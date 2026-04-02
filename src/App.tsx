import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
  const [user, setUser] = useState<any>(null);
  const [chatManager] = useState(() => new WebSocketRoomService());

  useEffect(() => {
    getSession()
      .then(async (phpData) => {
        const localToken = localStorage.getItem("sessionToken");

        if (phpData) {
          //USER CONNECTED AT BRICKSY
          try {
            const response = await fetch(`/api-node/player?SQLid=${phpData.id}`);
            const mongoPlayer = await response.json();

            if (mongoPlayer?.sessionToken) {
              localStorage.setItem("sessionToken", mongoPlayer.sessionToken);
              setUser({ ...phpData, ...mongoPlayer });
            } else {
              setUser(phpData);
            }
          } catch (err) {
            setUser(phpData);
          }
        } 
        else if (localToken) {
          // GUEST WITH TOKEN
          try {
            const response = await fetch(`/api-node/player`, {
              headers: { 'Authorization': `Bearer ${localToken}` }
            });
            const guestData = await response.json();
            if (guestData) setUser(guestData);
          } catch (err) {
            setUser(null);
          }
        } 
        // GUEST FIRST TIME
        else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  console.log(user);

  return (
    <BrowserRouter>
      <BackgroundStars>
        <Navbar games={games} user={user} />
        <div className="app-content">
          <RoomServiceContext.Provider value={chatManager}>
            <RoomProvider>
              <Routes>
                <Route path="/" element={<HomePage games={games} />} />
                <Route path="/game/:id" element={<GamePage games={games} />} />
                <Route path="/game/:id/lobby" element={<GameLobbyPage games={games} />} />
                <Route path="/history" element={<History />} />
              </Routes>
            </RoomProvider>
          </RoomServiceContext.Provider>
        </div>
      </BackgroundStars>
    </BrowserRouter>
  );
}

export default App;