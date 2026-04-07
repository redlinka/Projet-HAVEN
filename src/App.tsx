import "./App.css";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ToyBrick, Puzzle } from "lucide-react";
import { getSession } from "./api/session";

import Navbar from "./layouts/Navbar";
import BackgroundStars from "./components/BackgroundStars";

import GamePage from "./components/GamePage";
import HomePage from "./components/HomePage";
import History from "./components/History";

import BrickScene from "./components/BrickBlast/BrickBlast";
import PuzzleGame from "./components/Puzzle/PuzzleGame";

import GameLobbyPage from "./components/GameLobby/Gamelobbypage";

import { RoomServiceContext } from "./contexts/RoomServiceContext";
import { WebSocketRoomService } from "./services/WebSocketRoomService";
import { RoomProvider } from "./contexts/RoomContext";

import type { User } from "./types/types";
import { UserContext } from "./contexts/UserContext";
import { useRoomReconnect } from "./hooks/useRoomReconnect";

const games = [
  {
    game: <PuzzleGame />,
    description: "",
    title: "PuzzleGame",
    icon: <Puzzle />,
    img: `${import.meta.env.BASE_URL}img/LegoPuzzle.png`,
  },
  {
    game: <BrickScene />,
    description: "",
    title: "Brick Blast",
    icon: <ToyBrick />,
    img: `${import.meta.env.BASE_URL}img/BrickBlast.png`,
  },
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [chatManager] = useState(() => new WebSocketRoomService());

  useEffect(() => {
  const initUser = async () => {
    try {
      const phpData = await getSession();
      const localToken = localStorage.getItem("sessionToken");

      let url = "/api-node/player";
      let options: RequestInit = {};

      if (localToken) {
        options.headers = { Authorization: `Bearer ${localToken}` };
      }

      // USER CONNECTED IN BRICKSY
      if (phpData?.id && phpData.id !== -1) {
        url += `?SQLid=${phpData.id}`;
      }

      const response = await fetch(url, options);
      const playerData = await response.json();

      // IF NO PLAYER DATA, we clear everything
      if (!playerData) {
        localStorage.removeItem("sessionToken");
        localStorage.removeItem("user");
        setUser({ id: -1, SQL_id: -1, sessionToken: null, games: [] });
        return;
      }


      // IF PLAYER DATA EXISTS, we save token and set user
      if (playerData.sessionToken) {
        localStorage.setItem("sessionToken", playerData.sessionToken);
      }

      setUser({
        id: phpData?.id ?? -1,
        SQL_id: playerData.SQL_id ?? (phpData?.id ?? -1),
        sessionToken: playerData.sessionToken ?? localToken,
        games: playerData.games ?? [],
      });

    } catch (err) {
      console.error("Error initializing user:", err);
      setUser({ id: -1, SQL_id: -1, sessionToken: null, games: [] });
    }
  };

  initUser();
}, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <BrowserRouter basename="/games">
        <BackgroundStars>
          <RoomServiceContext.Provider value={chatManager}>
            <RoomProvider>
              <Navbar games={games} />
              <div className="app-content">
                <AppRoutes />
              </div>
            </RoomProvider>
          </RoomServiceContext.Provider>
        </BackgroundStars>
      </BrowserRouter>
    </UserContext.Provider>
  );
}

export default App;

const AppRoutes = () => {
  useRoomReconnect();

  return (
    <Routes>
      <Route path="/" element={<HomePage games={games} />} />
      <Route path="/game/:id" element={<GamePage games={games} />} />
      <Route path="/game/:id/lobby" element={<GameLobbyPage games={games} />} />
      <Route path="/history" element={<History />} />
    </Routes>
  );
};
