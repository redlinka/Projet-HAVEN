import { useState } from "react";
import { useRoomService } from "../../contexts/RoomServiceContext";
import RoomForm from "./RoomForm";
import "../../styles/components/Room/RoomJoiner.css";
import { useParams } from "react-router-dom";

interface RoomJoinerProps {
  /** Appelé quand le salon est rejoint avec succès ; users = joueurs déjà présents */
  onRoomJoined: (userName: string, users: string[]) => void;
  /** Appelé en cas d'erreur */
  onError: (error: string) => void;
  /** Appelé au départ de la requête */
  onConnecting: () => void;
  /** Pré-remplissage du code (ex : transmis via URL) */
  initialRoomId?: string;
}

export default function RoomJoiner({
  onRoomJoined,
  onError,
  onConnecting,
  initialRoomId = "",
}: RoomJoinerProps) {
  const roomService = useRoomService();
  const [userName, setUserName] = useState("");
  const [roomId, setRoomId] = useState(initialRoomId);
  const [isLoading, setIsLoading] = useState(false);
  const { id: gameId } = useParams();

  const handleSubmit = async ({
    userName: name,
    roomCode,
  }: {
    userName: string;
    roomCode?: string;
  }) => {
    setIsLoading(true);
    onConnecting();

    try {
      const existingUsers = await roomService.joinRoom(
        name,
        roomCode || "",
        gameId || "",
      );
      onRoomJoined(name, existingUsers);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible de rejoindre le salon";
      onError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="room-joiner">
      <RoomForm
        title="Rejoindre une partie"
        icon="🎯"
        description="Entrez le code transmis par votre adversaire"
        userName={userName}
        onUserNameChange={setUserName}
        roomCode={roomId}
        onRoomCodeChange={setRoomId}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        submitButtonText="Rejoindre la partie"
        showRoomCode
      />
    </div>
  );
}
