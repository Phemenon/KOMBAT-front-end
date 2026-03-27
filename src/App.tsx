import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WebsocketProvider } from "./context/WebsocketProvider.tsx";

import HomePage from "./pages/HomePage/HomePage.tsx";
import PlayPage from "./pages/PlayPage/PlayPage.tsx";
import LobbyPage from "./pages/LobbyPage/LobbyPage.tsx";
import SelectMinionPage from "./pages/SelectMinion/SelectMinion.tsx";
import GameScreen from "./pages/GameScreen/GameScreen.tsx";

function App() {
    return (
        <WebsocketProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/host-play" element={<PlayPage />} />
                    <Route path="/lobby/:roomId" element={<LobbyPage />} />
                    <Route path="/select/:roomId" element={<SelectMinionPage />} />
                    <Route path="/game/:roomId" element={<GameScreen />} />
                </Routes>
            </BrowserRouter>
        </WebsocketProvider>
    );
}

export default App;