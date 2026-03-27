import { useState } from "react";

type Props = {
    onCancel: () => void;
    onConfirm: (roomId: string) => void;
};

export default function JoinPopup({ onCancel, onConfirm }: Props) {
    const [roomId, setRoomId] = useState("");

    return (
        <div className="modalOverlay">
            <div className="modalBox">
                <div className="joinContext">
                    <h1 className="modelTitle">Room ID</h1>

                    <input
                        className="hostInput"
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                    />

                    <div className="btnGroup">
                        <button className="joinCancleBtn" onClick={onCancel}>
                            Cancel
                        </button>

                        <button
                            className="joinConfirmBtn"
                            onClick={() => {
                                if (!roomId.trim()) {
                                    alert("Please enter room ID");
                                    return;
                                }

                                onConfirm(roomId.trim());
                            }}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}