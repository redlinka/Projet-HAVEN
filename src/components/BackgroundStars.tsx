import { useEffect, useRef, type ReactNode } from "react";

import "../styles/components/BackgroundStars.css";

export default function BackgroundStars({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: {
      angle: number;
      distance: number;
      speed: number;
      size: number;
    }[] = [];

    const starCount = 100; // Star density
    let animFrameId: number;

    function initCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Initialize stars with random positions
      stars = Array.from({ length: starCount }, () => createStar(true));
    }

    function createStar(randomDistance = false) {
      // Maximum distance = farthest corner from the center
      const maxDist = Math.sqrt(
        Math.pow(canvas!.width / 2, 2) + Math.pow(canvas!.height / 2, 2),
      );
      return {
        angle: Math.random() * Math.PI * 2, // Random direction (360°)
        distance: randomDistance ? Math.random() * maxDist : 0, // Spawn at center or randomly spread
        speed: Math.random() * 1.5, // Base speed
        size: Math.random(), // Base star size
      };
    }

    function animate() {
      if (!canvas || !ctx) return;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);

      // Semi-transparent background to create a trail effect
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        // Calculate star position relative to the center
        const x = cx + Math.cos(star.angle) * star.distance;
        const y = cy + Math.sin(star.angle) * star.distance;

        // Stars become larger and faster as they move away from the center
        const progress = star.distance / maxDist; // 0 (center) → 1 (edge)
        const currentSize = star.size * (1 + progress * 3);
        const currentSpeed = star.speed * (1 + progress * 2);

        // Increase opacity with distance
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + progress * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, currentSize, 0, Math.PI * 2);
        ctx.fill();

        star.distance += currentSpeed;

        // Reset star to the center if it leaves the screen
        if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
          Object.assign(star, createStar(false));
        }
      });

      animFrameId = requestAnimationFrame(animate);
    }

    window.addEventListener("resize", initCanvas);
    initCanvas();
    animate();

    return () => {
      window.removeEventListener("resize", initCanvas);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <div className="main">
      <div className="bg"></div>
      <canvas ref={canvasRef} id="starfield" />
      {children}
    </div>
  );
}
