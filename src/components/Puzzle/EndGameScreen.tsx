import { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { useRoom } from "../../contexts/RoomContext";
import { useRoomService } from "../../contexts/RoomServiceContext";
import {
  calculateScoreTransfer,
  determineWinner,
} from "../../utils/scoreTransfer";
import "../../styles/components/Puzzle/EndGameScreen.css";

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
  const perfect = score === difficulty.cols * difficulty.rows;
  const reason = localStorage.getItem("reason");
  console.log("la raison est " + reason);
  const diff =
    difficulty.cols === 16
      ? "easy"
      : difficulty.cols === 32
        ? "medium"
        : "hard";
  const { user, setUser } = useUser();
  const { connectedUsers } = useRoom();
  const roomService = useRoomService();
  const isMultiplayer = connectedUsers.length >= 2;

  const [finalScore, setFinalScore] = useState(score);
  const [opponentScore, setOpponentScore] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [hasCalculated, setHasCalculated] = useState(false);

  // Étape 1: Envoyer notre score et attendre le score adverse
  useEffect(() => {
    if (!isMultiplayer || hasCalculated) return;

    // Envoyer notre score
    roomService.sendGameEndScore(score, "PUZZLE", diff);

    // Écouter le score adverse
    const handleOpponentScore = (data: {
      opponentScore: number;
      game: string;
      difficulty: string;
    }) => {
      console.log("[Puzzle EndGameScreen] Score adverse:", data.opponentScore);
      setOpponentScore(data.opponentScore);

      // Calculer le transfert
      const { winner, loser } = determineWinner(score, data.opponentScore);
      const { winner: finalWinner, loser: finalLoser } = calculateScoreTransfer(
        winner,
        loser,
        0.25,
      );

      // Déterminer si nous avons gagné
      if (score === winner) {
        setFinalScore(finalWinner);
        setResultMessage(
          `VICTOIRE! +${finalWinner - score} points reçus du perdant`,
        );
      } else if (score === loser) {
        setFinalScore(finalLoser);
        setResultMessage(
          `DÉFAITE... -${score - finalLoser} points perdus au gagnant`,
        );
      }

      setHasCalculated(true);
    };

    roomService.setGameEndScoreListener(handleOpponentScore);
  }, [isMultiplayer, hasCalculated, score, diff]);

  // Étape 2: Envoyer le score final au serveur
  useEffect(() => {
    // Attendre que le calcul soit terminal pour les multijoueur, ou de suite pour solo
    const readyToSend =
      !isMultiplayer ||
      (isMultiplayer && hasCalculated && opponentScore !== null);

    if (!readyToSend) return;

    const token = localStorage.getItem("sessionToken");

    fetch("/api-node/endgame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token,
        SQLid: user?.SQL_id ?? -1,
        game: "PUZZLE",
        mode: isMultiplayer ? "MULTIPLAYER" : "SOLO",
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
  }, [finalScore, isMultiplayer, hasCalculated, opponentScore, diff]);

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

          <div className="ending-footer">
            <button className="retry-btn" onClick={onModeMenu}>
              <span className="btn-cursor">▮</span>MAIN MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
