import { io } from "socket.io-client";

// URL сервера береться зі змінної середовища (.env -> VITE_SERVER_URL),
// або за замовчуванням — локальний сервер розробки.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

// Один спільний екземпляр сокета на весь застосунок.
export const socket = io(SERVER_URL, {
  autoConnect: true,
});
