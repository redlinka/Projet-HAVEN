import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { ToyBrick, Puzzle } from "lucide-react";
import { getSession } from "./api/session";

import Navbar from "./layouts/Navbar";
import BackgroundStars from "./components/BackgroundStars";

// Pages
import GamePage from "./components/GamePage";
import HomePage from "./components/HomePage";
import History from "./components/History";


// Games
import BrickScene from "./components/BrickBlast/BrickBlast";
import PuzzleGame from "./components/Puzzle/PuzzleGame";

// Game lobby
import GameLobbyPage from "./components/GameLobby/Gamelobbypage";

// Context
import { RoomServiceContext } from "./contexts/RoomServiceContext";
import { WebSocketRoomService } from "./services/WebSocketRoomService";
import { RoomProvider } from "./contexts/RoomContext";

const games = [
  {
    game: <PuzzleGame />,
    description: "",
    title: "PuzzleGame",
    icon: <Puzzle />,
    img: "/img/LegoPuzzle.png",
  },
  {
    game: <BrickScene />,
    description: "",
    title: "Brick Blast",
    icon: <ToyBrick />,
    img: "/img/BrickBlast.png",
  },
];

function App() {
  const [user, setUser] = useState<{ id: number; username: string } | null>(
    null,
  );

  // Création d'un seul ChatManager partagé pour tout l'app
  const [chatManager] = useState(() => new WebSocketRoomService());

  useEffect(() => {
    getSession()
      .then((data) => setUser(data))
      .catch((err) => console.error("Erreur fetch session:", err));
  }, []);

  useEffect(() => {
    localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  return (
    <BrowserRouter>
      <BackgroundStars>
        <Navbar games={games} />

        <div className="app-content">
          <RoomServiceContext.Provider value={chatManager}>
            <RoomProvider>
              <Routes>
                <Route path="/" element={<HomePage games={games} />} />
                <Route path="/game/:id" element={<GamePage games={games} />} />
                <Route path="/game/:id/lobby" element={<GameLobbyPage games={games} />}/>
                <Route path="/history" element={<History/>}/>

              </Routes>
            </RoomProvider>
          </RoomServiceContext.Provider>
        </div>
      </BackgroundStars>
    </BrowserRouter>
  );
}

export default App;
