import { useEffect, useRef, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { useRoom } from "../../contexts/RoomContext";
import { useRoomService } from "../../contexts/RoomServiceContext";
import {
  calculateScoreTransfer,
  determineWinner,
} from "../../utils/scoreTransfer";
import "../../styles/components/Puzzle/EndGameScreen.css";
import { useNavigate } from "react-router-dom";

interface Props {
  score: number;
  difficulty: { cols: number; rows: number };
  mode: string;
  onModeMenu: () => void;
}

export default function EndGameScreen({
  score,
  difficulty,
  mode,
  onModeMenu,
}: Props) {
  const navigate = useNavigate();
  const perfect = score === difficulty.cols * difficulty.rows;
  const reason = localStorage.getItem("reason");
  const diff =
    difficulty.cols === 16
      ? "easy"
      : difficulty.cols === 32
        ? "medium"
        : "hard";
  const { user, setUser } = useUser();
  const { roomId, isAdmin, handleStartGame, gameId } = useRoom();
  const roomService = useRoomService();
  const isMultiplayer = roomId;

  const [finalScore, setFinalScore] = useState(score);
  const [opponentScore, setOpponentScore] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [hasCalculated, setHasCalculated] = useState(false);
  const hasSentScoreRef = useRef(false);

  const onRestartGame = () => {
    if (isAdmin) {
      navigate(`/game/${gameId}`);
    }
  };

  // Step 1 & 2: Send our score and listen to the opponent
  useEffect(() => {
    if (!isMultiplayer || hasSentScoreRef.current) return;
    hasSentScoreRef.current = true;

    console.log("[Puzzle EndGameScreen] Sending score:", score);
    roomService.sendGameEndScore(score, "PUZZLE", diff);

    const handleOpponentScore = (data: {
      opponentScore: number;
      game: string;
      difficulty: string;
    }) => {
      console.log("[EndGame] Opponent score received:", data.opponentScore);

      const { winner, loser, draw } = determineWinner(
        score,
        data.opponentScore,
      );

      if (draw) {
        setFinalScore(score);
        setOpponentScore(data.opponentScore);
        setResultMessage("TIE - No point transfer");
      } else {
        const { winner: finalWinner, loser: finalLoser } =
          calculateScoreTransfer(winner, loser);

        if (score === winner) {
          setFinalScore(finalWinner);
          setResultMessage(`VICTORY! +${finalWinner - score} points`);
        } else {
          setFinalScore(finalLoser);
          setResultMessage(`LOSE... -${score - finalLoser} points`);
        }
        setOpponentScore(data.opponentScore);
      }
      setHasCalculated(true);
    };

    roomService.setGameEndScoreListener(handleOpponentScore);
  }, []);

  // Step 3: Send the final score to the server
  useEffect(() => {
    // Wait for the calculation to be done in multiplayer, or directly in solo
    const readyToSend =
      !isMultiplayer ||
      (isMultiplayer && hasSentScoreRef.current && hasCalculated);

    if (!readyToSend) return;

    const token = localStorage.getItem("sessionToken");

    fetch("/api-node/endgame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token,
        SQLid: user?.SQL_id ?? -1,
        game: "PUZZLE",
        mode: isMultiplayer ? "DUPLICATE" : "SOLO",
        difficulty: diff,
        points: finalScore,
      }),
    })
      .then((r) => r.json())
      .then((player) => {
        if (!player) return;

        localStorage.setItem("sessionToken", player.sessionToken ?? token);
        localStorage.setItem("user", JSON.stringify(player));

        setUser({
          id: player.id ?? user?.id ?? -1,
          SQL_id: player.SQL_id ?? user?.SQL_id ?? -1,
          sessionToken: player.sessionToken ?? token,
          games: player.games ?? [],
        });
      })
      .catch((err) => console.error("Error saving score:", err));
    console.log("Set score");
  }, [finalScore, isMultiplayer, hasCalculated, diff]);

  return (
    <div className="ending-overlay">
      <div className="ending-panel">
        <div className="ending-panel-inner">
          <div className={"ending-header win"}>
            {perfect ? "PERFECT!" : "GAME CLEAR"}
          </div>

          <div className="ending-plate">
            <div className="ending-plate-inner">
              <div className="plate-content">
                <div className={perfect ? "plate-msg win" : "plate-msg lose"}>
                  {reason}
                </div>

                <div className="plate-sep" />

                <div className="plate-row">
                  <span className="plate-key">SCORE</span>
                  <span className="plate-val big">
                    {String(finalScore).padStart(4, "0")}/
                    {String(difficulty.cols * difficulty.rows).padStart(4, "0")}
                  </span>
                </div>

                {isMultiplayer && opponentScore !== null && (
                  <>
                    <div className="plate-sep" />
                    <div className="plate-row">
                      <span className="plate-key">OPPONENT</span>
                      <span className="plate-val">{opponentScore}</span>
                    </div>
                    <div className="plate-row">
                      <span className="plate-msg">{resultMessage}</span>
                    </div>
                  </>
                )}

                <div className="plate-sep" />

                <div className="plate-row">
                  <span className="plate-key">DIFF</span>
                  <span className={`plate-diff plate-diff-${diff}`}>
                    {diff.toUpperCase()}
                  </span>
                </div>
                <div className="plate-row">
                  <span className="plate-key">MODE</span>
                  <span className="plate-val">
                    {isMultiplayer ? "MULTIPLAYER" : mode}
                  </span>
                </div>

                <div className="plate-sep" />

                <div className="plate-hi">
                  {perfect ? "★ PERFECT SCORE ★" : "★ BETTER LUCK NEXT TIME ★"}
                </div>
              </div>
            </div>
          </div>

          {(!isMultiplayer || isAdmin) && (
            <div className="ending-footer">
              <button
                className="retry-btn"
                onClick={
                  !isMultiplayer
                    ? onModeMenu
                    : () => handleStartGame(onRestartGame)
                }
              >
                <span className="btn-cursor">▮</span>MAIN MENU
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
