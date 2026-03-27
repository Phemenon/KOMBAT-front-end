import "../../globalStyle.css";
import "../LobbyPage/LobbyStyle.css";
import ConfigItem from "../../components/ConfigAndInfoItem/ConfigItem.tsx";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../../config/apiConfig.ts";
import { useWebsocket } from "../../hooks/useWebsocket.ts";

/* import icons */
import maxTurnIcon from "../../assets/maxTurn.png";
import spawnCostIcon from "../../assets/spawnCost.png";
import hexCostIcon from "../../assets/hexCost.png";
import initialBudgetIcon from "../../assets/initialBudget.png";
import initialHPIcon from "../../assets/initialHP.png";
import turnBudgetIcon from "../../assets/turnBudget.png";
import interestPCTIcon from "../../assets/interestPCT.png";
import maxBudgetIcon from "../../assets/maxBudget.png";
import maxSpawnsIcon from "../../assets/maxSpawns.png";
import playerIcon from "../../assets/player.png";
import player1Logo from "../../assets/player1Logo.png";
import player2Logo from "../../assets/player2Logo.png";

type PlayerModel = {
    userId: string;
    userName: string;
    ready: boolean;
};

type RoomConfig = {
    spawnCost: number;
    hexPurchaseCost: number;
    initBudget: number;
    turnBudget: number;
    maxBudget: number;
    baseInterestPct: number;
    initHp: number;
    maxSpawns: number;
    maxTurns: number;
};

type RoomResponse = {
    roomId: string;
    hostId: string;
    gameStarted: boolean;
    mode: "DUEL" | "SOLITAIRE" | "AUTO";
    config: RoomConfig;
    players: Record<string, PlayerModel>;
};

export default function LobbyPage() {
    const navigate = useNavigate();
    const { roomId } = useParams<{ roomId: string }>();

    const currentUserId = sessionStorage.getItem("userId") ?? "";
    const { client, isConnected, connect, disconnect } = useWebsocket();

    const [room, setRoom] = useState<RoomResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const isSoloMode =
        room?.mode === "SOLITAIRE" || room?.mode === "AUTO";

    const handleCopy = async () => {
        if (!room) return;

        try {
            await navigator.clipboard.writeText(room.roomId);
            setCopied(true);

            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error("Copy failed", err);
        }
    };

    useRef(false);
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
        if (!roomId) return;

        const fetchRoom = async () => {
            try {
                const res = await fetch(`${API_BASE}/room/${roomId}`);

                if (!res.ok) {
                    throw new Error("Failed to load room");
                }

                const data: RoomResponse = await res.json();
                setRoom(data);
                setError("");
            } catch (err) {
                console.error(err);
                setError("Cannot load room");
            } finally {
                setLoading(false);
            }
        };

        fetchRoom();
    }, [roomId]);

    useEffect(() => {
        if (!client || !isConnected || !roomId) return;
        if (!client.connected) return;

        const subscription = client.subscribe(`/topic/room/${roomId}`, (message) => {
            const updatedRoom = JSON.parse(message.body);
            setRoom(updatedRoom);
            setActionLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [client, isConnected, roomId]);

    useEffect(() => {
        if (room?.gameStarted) {
            navigate(`/select/${room.roomId}`);
        }
    }, [room?.gameStarted, room?.roomId, navigate]);

    const isHost = room?.hostId === currentUserId;

    const playersArray = room ? Object.values(room.players) : [];

    const hostPlayer = room ? room.players[room.hostId] : null;

    const guestPlayer =
        playersArray.find((player) => player.userId !== room?.hostId) ?? null;

    const playerCount = playersArray.length;

    const allReady = isSoloMode
        ? !!hostPlayer?.ready
        : playerCount === 2 &&
        playersArray.every((player) => player.ready);

    const editableConfig = !!isHost && !room?.gameStarted;

    const lobbyStatus = useMemo(() => {
        if (!room) return "Loading...";
        if (room.gameStarted) return "Preparing match...";

        if (isSoloMode) {
            return hostPlayer?.ready
                ? "Starting solo match..."
                : "Press ready to start";
        }

        if (playerCount < 2) return "Waiting for players...";
        if (allReady) return "Both players ready";
        return "Waiting for both players to ready...";
    }, [room, playerCount, allReady, isSoloMode, hostPlayer]);

    const handleToggleReady = () => {
        if (!client || !roomId) return;
        if (!client.connected) {
            alert("WebSocket is not connected yet");
            return;
        }

        try {
            setActionLoading(true);

            client.publish({
                destination: `/app/room/${roomId}/ready`,
                body: JSON.stringify({
                    roomId,
                    userId: currentUserId,
                }),
            });
        } catch (err) {
            console.error(err);
            setActionLoading(false);
            alert("Cannot toggle ready");
        }
    };

    const updateConfigToServer = (patch: Partial<RoomConfig>) => {
        if (!client || !roomId || !room) return;
        if (!editableConfig) return;
        if (!client.connected) {
            console.warn("WebSocket not connected yet");
            return;
        }

        try {
            setActionLoading(true);

            client.publish({
                destination: `/app/room/${roomId}/config`,
                body: JSON.stringify({
                    userId: currentUserId,
                    ...patch,
                }),
            });
        } catch (err) {
            console.error(err);
            setActionLoading(false);
            alert("Cannot update config");
        }
    };

    const handleConfigChange =
        (key: keyof RoomConfig) =>
            (value: number) => {
                updateConfigToServer({ [key]: value } as Partial<RoomConfig>);
            };

    if (loading) {
        return (
            <div className="LobbyBackgroundLayout LobbyBG">
                <div className="page">
                    <div className="LobbyTitle">Loading...</div>
                </div>
            </div>
        );
    }

    if (!roomId || !room) {
        return (
            <div className="LobbyBackgroundLayout LobbyBG">
                <div className="page">
                    <div className="LobbyTitle">ROOM LOBBY</div>
                    <div className="LobbySubTitle">{error || "Room not found"}</div>
                    <button className="btn" onClick={() => navigate(-1)}>
                        Back
                    </button>
                </div>
            </div>
        );
    }

    const currentPlayer =
        hostPlayer?.userId === currentUserId
            ? hostPlayer
            : guestPlayer?.userId === currentUserId
                ? guestPlayer
                : null;

    return (
        <div className="LobbyBackgroundLayout LobbyBG">
            <div className="page">
                <button
                    className="backBTN"
                    onClick={() => navigate(-1)}
                >
                    Back
                </button>

                <div className="LobbyHeader">
                    <div className="line"></div>

                    <div className="LobbyTitleSection">
                        <div className="LobbyTitle">ROOM LOBBY</div>
                        <div className="LobbySubTitle">
                            {lobbyStatus} {isConnected ? "" : "(connecting...)"}
                        </div>
                    </div>

                    <div className="line"></div>
                </div>

                <div className="roomInfo" onClick={handleCopy}>
                    <div className="roomNumber">Room Number</div>
                    <div className={`roomID ${copied ? "copied" : ""}`}>
                        {copied ? "COPIED!" : `#${room.roomId}`}
                    </div>
                </div>

                <div className="characterStage">
                    <span className="corner tr" />
                    <span className="corner bl" />
                    <div className="stageBG" />

                    <div className="characters">
                        <div className="character">
                            <img src="/player1.png" alt="player1" />
                            <div className="playerName">
                                {hostPlayer?.userName ?? "Waiting..."}
                            </div>
                        </div>

                        <div className={`character ${isSoloMode ? "" : guestPlayer?.ready ? "" : "disabled"}`}>
                            <img src="/player2.png" alt="player2" />
                            <div className="playerName">
                                {isSoloMode
                                    ? room.mode === "AUTO"
                                        ? "Bot"
                                        : "Bot"
                                    : guestPlayer?.userName ?? "Waiting..."}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="BottomSection">
                    <div className="ConfigWrapper">
                        <div className="BoxTitle">
                            <img src="/settingIcon.png" alt="config" className="TitleIcon" />
                            <span>Config</span>
                        </div>

                        <div className="ConfigBox">
                            <ConfigItem
                                icon={spawnCostIcon}
                                label="Spawn Cost"
                                value={room.config.spawnCost}
                                onChange={handleConfigChange("spawnCost")}
                                editable={editableConfig}
                                disabled={room.gameStarted}
                            />

                            <ConfigItem
                                icon={hexCostIcon}
                                label="Hex Cost"
                                value={room.config.hexPurchaseCost}
                                onChange={handleConfigChange("hexPurchaseCost")}
                                editable={editableConfig}
                                disabled={room.gameStarted}
                            />

                            <ConfigItem
                                icon={initialHPIcon}
                                label="Initial HP"
                                value={room.config.initHp}
                                onChange={handleConfigChange("initHp")}
                                editable={editableConfig}
                                disabled={room.gameStarted}
                            />

                            <ConfigItem
                                icon={initialBudgetIcon}
                                label="Initial Budget"
                                value={room.config.initBudget}
                                onChange={handleConfigChange("initBudget")}
                                editable={editableConfig}
                                disabled={room.gameStarted}
                            />

                            <ConfigItem
                                icon={turnBudgetIcon}
                                label="Turn Budget"
                                value={room.config.turnBudget}
                                onChange={handleConfigChange("turnBudget")}
                                editable={editableConfig}
                                disabled={room.gameStarted}
                            />

                            <ConfigItem
                                icon={interestPCTIcon}
                                label="Interest PCT"
                                value={room.config.baseInterestPct}
                                onChange={handleConfigChange("baseInterestPct")}
                                editable={editableConfig}
                                disabled={room.gameStarted}
                            />

                            <ConfigItem
                                icon={maxBudgetIcon}
                                label="Max Budget"
                                value={room.config.maxBudget}
                                onChange={handleConfigChange("maxBudget")}
                                editable={editableConfig}
                                disabled={room.gameStarted}
                            />

                            <ConfigItem
                                icon={maxTurnIcon}
                                label="Max Turns"
                                value={room.config.maxTurns}
                                onChange={handleConfigChange("maxTurns")}
                                editable={editableConfig}
                                disabled={room.gameStarted}
                            />

                            <ConfigItem
                                icon={maxSpawnsIcon}
                                label="Max Spawns"
                                value={room.config.maxSpawns}
                                onChange={handleConfigChange("maxSpawns")}
                                editable={editableConfig}
                                disabled={room.gameStarted}
                            />
                        </div>
                    </div>

                    <div className="InfoWrapper">
                        <div className="BoxTitle">
                            <img src="/infoIcon.png" alt="info" className="TitleIcon" />
                            <span>Info</span>
                        </div>

                        <div className="InfoBox">
                            <div className="infoRow">
                                <img src={playerIcon} alt="playerCount" className="infoIcon" />
                                <p className="infoValue">{playerCount}/{isSoloMode ? 1 : 2}</p>
                            </div>

                            <div className="infoRow">
                                <img src={player1Logo} alt="player1" className="infoIcon" />
                                <p className={`infoPlayerStatus ${hostPlayer?.ready ? "ready" : "waiting"}`}>
                                    {hostPlayer?.userName ?? "Waiting..."} : {hostPlayer?.ready ? "ready" : "waiting"}
                                </p>
                            </div>

                            <div className="infoRow">
                                <img src={player2Logo} alt="player2" className="infoIcon" />
                                <p className={`infoPlayerStatus ${isSoloMode ? "ready" : guestPlayer?.ready ? "ready" : "waiting"}`}>
                                    {isSoloMode
                                        ? "Bot : ready"
                                        : `${guestPlayer?.userName ?? "Waiting..."} : ${guestPlayer?.ready ? "ready" : "waiting"}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    className="btn"
                    onClick={handleToggleReady}
                    disabled={
                        actionLoading ||
                        room.gameStarted ||
                        !currentPlayer ||
                        (!isSoloMode && playerCount < 2)
                    }
                >
                    {currentPlayer?.ready ? "UNREADY" : "READY"}
                </button>

            </div>
        </div>
    );
}