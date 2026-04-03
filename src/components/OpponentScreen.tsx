import { useCanvasStream } from "../hooks/useCanvasStream";
import { useRoom } from "../contexts/RoomContext";
import "../styles/components/OpponentScreen.css";
import { useState } from "react";
import { useParams } from "react-router-dom";

export default function OpponentScreen() {
  const { id: gameId } = useParams();
  const { isAdmin } = useRoom();
  const { remoteVideoRef } = useCanvasStream(isAdmin, gameId);

  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setPosition({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  return (
    <div
      className="opponent-screen"
      onPointerDown={handlePointerDown}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        cursor: "grab",
      }}
    >
      <video ref={remoteVideoRef} autoPlay playsInline muted />
    </div>
  );
}
