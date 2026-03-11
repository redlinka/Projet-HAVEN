import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToyBrick, Puzzle } from "lucide-react";

import Navbar from "./layouts/Navbar";
import BackgroundStars from "./components/BackgroundStars";

// Pages
import GamePage from "./components/GamePage";
import HomePage from "./components/HomePage";

// Games
import BlockScene from "./components/BrickBlast/BlockBlast";
import PuzzleGame from "./components/Puzzle/PuzzleGame";

function App() {
  const games = [
    {
      game: <PuzzleGame />,
      description: "lorem ipsum",
      title: "PuzzleGame",
      icon: <Puzzle />,
      img: "/img/LegoPuzzle.png",
    },
    {
      game: <BlockScene />,
      description: "lorem ipsum",
      title: "Brick Blast",
      icon: <ToyBrick />,
      img: "/img/BrickBlast.png",
    },
  ];

  return (
    <BrowserRouter>
      <BackgroundStars>
        <Navbar games={games} />

        <div className="app-content">
          <Routes>
            <Route path="/" element={<HomePage games={games} />} />
            <Route path="/game/:id" element={<GamePage games={games} />} />
          </Routes>
        </div>
      </BackgroundStars>
    </BrowserRouter>
  );
}

export default App;
