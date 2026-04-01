import RoomCreator from "../Room/RoomCreator";
import RoomJoiner from "../Room/RoomJoiner";

import "../../styles/components/Chat/ChatterLobby.css";
import { useRoom } from "../../contexts/RoomContext";

export default function ChatterLobby({
  initialRoomId,
}: {
  initialRoomId?: string;
}) {
  const { error, handleRoomCreated, handleRoomJoined, setError, setState } =
    useRoom();

  const onError = (err: string) => {
    setError(err);
    setState("idle");
  };

  const onDismissError = () => setError(null);

  const onConnecting = () => setState("connecting");
  return (
    <div className="chatter-lobby">
      {error && (
        <div className="chatter-error" role="alert">
          <span>⚠️ {error}</span>
          <button className="chatter-error-close" onClick={onDismissError}>
            ✕
          </button>
        </div>
      )}
      <div className="chatter-lobby-cards">
        <RoomCreator
          onRoomCreated={handleRoomCreated}
          onError={onError}
          onConnecting={onConnecting}
        />
        <div className="chatter-lobby-separator">
          <span>ou</span>
        </div>
        <RoomJoiner
          onRoomJoined={handleRoomJoined}
          onError={onError}
          onConnecting={onConnecting}
          initialRoomId={initialRoomId}
        />
      </div>
    </div>
  );
}
