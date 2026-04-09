import { useCanvasStream } from "../hooks/useCanvasStream";
import { useRoom } from "../contexts/RoomContext";
import "../styles/components/OpponentScreen.css";
import { useRef, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function OpponentScreen() {
  const { id: gameId } = useParams();
  const { isAdmin } = useRoom();
  const { remoteVideoRef } = useCanvasStream(isAdmin, gameId);

  const containerRef = useRef<HTMLDivElement>(null);

  // On utilise des Refs pour TOUT le mouvement (zéro lag React)
  const pos = useRef({ x: 12, y: 12 });
  const offset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      // Calcul de la nouvelle position en utilisant pageX/Y pour plus de stabilité
      pos.current = {
        x: e.pageX - offset.current.x,
        y: e.pageY - offset.current.y,
      };

      // MANIPULATION DIRECTE DU DOM (C'est ça qui rend le truc fluide comme le puzzle)
      containerRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
    };

    const onEnd = () => {
      isDragging.current = false;
      if (containerRef.current) {
        containerRef.current.style.cursor = "grab";
        containerRef.current.style.transition = ""; // On remet si besoin
      }
    };

    // On attache les events au window pour ne jamais perdre le focus
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onEnd);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;

    // On capture l'élément pour que les events arrivent même si on sort de la zone
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const rect = target.getBoundingClientRect();

    // On stocke l'endroit exact où on a cliqué dans la div
    offset.current = {
      x: e.pageX - rect.left,
      y: e.pageY - rect.top,
    };

    target.style.cursor = "grabbing";
    target.style.transition = "none"; // CRITIQUE : tue toute latence CSS
  };

  return (
    <div
      ref={containerRef}
      className="opponent-screen"
      onPointerDown={handlePointerDown}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        // Position initiale
        transform: `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`,
        cursor: "grab",
        zIndex: 9999,
        touchAction: "none",
        willChange: "transform", // Prévient le GPU qu'on va bouger
        userSelect: "none",
        width: "fit-content", // S'assure que la div ne prend pas toute la largeur
      }}
    >
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          pointerEvents: "none", // La vidéo ne doit pas intercepter le clic
          display: "block",
          maxWidth: "300px", // Ajuste selon tes besoins
          borderRadius: "8px",
        }}
      />
    </div>
  );
}
