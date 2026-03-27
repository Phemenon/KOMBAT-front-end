import { useState, useEffect } from "react";
import "../globalStyle.css";

interface NameModalProps {
    isOpen: boolean;
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

function NameModal({ isOpen, onConfirm, onCancel }: NameModalProps) {
    const [name, setName] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2 className="modal-title">ENTER YOUR NAME</h2>

                <input
                    type="text"
                    className="modal-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && name.trim()) {
                            onConfirm(name);
                        }
                    }}
                    placeholder="Type your name here"
                    autoFocus
                />

                <div className="modal-actions">
                    <button
                        className="btn-confirm"
                        disabled={!name.trim()}
                        onClick={() => onConfirm(name)}
                    >
                        CONFIRM
                    </button>

                    <button
                        className="btn-cancel"
                        onClick={onCancel}
                    >
                        CANCEL
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NameModal;