import { useNavigate } from "react-router-dom";
import { useRoomService } from "../contexts/RoomServiceContext";
import { useEffect } from "react";
import { RoomSessionService } from "../services/RoomSession";
import { useRoom } from "../contexts/RoomContext";

export function useRoomReconnect() {
  const roomService = useRoomService();
  const { handleRoomJoined, setIsAdmin, setDifficulty, setGameId } = useRoom();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[Reconnect] Vérification de session de room en cours...");
    const session = RoomSessionService.load();
    if (!session) {
      console.log(
        "[Reconnect] Aucune session trouvée, pas de reconnexion nécessaire",
      );
      return;
    }

    console.log("[Reconnect] Session trouvée, tentative de reconnexion...");

    roomService
      .rejoinRoom(session.userName, session.roomId, session.gameId)
      .then(({ users, isAdmin, gameStarted, difficulty }) => {
        console.log("[Reconnect] Reconnexion réussie");
        setIsAdmin(isAdmin);
        if (difficulty) setDifficulty(difficulty);
        setGameId(session.gameId);
        handleRoomJoined(session.userName, users, session.gameId, isAdmin);
        // Redirige vers la bonne page
        if (gameStarted) {
          navigate(`/game/${session.gameId}`);
        } else {
          navigate(`/game/${session.gameId}/lobby`);
        }
      })
      .catch((err) => {
        console.log("[Reconnect] Échec :", err.message);
        RoomSessionService.clear(); // session invalide -> efface
      });
  }, []);
}
