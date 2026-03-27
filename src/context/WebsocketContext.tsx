import { createContext } from "react";
import type { Client } from "@stomp/stompjs";

export interface WebsocketState {
    client: Client | null;
    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;
}

export const WebsocketContext = createContext<WebsocketState | null>(null);