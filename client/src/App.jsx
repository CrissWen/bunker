import { useEffect, useState } from "react";
import { socket } from "./socket";
import Lobby from "./Lobby.jsx";
import GameTable from "./GameTable.jsx";
import GameOver from "./GameOver.jsx";

// ==========================================================
//  App.jsx — верхньорівневий "роутер" екранів.
//  Принцип "тупий сервер, розумні гравці": увесь UI тут
//  просто відображає той GameState, що прийшов із сервера.
//
//    room.gameState.status === undefined / "lobby" -> <Lobby />
//    room.gameState.status === "playing"            -> <GameTable />
// ==========================================================

export default function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }
    function onRoomUpdated(updatedRoom) {
      setRoom(updatedRoom);
    }
    function onGameStateUpdated(gameState) {
      setRoom((prev) => (prev ? { ...prev, gameState } : prev));
    }
    function onErrorMessage(message) {
      setError(message);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_updated", onRoomUpdated);
    socket.on("game_state_updated", onGameStateUpdated);
    socket.on("error_message", onErrorMessage);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_updated", onRoomUpdated);
      socket.off("game_state_updated", onGameStateUpdated);
      socket.off("error_message", onErrorMessage);
    };
  }, []);

  const handleCreateRoom = () => {
    setError("");
    socket.emit("create_room", { playerName }, (res) => {
      if (res.success) {
        setRoom(res.room);
        setRoomCode(res.roomCode);
      } else {
        setError(res.error || "Не вдалося створити кімнату");
      }
    });
  };

  const handleJoinRoom = () => {
    setError("");
    const code = roomCodeInput.toUpperCase();
    socket.emit("join_room", { roomCode: code, playerName }, (res) => {
      if (res.success) {
        setRoom(res.room);
        setRoomCode(res.roomCode);
      } else {
        setError(res.error || "Не вдалося приєднатись");
      }
    });
  };

  const handleStartGame = () => {
    setError("");
    socket.emit("start_game", { roomCode });
  };

  const isHost = room?.players?.find((p) => p.id === socket.id)?.isHost ?? false;
  const status = room?.gameState?.status;

  if (room && status === "playing") {
    return <GameTable roomCode={roomCode} gameState={room.gameState} />;
  }

  if (room && status === "finished") {
    return <GameOver roomCode={roomCode} gameState={room.gameState} />;
  }

  return (
    <Lobby
      isConnected={isConnected}
      playerName={playerName}
      setPlayerName={setPlayerName}
      roomCodeInput={roomCodeInput}
      setRoomCodeInput={setRoomCodeInput}
      room={room}
      roomCode={roomCode}
      isHost={isHost}
      error={error}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      onStartGame={handleStartGame}
    />
  );
}
