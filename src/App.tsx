import "./App.css";
import PuzzleGame1 from "./components/Puzzle/Puzzle";
import PuzzleGame2 from "./components/Puzzle/PuzzleGame";
import Sidebar from "./layouts/Sidebar";
import GamePage from "./components/GamePage";
import HomePage from "./components/HomePage";
import { ToyBrick, Puzzle } from "lucide-react";
import { useState } from "react";

function App() {
  const [selectedGame, setSelectedGame] = useState(-1); // -1 = Home page
  const games = [
    {
      game: <PuzzleGame1 />,
      description: "lorem ipsum",
      title: "PuzzleGame",
      icon: <Puzzle color="#5e606a" />,
      img: "/img/LegoPuzzle.png",
    },
    {
      game: <PuzzleGame2 />,
      description: "lorem ipsum",
      title: "Brick",
      icon: <ToyBrick color="#5e606a" />,
      img: "/img/BrickBlast.png",
    },
  ];
  return (
    <main className="app">
      {/* <Brick /> */}
      <div className="bg" />
      <Sidebar
        games={games}
        handleOnClick={(i: number) => setSelectedGame(i)}
      />

      <div className="app-content">
        <div className="top">
          <h1 onClick={() => setSelectedGame(-1)}>
            Haven <span>Games</span>
          </h1>
        </div>
        {selectedGame === -1 ? (
          <HomePage
            games={games}
            handleOnClick={(i: number) => setSelectedGame(i)}
          />
        ) : (
          <GamePage gameSelected={games[selectedGame]} />
        )}
      </div>
    </main>
  );
}

export default App;
