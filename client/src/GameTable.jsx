import { socket } from "./socket";
import { TRAITS } from "./traits";
import HostGodMode from "./HostGodMode.tsx";
import TraitCard from "./TraitCard";

// ==========================================================
//  GameTable.jsx — ігровий стіл.
//
//  Дизайн: gold/silver glassmorphism (design-tokens.css) —
//  .glass-card / .linear-border / .gold-text / .silver-text.
//
//  Дані вже прийшли з сервера відфільтрованими:
//  - у "своєму" записі всі characteristics видно завжди,
//    isHidden означає лише "ще не розкрито ІНШИМ гравцям";
//  - у чужих записах приховані характеристики мають value: "???"
//    і жодна дія клієнта не може їх розкрити — тому OtherPlayerCard
//    ніколи не передає handleReveal у TraitCard і завжди рендерить
//    замок в режимі interactive={false} (суто візуальний).
//  Підрахунок голосів — суто на клієнті, сервер лише зберігає
//  сирий voting.votes.
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
    <div className="min-h-screen bg-bunker-950 text-white px-4 py-8 sm:px-8">
      {/* ---- Банер активного голосування ---- */}
      {voting.isActive && (
        <div className="max-w-5xl mx-auto mb-6 glass-card linear-border danger text-center py-3 px-4 uppercase tracking-wide font-bold text-danger-light">
          🚨 Йде голосування! Оберіть, кого вигнати з бункера
        </div>
      )}

      {/* ---- Лор гри: катастрофа і умови бункера ---- */}
      {gameState?.environment && (
        <div className="max-w-5xl mx-auto mb-6 glass-card linear-border silver px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-xs uppercase tracking-widest silver-text mb-2 font-semibold">
            📻 Зведення новин
          </p>
          <p className="text-sm sm:text-base text-white/90 mb-1">
            <span className="gold-text font-semibold">☣️ Катастрофа:</span>{" "}
            {gameState.environment.catastrophe}
          </p>
          <p className="text-sm sm:text-base text-white/90">
            <span className="gold-text font-semibold">🏚️ Бункер:</span>{" "}
            {gameState.environment.condition}
          </p>
        </div>
      )}

      <header className="max-w-5xl mx-auto mb-8 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/40">
            Операція «Бункер»
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold gold-text">
            Кімната {roomCode}
          </h1>
        </div>
        <div className="text-right text-xs text-white/40">
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
          <MyCard
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
        <p className="text-xs uppercase tracking-widest text-white/40 mb-4">
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
            <p className="text-white/30 text-sm italic">Ви поки що самі в бункері.</p>
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
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <span className="rotate-[-12deg] border-2 border-danger-light text-danger-light font-extrabold uppercase tracking-widest px-4 py-2 text-lg sm:text-2xl bg-black/50 rounded-sm">
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
    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-dashed border-white/15">
      <span className="text-xs text-white/60">
        Голосів проти: <strong className="text-white">{voteCount}</strong>
      </span>
      <button
        onClick={onVote}
        className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-sm transition ${
          isVotedByMe
            ? "bg-danger text-white/90"
            : "bg-danger-gradient hover:brightness-110 text-white"
        }`}
      >
        {isVotedByMe ? "✅ Ваш голос" : "🗳️ Проти"}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------
// Моя картка — золота рамка, характеристики завжди видимі МЕНІ;
// isHidden тут означає лише "ще не розкрито іншим", тож кнопка
// відкриває поле для всіх гравців через handleReveal -> socket.emit.
// Після вигнання дальше розкриття сенсу не має, тож handleReveal
// не передається (interactive=true, але кнопка disabled в TraitCard).
// ------------------------------------------------------------------
function MyCard({
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
      className={`relative overflow-hidden glass-card linear-border gold p-5 sm:p-8 transition ${
        isEliminated ? "grayscale opacity-50" : ""
      }`}
    >
      {isEliminated && <EliminatedStamp />}

      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs uppercase tracking-widest text-white/40">
          Особова справа
        </p>
        {isHost && (
          <p className="text-xs gold-text font-semibold uppercase tracking-widest">
            👑 Хост
          </p>
        )}
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold gold-text mb-6 border-b border-white/10 pb-3">
        {name}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TRAITS.map(({ key, label, icon }) => {
          const trait = traits?.[key];
          return (
            <TraitCard
              key={key}
              traitKey={key}
              traitData={{ icon, label, value: trait?.value }}
              isHidden={!!trait?.isHidden}
              handleReveal={isEliminated ? undefined : onReveal}
              interactive
            />
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

// ------------------------------------------------------------------
// Картка іншого гравця — срібна рамка. Жодна дія клієнта не може
// розкрити чужу приховану рису, тому handleReveal НЕ передається,
// а TraitCard рендерить замок як interactive={false} (просто <span>,
// без onClick) — блокування суто візуальне.
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
      className={`relative overflow-hidden glass-card linear-border silver p-4 flex flex-col gap-3 transition ${
        isEliminated ? "grayscale opacity-50" : ""
      }`}
    >
      {isEliminated && <EliminatedStamp />}

      <h3 className="font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
        {isHost && <span title="Хост">👑</span>}
        {name}
      </h3>

      <div className="grid grid-cols-1 gap-2">
        {TRAITS.map(({ key, label, icon }) => {
          const trait = traits?.[key];
          return (
            <TraitCard
              key={key}
              traitKey={key}
              traitData={{ icon, label, value: trait?.value }}
              isHidden={!!trait?.isHidden}
              interactive={false}
            />
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
