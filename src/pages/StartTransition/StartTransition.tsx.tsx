import React, { useEffect, useState } from 'react';
import './StartTransitionStyle.css';
import startBg from '../../assets/Gamestart.png';

interface StartTransitionProps {
    onComplete: () => void;
}

const StartTransition: React.FC<StartTransitionProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState<"intro" | "countdown" | "ready" | "fade">("intro");
    const [count, setCount] = useState(3);

    useEffect(() => {
        // 🎧 sound (optional)
        const audio = new Audio("/start.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});

        const t1 = setTimeout(() => setPhase("countdown"), 800);

        const countdownInterval = setInterval(() => {
            setCount(prev => {
                if (prev === 1) {
                    clearInterval(countdownInterval);
                    setPhase("ready");
                    return 1;
                }
                return prev - 1;
            });
        }, 500);

        const t2 = setTimeout(() => setPhase("fade"), 2300);
        const t3 = setTimeout(() => onComplete(), 2700);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearInterval(countdownInterval);
        };
    }, [onComplete]);

    return (
        <div className={`transition-overlay ${phase}`}>
            <div
                className={`transition-content ${phase === "ready" ? "shake" : ""}`}
                style={{ backgroundImage: `url(${startBg})` }}
            >
                {/* เอฟเฟกต์ */}
                <div className="glitch-layer" />
                <div className="scanline" />
                <div className="light-sweep" />
                <div className={`flash ${phase === "ready" ? "active" : ""}`} />

                {/* PARTICLES */}
                {phase === "ready" && <div className="particles" />}

                {/* TEXT */}
                <div className="transition-text">
                    {phase === "intro" && <h1>INITIALIZING</h1>}

                    {phase === "countdown" && (
                        <h1 className="count">{count}</h1>
                    )}

                    {phase === "ready" && (
                        <h1 className="ready-text">READY</h1>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StartTransition;