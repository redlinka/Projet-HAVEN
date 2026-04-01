import "../../styles/components/GameLobby/MultiplayerLobby.css";

import Chatter from "../Chat/Chatter";

interface MultiplayerLobbyProps {
  initialRoomId?: string;
}

export default function MultiplayerLobby({
  initialRoomId,
}: MultiplayerLobbyProps) {
  return (
    <div className="lobby-chat-wrapper">
      <Chatter initialRoomId={initialRoomId} keepAlive />
    </div>
  );
}
