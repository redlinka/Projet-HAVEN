import { useState } from "react";
import { useRoomService } from "../../contexts/RoomServiceContext";
import RoomForm from "./RoomForm";
import "../../styles/components/Room/RoomJoiner.css";
import { useParams } from "react-router-dom";

interface RoomJoinerProps {
  /** Called when room is joined successfully, users = players already in the room**/
  onRoomJoined: (
    userName: string,
    users: string[],
    gameId: string,
    isAdmin: boolean | false,
  ) => void;
  /** Called in case of error */
  onError: (error: string) => void;
  /** Called when the request starts */
  onConnecting: () => void;
  /** Pre-fill the code (eg: transmitted via URL) */
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
      onRoomJoined(name, existingUsers, gameId ?? "", false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible to join the room";
      onError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="room-joiner">
      <RoomForm
        title="Join a room"
        icon="🎯"
        description="Enter the code provided by your opponent"
        userName={userName}
        onUserNameChange={setUserName}
        roomCode={roomId}
        onRoomCodeChange={setRoomId}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        submitButtonText="Join the room"
        showRoomCode
      />
    </div>
  );
}
