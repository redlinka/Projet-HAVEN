import { useCanvasStream } from "../hooks/useCanvasStream";
import { useRoom } from "../contexts/RoomContext";
import "../styles/components/OpponentScreen.css";
import { useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

export default function OpponentScreen() {
  const { id: gameId } = useParams();
  const { isAdmin } = useRoom();
  const { remoteVideoRef } = useCanvasStream(isAdmin, gameId);

  const [position, setPosition] = useState({ x: 12, y: 12 });
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    offsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    setDragging(true);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y,
    });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      className="opponent-screen"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      <video ref={remoteVideoRef} autoPlay playsInline muted />
    </div>
  );
}
