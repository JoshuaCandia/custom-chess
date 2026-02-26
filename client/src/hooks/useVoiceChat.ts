import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Socket } from "socket.io-client";
import type { Color, GameStatus } from "../types/chess";

export type VoiceStatus = "idle" | "requesting" | "connecting" | "connected" | "error";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useVoiceChat(
  socketRef: MutableRefObject<Socket | null>,
  roomId: string | null,
  playerColor: Color | null,
  gameStatus: GameStatus
) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);

  const pcRef               = useRef<RTCPeerConnection | null>(null);
  const localStreamRef      = useRef<MediaStream | null>(null);
  const pendingOfferRef     = useRef<RTCSessionDescriptionInit | null>(null);
  // ICE candidates that arrive before remoteDescription is set are queued here
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Always-current refs for use inside event handlers (avoids stale closures)
  const roomIdRef      = useRef(roomId);
  const colorRef       = useRef(playerColor);
  roomIdRef.current    = roomId;
  colorRef.current     = playerColor;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function signal(type: string, payload: object) {
    socketRef.current?.emit(type, { roomId: roomIdRef.current, ...payload });
  }

  async function flushCandidates(pc: RTCPeerConnection) {
    for (const c of pendingCandidatesRef.current) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    pendingCandidatesRef.current = [];
  }

  async function processOffer(sdp: RTCSessionDescriptionInit) {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    await flushCandidates(pc); // apply any candidates that arrived early
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signal("webrtc-answer", { sdp: answer });
  }

  function buildPC(): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) signal("webrtc-ice-candidate", { candidate: candidate.toJSON() });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected")                          setStatus("connected");
      if (pc.connectionState === "failed" || pc.connectionState === "closed") setStatus("error");
    };

    // Play incoming audio automatically
    pc.ontrack = ({ streams }) => {
      const audio = new Audio();
      audio.srcObject = streams[0];
      audio.play().catch(() => {});
    };

    return pc;
  }

  // ── Socket event listeners ─────────────────────────────────────────────────

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onOffer = ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) {
        // Mic not yet active — store offer, process when user joins
        pendingOfferRef.current = sdp;
        return;
      }
      processOffer(sdp);
    };

    const onAnswer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushCandidates(pc); // apply candidates that arrived before the answer
    };

    const onCandidate = ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (pc?.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else {
        // No PC yet or remote description not set — queue for later
        pendingCandidatesRef.current.push(candidate);
      }
    };

    socket.on("webrtc-offer",         onOffer);
    socket.on("webrtc-answer",        onAnswer);
    socket.on("webrtc-ice-candidate", onCandidate);

    return () => {
      socket.off("webrtc-offer",         onOffer);
      socket.off("webrtc-answer",        onAnswer);
      socket.off("webrtc-ice-candidate", onCandidate);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop when game ends ───────────────────────────────────────────────────

  useEffect(() => {
    if (gameStatus === "finished") stopVoiceChat();
  }, [gameStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => () => { stopVoiceChat(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ────────────────────────────────────────────────────────────

  async function startVoiceChat() {
    if (!roomId || status === "connected" || status === "connecting") return;

    setStatus("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setStatus("error");
      return;
    }

    localStreamRef.current = stream;
    const pc = buildPC();
    for (const track of stream.getTracks()) pc.addTrack(track, stream);

    setStatus("connecting");

    if (pendingOfferRef.current) {
      // Offer arrived before we activated mic — process it now
      await processOffer(pendingOfferRef.current);
      pendingOfferRef.current = null;
    } else if (colorRef.current === "w") {
      // White is always the initiator
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signal("webrtc-offer", { sdp: offer });
    }
    // Black waits: onOffer will call processOffer when White's offer arrives
  }

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setIsMuted(next);
  }

  function stopVoiceChat() {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current        = null;
    pendingOfferRef.current       = null;
    pendingCandidatesRef.current  = [];
    setStatus("idle");
    setIsMuted(false);
  }

  return { voiceStatus: status, isMuted, startVoiceChat, toggleMute, stopVoiceChat };
}
