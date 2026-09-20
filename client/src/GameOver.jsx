import { TRAITS } from "./traits";

// ==========================================================
//  GameOver.jsx — фінальний екран "відкриття бункера".
//
//  Дизайн: навмисно третя, окрема естетика від "досьє" (GameTable)
//  і "термінала" (HostGodMode) — мемний вайб телеграм-каналу з
//  терміновими новинами: чорний фон, жовто-чорні "стрічки",
//  великий заголовок з блискавками, бейдж "🔴 НАЖИВО".
//
//  status === "finished" означає, що бекенд більше НЕ фільтрує
//  gameState (див. getFilteredGameState на сервері) — тобто всі
//  characteristics.value вже прийшли розкритими. Компонент навмисно
//  ігнорує isHidden і завжди показує value.
// ==========================================================

export default function GameOver({ roomCode, gameState }) {
  const players = gameState?.players ?? {};
  const entries = Object.entries(players);

  const saved = entries.filter(([, p]) => !p.isEliminated);
  const notSaved = entries.filter(([, p]) => p.isEliminated);

  return (
    <div className="min-h-screen bg-black text-stone-100 px-4 py-8 sm:px-8">
      {/* ---- Шапка у стилі "термінових новин" ---- */}
      <div className="max-w-5xl mx-auto mb-10">
        <div className="bg-repeat-x bg-[length:28px_28px] h-3 rounded-t-sm"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #facc15 0 14px, #111 14px 28px)",
          }}
        />
        <div className="bg-[#0d0d0d] border-x-4 border-yellow-400 px-4 py-6 sm:px-8 sm:py-8 text-center">
          <div className="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 animate-pulse">
            🔴 Наживо · Кімната {roomCode}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase leading-tight text-yellow-400 drop-shadow-[0_2px_0_rgba(0,0,0,0.8)]">
            ⚡️ ТЕРМІНОВО ⚡️
            <br />
            Двері бункера зачинено!
          </h1>
          <p className="mt-4 text-stone-400 font-mono text-sm sm:text-base">
            Рішення прийнято. Дороги назад немає. Дізнаємось, кого пустили
            всередину, а кого лишили нагорі — просто зараз 👇
          </p>
        </div>
        <div
          className="bg-repeat-x bg-[length:28px_28px] h-3 rounded-b-sm"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #facc15 0 14px, #111 14px 28px)",
          }}
        />
      </div>

      {/* ---- Два блоки: врятовані / залишені на поверхні ---- */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ResultColumn
          title="Врятовані"
          subtitle={`${saved.length} місце(ь) у бункері`}
          accent="emerald"
        >
          {saved.map(([id, player]) => (
            <ResultCard key={id} player={player} variant="saved" />
          ))}
          {saved.length === 0 && (
            <EmptyNote text="Бункер лишився порожнім. Похмуро." />
          )}
        </ResultColumn>

        <ResultColumn
          title="Залишені на поверхні"
          subtitle={`${notSaved.length} не витримали голосування`}
          accent="red"
        >
          {notSaved.map(([id, player]) => (
            <ResultCard key={id} player={player} variant="lost" />
          ))}
          {notSaved.length === 0 && (
            <EmptyNote text="Дивовижно — усі вижили. Ідилія." />
          )}
        </ResultColumn>
      </div>
    </div>
  );
}

function ResultColumn({ title, subtitle, accent, children }) {
  const accentClasses =
    accent === "emerald"
      ? "border-emerald-600 text-emerald-400"
      : "border-red-600 text-red-400";

  return (
    <section>
      <div className={`border-l-4 pl-3 mb-4 ${accentClasses}`}>
        <h2 className="font-mono font-bold text-lg uppercase tracking-wide">
          {title}
        </h2>
        <p className="text-xs text-stone-500 font-mono">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function EmptyNote({ text }) {
  return <p className="text-stone-600 text-sm italic font-mono">{text}</p>;
}

function ResultCard({ player, variant }) {
  const isSaved = variant === "saved";

  return (
    <div
      className={`relative overflow-hidden rounded-lg border p-4 sm:p-5 ${
        isSaved
          ? "bg-[#101a12] border-emerald-700/60"
          : "bg-[#1a1414] border-red-900/60 grayscale"
      }`}
    >
      <div
        className={`inline-block mb-3 text-xs font-mono font-extrabold uppercase tracking-widest px-3 py-1 rounded-sm ${
          isSaved ? "bg-emerald-600 text-black" : "bg-red-700 text-white"
        }`}
      >
        {isSaved ? "✅ Успішно заселені" : "💀 Не пережили"}
      </div>

      <h3 className="font-mono font-bold text-lg mb-3 flex items-center gap-2">
        {player.isHost && <span title="Хост">👑</span>}
        {player.name}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {TRAITS.map(({ key, label, icon }) => (
          <div key={key} className="text-sm font-mono">
            <span className="text-stone-500">
              {icon} {label}:
            </span>{" "}
            <span className="text-stone-100">
              {player.characteristics?.[key]?.value ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
