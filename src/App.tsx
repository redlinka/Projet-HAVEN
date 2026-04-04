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

import type {User} from "./types/types";
import { UserContext } from "./contexts/UserContext";

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
  getSession()
    .then(async (phpData) => {
      const localToken = localStorage.getItem("sessionToken");

      // USER CONNECTED IN BRICKSY
      if (phpData?.id && phpData.id !== -1) {
        try {
          const response = await fetch(`/api-node/player?SQLid=${phpData.id}`);
          const mongoPlayer = await response.json();

          if (mongoPlayer?.sessionToken) {
            localStorage.setItem("sessionToken", mongoPlayer.sessionToken);

            setUser({id: phpData.id, SQL_id: mongoPlayer.SQL_id ?? phpData.id, sessionToken: mongoPlayer.sessionToken ?? null, games: mongoPlayer.games ?? []});

          } else {
            setUser({id: phpData.id, SQL_id: phpData.id, sessionToken: null, games: []});
          }
        } catch {
          setUser({id: phpData.id, SQL_id: phpData.id, sessionToken: null, games: []});
        }

      } 

      // GUEST WITH TOKEN
      else if (localToken) {
        try {
          const response = await fetch(`/api-node/player`, {
            headers: { Authorization: `Bearer ${localToken}` },
          });
          const guestData = await response.json();

          setUser({id: -1, SQL_id: guestData?.SQL_id ?? null, sessionToken: guestData?.sessionToken ?? localToken, games: guestData?.games ?? []});

        } catch {
          setUser({ id: -1, SQL_id: -1, sessionToken: localToken, games: []});
        }

      } 
      // NEW GUEST 
      else {
        setUser({id: -1, SQL_id: -1, sessionToken: null, games: [],});
      }
    })
    .catch(() =>
      setUser({id: -1, SQL_id: -1, sessionToken: null, games: []})
    );
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
  <UserContext.Provider value={{ user, setUser }}>
    <BrowserRouter basename="/games">
      <BackgroundStars>
        <Navbar games={games}/>
  
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
  </UserContext.Provider>
  );
}

export default App;
