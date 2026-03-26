import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from './apiClient';

let socket: Socket | null = null;

export const getSocket = (token?: string) => {
    if (!socket && typeof window !== 'undefined') {
        const backendUrl = getBackendUrl();
        const authToken = token || localStorage.getItem('token');

        socket = io(backendUrl, {
            auth: {
                token: authToken
            },
            transports: ['websocket'],
            autoConnect: true
        });

        socket.on('connect', () => {
            console.log('🔌 Socket connected');
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
