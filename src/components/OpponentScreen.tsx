import { useCanvasStream } from "../hooks/useCanvasStream";
import { useRoom } from "../contexts/RoomContext";
import "../styles/components/OpponentScreen.css";
import { useRef, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function OpponentScreen() {
  const { id: gameId } = useParams();
  const { isAdmin, connectedUsers } = useRoom();
  const { remoteVideoRef } = useCanvasStream(isAdmin, gameId);
  const opponentLeft = connectedUsers.length < 2;

  const containerRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 12, y: 12 });
  const offset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      offset.current = { x: e.clientX - pos.current.x, y: e.clientY - pos.current.y };
      dragging.current = true;
      el.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      pos.current = {
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      };
      el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
    };

    const onPointerUp = () => {
      dragging.current = false;
      el.style.cursor = "grab";
    };

    el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="opponent-screen"
    >
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted
        style={{ display: opponentLeft ? "none" : undefined }}
      />
      {opponentLeft && (
        <div className="opponent-disconnected">
          Opponent disconnected
        </div>
      )}
    </div>
  );
}
