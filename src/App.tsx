import "./App.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState} from "react"
import { ToyBrick, Puzzle } from "lucide-react";
import {getSession} from "./api/session";

import Sidebar from "./layouts/Sidebar";

// Pages
import GamePage from "./components/GamePage";
import HomePage from "./components/HomePage";

// Games
import BlockScene from "./components/BrickBlast/BlockBlast";
import PuzzleGame from "./components/Puzzle/PuzzleGame";

function App() {
  const [user, setUser] = useState<{id:number, username:string} | null>(null);

  useEffect(() => {
    getSession()
      .then(data => setUser(data))
      .catch(err => console.error("Erreur fetch session:", err));
  }, []);


  localStorage.setItem("user",JSON.stringify(user));

  const games = [
    {
      game: <PuzzleGame />,
      description: "lorem ipsum",
      title: "PuzzleGame",
      icon: <Puzzle color="#5e606a" />,
      img: "/img/LegoPuzzle.png",
    },
    {
      game: <BlockScene />,
      description: "lorem ipsum",
      title: "Brick Blast",
      icon: <ToyBrick color="#5e606a" />,
      img: "/img/BrickBlast.png",
    },
  ];
  return (
    <BrowserRouter>
      <main className="app">
        <div className="bg" />
        <Sidebar games={games} />

        <div className="app-content">
          <div className="top">
            <Link to="/" className="main-title">
              Haven <span>Games</span>
            </Link>
          </div>
          <Routes>
            <Route path="/" element={<HomePage games={games} />} />
            <Route path="/game/:id" element={<GamePage games={games} />} />
          </Routes>
        </div>
      </main>
    </BrowserRouter>
  );
}

export default App;
