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

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function useSocket(currentUsername: string) {
  const socketRef = useRef<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        });
      }
    );

    socket.on("move-made", (payload: MoveMadePayload) => {
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
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on("invalid-move", ({ reason }: { reason: string }) => {
      showError(reason);
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
          return { ...prev, status: "finished", message };
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
    socketRef.current?.emit("make-move", { roomId, move });
  }

  function sendChat(roomId: string, text: string) {
    socketRef.current?.emit("chat-message", { roomId, text });
  }

  return { gameState, chatMessages, error, socketRef, createRoom, joinRoom, makeMove, sendChat };
}
