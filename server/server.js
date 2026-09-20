import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import gameData from "./gameData.js";

// ==========================================================
//  БУНКЕР — бекенд
//  Архітектурний принцип: "Тупий сервер, розумні гравці".
//  Сервер НЕ містить ігрової логіки. Він лише:
//    1. Створює/зберігає кімнати (GameState) в оперативній пам'яті.
//    2. Ретранслює зміни стану всім гравцям у кімнаті.
//  Уся логіка (розкриття карток, голосування, катастрофа тощо)
//  вирішується гравцями голосом і відображається клієнтом,
//  який просто надсилає новий GameState на сервер.
// ==========================================================

const app = express();
// MVP: приймаємо запити з будь-якого домену. Перед продом варто
// звузити origin до конкретного домену клієнта (напр. Vercel-URL).
app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Bunker game server is running ✅");
});

// Проста healthcheck-точка, зручно для деплою (Render/Railway тощо)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", rooms: Object.keys(rooms).length });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // TODO: на проді замінити на конкретний домен клієнта
    methods: ["GET", "POST"],
  },
});

// ------------------------------------------------------------------
// In-memory сховище кімнат.
// Структура однієї кімнати:
// {
//   hostId: string,
//   createdAt: number,
//   players: [{ id, name, isHost }],
//   gameState: {}   // повністю довільний об'єкт — його форму визначає клієнт
// }
// ------------------------------------------------------------------
const rooms = {};

function generateRoomCode() {
  // Короткий людський код кімнати, напр. "A1B2"
  let code;
  do {
    code = Math.random().toString(36).substring(2, 6).toUpperCase();
  } while (rooms[code]);
  return code;
}

// ------------------------------------------------------------------
// Допоміжні функції для роздачі карток.
// Сервер лише випадково обирає значення з gameData — жодних правил
// гри (хто кого виганяє, скільки місць у бункері тощо) тут немає.
// ------------------------------------------------------------------

// Перемішування масиву (Fisher-Yates), не мутує оригінал
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Обгортає значення картки у формат, обов'язковий для GameState:
// { value: "Текст картки", isHidden: true }
function makeCard(value) {
  return { value, isHidden: true };
}

// Генерує характеристики для всіх гравців кімнати.
// Професії гарантовано унікальні (наскільки дозволяє розмір бази).
function generatePlayersState(players) {
  const shuffledProfessions = shuffle(gameData.professions);

  const playersState = {};

  players.forEach((player, index) => {
    // Якщо гравців більше, ніж унікальних професій у базі,
    // починаємо видавати їх по колу, щоб не зламати гру.
    const profession =
      shuffledProfessions[index % shuffledProfessions.length];

    playersState[player.id] = {
      name: player.name,
      isHost: player.isHost,
      isEliminated: false,
      characteristics: {
        profession: makeCard(profession),
        health: makeCard(randomFrom(gameData.health)),
        biology: makeCard(randomFrom(gameData.biology)),
        phobia: makeCard(randomFrom(gameData.phobias)),
        baggage: makeCard(randomFrom(gameData.baggage)),
        fact: makeCard(randomFrom(gameData.facts)),
      },
    };
  });

  return playersState;
}

// Перевіряє, що запит надійшов саме від хоста цієї кімнати.
// Використовується для всіх адмінських (host_*) подій.
function isHost(room, socketId) {
  return !!room && room.hostId === socketId;
}

function removePlayerFromRoom(socket) {
  for (const [roomCode, room] of Object.entries(rooms)) {
    const idx = room.players.findIndex((p) => p.id === socket.id);
    if (idx === -1) continue;

    room.players.splice(idx, 1);

    if (room.players.length === 0) {
      delete rooms[roomCode];
      console.log(`[room] ${roomCode} видалено (порожня)`);
      return;
    }

    // Якщо вийшов хост — призначаємо нового
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }

    broadcastRoomState(roomCode);
    return;
  }
}

// ------------------------------------------------------------------
// Безпека: приховування чужих карток.
//
// room.gameState.players зберігає ПОВНУ (незашифровану) правду —
// це "джерело істини" на сервері. Але кожному клієнту ми надсилаємо
// не сирий room, а персоналізовану версію: чужі приховані картки
// підміняються на "???", і клієнт фізично не отримує справжнє
// значення, поки isHidden не стане false.
// ------------------------------------------------------------------
function getFilteredGameState(room, targetSocketId) {
  const gameState = room.gameState;

  // До старту гри (або якщо стан ще порожній) фільтрувати нічого
  if (!gameState || gameState.status !== "playing" || !gameState.players) {
    return gameState;
  }

  const filteredPlayers = {};

  for (const [playerId, playerData] of Object.entries(gameState.players)) {
    if (playerId === targetSocketId) {
      // Власні картки гравець бачить повністю, незалежно від isHidden
      filteredPlayers[playerId] = playerData;
      continue;
    }

    const filteredCharacteristics = {};
    for (const [traitKey, trait] of Object.entries(playerData.characteristics)) {
      filteredCharacteristics[traitKey] = trait.isHidden
        ? { value: "???", isHidden: true }
        : trait;
    }

    filteredPlayers[playerId] = {
      ...playerData,
      characteristics: filteredCharacteristics,
    };
  }

  return { ...gameState, players: filteredPlayers };
}

// Розсилає кожному гравцю кімнати ЙОГО ВЛАСНУ, персонально
// відфільтровану версію room_updated (замість одного io.to().emit()
// для всіх).
function broadcastRoomState(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  for (const player of room.players) {
    const targetSocket = io.sockets.sockets.get(player.id);
    if (!targetSocket) continue;

    targetSocket.emit("room_updated", {
      ...room,
      gameState: getFilteredGameState(room, player.id),
    });
  }
}

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  // --- Створення кімнати ---
  socket.on("create_room", ({ playerName } = {}, callback) => {
    const roomCode = generateRoomCode();

    rooms[roomCode] = {
      hostId: socket.id,
      createdAt: Date.now(),
      players: [{ id: socket.id, name: playerName || "Гравець", isHost: true }],
      gameState: {}, // клієнт сам наповнить це своєю структурою гри
    };

    socket.join(roomCode);
    console.log(`[room] створено ${roomCode} гравцем ${socket.id}`);

    callback?.({ success: true, roomCode, room: rooms[roomCode] });
    broadcastRoomState(roomCode);
  });

  // --- Приєднання до кімнати ---
  socket.on("join_room", ({ roomCode, playerName } = {}, callback) => {
    const room = rooms[roomCode];

    if (!room) {
      callback?.({ success: false, error: "Кімнату не знайдено" });
      return;
    }

    room.players.push({ id: socket.id, name: playerName || "Гравець", isHost: false });
    socket.join(roomCode);

    callback?.({ success: true, roomCode, room });
    broadcastRoomState(roomCode);
  });

  // --- Старт гри ---
  // Ініціюється хостом. Сервер бере поточний список гравців кімнати,
  // генерує кожному набір характеристик (усі картки приховані)
  // і транслює оновлений GameState усім у кімнаті.
  socket.on("start_game", ({ roomCode } = {}) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Стартувати гру може лише хост кімнати
    if (room.hostId !== socket.id) {
      socket.emit("error_message", "Лише хост може почати гру");
      return;
    }

    if (room.players.length < 1) return;

    room.gameState = {
      status: "playing",
      players: generatePlayersState(room.players),
      voting: { isActive: false, votes: {} },
      environment: {
        catastrophe: randomFrom(gameData.catastrophes),
        condition: randomFrom(gameData.bunkerConditions),
      },
    };

    console.log(`[room] ${roomCode}: гру розпочато, роздано картки`);
    broadcastRoomState(roomCode);
  });

  // --- Розкриття картки ---
  // Гравець сам вирішує розкрити свою характеристику (голосом
  // повідомивши це іншим). Сервер лише позначає isHidden: false
  // і розсилає всім оновлений, персонально відфільтрований стан.
  socket.on("reveal_trait", ({ roomCode, traitKey } = {}) => {
    const room = rooms[roomCode];
    if (!room || !room.gameState || room.gameState.status !== "playing") return;

    const playerState = room.gameState.players[socket.id];
    if (!playerState) return;

    const trait = playerState.characteristics[traitKey];
    if (!trait) return;

    trait.isHidden = false;

    console.log(`[room] ${roomCode}: ${socket.id} розкрив картку "${traitKey}"`);
    broadcastRoomState(roomCode);
  });

  // ==================================================================
  //  ГОЛОСУВАННЯ ТА ВИГНАННЯ
  //  Сервер лише зберігає, хто за кого проголосував, і хто вигнаний.
  //  Підрахунок голосів, визначення "програвшого" тощо — рахує клієнт
  //  (архітектурний принцип "тупий сервер").
  // ==================================================================

  // --- Хост вмикає/вимикає раунд голосування ---
  socket.on("host_toggle_voting", ({ roomCode } = {}) => {
    const room = rooms[roomCode];
    if (!isHost(room, socket.id)) return;

    const gs = room.gameState;
    if (!gs || gs.status !== "playing" || !gs.voting) return;

    gs.voting.isActive = !gs.voting.isActive;

    // Новий раунд голосування завжди стартує з чистого аркуша
    if (gs.voting.isActive) {
      gs.voting.votes = {};
    }

    console.log(
      `[voting] ${roomCode}: голосування ${gs.voting.isActive ? "розпочато" : "зупинено"}`
    );
    broadcastRoomState(roomCode);
  });

  // --- Гравець голосує проти когось (в т.ч. проти себе) ---
  socket.on("cast_vote", ({ roomCode, targetId } = {}) => {
    const room = rooms[roomCode];
    if (!room) return;

    const gs = room.gameState;
    if (!gs || gs.status !== "playing" || !gs.voting?.isActive) return;

    const voter = gs.players[socket.id];
    if (!voter || voter.isEliminated) return;

    if (!gs.players[targetId]) return;

    gs.voting.votes[socket.id] = targetId;

    console.log(`[voting] ${roomCode}: ${socket.id} голосує проти ${targetId}`);
    broadcastRoomState(roomCode);
  });

  // --- Хост виганяє гравця з бункера ---
  socket.on("host_eliminate_player", ({ roomCode, targetId } = {}) => {
    const room = rooms[roomCode];
    if (!isHost(room, socket.id)) return;

    const gs = room.gameState;
    if (!gs || gs.status !== "playing" || !gs.players?.[targetId]) return;

    gs.players[targetId].isEliminated = true;

    console.log(`[voting] ${roomCode}: хост вигнав гравця ${targetId}`);
    broadcastRoomState(roomCode);
  });

  // --- Хост завершує гру (відкриває бункер) ---
  // Жодних умов перемоги сервер не рахує — просто перемикає статус.
  // Оскільки getFilteredGameState фільтрує лише при status === "playing",
  // з цього моменту всі клієнти автоматично отримують НЕфільтрований
  // gameState — усі characteristics.value видно всім, незалежно від isHidden.
  socket.on("host_end_game", ({ roomCode } = {}) => {
    const room = rooms[roomCode];
    if (!isHost(room, socket.id)) return;

    const gs = room.gameState;
    if (!gs || gs.status !== "playing") return;

    gs.status = "finished";

    console.log(`[room] ${roomCode}: хост завершив гру, бункер відкрито`);
    broadcastRoomState(roomCode);
  });

  // ==================================================================
  //  РЕЖИМ БОГА (адмін-панель хоста)
  //  Жодної ігрової логіки — сервер лише виконує "сирі" маніпуляції
  //  над characteristics.value за командою хоста. Єдина перевірка —
  //  що команда прийшла саме від room.hostId.
  // ==================================================================

  // --- Ручне редагування однієї характеристики ---
  socket.on(
    "host_override_trait",
    ({ roomCode, targetId, traitKey, newValue } = {}) => {
      const room = rooms[roomCode];
      if (!isHost(room, socket.id)) return;

      const gs = room.gameState;
      if (!gs || gs.status !== "playing" || !gs.players) return;

      const trait = gs.players[targetId]?.characteristics?.[traitKey];
      if (!trait) return;

      trait.value = newValue;

      console.log(
        `[god-mode] ${roomCode}: хост встановив ${targetId}.${traitKey} = "${newValue}"`
      );
      broadcastRoomState(roomCode);
    }
  );

  // --- Обмін характеристикою між двома гравцями ---
  socket.on(
    "host_swap_traits",
    ({ roomCode, playerAId, playerBId, traitKey } = {}) => {
      const room = rooms[roomCode];
      if (!isHost(room, socket.id)) return;

      const gs = room.gameState;
      if (!gs || gs.status !== "playing" || !gs.players) return;

      const traitA = gs.players[playerAId]?.characteristics?.[traitKey];
      const traitB = gs.players[playerBId]?.characteristics?.[traitKey];
      if (!traitA || !traitB) return;

      [traitA.value, traitB.value] = [traitB.value, traitA.value];

      console.log(
        `[god-mode] ${roomCode}: хост обміняв "${traitKey}" між ${playerAId} і ${playerBId}`
      );
      broadcastRoomState(roomCode);
    }
  );

  // --- Циклічний зсув характеристики по всіх гравцях кімнати ---
  // Значення кожного гравця переходить до попереднього за списком;
  // останній гравець room.players отримує значення першого.
  socket.on("host_shift_traits_clockwise", ({ roomCode, traitKey } = {}) => {
    const room = rooms[roomCode];
    if (!isHost(room, socket.id)) return;

    const gs = room.gameState;
    if (!gs || gs.status !== "playing" || !gs.players) return;

    const orderedIds = room.players.map((p) => p.id);
    if (orderedIds.length < 2) return;

    const originalValues = orderedIds.map(
      (id) => gs.players[id]?.characteristics?.[traitKey]?.value
    );
    if (originalValues.some((v) => v === undefined)) return;

    orderedIds.forEach((id, index) => {
      const sourceIndex = (index + 1) % orderedIds.length;
      gs.players[id].characteristics[traitKey].value = originalValues[sourceIndex];
    });

    console.log(`[god-mode] ${roomCode}: хост зсунув "${traitKey}" по колу`);
    broadcastRoomState(roomCode);
  });

  // --- Оновлення стану гри ---
  // Будь-який клієнт може надіслати новий GameState — сервер лише
  // зберігає його і ретранслює всім ІНШИМ гравцям кімнати.
  // Жодної валідації ігрової логіки тут немає навмисно.
  socket.on("update_game_state", ({ roomCode, gameState } = {}) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.gameState = gameState;
    socket.to(roomCode).emit("game_state_updated", gameState);
  });

  // --- Відключення ---
  socket.on("disconnect", () => {
    console.log(`[disconnect] ${socket.id}`);
    removePlayerFromRoom(socket);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Bunker server running on http://localhost:${PORT}`);
});
