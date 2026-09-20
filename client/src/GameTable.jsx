import { socket } from "./socket";
import { TRAITS } from "./traits";
import HostGodMode from "./HostGodMode.tsx";

// ==========================================================
//  GameTable.jsx — ігровий стіл.
//
//  Дизайн: естетика розсекреченого досьє — карта гравця виглядає
//  як пожовклий паперовий бланк зі штампом "СЕКРЕТНО", чужі картки —
//  як замкнені файли, що розкриваються по одному полю за раз.
//  Під час голосування картки отримують кнопку "Проти" і лічильник
//  голосів; вигнаний гравець отримує чорно-білий вигляд і штамп.
//
//  Дані вже прийшли з сервера відфільтрованими:
//  - у "своєму" записі всі characteristics видно завжди;
//  - у чужих записах приховані характеристики мають value: "???".
//  Підрахунок голосів і будь-яка "логіка" голосування — суто на
//  клієнті: сервер лише зберігає сирий voting.votes.
// ==========================================================

export default function GameTable({ roomCode, gameState }) {
  const players = gameState?.players ?? {};
  const voting = gameState?.voting ?? { isActive: false, votes: {} };
  const myId = socket.id;
  const me = players[myId];
  const others = Object.entries(players).filter(([id]) => id !== myId);
  const isHost = me?.isHost ?? false;

  const playersList = Object.entries(players).map(([id, p]) => ({
    id,
    name: p.name,
    isHost: p.isHost,
    isEliminated: p.isEliminated,
  }));

  // Підрахунок голосів — суто на фронтенді, сервер лише зберігає votes
  const voteCounts = {};
  Object.values(voting.votes || {}).forEach((targetId) => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  });
  const myVoteTarget = voting.votes?.[myId];

  const handleReveal = (traitKey) => {
    socket.emit("reveal_trait", { roomCode, traitKey });
  };

  const handleVote = (targetId) => {
    socket.emit("cast_vote", { roomCode, targetId });
  };

  return (
    <div className="min-h-screen bg-[#12140f] text-stone-200 px-4 py-8 sm:px-8">
      {/* ---- Банер активного голосування ---- */}
      {voting.isActive && (
        <div className="max-w-5xl mx-auto mb-6 rounded-md border-2 border-red-500 bg-red-950/60 text-red-200 font-mono font-bold text-center py-3 px-4 uppercase tracking-wide">
          🚨 Йде голосування! Оберіть, кого вигнати з бункера
        </div>
      )}

      {/* ---- Лор гри: катастрофа і умови бункера ---- */}
      {gameState?.environment && (
        <div className="max-w-5xl mx-auto mb-6 rounded-md border border-amber-700/50 bg-amber-950/30 px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-xs uppercase tracking-widest text-amber-500 font-mono mb-2">
            📻 Зведення новин
          </p>
          <p className="font-mono text-sm sm:text-base text-amber-100 mb-1">
            <span className="text-amber-500">☣️ Катастрофа:</span>{" "}
            {gameState.environment.catastrophe}
          </p>
          <p className="font-mono text-sm sm:text-base text-amber-100">
            <span className="text-amber-500">🏚️ Бункер:</span>{" "}
            {gameState.environment.condition}
          </p>
        </div>
      )}

      <header className="max-w-5xl mx-auto mb-8 flex items-center justify-between border-b border-stone-700/60 pb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500 font-mono">
            Операція «Бункер»
          </p>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-stone-100">
            Кімната {roomCode}
          </h1>
        </div>
        <div className="text-right text-xs font-mono text-stone-500">
          Учасників: {Object.keys(players).length}
        </div>
      </header>

      <HostGodMode
        roomCode={roomCode}
        isHost={isHost}
        players={playersList}
        votingActive={voting.isActive}
      />

      {/* ---- Секція 1: моя картка ---- */}
      {me && (
        <section className="max-w-5xl mx-auto mb-12">
          <DossierCard
            name={me.name}
            isHost={me.isHost}
            isEliminated={me.isEliminated}
            traits={me.characteristics}
            onReveal={handleReveal}
            isVotingActive={voting.isActive}
            voteCount={voteCounts[myId] || 0}
            isVotedByMe={myVoteTarget === myId}
            onVote={() => handleVote(myId)}
          />
        </section>
      )}

      {/* ---- Секція 2: інші гравці ---- */}
      <section className="max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-4">
          Інші виживальники
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {others.map(([id, player]) => (
            <OtherPlayerCard
              key={id}
              name={player.name}
              isHost={player.isHost}
              isEliminated={player.isEliminated}
              traits={player.characteristics}
              isVotingActive={voting.isActive}
              voteCount={voteCounts[id] || 0}
              isVotedByMe={myVoteTarget === id}
              onVote={() => handleVote(id)}
            />
          ))}
          {others.length === 0 && (
            <p className="text-stone-600 text-sm italic">Ви поки що самі в бункері.</p>
          )}
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------
// Штамп поверх картки вигнаного гравця
// ------------------------------------------------------------------
function EliminatedStamp() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
      <span className="rotate-[-12deg] border-4 border-red-600 text-red-500 font-mono font-extrabold uppercase tracking-widest px-4 py-2 text-lg sm:text-2xl bg-black/40">
        Вигнаний
      </span>
    </div>
  );
}

// ------------------------------------------------------------------
// Кнопка голосування + лічильник, спільна для обох типів карток
// ------------------------------------------------------------------
function VoteControl({ isVotingActive, isEliminated, voteCount, isVotedByMe, onVote }) {
  if (!isVotingActive || isEliminated) return null;

  return (
    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-dashed border-current/20">
      <span className="text-xs font-mono opacity-70">
        Голосів проти: <strong>{voteCount}</strong>
      </span>
      <button
        onClick={onVote}
        className={`text-xs font-mono font-bold uppercase tracking-wide px-3 py-1.5 rounded-sm transition ${
          isVotedByMe
            ? "bg-red-800 text-red-100"
            : "bg-red-600 hover:bg-red-500 text-red-50"
        }`}
      >
        {isVotedByMe ? "✅ Ваш голос" : "🗳️ Проти"}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------
// Моя картка — "розсекречене досьє": паперовий бланк з ротованим
// штампом, кожне поле можна розкрити окремою кнопкою.
// ------------------------------------------------------------------
function DossierCard({
  name,
  isHost,
  isEliminated,
  traits,
  onReveal,
  isVotingActive,
  voteCount,
  isVotedByMe,
  onVote,
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-sm bg-[#e9e2cd] text-[#26221a] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] border border-[#c9bd9a] transition ${
        isEliminated ? "grayscale opacity-50" : ""
      }`}
    >
      {isEliminated && <EliminatedStamp />}

      {/* штамп СЕКРЕТНО */}
      <div className="pointer-events-none select-none absolute -right-10 top-6 rotate-[18deg] border-4 border-[#8a1f1f] text-[#8a1f1f] font-mono font-bold text-lg sm:text-xl px-6 py-1 opacity-70">
        СЕКРЕТНО
      </div>

      <div className="p-5 sm:p-8">
        <div className="flex items-baseline justify-between mb-1 font-mono">
          <p className="text-xs uppercase tracking-widest text-[#6b5f45]">
            Особова справа
          </p>
          <p className="text-xs text-[#6b5f45]">№ {name?.length ?? 0}{isHost ? "-H" : ""}</p>
        </div>

        <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-6 border-b-2 border-dashed border-[#8a7c56] pb-3">
          {name} {isHost && <span title="Хост">👑</span>}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {TRAITS.map(({ key, label, icon }) => {
            const trait = traits?.[key];
            const isHidden = trait?.isHidden;
            return (
              <div key={key} className="flex items-start justify-between gap-3 font-mono">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[#6b5f45]">
                    {icon} {label}
                  </p>
                  <p className="text-base sm:text-lg leading-tight">
                    {isHidden ? (
                      <span className="inline-block bg-[#26221a] text-[#26221a] rounded-sm px-2 select-none">
                        ██████████
                      </span>
                    ) : (
                      trait?.value
                    )}
                  </p>
                </div>

                {isHidden && !isEliminated && (
                  <button
                    onClick={() => onReveal(key)}
                    className="shrink-0 mt-1 rounded-sm bg-[#8a1f1f] hover:bg-[#a52828] text-[#f3e9d8] text-xs font-mono font-bold uppercase tracking-wide px-3 py-1.5 transition"
                  >
                    Відкрити
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <VoteControl
          isVotingActive={isVotingActive}
          isEliminated={isEliminated}
          voteCount={voteCount}
          isVotedByMe={isVotedByMe}
          onVote={onVote}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Картка іншого гравця — "замкнений файл": темна, приховані поля
// показують іконку замка замість тексту.
// ------------------------------------------------------------------
function OtherPlayerCard({
  name,
  isHost,
  isEliminated,
  traits,
  isVotingActive,
  voteCount,
  isVotedByMe,
  onVote,
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[#1c1f19] border border-stone-700/60 p-4 flex flex-col gap-3 transition ${
        isEliminated ? "grayscale opacity-50" : ""
      }`}
    >
      {isEliminated && <EliminatedStamp />}

      <h3 className="font-mono font-bold text-stone-100 flex items-center gap-2 border-b border-stone-700/60 pb-2">
        {isHost && <span title="Хост">👑</span>}
        {name}
      </h3>

      <div className="flex flex-col gap-2">
        {TRAITS.map(({ key, label, icon }) => {
          const trait = traits?.[key];
          const isHidden = trait?.isHidden;
          return (
            <div key={key} className="flex items-center justify-between text-sm font-mono">
              <span className="text-stone-500">
                {icon} {label}
              </span>
              {isHidden ? (
                <span className="flex items-center gap-1 text-stone-600 italic">
                  🔒 Секретно
                </span>
              ) : (
                <span className="text-stone-200 text-right">{trait?.value}</span>
              )}
            </div>
          );
        })}
      </div>

      <VoteControl
        isVotingActive={isVotingActive}
        isEliminated={isEliminated}
        voteCount={voteCount}
        isVotedByMe={isVotedByMe}
        onVote={onVote}
      />
    </div>
  );
}
