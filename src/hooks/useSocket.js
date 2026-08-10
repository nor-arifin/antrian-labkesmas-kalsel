import { useEffect, useRef, useCallback } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../lib/socket';

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = connectSocket();
    return () => disconnectSocket();
  }, []);

  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (socket) socket.on(event, handler);
    return () => socket?.off(event, handler);
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, on, emit };
}
