import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './api';
import { useAuthStore } from '../store/authStore';

let socketInstance: Socket | null = null;
let socketToken: string | null = null;

export const getSocket = (): Socket => {
  const token = useAuthStore.getState().token;
  if (socketInstance && socketToken !== token) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  if (!socketInstance) {
    socketToken = token;
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
    socketToken = null;
  }
};
