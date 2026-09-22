// ==========================================================
//  TraitCard.jsx
//
//  Один рядок характеристики гравця, у стилістиці нової
//  дизайн-системи (glass-card + linear-border + gold/silver text
//  з design-tokens.css). Стилі більше не імпортуються окремим
//  файлом — усе живе в глобальних токенах.
// ==========================================================

function LockIcon({ locked }) {
  return locked ? (
    // Замкнений замок — показуємо, поки isHidden === true
    <svg width="16" height="22" viewBox="0 0 18 26" fill="none" aria-hidden="true">
      <rect x="2" y="11" width="14" height="13" rx="2" fill="currentColor" />
      <path
        d="M5 11V7a4 4 0 0 1 8 0v4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="9" cy="17" r="1.6" fill="#0a0a0a" />
    </svg>
  ) : (
    <svg width="16" height="22" viewBox="0 0 18 26" fill="none" aria-hidden="true">
      <rect x="2" y="11" width="14" height="13" rx="2" fill="currentColor" />
      <path
        d="M5 11V7a4 4 0 0 1 7.5-2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="9" cy="17" r="1.6" fill="#0a0a0a" />
    </svg>
  );
}

/**
 * TraitCard — один рядок характеристики гравця.
 *
 * @param {Object} props
 * @param {Object} props.traitData - { icon?: string, label: string, value: string }
 * @param {boolean} props.isHidden - true -> заглушка "Приховано" + замок
 * @param {(traitKey: string) => void} [props.handleReveal] - socket.emit('reveal_trait', ...)
 * @param {string} [props.traitKey] - ключ характеристики
 * @param {boolean} [props.special] - .gold замість .silver рамки (для особливих здібностей)
 * @param {boolean} [props.interactive] - false -> замок суто візуальний, без onClick
 *   (використовується для чужих карток: OtherPlayerCard ніколи не передає handleReveal
 *   і завжди interactive=false, щоб дії гравця жодним чином не зачіпали чужі поля)
 */
export default function TraitCard({
  traitData,
  isHidden,
  handleReveal,
  traitKey,
  special = false,
  interactive = true,
}) {
  const onLockClick = () => {
    if (handleReveal) handleReveal(traitKey);
  };

  return (
    <div
      className={`glass-card linear-border ${special ? "gold" : "silver"} p-3 flex flex-col gap-1.5`}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-silver-light/70 font-semibold">
        {traitData.icon && (
          <span aria-hidden="true">{traitData.icon}</span>
        )}
        {traitData.label}
      </div>

      <div className="flex items-center justify-between gap-2 min-h-[26px]">
        {isHidden ? (
          <>
            <p className="text-sm italic text-white/35 select-none">Приховано</p>

            {interactive ? (
              <button
                type="button"
                onClick={onLockClick}
                disabled={!handleReveal}
                aria-label={`Розкрити характеристику «${traitData.label}»`}
                className="shrink-0 text-gold-light hover:text-gold-DEFAULT disabled:text-white/20 disabled:cursor-not-allowed transition"
              >
                <LockIcon locked />
              </button>
            ) : (
              // Чужа картка: суто візуальний замок, без onClick і без role="button"
              <span className="shrink-0 text-white/25" aria-hidden="true">
                <LockIcon locked />
              </span>
            )}
          </>
        ) : (
          <p
            className={`text-sm sm:text-base font-semibold ${
              special ? "gold-text" : "text-white"
            }`}
          >
            {traitData.value}
          </p>
        )}
      </div>
    </div>
  );
}
