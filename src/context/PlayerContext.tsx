import { createContext, useContext, useState } from "react";

interface Player {
    id: string;
    name: string;
}

interface PlayerContextType {
    player: Player | null;
    setPlayer: (player: Player | null) => void;
}

// create context
const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// provider
export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [player, setPlayer] = useState<Player | null>(null);

    return (
        <PlayerContext.Provider value={{ player, setPlayer }}>
            {children}
        </PlayerContext.Provider>
    );
}

// custom hook
export function usePlayer() {
    const context = useContext(PlayerContext);

    if (!context) {
        throw new Error("usePlayer must be used within PlayerProvider");
    }

    return context;
}