import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWebsocket } from "../../hooks/useWebsocket.ts";
import "./GameScreen.css";

import player1Avatar from "../../assets/Player1-ingame.png";
import player2Avatar from "../../assets/Player2-ingame.png";

type PlayerId = 1 | 2;

type BackendMinionDTO = {
    row: number;
    col: number;
    owner: PlayerId;
    hp: number;
    type: string;
};

type SpawnableHexDTO = {
    row: number;
    col: number;
    spawnableP1: boolean;
    spawnableP2: boolean;
};

type BackendGameDTO = {
    currentPlayer: PlayerId;
    turn: number;
    minions: BackendMinionDTO[];
    player1Budget?: number;
    player2Budget?: number;
    player1TotalHp?: number;
    player2TotalHp?: number;
    player1SpawnsLeft?: number;
    player2SpawnsLeft?: number;
    result?: "ONGOING" | "PLAYER1_WIN" | "PLAYER2_WIN" | "DRAW";
    events?: string[];
    currentPlayerAllowedTypes?: string[];
    hexPurchaseCost?: number;
    spawnableHexes?: SpawnableHexDTO[];
    currentPlayerBoughtHexThisTurn?: boolean;
    currentPlayerSpawnedThisTurn?: boolean;
    hostId: string;
    mode: "DUEL" | "SOLITAIRE" | "AUTO";
};

type SelectedCell = {
    row: number;
    col: number;
};

type GameRequest = {
    roomId: string;
    userId: string;
};

type SpawnMinionRequest = {
    roomId: string;
    row: number;
    col: number;
    type: string;
};

type BuyHexRequest = {
    roomId: string;
    row: number;
    col: number;
};

const BOARD_ROWS = 8;
const BOARD_COLS = 8;

function minionShortName(type: string): string {
    const normalized = type.trim().toLowerCase();

    if (normalized === "berserker") return "BER";
    if (normalized === "factory") return "FAC";
    if (normalized === "bomber") return "BOM";
    if (normalized === "calmer") return "CAL";
    if (normalized === "gambler") return "GAM";

    return type.slice(0, 3).toUpperCase();
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US").format(value);
}

function getNeighbors(row: number, col: number): Array<{ row: number; col: number }> {
    const isOddCol = col % 2 === 1;

    const deltas = isOddCol
        ? [
            { row: -1, col: 0 },
            { row: -1, col: 1 },
            { row: 0, col: 1 },
            { row: 1, col: 0 },
            { row: 0, col: -1 },
            { row: -1, col: -1 },
        ]
        : [
            { row: -1, col: 0 },
            { row: 0, col: 1 },
            { row: 1, col: 1 },
            { row: 1, col: 0 },
            { row: 1, col: -1 },
            { row: 0, col: -1 },
        ];

    return deltas
        .map((delta) => ({ row: row + delta.row, col: col + delta.col }))
        .filter(
            (pos) =>
                pos.row >= 0 &&
                pos.row < BOARD_ROWS &&
                pos.col >= 0 &&
                pos.col < BOARD_COLS
        );
}

export default function GameScreen(): React.JSX.Element {
    const navigate = useNavigate();
    const { roomId } = useParams<{ roomId: string }>();

    const currentUserId = sessionStorage.getItem("userId") ?? "";
    const { client, isConnected, connect, disconnect } = useWebsocket();

    const [gameState, setGameState] = useState<BackendGameDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [endingTurn, setEndingTurn] = useState(false);
    const [spawning, setSpawning] = useState(false);
    const [buyingHex, setBuyingHex] = useState(false);
    const [error, setError] = useState("");

    const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
    const [spawnMenuOpen, setSpawnMenuOpen] = useState(false);
    const currentPlayerSpawnedThisTurn =
        gameState?.currentPlayerSpawnedThisTurn ?? false;



    useEffect(() => {
        if (!currentUserId || !roomId) {
            navigate("/");
            return;
        }

        connect();
        return () => disconnect();
    }, [currentUserId, roomId, navigate, connect, disconnect]);

    useEffect(() => {
        if (!client || !isConnected || !roomId) return;
        if (!client.connected) return;

        const subscription = client.subscribe(`/topic/game/${roomId}`, (message) => {
            try {
                const payload: BackendGameDTO = JSON.parse(message.body);

                setGameState(payload);
                setLoading(false);
                setSyncing(false);
                setEndingTurn(false);
                setSpawning(false);
                setBuyingHex(false);
                setError("");
                setSpawnMenuOpen(false);
            } catch (err) {
                console.error("Cannot parse game state:", err);
                setLoading(false);
                setSyncing(false);
                setEndingTurn(false);
                setSpawning(false);
                setBuyingHex(false);
                setError("Cannot parse game state");
            }
        });

        try {
            setSyncing(true);
            client.publish({
                destination: "/app/game/sync",
                body: JSON.stringify({
                    roomId,
                    userId: currentUserId,
                }),
            });
        } catch (err) {
            console.error(err);
            setSyncing(false);
            setLoading(false);
            setError("Cannot sync game state");
        }

        return () => subscription.unsubscribe();
    }, [client, isConnected, roomId]);

    const minionMap = useMemo(() => {
        const map = new Map<string, BackendMinionDTO>();
        for (const minion of gameState?.minions ?? []) {
            map.set(`${minion.row}-${minion.col}`, minion);
        }
        return map;
    }, [gameState]);

    const spawnableMap = useMemo(() => {
        const map = new Map<string, SpawnableHexDTO>();
        for (const hex of gameState?.spawnableHexes ?? []) {
            map.set(`${hex.row}-${hex.col}`, hex);
        }
        return map;
    }, [gameState]);

    const selectedMinion = useMemo(() => {
        if (!selectedCell) return null;
        return minionMap.get(`${selectedCell.row}-${selectedCell.col}`) ?? null;
    }, [selectedCell, minionMap]);

    const player1Minions = useMemo(
        () => (gameState?.minions ?? []).filter((m) => m.owner === 1),
        [gameState]
    );
    const player2Minions = useMemo(
        () => (gameState?.minions ?? []).filter((m) => m.owner === 2),
        [gameState]
    );

    const currentPlayer = gameState?.currentPlayer ?? 1;
    const turn = gameState?.turn ?? 1;
    const result = gameState?.result ?? "ONGOING";
    const currentAllowedTypes = gameState?.currentPlayerAllowedTypes ?? [];
    const hexPurchaseCost = gameState?.hexPurchaseCost ?? 0;
    const currentPlayerBoughtHexThisTurn = gameState?.currentPlayerBoughtHexThisTurn ?? false;

    const player1Budget = gameState?.player1Budget ?? 0;
    const player2Budget = gameState?.player2Budget ?? 0;
    const player1TotalHp =
        gameState?.player1TotalHp ?? player1Minions.reduce((sum, minion) => sum + minion.hp, 0);
    const player2TotalHp =
        gameState?.player2TotalHp ?? player2Minions.reduce((sum, minion) => sum + minion.hp, 0);
    const player1SpawnsLeft = gameState?.player1SpawnsLeft ?? 0;
    const player2SpawnsLeft = gameState?.player2SpawnsLeft ?? 0;

    const currentPlayerAvatar = currentPlayer === 1 ? player1Avatar : player2Avatar;
    const currentPlayerName = currentPlayer === 1 ? "Player 1" : "Player 2";
    const currentBudget = currentPlayer === 1 ? player1Budget : player2Budget;
    const currentTotalHp = currentPlayer === 1 ? player1TotalHp : player2TotalHp;
    const currentSpawnsLeft = currentPlayer === 1 ? player1SpawnsLeft : player2SpawnsLeft;
    const hasSpawnsLeft = currentSpawnsLeft > 0;
    const isAutoMode = gameState?.mode === "AUTO";
    const isSolitaireMode = gameState?.mode === "SOLITAIRE";

    const isHost = gameState?.hostId === currentUserId;
    const myPlayer = isHost ? 1 : 2;

    const isMyTurn = isAutoMode
        ? false
        : myPlayer === currentPlayer;

    const actionFeed = useMemo(() => {
        if (gameState?.events && gameState.events.length > 0) return gameState.events;
        if (!gameState) return ["Waiting for game state..."];
        return [
            `Turn ${turn} started`,
            `Current player: Player ${currentPlayer}`,
            `Minions on board: ${gameState.minions.length}`,
        ];
    }, [gameState, turn, currentPlayer]);

    const currentPlayerSpawnableHexes = useMemo(() => {
        return (gameState?.spawnableHexes ?? []).filter((hex) =>
            currentPlayer === 1 ? hex.spawnableP1 : hex.spawnableP2
        );
    }, [gameState, currentPlayer]);

    const buyableHexMap = useMemo(() => {
        const map = new Map<string, true>();

        if (!gameState || currentPlayerBoughtHexThisTurn) {
            return map;
        }

        for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
                const occupied = gameState.minions.some((m) => m.row === row && m.col === col);
                if (occupied) continue;

                const alreadySpawnable = currentPlayerSpawnableHexes.some(
                    (hex) => hex.row === row && hex.col === col
                );
                if (alreadySpawnable) continue;

                const neighbors = getNeighbors(row, col);
                const adjacent = neighbors.some((neighbor) =>
                    currentPlayerSpawnableHexes.some(
                        (hex) => hex.row === neighbor.row && hex.col === neighbor.col
                    )
                );

                if (adjacent) {
                    map.set(`${row}-${col}`, true);
                }
            }
        }

        return map;
    }, [gameState, currentPlayerSpawnableHexes, currentPlayerBoughtHexThisTurn]);

    const canSpawnOnSelectedCell = useMemo(() => {
        if (!selectedCell || !gameState) return false;

        const occupied = gameState.minions.some(
            (m) => m.row === selectedCell.row && m.col === selectedCell.col
        );
        if (occupied) return false;

        return currentPlayerSpawnableHexes.some(
            (hex) => hex.row === selectedCell.row && hex.col === selectedCell.col
        );
    }, [selectedCell, gameState, currentPlayerSpawnableHexes]);

    const canBuySelectedHex = useMemo(() => {
        if (!selectedCell || !gameState) return false;
        if (currentPlayerBoughtHexThisTurn) return false;
        return buyableHexMap.has(`${selectedCell.row}-${selectedCell.col}`);
    }, [selectedCell, gameState, currentPlayerBoughtHexThisTurn, buyableHexMap]);

    const handleManualSync = () => {
        if (!client || !client.connected || !roomId) return;
        try {
            setSyncing(true);
            client.publish({
                destination: "/app/game/sync",
                body: JSON.stringify({
                    roomId,
                    userId: currentUserId,
                } satisfies GameRequest),
            });
        } catch (err) {
            console.error(err);
            setSyncing(false);
            setError("Cannot sync game state");
        }
    };

    const handleEndTurn = () => {
        if (!client || !client.connected || !roomId || result !== "ONGOING") return;
        if (!isAutoMode && !isMyTurn) return;

        try {
            setEndingTurn(true);
            client.publish({
                destination: "/app/game/end-turn",
                body: JSON.stringify({
                    roomId,
                    userId: currentUserId,
                }),
            });
        } catch (err) {
            console.error(err);
            setEndingTurn(false);
            setError("Cannot end turn");
        }
    };

    const handleSurrender = () => {
        if (!client || !client.connected || !roomId || !currentUserId) return;

        try {
            client.publish({
                destination: "/app/game/surrender",
                body: JSON.stringify({
                    roomId,
                    userId: currentUserId,
                }),
            });
        } catch (err) {
            console.error(err);
            setError("Cannot surrender");
        }
    };

    const handleOpenSpawnMenu = () => {
        if (isAutoMode || !isMyTurn) return;
        if (!hasSpawnsLeft) return;
        if (!selectedCell || !canSpawnOnSelectedCell) return;
        if (currentPlayerSpawnedThisTurn) return;
        setSpawnMenuOpen(true);
    };

    const handleCloseSpawnMenu = () => {
        setSpawnMenuOpen(false);
    };

    const handleSpawnMinion = (type: string) => {
        if (isAutoMode || !isMyTurn) return;
        if (!hasSpawnsLeft) return;
        if (!client || !client.connected || !roomId || !selectedCell) return;

        try {
            setSpawning(true);
            client.publish({
                destination: "/app/game/spawn",
                body: JSON.stringify({
                    roomId,
                    userId: currentUserId,
                    row: selectedCell.row,
                    col: selectedCell.col,
                    type,
                }),
            });
        } catch (err) {
            console.error(err);
            setSpawning(false);
            setError("Cannot spawn minion");
        }
    };

    const handleBuyHex = () => {
        if (isAutoMode || !isMyTurn) return;
        if (!client || !client.connected || !roomId || !selectedCell) return;

        try {
            setBuyingHex(true);
            client.publish({
                destination: "/app/game/buy-hex",
                body: JSON.stringify({
                    roomId,
                    userId: currentUserId,
                    row: selectedCell.row,
                    col: selectedCell.col,
                }),
            });
        } catch (err) {
            console.error(err);
            setBuyingHex(false);
            setError("Cannot buy hex");
        }
    };

    if (loading) {
        return (
            <div className="game-screen loading-screen">
                <div className="loading-panel">
                    <h1 className="loading-title">KOMBAT</h1>
                    <p className="loading-text">Loading battlefield...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`game-screen ${currentPlayer === 2 ? "theme-blue" : "theme-red"}`}>
            <div className="game-overlay" />

            <div className="game-topbar">
                <button className="outline-btn danger" onClick={handleSurrender}>
                    Surrender
                </button>

                <div className="turn-box">
                    <span className="turn-label">Current Turn</span>
                    <span className="turn-value">Turn {turn}</span>
                </div>

                <div className="topbar-actions">
                    <button
                        className="outline-btn secondary"
                        onClick={handleManualSync}
                        disabled={syncing || endingTurn || spawning || buyingHex}
                    >
                        {syncing ? "Syncing..." : "Sync"}
                    </button>

                    <button
                        className="outline-btn primary"
                        onClick={handleEndTurn}
                        disabled={
                            endingTurn ||
                            syncing ||
                            spawning ||
                            buyingHex ||
                            result !== "ONGOING" ||
                            (!isAutoMode && !isMyTurn)
                        }
                    >
                        {endingTurn ? "Ending..." : "End Turn"}
                    </button>
                </div>
            </div>

            {error && <div className="game-error-banner">{error}</div>}

            <div className="game-main">
                <aside className="left-panel">
                    <section className="panel card action-feed-panel">
                        <h2 className="panel-title">Action Feed</h2>
                        <div className="feed-list">
                            {actionFeed.map((item, index) => (
                                <div key={`${item}-${index}`} className="feed-item">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="panel card score-panel">
                        <h2 className="panel-title">Battle Summary</h2>

                        <div className="score-row"><span>Player 1 Minions</span><span>{player1Minions.length}</span></div>
                        <div className="score-row"><span>Player 2 Minions</span><span>{player2Minions.length}</span></div>
                        <div className="score-row"><span>Player 1 Total HP</span><span>{player1TotalHp}</span></div>
                        <div className="score-row"><span>Player 2 Total HP</span><span>{player2TotalHp}</span></div>
                        <div className="score-row"><span>Player 1 Budget</span><span>{formatNumber(player1Budget)}</span></div>
                        <div className="score-row"><span>Player 2 Budget</span><span>{formatNumber(player2Budget)}</span></div>
                    </section>
                </aside>

                <main className="board-panel">
                    <div className="board-card">
                        <div className="board-header">
                            <h1 className="board-title">Battlefield</h1>
                            <p className="board-subtitle">Player {currentPlayer}'s turn</p>
                        </div>

                        <div className="hex-board">
                            {Array.from({ length: BOARD_ROWS }, (_, rowIndex) => (
                                <div key={`row-${rowIndex}`} className={`hex-row ${rowIndex % 2 === 1 ? "offset" : ""}`}>
                                    {Array.from({ length: BOARD_COLS }, (_, colIndex) => {
                                        const key = `${rowIndex}-${colIndex}`;
                                        const minion = minionMap.get(key);
                                        const spawnable = spawnableMap.get(key);
                                        const isSelected =
                                            selectedCell?.row === rowIndex && selectedCell?.col === colIndex;

                                        const isP1Base = !!spawnable?.spawnableP1;
                                        const isP2Base = !!spawnable?.spawnableP2;
                                        const isBuyable = buyableHexMap.has(key);

                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                className={[
                                                    "hex-cell",
                                                    isSelected ? "selected" : "",
                                                    isP1Base ? "base-p1" : "",
                                                    isP2Base ? "base-p2" : "",
                                                    isBuyable ? "buyable-hex" : "",
                                                    minion ? `owner-${minion.owner}` : "",
                                                ].join(" ").trim()}
                                                onClick={() => {
                                                    setSelectedCell({ row: rowIndex, col: colIndex });
                                                    setSpawnMenuOpen(false);
                                                }}
                                            >
                                                <span className="hex-coord">{rowIndex},{colIndex}</span>

                                                {minion ? (
                                                    <div
                                                        className="unit-chip"
                                                        data-type={minionShortName(minion.type)}
                                                    >
                                                        <span className="unit-type">
                                                            {minionShortName(minion.type)}
                                                        </span>
                                                        <span className="unit-hp">
                                                            HP {minion.hp}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="empty-cell-mark" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                <aside className="right-panel">
                    <section className="panel card current-player-panel">
                        <div className="current-player-top">
                            <div className="player-avatar-wrap">
                                <img src={currentPlayerAvatar} alt={currentPlayerName} className="player-avatar" />
                            </div>

                            <div className="player-meta">
                                <h2 className="current-player-name">{currentPlayerName}</h2>
                                <p className="current-player-tag">Active Player</p>
                            </div>
                        </div>

                        <div className="stat-grid">
                            <div className="stat-box"><span className="stat-label">Budget</span><span className="stat-value">{formatNumber(currentBudget)}</span></div>
                            <div className="stat-box"><span className="stat-label">Total HP</span><span className="stat-value">{currentTotalHp}</span></div>
                            <div className="stat-box"><span className="stat-label">Spawns Left</span><span className="stat-value">{currentSpawnsLeft}</span></div>
                            <div className="stat-box"><span className="stat-label">Units</span><span className="stat-value">{currentPlayer === 1 ? player1Minions.length : player2Minions.length}</span></div>
                        </div>
                    </section>

                    <section className="panel card selected-panel">
                        <h2 className="panel-title">Selected Cell</h2>

                        {selectedCell ? (
                            <>
                                <div className="selected-row"><span>Position</span><span>{selectedCell.row},{selectedCell.col}</span></div>

                                {selectedMinion ? (
                                    <>
                                        <div className="selected-row"><span>Owner</span><span>Player {selectedMinion.owner}</span></div>
                                        <div className="selected-row"><span>Type</span><span>{selectedMinion.type}</span></div>
                                        <div className="selected-row"><span>HP</span><span>{selectedMinion.hp}</span></div>
                                    </>
                                ) : (
                                    <div className="selected-empty">Empty hex</div>
                                )}
                            </>
                        ) : (
                            <div className="selected-empty">Click a hex to inspect it</div>
                        )}
                    </section>

                    <section className="panel card selected-panel">
                        <h2 className="panel-title">Buy Hex</h2>

                        {selectedCell ? (
                            <>
                                <div className="selected-row"><span>Selected</span><span>{selectedCell.row},{selectedCell.col}</span></div>
                                <div className="selected-row"><span>Cost</span><span>{formatNumber(hexPurchaseCost)}</span></div>
                                <div className="selected-row"><span>Bought This Turn</span><span>{currentPlayerBoughtHexThisTurn ? "Yes" : "No"}</span></div>

                                {canBuySelectedHex ? (
                                    <>
                                        <div className="selected-empty">You can buy this hex.</div>
                                        <button
                                            className="outline-btn primary full-width-btn"
                                            onClick={handleBuyHex}
                                            disabled={isAutoMode || !isMyTurn || buyingHex || syncing || endingTurn || spawning}
                                        >
                                            {buyingHex ? "Buying..." : "Buy Hex"}
                                        </button>
                                    </>
                                ) : (
                                    <div className="selected-empty">
                                        {currentPlayerBoughtHexThisTurn
                                            ? "You already bought 1 hex this turn."
                                            : "This hex is not adjacent to your current spawnable area."}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="selected-empty">
                                Select an empty hex adjacent to your spawnable area
                            </div>
                        )}
                    </section>

                    <section className="panel card selected-panel">
                        <h2 className="panel-title">Spawn</h2>

                        {selectedCell ? (
                            <>
                                <div className="selected-row">
                                    <span>Selected</span>
                                    <span>
                {selectedCell.row}, {selectedCell.col}
            </span>
                                </div>

                                {canSpawnOnSelectedCell ? (
                                    !hasSpawnsLeft ? (
                                        <div className="selected-empty">
                                            No spawns left.
                                        </div>
                                    ) : currentPlayerSpawnedThisTurn ? (
                                        <div className="selected-empty">
                                            You already spawned 1 minion this turn.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="selected-empty">
                                                You can spawn on this hex.
                                            </div>

                                            {!spawnMenuOpen ? (
                                                <button
                                                    className="outline-btn primary full-width-btn"
                                                    onClick={handleOpenSpawnMenu}
                                                    disabled={
                                                        isAutoMode ||
                                                        !isMyTurn ||
                                                        !hasSpawnsLeft ||
                                                        spawning ||
                                                        endingTurn ||
                                                        syncing ||
                                                        buyingHex
                                                    }
                                                >
                                                    Open Spawn Menu
                                                </button>
                                            ) : (
                                                <div className="spawn-menu">
                                                    {currentAllowedTypes.length > 0 ? (
                                                        currentAllowedTypes.map((type) => (
                                                            <button
                                                                key={type}
                                                                className="spawn-type-btn"
                                                                onClick={() => handleSpawnMinion(type)}
                                                                disabled={
                                                                    isAutoMode ||
                                                                    !isMyTurn ||
                                                                    !hasSpawnsLeft ||
                                                                    spawning
                                                                }
                                                                type="button"
                                                            >
                                                                {type}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="selected-empty">
                                                            No allowed types found
                                                        </div>
                                                    )}

                                                    <button
                                                        className="outline-btn secondary full-width-btn"
                                                        onClick={handleCloseSpawnMenu}
                                                        disabled={spawning}
                                                        type="button"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )
                                ) : (
                                    <div className="selected-empty">
                                        This hex is not a valid spawn hex.
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="selected-empty">
                                Select an empty spawnable hex to spawn a minion
                            </div>
                        )}
                    </section>

                    <section className="panel card help-panel">
                        <h2 className="panel-title">Controls</h2>
                        <div className="help-text">
                            ตอนนี้หน้าเกมเชื่อมกับ backend สำหรับ
                            <strong> sync state </strong>,
                            <strong> end turn </strong>,
                            <strong> buy hex </strong>
                            และ
                            <strong> spawn minion </strong>
                            แล้ว
                        </div>
                    </section>
                </aside>
            </div>

            {result !== "ONGOING" && (
                <div className="game-result-overlay">
                    <div className="game-result-modal">
                        <h2 className="game-result-title">Game Over</h2>
                        <p className="game-result-text">
                            {result === "PLAYER1_WIN" && "Player 1 wins!"}
                            {result === "PLAYER2_WIN" && "Player 2 wins!"}
                            {result === "DRAW" && "Draw!"}
                        </p>
                        <button className="outline-btn primary" onClick={() => navigate("/")}>
                            Return Home
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}