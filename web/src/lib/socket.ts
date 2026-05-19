import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './api';
import { useAuthStore } from '../store/authStore';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const token = useAuthStore.getState().token;
    socketInstance = io(BACKEND_URL, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
