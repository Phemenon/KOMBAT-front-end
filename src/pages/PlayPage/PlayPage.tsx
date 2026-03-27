import { useNavigate } from "react-router-dom";
import ModeSelect from "../../components/ModeSelect.tsx";
import JoinPopup from "../../components/JoinPopup.tsx";
import { useState } from "react";
import { API_BASE } from "../../config/apiConfig.ts";
import "../../globalStyle.css";
import "../PlayPage/PlayPageStyle.css";

export default function PlayPage() {
    const navigate = useNavigate();

    const [showPopup, setShowPopup] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const currentUserId = sessionStorage.getItem("userId") ?? "";
    const currentUserName = sessionStorage.getItem("userName") ?? "";

    const handleCreateRoom = async (mode: string) => {
        if (!currentUserId) {
            alert("User not found");
            navigate("/");
            return;
        }

        try {
            setIsLoading(true);

            const res = await fetch(`${API_BASE}/room/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    hostId: currentUserId,
                    userName: currentUserName,
                    mode,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to create room");
            }

            const room = await res.json();
            console.log("create room response =", room);
            navigate(`/lobby/${room.roomId}`);
        } catch (error) {
            console.error(error);
            alert("Cannot create room");
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async (roomId: string) => {
        if (!currentUserId) {
            alert("User not found");
            navigate("/");
            return;
        }

        try {
            setIsLoading(true);

            const res = await fetch(`${API_BASE}/room/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    roomId,
                    userId: currentUserId,
                    userName: currentUserName,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to join room");
            }

            const room = await res.json();
            console.log("JoinPopup roomId =", roomId);
            navigate(`/lobby/${room.roomId}`);
        } catch (error) {
            console.error(error);
            alert("Cannot join room");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="backgroundLayout playBg">
            <button
                className="backBTN"
                onClick={() => navigate(-1)}
                disabled={isLoading}
            >
                Back
            </button>

            <div className="topBar">
                <div className="subTitle">
                    <h1>KOMBAT</h1>
                </div>
            </div>

            <div className="homeContent">
                <div className="homeMenu">
                    <button
                        className="btn"
                        onClick={() => setShowPopup(true)}
                        disabled={isLoading}
                    >
                        Create
                    </button>

                    {showPopup && (
                        <ModeSelect
                            onCancel={() => setShowPopup(false)}
                            onSelect={async (mode: string) => {
                                setShowPopup(false);
                                await handleCreateRoom(mode);
                            }}
                        />
                    )}

                    <button
                        className="btn"
                        onClick={() => setShowJoin(true)}
                        disabled={isLoading}
                    >
                        Join
                    </button>

                    {showJoin && (
                        <JoinPopup
                            onCancel={() => setShowJoin(false)}
                            onConfirm={async (roomId: string) => {
                                console.log("JoinPopup roomId =", roomId);
                                setShowJoin(false);
                                await handleJoinRoom(roomId);
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}