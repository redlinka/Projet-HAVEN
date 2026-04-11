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
    console.log("[Reconnect] Checking room session...");
    const session = RoomSessionService.load();
    if (!session) {
      console.log(
        "[Reconnect] No session found, reconnection not necessary",
      );
      return;
    }

    console.log("[Reconnect] Session found, attempting reconnection...");

    roomService
      .rejoinRoom(session.userName, session.roomId, session.gameId)
      .then(({ users, isAdmin, gameStarted, difficulty }) => {
        console.log("[Reconnect] Reconnection successful");
        setIsAdmin(isAdmin);
        if (difficulty) setDifficulty(difficulty);
        setGameId(session.gameId);
        handleRoomJoined(session.userName, users, session.gameId, isAdmin);
        // Redirect to the correct page
        if (gameStarted) {
          navigate(`/game/${session.gameId}`);
        } else {
          navigate(`/game/${session.gameId}/lobby`);
        }
      })
      .catch((err) => {
        console.log("[Reconnect] Failed:", err.message);
        RoomSessionService.clear(); // invalid session -> clear
      });
  }, []);
}
