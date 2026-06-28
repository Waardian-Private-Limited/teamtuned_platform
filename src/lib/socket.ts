import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from './apiClient';

let socket: Socket | null = null;

export const getSocket = (token?: string, isQr?: boolean) => {
    if (!socket && typeof window !== 'undefined') {
        const backendUrl = getBackendUrl();
        const authToken = token || localStorage.getItem('token');

        const authOptions: any = {};
        if (authToken) {
            authOptions.token = authToken;
        }
        if (isQr) {
            authOptions.isQr = 'true';
        }

        socket = io(backendUrl, {
            auth: authOptions,
            query: isQr ? { isQr: 'true' } : {},
            transports: ['polling', 'websocket'],
            extraHeaders: {
                'ngrok-skip-browser-warning': 'true',
            },
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
