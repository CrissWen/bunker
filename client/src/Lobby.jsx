// ==========================================================
//  Lobby.jsx — екран очікування гравців.
//  Показується, поки room.gameState.status !== "playing".
// ==========================================================

export default function Lobby({
  isConnected,
  playerName,
  setPlayerName,
  roomCodeInput,
  setRoomCodeInput,
  room,
  roomCode,
  isHost,
  error,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-bold tracking-tight">☢️ Бункер</h1>

      <div className="flex items-center gap-2 text-sm">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isConnected ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        {isConnected ? "З'єднано з сервером" : "Немає з'єднання"}
      </div>

      {!room && (
        <div className="w-full max-w-sm flex flex-col gap-3 bg-slate-800 p-6 rounded-2xl shadow-lg">
          <input
            className="rounded-lg px-3 py-2 bg-slate-700 outline-none focus:ring-2 ring-emerald-500"
            placeholder="Ваше ім'я"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <button
            onClick={onCreateRoom}
            disabled={!playerName || !isConnected}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2 font-semibold transition"
          >
            Створити кімнату
          </button>

          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <div className="flex-1 h-px bg-slate-700" />
            або
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <input
            className="rounded-lg px-3 py-2 bg-slate-700 outline-none focus:ring-2 ring-sky-500"
            placeholder="Код кімнати"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value)}
          />
          <button
            onClick={onJoinRoom}
            disabled={!playerName || !roomCodeInput || !isConnected}
            className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 py-2 font-semibold transition"
          >
            Приєднатись
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}

      {room && (
        <div className="w-full max-w-lg bg-slate-800 p-6 rounded-2xl shadow-lg flex flex-col gap-3">
          <p className="text-lg">
            Кімната: <span className="font-mono font-bold">{roomCode}</span>
          </p>

          <p className="text-sm text-slate-400">
            Гравці ({room.players?.length ?? 0}):
          </p>
          <ul className="flex flex-col gap-1">
            {room.players?.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span>{p.isHost ? "👑" : "🙂"}</span>
                {p.name}
              </li>
            ))}
          </ul>

          {isHost && (
            <button
              onClick={onStartGame}
              disabled={!room.players || room.players.length < 1}
              className="mt-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 py-2 font-semibold transition"
            >
              🚀 Почати гру
            </button>
          )}

          {!isHost && (
            <p className="text-slate-400 text-sm mt-2">
              Очікуємо, поки хост розпочне гру...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
