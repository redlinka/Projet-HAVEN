import { useState } from "react";
import { useRoomService } from "../../contexts/RoomServiceContext";
import RoomForm from "./RoomForm";
import "../../styles/components/Room/RoomCreator.css";
import { useParams } from "react-router-dom";

interface RoomCreatorProps {
  /** Called when the room is created successfully */
  onRoomCreated: (userName: string, roomId: string, gameId: string) => void;
  /** Called in case of connection error */
  onError: (error: string) => void;
  /** Called when the request starts (to display a global loading state) */
  onConnecting: () => void;
}

export default function RoomCreator({
  onRoomCreated,
  onError,
  onConnecting,
}: RoomCreatorProps) {
  const roomService = useRoomService();
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { id: gameId } = useParams();

  const handleSubmit = async ({ userName: name }: { userName: string }) => {
    setIsLoading(true);
    onConnecting();

    try {
      const roomId = await roomService.createRoom(name, gameId || "");
      onRoomCreated(name, roomId, gameId ?? "");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la création du salon";
      onError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="room-creator">
      <RoomForm
        title="Create a room"
        icon="👑"
        description="Generate a code & invite your opponents"
        userName={userName}
        onUserNameChange={setUserName}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        submitButtonText="Create the room"
      />
    </div>
  );
}
