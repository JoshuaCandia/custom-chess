import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type {
  GameState,
  MoveInput,
  MoveMadePayload,
  ChatMessage,
  Color,
  TimeControl,
} from "../types/chess";
import { useGameSounds } from "./useGameSounds";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function useSocket(currentUsername: string) {
  const socketRef = useRef<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { play } = useGameSounds();
  // Tracks my assigned color so we can distinguish my moves from opponent moves
  const playerColorRef = useRef<Color | null>(null);

  function showError(reason: string) {
    setError(reason);
    setTimeout(() => setError(null), 3000);
  }

  useEffect(() => {
    const socket = io("/", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on(
      "room-created",
      ({ roomId, timeControl }: { roomId: string; timeControl: TimeControl }) => {
        setGameState({
          roomId,
          playerColor: "w",
          fen: INITIAL_FEN,
          turn: "w",
          status: "waiting",
          isCheck: false,
          isCheckmate: false,
          isStalemate: false,
          isDraw: false,
          message: null,
          lastMove: null,
          timeControl,
          timeWhite: timeControl ? timeControl * 1000 : 0,
          timeBlack: timeControl ? timeControl * 1000 : 0,
          moveHistory: [],
          myUsername: currentUsername,
          opponentUsername: "Guest",
          drawOfferPending: false,
          drawOfferSent: false,
          opponentOffline: false,
        });
      }
    );

    socket.on(
      "game-start",
      ({
        roomId,
        color,
        fen,
        timeControl,
        timeWhite,
        timeBlack,
        myUsername,
        opponentUsername,
      }: {
        roomId: string;
        color: Color;
        fen: string;
        timeControl: TimeControl;
        timeWhite: number;
        timeBlack: number;
        myUsername: string;
        opponentUsername: string;
      }) => {
        playerColorRef.current = color;
        play("notify");
        setGameState({
          roomId,
          playerColor: color,
          fen,
          turn: "w",
          status: "playing",
          isCheck: false,
          isCheckmate: false,
          isStalemate: false,
          isDraw: false,
          message: null,
          lastMove: null,
          timeControl,
          timeWhite,
          timeBlack,
          moveHistory: [],
          myUsername,
          opponentUsername,
          drawOfferPending: false,
          drawOfferSent: false,
          opponentOffline: false,
        });
      }
    );

    socket.on("move-made", (payload: MoveMadePayload) => {
      // payload.turn is who moves NEXT after this move.
      // If it's now my turn → opponent just moved → play sound here.
      // If it's opponent's turn → I just moved → sound already played in makeMove().
      const isOpponentMove = payload.turn === playerColorRef.current;
      if (isOpponentMove) {
        play(payload.move.san.includes("x") ? "capture" : "move");
      }

      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          fen: payload.fen,
          turn: payload.turn,
          isCheck: payload.isCheck,
          isCheckmate: payload.isCheckmate,
          isStalemate: payload.isStalemate,
          isDraw: payload.isDraw,
          status:
            payload.isCheckmate || payload.isStalemate || payload.isDraw
              ? "finished"
              : "playing",
          lastMove: { from: payload.move.from, to: payload.move.to },
          timeWhite: payload.timeWhite ?? prev.timeWhite,
          timeBlack: payload.timeBlack ?? prev.timeBlack,
          message: null,
          moveHistory: [...prev.moveHistory, payload.move.san],
        };
      });
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      play("notify");
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on("invalid-move", () => {
      // Board is driven by server FEN — the piece just snaps back, no toast needed.
    });

    socket.on("join-error", ({ reason }: { reason: string }) => {
      showError(reason);
    });

    socket.on(
      "timeout",
      ({ loser, winner }: { loser: Color; winner: Color }) => {
        setGameState((prev) => {
          if (!prev) return prev;
          const isLoser = prev.playerColor === loser;
          return {
            ...prev,
            status: "finished",
            timeWhite: loser === "w" ? 0 : prev.timeWhite,
            timeBlack: loser === "b" ? 0 : prev.timeBlack,
            message: isLoser
              ? "Time's up — you lose."
              : `${winner === "w" ? "White" : "Black"} wins on time!`,
          };
        });
      }
    );

    socket.on(
      "player-disconnected",
      ({ message }: { color: Color; message: string }) => {
        setGameState((prev) => {
          if (!prev) return prev;
          return { ...prev, status: "finished", message, opponentOffline: false };
        });
      }
    );

    socket.on("opponent-offline", () => {
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, opponentOffline: true };
      });
    });

    socket.on("opponent-reconnected", () => {
      play("notify");
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, opponentOffline: false };
      });
    });

    socket.on(
      "resigned",
      ({ loser }: { loser: Color; winner: Color }) => {
        setGameState((prev) => {
          if (!prev) return prev;
          const iLost = prev.playerColor === loser;
          return {
            ...prev,
            status: "finished",
            message: iLost ? "You resigned." : "Opponent resigned — you win!",
          };
        });
      }
    );

    socket.on("draw-offered", () => {
      play("notify");
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, drawOfferPending: true };
      });
    });

    socket.on("draw-accepted", () => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "finished",
          drawOfferPending: false,
          drawOfferSent: false,
          message: "Draw agreed.",
        };
      });
    });

    socket.on("draw-declined", () => {
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, drawOfferSent: false };
      });
      showError("Draw offer declined.");
    });

    socket.on(
      "game-reconnect",
      ({
        roomId,
        color,
        fen,
        turn,
        isCheck,
        timeControl,
        timeWhite,
        timeBlack,
        moveHistory,
        myUsername,
        opponentUsername,
      }: {
        roomId: string;
        color: Color;
        fen: string;
        turn: Color;
        isCheck: boolean;
        timeControl: TimeControl;
        timeWhite: number;
        timeBlack: number;
        moveHistory: string[];
        myUsername: string;
        opponentUsername: string;
      }) => {
        playerColorRef.current = color;
        setGameState({
          roomId,
          playerColor: color,
          fen,
          turn,
          status: "playing",
          isCheck,
          isCheckmate: false,
          isStalemate: false,
          isDraw: false,
          message: null,
          lastMove: null,
          timeControl,
          timeWhite,
          timeBlack,
          moveHistory,
          myUsername,
          opponentUsername,
          drawOfferPending: false,
          drawOfferSent: false,
          opponentOffline: false,
        });
      }
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  function createRoom(timeControl: TimeControl) {
    socketRef.current?.emit("create-room", { timeControl });
  }

  function joinRoom(roomId: string) {
    socketRef.current?.emit("join-room", { roomId });
  }

  function makeMove(roomId: string, move: MoveInput) {
    // Play sound immediately for my own moves (instant feedback, before server round-trip).
    // move-made handler will skip sound when it arrives since it detects it's not an opponent move.
    play("move");
    socketRef.current?.emit("make-move", { roomId, move });
  }

  function sendChat(roomId: string, text: string) {
    socketRef.current?.emit("chat-message", { roomId, text });
  }

  function resign(roomId: string) {
    socketRef.current?.emit("resign", { roomId });
  }

  function leaveRoom(roomId: string) {
    socketRef.current?.emit("leave-room", { roomId });
    setGameState(null);
  }

  function resetGame() {
    setGameState(null);
  }

  function offerDraw(roomId: string) {
    setGameState((prev) => {
      if (!prev) return prev;
      return { ...prev, drawOfferSent: true };
    });
    socketRef.current?.emit("draw-offer", { roomId });
  }

  function respondDraw(roomId: string, accept: boolean) {
    setGameState((prev) => {
      if (!prev) return prev;
      return { ...prev, drawOfferPending: false };
    });
    socketRef.current?.emit("draw-response", { roomId, accept });
  }

  return {
    gameState,
    chatMessages,
    error,
    socketRef,
    createRoom,
    joinRoom,
    makeMove,
    sendChat,
    resign,
    leaveRoom,
    resetGame,
    offerDraw,
    respondDraw,
  };
}
