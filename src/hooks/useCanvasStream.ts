import { useEffect, useRef } from "react";
import { useRoomService } from "../contexts/RoomServiceContext";

const STUN = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function useCanvasStream(isAdmin: boolean, gameId: string | undefined) {
  const roomService = useRoomService();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  let animFrameId: number;

  useEffect(() => {
    (async () => {
      let canvas: HTMLCanvasElement | null | undefined = null;

      if (gameId === "1") {
        const container = document.getElementById("cnv");
        canvas = container?.querySelector("canvas");
        console.log("[useCanvasStream] BrickBlast - Canvas recherché:", canvas);
      } else {
        const board = document.getElementById("cnv") as HTMLCanvasElement;
        const bricks = document.getElementById("bricks") as HTMLCanvasElement;

        console.log("[useCanvasStream] Puzzle - Recherche canvas:", {
          boardExists: !!board,
          bricksExists: !!bricks,
          boardSize: board ? `${board.width}x${board.height}` : "N/A",
        });

        if (board && bricks) {
          const finalCanvas = document.createElement("canvas");
          const ctx = finalCanvas.getContext("2d");

          finalCanvas.width = board.width;
          finalCanvas.height = board.height;

          function render() {
            if (!ctx) return;
            console.log("rendering...");
            ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

            ctx.drawImage(board, 0, 0);
            ctx.drawImage(bricks, 0, 0);

            animFrameId = requestAnimationFrame(render);
          }

          render();

          canvas = finalCanvas;
        }
      }
      console.log("[useCanvasStream] Canvas trouvé :", canvas);

      if (!canvas) {
        console.warn("[useCanvasStream] Aucun canvas trouvé");
        return;
      }

      const pc = new RTCPeerConnection(STUN);
      peerRef.current = pc;

      pc.ontrack = (event) => {
        console.log("[WebRTC] ontrack reçu !", event.streams);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        console.log("[WebRTC] ICE candidate :", event.candidate);

        if (event.candidate) {
          roomService.sendWebRTCIceCandidate(event.candidate.toJSON());
        }
      };

      // canvas récupéré directement ici
      const stream = canvas.captureStream(60);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      roomService.setWebRTCOfferListener(async (sdp) => {
        console.log("[WebRTC] Offer reçu");

        await pc.setRemoteDescription(sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        roomService.sendWebRTCAnswer(answer);
      });

      roomService.setWebRTCAnswerListener(async (sdp) => {
        console.log("[WebRTC] Answer reçu");

        await pc.setRemoteDescription(sdp);
      });

      roomService.setWebRTCIceCandidateListener(async (candidate) => {
        console.log("[WebRTC] ICE candidate reçu");

        await pc.addIceCandidate(candidate);
      });

      if (isAdmin) {
        // Admin attend que le non-admin soit prêt
        roomService.setWebRTCReadyListener(() => {
          console.log("[WebRTC] Non-admin prêt, envoi de l'offer");
          pc.createOffer().then(async (offer) => {
            await pc.setLocalDescription(offer);
            roomService.sendWebRTCOffer(offer);
          });
        });
      } else {
        // Non-admin signale qu'il est prêt
        console.log("[WebRTC] Non-admin signale ready");
        roomService.sendWebRTCReady();
      }
    })();

    return () => {
      cancelAnimationFrame(animFrameId!);
      peerRef.current?.close();
    };
  }, [gameId, isAdmin, roomService, document.getElementById("cnv")]);

  return { remoteVideoRef };
}
