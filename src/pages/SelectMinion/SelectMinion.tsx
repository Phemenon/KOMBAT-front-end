import "../../globalStyle.css";
import "./SelectMinion.css";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useWebsocket } from "../../hooks/useWebsocket.ts";
import StartTransition from "../StartTransition/StartTransition.tsx";

import factoryImg from "../../assets/factory.png";
import berserkImg from "../../assets/berserk.png";
import bomberImg from "../../assets/bomber.png";
import calmerImg from "../../assets/calmer.png";
import gamblerImg from "../../assets/gambler.png";

type MinionOption = {
    id: string;
    name: string;
    description: string;
    image: string;
};

const minionOptions: MinionOption[] = [
    {
        id: "Factory",
        name: "Factory",
        description:
            "High-tier economic scaling. The Overlord remains in a \"Zen\" state of compound interest, refusing to move until the treasury is overflowing (90% MaxBudget) or the final clock strikes. Once activated, it’s an unstoppable juggernaut backed by infinite wealth.",
        image: factoryImg,
    },
    {
        id: "Berserker",
        name: "Berserker",
        description:
            "High-risk, high-impact. Driven by raw instinct, the Juggernaut initiates a \"Search & Destroy\" protocol much earlier than others (40% Budget). It ignores distance and charges straight for the kill, delivering a devastating 250 HP payload to delete threats instantly.",
        image: berserkImg,
    },
    {
        id: "Bomber",
        name: "Bomber",
        description:
            "High-octane infiltration. The Bomber is your \"First Responder,\" hitting the field with zero chill (30% Budget). It’s designed to breach enemy lines and force early mistakes. It doesn't care about the long game; it only cares about the Full Payload impact.",
        image: bomberImg,
    },
    {
        id: "Calmer",
        name: "Calmer",
        description:
            "Controlled aggression. The Stalker maintains a strict discipline, stalking targets from the periphery while keeping the economy healthy (60% Budget). It uses a 3-tier adaptive firing system—shooting only what it can afford—making it the most sustainable unit in your army.",
        image: calmerImg,
    },
    {
        id: "Gambler",
        name: "Gambler",
        description:
            "Total unpredictability. The High Roller operates on a \"Fortune Favors the Bold\" philosophy. Its lethality is purely RNG-based, scaling its \"bets\" (shots) based on the current bankroll. Perfect for breaking stalemates or pulling off a miracle comeback when the odds are stacked against you.",
        image: gamblerImg,
    },
];

type PlayerSelectState = {
    userId: string;
    userName: string;
    ready: boolean;
};

type MinionSelectRoomState = {
    roomId: string;
    hostId: string;
    gameStarted: boolean;
    mode: "DUEL" | "SOLITAIRE" | "AUTO";
    selectedTypes: string[];
    players: Record<string, PlayerSelectState>;
    defaultStrategyMap?: Record<string, string>;
    currentStrategyMap?: Record<string, string>;
    defaultDefenseFactorMap?: Record<string, number>;
    currentDefenseFactorMap?: Record<string, number>;
};

type MinionStrategyEditorState = {
    minionType: string;
    defaultStrategy: string;
    currentStrategy: string;
    valid: boolean;
    message: string;
};

export default function SelectMinionPage() {
    const navigate = useNavigate();
    const { roomId } = useParams<{ roomId: string }>();

    const currentUserId = sessionStorage.getItem("userId") ?? "";
    const { client, isConnected, connect, disconnect } = useWebsocket();

    const [roomState, setRoomState] = useState<MinionSelectRoomState | null>(null);
    const [showTransition, setShowTransition] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingType, setEditingType] = useState("");
    const [, setDefaultStrategy] = useState("");
    const [draftStrategy, setDraftStrategy] = useState("");
    const [isValidStrategy, setIsValidStrategy] = useState(false);
    const [validationMessage, setValidationMessage] = useState("");
    const [editorLoading, setEditorLoading] = useState(false);
    const isSoloMode =
        roomState?.mode === "SOLITAIRE" || roomState?.mode === "AUTO";

    // local state สำหรับ input defense factor
    const [defenseDraftMap, setDefenseDraftMap] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!currentUserId) {
            navigate("/");
            return;
        }

        connect();

        return () => {
            disconnect();
        };
    }, [currentUserId, navigate, connect, disconnect]);

    useEffect(() => {
        if (!client || !isConnected || !roomId) return;
        if (!client.connected) return;

        const roomSubscription = client.subscribe(
            `/topic/room/${roomId}/minion-select`,
            (message) => {
                const updatedState: MinionSelectRoomState = JSON.parse(message.body);

                setRoomState(updatedState);
                setActionLoading(false);
                setError("");

                // sync draft input จากค่าปัจจุบันของ backend
                setDefenseDraftMap(() => {
                    const next: Record<string, string> = {};

                    for (const minion of minionOptions) {
                        const effectiveValue =
                            updatedState.currentDefenseFactorMap?.[minion.id]
                            ?? updatedState.defaultDefenseFactorMap?.[minion.id]
                            ?? 0;

                        next[minion.id] = String(effectiveValue);
                    }

                    return next;
                });

                if (updatedState.gameStarted) {
                    setShowTransition(true);
                }
            }
        );

        client.publish({
            destination: `/app/room/${roomId}/minion-select/sync`,
            body: JSON.stringify({
                userId: currentUserId,
            }),
        });

        return () => {
            roomSubscription.unsubscribe();
        };
    }, [client, isConnected, roomId, currentUserId]);

    useEffect(() => {
        if (!client || !isConnected || !roomId || !currentUserId) return;
        if (!client.connected) return;

        const editorSubscription = client.subscribe(
            `/topic/room/${roomId}/minion-strategy-editor/${currentUserId}`,
            (message) => {
                const payload: MinionStrategyEditorState = JSON.parse(message.body);

                setEditingType(payload.minionType);
                setDefaultStrategy((prev) => payload.defaultStrategy || prev);
                setDraftStrategy(payload.currentStrategy ?? "");
                setIsValidStrategy(payload.valid);
                setValidationMessage(payload.message ?? "");
                setEditorOpen(true);
                setEditorLoading(false);
                setError("");
            }
        );

        return () => {
            editorSubscription.unsubscribe();
        };
    }, [client, isConnected, roomId, currentUserId]);

    const playersArray = roomState ? Object.values(roomState.players) : [];

    const currentPlayer =
        playersArray.find((player) => player.userId === currentUserId) ?? null;

    const hostPlayer =
        roomState ? roomState.players[roomState.hostId] : null;

    const guestPlayer =
        playersArray.find((player) => player.userId !== roomState?.hostId) ?? null;

    const selectedTypes = roomState?.selectedTypes ?? [];

    const isSelectionValid =
        selectedTypes.length >= 1 && selectedTypes.length <= 5;

    const playerCount = playersArray.length;

    const allReady = isSoloMode
        ? !!hostPlayer?.ready
        : playerCount === 2 &&
        playersArray.every((player) => player.ready);

    const canEditSelection =
        !!roomState &&
        !roomState.gameStarted &&
        !currentPlayer?.ready;

    const hostReady = !!hostPlayer?.ready;
    const guestReady = !!guestPlayer?.ready;

    const statusText = useMemo(() => {
        if (!roomState) return "LOADING...";
        if (roomState.gameStarted) return "GAME IS STARTING...";
        if (!isSelectionValid) return "PLEASE SELECT 1-5 MINION TYPES";

        if (isSoloMode) {
            if (hostReady) return "STARTING MATCH...";
            return "CHOOSE SHARED MINION TYPES, SET DEFENSE FACTORS, AND PRESS READY";
        }

        if (playerCount < 2) return "WAITING FOR ANOTHER PLAYER...";
        if (allReady) return "BOTH PLAYERS ARE READY";
        return "CHOOSE SHARED MINION TYPES, SET DEFENSE FACTORS, AND PRESS READY";
    }, [roomState, playerCount, isSelectionValid, allReady, isSoloMode, hostReady]);

    const getDefenseFactor = (minionType: string): number => {
        return roomState?.currentDefenseFactorMap?.[minionType]
            ?? roomState?.defaultDefenseFactorMap?.[minionType]
            ?? 0;
    };

    const publishSelection = (nextSelectedTypes: string[]) => {
        if (!client || !roomId) return;
        if (!client.connected) {
            alert("WebSocket is not connected yet");
            return;
        }

        try {
            setActionLoading(true);

            client.publish({
                destination: `/app/room/${roomId}/minion-select/update`,
                body: JSON.stringify({
                    userId: currentUserId,
                    selectedTypes: nextSelectedTypes,
                }),
            });
        } catch (err) {
            console.error(err);
            setActionLoading(false);
            setError("Cannot update minion selection");
        }
    };

    const toggleMinion = (id: string) => {
        if (!canEditSelection) return;

        const alreadySelected = selectedTypes.includes(id);

        let nextSelectedTypes: string[];

        if (alreadySelected) {
            nextSelectedTypes = selectedTypes.filter((item) => item !== id);
        } else {
            if (selectedTypes.length >= 5) return;
            nextSelectedTypes = [...selectedTypes, id];
        }

        publishSelection(nextSelectedTypes);
    };

    const handleToggleReady = () => {
        if (!client || !roomId) return;
        if (!client.connected) {
            alert("WebSocket is not connected yet");
            return;
        }

        if (!roomState) {
            alert("Room state is not loaded yet");
            return;
        }

        if (!isSelectionValid) {
            alert("Please select 1-5 minion types first");
            return;
        }

        try {
            setActionLoading(true);

            client.publish({
                destination: `/app/room/${roomId}/minion-select/ready`,
                body: JSON.stringify({
                    userId: currentUserId,
                }),
            });
        } catch (err) {
            console.error(err);
            setActionLoading(false);
            setError("Cannot toggle ready");
        }
    };

    const handleOpenEditor = (minionType: string) => {
        if (!client || !roomId) return;
        if (!client.connected) {
            alert("WebSocket is not connected yet");
            return;
        }

        try {
            setEditorLoading(true);
            setValidationMessage("");
            setIsValidStrategy(false);

            client.publish({
                destination: `/app/room/${roomId}/minion-select/strategy/open`,
                body: JSON.stringify({
                    userId: currentUserId,
                    minionType,
                }),
            });
        } catch (err) {
            console.error(err);
            setEditorLoading(false);
            setError("Cannot open strategy editor");
        }
    };

    const handleResetDefault = () => {
        if (!client || !roomId) return;
        if (!client.connected) {
            alert("WebSocket is not connected yet");
            return;
        }

        try {
            setEditorLoading(true);

            client.publish({
                destination: `/app/room/${roomId}/minion-select/strategy/default`,
                body: JSON.stringify({
                    userId: currentUserId,
                    minionType: editingType,
                }),
            });
        } catch (err) {
            console.error(err);
            setEditorLoading(false);
            setError("Cannot reset strategy to default");
        }
    };

    const handleValidate = () => {
        if (!client || !roomId) return;
        if (!client.connected) {
            alert("WebSocket is not connected yet");
            return;
        }

        try {
            setEditorLoading(true);

            client.publish({
                destination: `/app/room/${roomId}/minion-select/strategy/validate`,
                body: JSON.stringify({
                    userId: currentUserId,
                    minionType: editingType,
                    strategySource: draftStrategy,
                }),
            });
        } catch (err) {
            console.error(err);
            setEditorLoading(false);
            setError("Cannot validate strategy");
        }
    };

    const handleConfirm = () => {
        if (!client || !roomId) return;
        if (!client.connected) {
            alert("WebSocket is not connected yet");
            return;
        }

        if (!isValidStrategy) return;

        try {
            client.publish({
                destination: `/app/room/${roomId}/minion-select/strategy/confirm`,
                body: JSON.stringify({
                    userId: currentUserId,
                    minionType: editingType,
                    strategySource: draftStrategy,
                }),
            });

            setEditorOpen(false);
            setValidationMessage("");
            setIsValidStrategy(false);
            setEditingType("");
        } catch (err) {
            console.error(err);
            setError("Cannot confirm strategy");
        }
    };

    const handleDefenseInputChange = (minionType: string, value: string) => {
        setDefenseDraftMap((prev) => ({
            ...prev,
            [minionType]: value,
        }));
    };

    const handleConfirmDefenseFactor = (minionType: string) => {
        if (!client || !roomId) return;
        if (!client.connected) {
            alert("WebSocket is not connected yet");
            return;
        }
        if (!canEditSelection) return;

        const raw = defenseDraftMap[minionType] ?? String(getDefenseFactor(minionType));
        const parsed = Number(raw);

        if (!Number.isFinite(parsed) || parsed < 0) {
            alert("Defense factor must be a number >= 0");
            return;
        }

        try {
            setActionLoading(true);

            client.publish({
                destination: `/app/room/${roomId}/minion-select/defense/confirm`,
                body: JSON.stringify({
                    userId: currentUserId,
                    minionType,
                    defenseFactor: parsed,
                }),
            });
        } catch (err) {
            console.error(err);
            setActionLoading(false);
            setError("Cannot confirm defense factor");
        }
    };

    const handleResetDefenseFactor = (minionType: string) => {
        if (!client || !roomId) return;
        if (!client.connected) {
            alert("WebSocket is not connected yet");
            return;
        }
        if (!canEditSelection) return;

        try {
            setActionLoading(true);

            client.publish({
                destination: `/app/room/${roomId}/minion-select/defense/default`,
                body: JSON.stringify({
                    userId: currentUserId,
                    minionType,
                }),
            });
        } catch (err) {
            console.error(err);
            setActionLoading(false);
            setError("Cannot reset defense factor");
        }
    };

    if (showTransition) {
        return (
            <StartTransition
                onComplete={() => navigate(`/game/${roomId}`)}
            />
        );
    }

    if (!roomState) {
        return (
            <div className="minions-container">
                <h1 className="minions-title">Minions</h1>
                <p className="selection-hint">LOADING...</p>
            </div>
        );
    }

    return (
        <div className="minions-container">
            <div className={`player-side left-side ${hostReady ? "active" : ""}`} />
            <div className={`player-side right-side ${guestReady ? "active" : ""}`} />

            <h1 className="minions-title">Minions</h1>

            <p className="selection-hint">
                {statusText} {isConnected ? "" : "(connecting...)"}
            </p>

            {error && <p className="selection-hint error">{error}</p>}

            <div className="minions-grid">
                {minionOptions.map((minion) => {
                    const isActive = selectedTypes.includes(minion.id);
                    const currentDefense = getDefenseFactor(minion.id);

                    return (
                        <div
                            key={minion.id}
                            className={`minion-card ${isActive ? "active" : ""} ${canEditSelection ? "clickable" : "locked"}`}
                            onClick={() => toggleMinion(minion.id)}
                        >
                            <div className="minion-image-container">
                                <img
                                    src={minion.image}
                                    alt={minion.name}
                                    className="minion-sprite"
                                />
                            </div>

                            <h2 className="minion-name">{minion.name}</h2>

                            <div
                                className="minion-meta-row"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <div className="minion-stat-chip">
                                    <span className="minion-stat-label">DEF</span>

                                    <input
                                        type="number"
                                        min={0}
                                        className="minion-defense-input"
                                        value={defenseDraftMap[minion.id] ?? String(currentDefense)}
                                        disabled={!canEditSelection || actionLoading}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onChange={(e) => handleDefenseInputChange(minion.id, e.target.value)}
                                    />

                                    <button
                                        type="button"
                                        className="mini-action-btn"
                                        disabled={!canEditSelection || actionLoading}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleConfirmDefenseFactor(minion.id);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        OK
                                    </button>

                                    <button
                                        type="button"
                                        className="mini-action-btn secondary"
                                        disabled={!canEditSelection || actionLoading}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleResetDefenseFactor(minion.id);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        DFT
                                    </button>
                                </div>
                            </div>

                            <p className="minion-desc">{minion.description}</p>

                            <button
                                className="edit-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditor(minion.id);
                                }}
                            >
                                edit
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="footer-section">
                <p className={`selection-hint ${!isSelectionValid ? "error" : ""}`}>
                    SELECTED SHARED TYPES: {selectedTypes.length} / 5
                </p>

                <button
                    className="done-btn-fixed"
                    onClick={handleToggleReady}
                    disabled={
                        actionLoading ||
                        !currentPlayer ||
                        !roomState ||
                        roomState.gameStarted ||
                        !isSelectionValid
                    }
                >
                    {currentPlayer?.ready ? "UNREADY" : "READY"}
                </button>
            </div>

            {editorOpen && (
                <div className="strategyModalOverlay">
                    <div className="strategyModalBox">
                        <button
                            className="defaultTabBtn"
                            onClick={handleResetDefault}
                            disabled={editorLoading}
                        >
                            default
                        </button>

                        <h2 className="strategyModalTitle">{editingType}</h2>

                        <textarea
                            className="strategyEditorTextarea"
                            value={draftStrategy}
                            onChange={(e) => {
                                setDraftStrategy(e.target.value);
                                setIsValidStrategy(false);
                                setValidationMessage("");
                            }}
                        />

                        <div className="strategyModalFooter">
                            <button
                                className="confirmStrategyBtn"
                                onClick={handleConfirm}
                                disabled={!isValidStrategy || editorLoading}
                            >
                                Confirm
                            </button>

                            <button
                                className="validateStrategyBtn"
                                onClick={handleValidate}
                                disabled={editorLoading}
                            >
                                valid
                            </button>
                        </div>

                        {validationMessage && (
                            <p className={`strategyValidationText ${isValidStrategy ? "ok" : "error"}`}>
                                {validationMessage}
                            </p>
                        )}

                        <button
                            className="closeStrategyModalBtn"
                            onClick={() => {
                                setEditorOpen(false);
                                setValidationMessage("");
                                setIsValidStrategy(false);
                                setEditingType("");
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}