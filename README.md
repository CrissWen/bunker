# Бункер — онлайн гра

Веб-версія настільної гри "Бункер".

## Архітектура

**"Тупий сервер, розумні гравці"**

- Сервер (`/server`) не містить ігрової логіки. Він лише:
  1. Створює/зберігає кімнати (`GameState`) в оперативній пам'яті (без БД).
  2. Ретранслює будь-яку зміну стану всім гравцям кімнати через Socket.io.
- Клієнт (`/client`) відповідає за всю логіку гри: розкриття карток,
  голосування, катастрофу, раунди тощо. Гравці домовляються голосом,
  а стан гри на екрані — лише візуальне відображення того, що вони
  зробили.

## Структура проєкту

```
bunker-game/
├── server/          # Node.js + Express + Socket.io
│   ├── server.js
│   └── package.json
└── client/          # React (Vite) + TailwindCSS
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── socket.js
    └── package.json
```

## Запуск

### 1. Сервер

```bash
cd server
npm install
npm run dev      # або: npm start
```

Сервер підніметься на `http://localhost:3001`.

### 2. Клієнт

```bash
cd client
npm install
cp .env.example .env   # за потреби зміни VITE_SERVER_URL
npm run dev
```

Клієнт підніметься на `http://localhost:5173`.

## Що вже реалізовано

- Базовий Express-сервер з healthcheck (`GET /health`).
- Socket.io: створення кімнати (`create_room`), приєднання (`join_room`),
  оновлення стану (`update_game_state`), автоматичне видалення
  гравця/кімнати при відключенні.
- Роздача карток при старті гри (`start_game`): кожному гравцю випадково
  призначаються 6 характеристик (`gameData.js`), професії — без повторів.
- Безпечна видача стану: сервер надсилає кожному гравцю персонально
  відфільтровану версію `GameState` (`getFilteredGameState` +
  `broadcastRoomState`) — чужі приховані картки клієнт фізично не отримує,
  бачить лише `"???"`.
- Розкриття власної картки (`reveal_trait`).
- **Режим Бога** — прихована адмін-панель хоста (`HostGodMode.tsx`):
  ручне редагування будь-якої характеристики (`host_override_trait`),
  обмін характеристикою між двома гравцями (`host_swap_traits`),
  циклічний зсув характеристики по всіх гравцях (`host_shift_traits_clockwise`),
  запуск/зупинка голосування та вигнання гравця (`host_toggle_voting`,
  `host_eliminate_player`). Усі `host_*` події на бекенді перевіряють лише,
  що відправник — `room.hostId`; жодної ігрової логіки не валідується навмисно.
- **Голосування та вигнання**: `gameState.voting = { isActive, votes }`,
  де `votes` — сирий словник `{ voterId: targetId }`. Голосувати може будь-який
  живий (`!isEliminated`) гравець, навіть за самого себе. Підрахунок голосів
  рахує клієнт (`GameTable.jsx`) із сирого `votes`, сервер нічого не рахує.
  Вигнаний гравець (`isEliminated: true`) отримує чорно-білу напівпрозору
  картку зі штампом "ВИГНАНИЙ" і втрачає можливість голосувати й розкривати картки.
- **Завершення гри** (`host_end_game`): хост перемикає `status` на `"finished"`.
  Оскільки `getFilteredGameState` фільтрує лише при `status === "playing"`,
  з цього моменту всі клієнти автоматично отримують геть нефільтрований
  `gameState` — усі characteristics видно всім, незалежно від `isHidden`.
  `GameOver.jsx` малює фінальний екран у стилі мемних термінових новин:
  колонка "Врятовані" (усі, у кого `isEliminated === false`) і колонка
  "Залишені на поверхні" (`isEliminated === true`, сірі картки).
- **Лор гри**: при `start_game` сервер випадково обирає одну катастрофу і
  одні умови бункера з `gameData.js` (`catastrophes`, `bunkerConditions`)
  та кладе їх у `gameState.environment = { catastrophe, condition }`.
  Клієнт показує це "зведення новин" зверху ігрового столу — спільний
  контекст для обговорення й голосування.
- React-клієнт: Лобі (створення/приєднання, список гравців, старт гри),
  Ігровий стіл у стилі "досьє" (своя картка + сітка інших гравців, банер
  активного голосування, кнопки "Проти" й лічильники голосів).
- TailwindCSS вже підключено; `.tsx`/`.ts` підтримується поряд з `.jsx` (див. `tsconfig.json`).

## Наступні кроки (ідеї)

- Автоматична умова кінця гри (напр. коли лишається задана кількість місць).
- Автоматичне зупинення голосування й підказка "більшість визначилась".
- Додати таймер ходу/голосування.
- Продумати захист від "нечесних" клієнтів на інших подіях (наразі
  `update_game_state` досі приймає довільний стан без перевірок).

## Деплой: Render (сервер) + Vercel (клієнт)

Проєкт готовий до MVP-деплою: порт бекенду динамічний
(`process.env.PORT`), CORS відкритий для будь-якого домену
(`origin: "*"` — і в Express, і в Socket.io), а клієнт бере адресу
сервера зі змінної середовища `VITE_SERVER_URL`.

### Крок 1 — Бекенд на Render

1. Заведи новий репозиторій на GitHub і заштовхни туди весь проєкт
   (папки `server/` і `client/` разом, або окремими репозиторіями —
   без різниці).
2. На [render.com](https://render.com) → **New → Web Service**.
3. Підключи репозиторій. Якщо `server/` не в корені репо, вкажи
   **Root Directory**: `server`.
4. Налаштування білда:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Environment Variables на Render у цьому сервісі не обов'язкові —
   `PORT` Render підставляє автоматично. За бажання можна додати:
   - `NODE_ENV=production`
6. Деплой. Render видасть URL типу `https://bunker-server.onrender.com`
   — це і є твій `VITE_SERVER_URL` для кроку 2.

> Порада: на безкоштовному тарифі Render "засинає" без трафіку —
> перший WebSocket-конект після сну може зайняти кілька секунд.

### Крок 2 — Клієнт на Vercel

1. На [vercel.com](https://vercel.com) → **Add New → Project** →
   підключи той самий репозиторій.
2. Якщо `client/` не в корені репо, вкажи **Root Directory**: `client`.
3. Vercel сам розпізнає Vite-проєкт, але для певності:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. **Environment Variables** (розділ Settings → Environment Variables):
   - `VITE_SERVER_URL` = `https://bunker-server.onrender.com`
     (URL з кроку 1, без слеша в кінці)
5. Деплой. Vercel видасть URL типу `https://bunker-game.vercel.app`.

### Крок 3 — звузити CORS (рекомендовано перед реальним релізом)

Після того як обидва URL відомі, заміни `origin: "*"` у `server.js`
(обидва місця — `app.use(cors(...))` і `new Server(server, { cors: {...} })`)
на конкретний домен клієнта:

```js
app.use(cors({ origin: "https://bunker-game.vercel.app" }));
// ...
const io = new Server(server, {
  cors: {
    origin: "https://bunker-game.vercel.app",
    methods: ["GET", "POST"],
  },
});
```

Це не обов'язково для MVP, але прибирає ризик, що чужий сайт
підключиться до твого сервера кімнат.
