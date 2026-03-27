import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { API_BASE } from "../config/apiConfig.ts";
import { WebsocketContext } from "./WebsocketContext.tsx";

export function WebsocketProvider({ children }: { children: ReactNode }) {
    const clientRef = useRef<Client | null>(null);
    const connectingRef = useRef(false);

    const [client, setClient] = useState<Client | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const connect = useCallback(() => {
        if (clientRef.current?.active || clientRef.current?.connected || connectingRef.current) {
            return;
        }

        connectingRef.current = true;

        const stompClient = new Client({
            webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log("WebSocket connected");
                connectingRef.current = false;
                clientRef.current = stompClient;
                setClient(stompClient);
                setIsConnected(true);
            },
            onDisconnect: () => {
                console.log("WebSocket disconnected");
                connectingRef.current = false;
                clientRef.current = null;
                setClient(null);
                setIsConnected(false);
            },
            onStompError: (frame) => {
                console.error("STOMP error:", frame.headers["message"]);
                console.error("Details:", frame.body);
                connectingRef.current = false;
                clientRef.current = null;
                setClient(null);
                setIsConnected(false);
            },
            onWebSocketClose: () => {
                connectingRef.current = false;
                clientRef.current = null;
                setClient(null);
                setIsConnected(false);
            },
            onWebSocketError: (event) => {
                console.error("WebSocket error:", event);
                connectingRef.current = false;
                clientRef.current = null;
                setClient(null);
                setIsConnected(false);
            },
        });

        clientRef.current = stompClient;
        setClient(stompClient);
        stompClient.activate();
    }, []);

    const disconnect = useCallback(() => {
        const currentClient = clientRef.current;
        if (!currentClient) return;

        clientRef.current = null;
        connectingRef.current = false;
        setClient(null);
        setIsConnected(false);

        void currentClient.deactivate();
    }, []);

    const value = useMemo(
        () => ({
            client,
            isConnected,
            connect,
            disconnect,
        }),
        [client, isConnected, connect, disconnect]
    );

    return (
        <WebsocketContext.Provider value={value}>
            {children}
        </WebsocketContext.Provider>
    );
}