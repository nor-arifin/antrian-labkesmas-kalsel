import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const url = window.location.port === '5173'
      ? 'http://localhost:3001'
      : window.location.origin;
    socket = io(url, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
