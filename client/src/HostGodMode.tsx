import { useState } from "react";
import { socket } from "./socket";
import { TRAITS } from "./traits";

// ==========================================================
//  HostGodMode.tsx — прихована адмін-панель ведучого.
//
//  Дизайн навмисно контрастний до "паперового досьє" GameTable:
//  темний термінал/пульт керування (моноширинний шрифт, тонкі
//  зелені лінії на чорному), щоб відчувалось як "погляд з-за куліс",
//  а не частина світу гри.
//
//  Сервер не перевіряє жодної ігрової логіки для host_* подій —
//  єдина перевірка (на бекенді) — що відправник це room.hostId.
//  Цей компонент лише малює кнопку і форми; якщо isHost === false,
//  не рендерить взагалі нічого.
// ==========================================================

interface PlayerOption {
  id: string;
  name: string;
  isHost: boolean;
  isEliminated?: boolean;
}

interface HostGodModeProps {
  roomCode: string;
  isHost: boolean;
  players: PlayerOption[];
  votingActive: boolean;
}

export default function HostGodMode({
  roomCode,
  isHost,
  players,
  votingActive,
}: HostGodModeProps) {
  const [isOpen, setIsOpen] = useState(false);

  // --- Секція 1: ручне редагування ---
  const [overrideTargetId, setOverrideTargetId] = useState("");
  const [overrideTraitKey, setOverrideTraitKey] = useState(TRAITS[0]?.key ?? "");
  const [overrideValue, setOverrideValue] = useState("");

  // --- Секція 2a: обмін ---
  const [swapPlayerAId, setSwapPlayerAId] = useState("");
  const [swapPlayerBId, setSwapPlayerBId] = useState("");
  const [swapTraitKey, setSwapTraitKey] = useState(TRAITS[0]?.key ?? "");

  // --- Секція 2b: зсув ---
  const [shiftTraitKey, setShiftTraitKey] = useState(TRAITS[0]?.key ?? "");

  // --- Секція 3: керування грою (голосування / вигнання) ---
  const [eliminateTargetId, setEliminateTargetId] = useState("");
  const alivePlayers = players.filter((p) => !p.isEliminated);

  if (!isHost) return null;

  const handleApplyOverride = () => {
    if (!overrideTargetId || !overrideTraitKey || !overrideValue.trim()) return;
    socket.emit("host_override_trait", {
      roomCode,
      targetId: overrideTargetId,
      traitKey: overrideTraitKey,
      newValue: overrideValue.trim(),
    });
    setOverrideValue("");
  };

  const handleSwap = () => {
    if (!swapPlayerAId || !swapPlayerBId || swapPlayerAId === swapPlayerBId) return;
    socket.emit("host_swap_traits", {
      roomCode,
      playerAId: swapPlayerAId,
      playerBId: swapPlayerBId,
      traitKey: swapTraitKey,
    });
  };

  const handleShift = () => {
    if (!shiftTraitKey) return;
    socket.emit("host_shift_traits_clockwise", { roomCode, traitKey: shiftTraitKey });
  };

  const handleToggleVoting = () => {
    socket.emit("host_toggle_voting", { roomCode });
  };

  const handleEliminate = () => {
    if (!eliminateTargetId) return;
    socket.emit("host_eliminate_player", { roomCode, targetId: eliminateTargetId });
    setEliminateTargetId("");
  };

  const handleEndGame = () => {
    socket.emit("host_end_game", { roomCode });
  };

  return (
    <>
      {/* Кнопка виклику панелі — тільки для хоста */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-sm px-4 py-3 shadow-[0_0_25px_rgba(16,185,129,0.5)] transition"
      >
        🛡️ Режим Бога
      </button>

      {/* Затемнення фону */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        />
      )}

      {/* Виїжджаюча панель */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] bg-[#0a0d0a] border-l border-emerald-900/60 text-emerald-100 font-mono overflow-y-auto transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 bg-[#0a0d0a] border-b border-emerald-900/60 px-5 py-4 flex items-center justify-between">
          <h2 className="text-emerald-400 font-bold tracking-widest text-sm">
            ▓ ПУЛЬТ ВЕДУЧОГО ▓
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-emerald-600 hover:text-emerald-300 text-xl leading-none"
            aria-label="Закрити"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-8">
          {/* ---- Секція 1: ручне редагування ---- */}
          <section className="flex flex-col gap-3">
            <SectionTitle>01. Ручне редагування</SectionTitle>

            <Field label="Гравець">
              <select
                value={overrideTargetId}
                onChange={(e) => setOverrideTargetId(e.target.value)}
                className={selectClass}
              >
                <option value="">— оберіть гравця —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.isHost ? " (хост)" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Характеристика">
              <select
                value={overrideTraitKey}
                onChange={(e) => setOverrideTraitKey(e.target.value)}
                className={selectClass}
              >
                {TRAITS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Нове значення">
              <input
                type="text"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                placeholder="Напр. «Втратив зір на праве око»"
                className={inputClass}
              />
            </Field>

            <button
              onClick={handleApplyOverride}
              disabled={!overrideTargetId || !overrideValue.trim()}
              className={primaryBtnClass}
            >
              Застосувати
            </button>
          </section>

          <Divider />

          {/* ---- Секція 2а: обмін ---- */}
          <section className="flex flex-col gap-3">
            <SectionTitle>02. Обмін характеристикою</SectionTitle>

            <Field label="Гравець А">
              <select
                value={swapPlayerAId}
                onChange={(e) => setSwapPlayerAId(e.target.value)}
                className={selectClass}
              >
                <option value="">— оберіть —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Гравець Б">
              <select
                value={swapPlayerBId}
                onChange={(e) => setSwapPlayerBId(e.target.value)}
                className={selectClass}
              >
                <option value="">— оберіть —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Характеристика">
              <select
                value={swapTraitKey}
                onChange={(e) => setSwapTraitKey(e.target.value)}
                className={selectClass}
              >
                {TRAITS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </Field>

            <button
              onClick={handleSwap}
              disabled={!swapPlayerAId || !swapPlayerBId || swapPlayerAId === swapPlayerBId}
              className={primaryBtnClass}
            >
              🔁 Обміняти
            </button>
          </section>

          <Divider />

          {/* ---- Секція 2б: зсув ---- */}
          <section className="flex flex-col gap-3">
            <SectionTitle>03. Зсув по колу</SectionTitle>

            <Field label="Характеристика">
              <select
                value={shiftTraitKey}
                onChange={(e) => setShiftTraitKey(e.target.value)}
                className={selectClass}
              >
                {TRAITS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </Field>

            <button onClick={handleShift} className={primaryBtnClass}>
              🔄 Зсунути всім
            </button>
          </section>

          <Divider />

          {/* ---- Секція 3: керування грою ---- */}
          <section className="flex flex-col gap-3">
            <SectionTitle>04. Керування грою</SectionTitle>

            <button
              onClick={handleToggleVoting}
              className={`rounded font-bold text-sm py-2 transition ${
                votingActive
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-black"
              }`}
            >
              {votingActive ? "⏹ Зупинити голосування" : "▶ Запустити голосування"}
            </button>

            <Field label="Живий гравець">
              <select
                value={eliminateTargetId}
                onChange={(e) => setEliminateTargetId(e.target.value)}
                className={selectClass}
              >
                <option value="">— оберіть гравця —</option>
                {alivePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.isHost ? " (хост)" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <button
              onClick={handleEliminate}
              disabled={!eliminateTargetId}
              className="rounded bg-red-700 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm py-2 transition"
            >
              ☠️ Вигнати гравця
            </button>

            <div className="h-px bg-emerald-900/60 my-1" />

            <button
              onClick={handleEndGame}
              className="rounded bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-sm py-3 uppercase tracking-wide transition"
            >
              🚨 Завершити гру (Відкрити бункер)
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}

// ------------------------------------------------------------------
// Дрібні допоміжні елементи форми (загальний стиль термінала)
// ------------------------------------------------------------------

const selectClass =
  "w-full bg-[#0f140f] border border-emerald-900/60 text-emerald-100 text-sm rounded px-3 py-2 outline-none focus:border-emerald-500";

const inputClass =
  "w-full bg-[#0f140f] border border-emerald-900/60 text-emerald-100 text-sm rounded px-3 py-2 outline-none focus:border-emerald-500 placeholder:text-emerald-900";

const primaryBtnClass =
  "rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-sm py-2 transition";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-emerald-500 text-xs uppercase tracking-widest">{children}</p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-emerald-700">{label}</span>
      {children}
    </label>
  );
}

function Divider() {
  return <div className="h-px bg-emerald-900/60" />;
}
