import { useContext } from "react";
import { WebsocketContext } from "../context/WebsocketContext.tsx";
import type { WebsocketState } from "../context/WebsocketContext.tsx";

export function useWebsocket(): WebsocketState {
    const context = useContext(WebsocketContext);

    if (!context) {
        throw new Error("useWebsocket must be used inside WebsocketProvider");
    }

    return context;
}