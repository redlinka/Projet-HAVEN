import "./App.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import PuzzleGame from "./components/Puzzle/PuzzleGame";
import Sidebar from "./layouts/Sidebar";
import GamePage from "./components/GamePage";
import HomePage from "./components/HomePage";
import { ToyBrick, Puzzle } from "lucide-react";
import { useState } from "react";
import BlockScene from "./components/BrickBlast/BlockBlast";

function App() {
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
