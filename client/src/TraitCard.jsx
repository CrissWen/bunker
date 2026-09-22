import "./TraitCard.css";

// ==========================================================
//  TraitCard.jsx
//
//  Пряма репліка блоку `.item-gamerInfo` з референсного сайту
//  (знайдено в реальному DOM-снепшоті /game=... та у відповідному
//  CSS-бандлі Game-*.css). Структура і класи навмисно залишені
//  максимально близькими до оригіналу — це дозволяє 1-в-1
//  скопіювати решту стилів сторінки (.gamerInfo, .gamerInfo__body
//  тощо), якщо вони знадобляться пізніше.
//
//  Оригінал використовував растрові іконки lock-closed.png /
//  lock-open.png — їх у нас немає, тому заміняємо на inline SVG
//  (компонент LockIcon нижче), що займає ту саму площу (18×26).
// ==========================================================

function LockIcon({ locked }) {
  return locked ? (
    // Замкнений замок — показуємо, поки isHidden === true
    <svg width="18" height="26" viewBox="0 0 18 26" fill="none" aria-hidden="true">
      <rect x="2" y="11" width="14" height="13" rx="2" fill="currentColor" />
      <path
        d="M5 11V7a4 4 0 0 1 8 0v4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="9" cy="17" r="1.6" fill="#1a1a1a" />
    </svg>
  ) : (
    // Розімкнений замок — на випадок, якщо потрібно показати
    // "щойно розкрито" стан (не використовується напряму в isHidden=false,
    // бо там взагалі немає кнопки, але лишаю для повторного використання)
    <svg width="18" height="26" viewBox="0 0 18 26" fill="none" aria-hidden="true">
      <rect x="2" y="11" width="14" height="13" rx="2" fill="currentColor" />
      <path
        d="M5 11V7a4 4 0 0 1 7.5-2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="9" cy="17" r="1.6" fill="#1a1a1a" />
    </svg>
  );
}

/**
 * TraitCard — один рядок характеристики гравця.
 *
 * @param {Object} props
 * @param {Object} props.traitData - { icon?: string, label: string, value: string }
 * @param {boolean} props.isHidden - true -> закрита картка (заглушка + замок)
 * @param {(traitKey: string) => void} [props.handleReveal] - викликається
 *   при кліку на замок; сюди підключається socket.emit('reveal_trait', ...)
 * @param {string} [props.traitKey] - ключ характеристики (передається назад
 *   у handleReveal, щоб бекенд знав, ЩО саме розкривати)
 * @param {boolean} [props.special] - модифікатор .special з референсу
 *   (використовується там для "особливих здібностей", ширші картки)
 */
export default function TraitCard({
  traitData,
  isHidden,
  handleReveal,
  traitKey,
  special = false,
}) {
  const onLockClick = () => {
    if (handleReveal) handleReveal(traitKey);
  };

  return (
    <div className={`item-gamerInfo${special ? " special" : ""}`}>
      <div className="item-gamerInfo__title">
        {traitData.icon && (
          <span className="item-gamerInfo__icon" aria-hidden="true">
            {traitData.icon}
          </span>
        )}
        {traitData.label}
      </div>

      <div className="item-gamerInfo__description">
        {isHidden ? (
          <>
            <p className="item-gamerInfo__text item-gamerInfo__text--placeholder">
              Приховано
            </p>
            <div className="item-gamerInfo__lockedFunc">
              <button
                type="button"
                className="item-gamerInfo__open"
                onClick={onLockClick}
                aria-label={`Розкрити характеристику «${traitData.label}»`}
              >
                <LockIcon locked />
              </button>
            </div>
          </>
        ) : (
          <p className="item-gamerInfo__text">{traitData.value}</p>
        )}
      </div>
    </div>
  );
}
