import { useEffect, useRef } from "react";
import { useRoomService } from "../contexts/RoomServiceContext";
import { useRoom } from "../contexts/RoomContext";

const STUN = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function useCanvasStream(isAdmin: boolean, gameId: string | undefined) {
  const roomService = useRoomService();
  const { canvasRefs, isCanvasReady } = useRoom();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameId = useRef<number>(0);

  useEffect(() => {
    if (!isCanvasReady) {
      console.log("3) [useCanvasStream] Canvas non prêt: isCanvasReady=false");
      return;
    }

    const validRefs =
      canvasRefs.current.length > 0 &&
      canvasRefs.current.every((ref) => ref !== null && ref !== undefined);

    if (!validRefs) {
      console.log("3) [useCanvasStream] Refs invalides:", {
        refsCount: canvasRefs.current.length,
      });
      return;
    }

    (async () => {
      try {
        let canvas: HTMLCanvasElement | null | undefined = null;

        if (gameId === "1") {
          canvas = canvasRefs.current[0] ?? null;
        } else {
          const board = canvasRefs.current[0] ?? null;
          const bricks = canvasRefs.current[1] ?? null;

          if (!board || !bricks) {
            console.warn("3) [useCanvasStream] canvasRefs vides");
            return;
          }

          console.log(
            "3) [useCanvasStream] Puzzle - board:",
            board.width,
            board.height,
          );

          if (board && bricks) {
            await new Promise<void>((resolve) => {
              const check = () => {
                if (board.width > 0 && board.height > 0) resolve();
                else requestAnimationFrame(check);
              };
              check();
            });
            const finalCanvas = document.createElement("canvas");
            const ctx = finalCanvas.getContext("2d");

            finalCanvas.width = board.width;
            finalCanvas.height = board.height;

            const render = () => {
              if (!ctx) return;
              ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

              ctx.drawImage(board, 0, 0);
              ctx.drawImage(bricks, 0, 0);

              animFrameId.current = requestAnimationFrame(render);
            };

            render();
            canvas = finalCanvas;
          }
        }

        console.log("4) [useCanvasStream] Canvas trouvé:", canvas);
        if (!canvas) {
          console.warn("5) [useCanvasStream] Aucun canvas trouvé");
          return;
        }

        peerRef.current?.close();

        const pc = new RTCPeerConnection(STUN);
        peerRef.current = pc;

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            roomService.sendWebRTCIceCandidate(event.candidate.toJSON());
          }
        };

        const stream = canvas.captureStream(40);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        console.log(
          "5) [useCanvasStream] Stream capturé et tracks ajoutés au PeerConnection",
        );

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
          console.log("[WebRTC] Admin - enregistre ReadyListener");

          roomService.setWebRTCReadyListener(() => {
            console.log("[WebRTC] Admin - ready reçu, envoi offer");

            pc.createOffer().then(async (offer) => {
              await pc.setLocalDescription(offer);
              roomService.sendWebRTCOffer(offer);
            });
          });
        } else {
          // Non-admin signale qu'il est prêt
          console.log("[WebRTC] Non-admin - envoi ready");
          roomService.sendWebRTCReady();
        }
      } catch (err) {
        console.error("[useCanvasStream] Error :", err);
      }
    })();

    return () => {
      cancelAnimationFrame(animFrameId.current);
      peerRef.current?.close();
    };
  }, [isCanvasReady, canvasRefs]);

  return { remoteVideoRef };
}
