import "./App.css";
import PuzzleGame from "./components/Puzzle";
import Brick from "./components/Bricks";
import Sidebar from "./layouts/Sidebar";
import GamePage from "./components/GamePage";
import { ToyBrick, Puzzle } from "lucide-react";
import { useState } from "react";

function App() {
  const [selectedGame, setSelectedGame] = useState(0);
  const games = [
    {
      game: <PuzzleGame />,
      description: "lorem ipsum",
      title: "PuzzleGame",
      icon: <Puzzle color="#5e606a" />,
    },
    {
      game: <Brick />,
      description: "lorem ipsum",
      title: "Brick",
      icon: <ToyBrick color="#5e606a" />,
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
      <GamePage gameSelected={games[selectedGame]} />
    </main>
  );
}

export default App;
