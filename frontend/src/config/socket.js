import { io } from 'socket.io-client';

let socket;

export const initializeSocket = (projectId) => {
    console.log('Initializing socket for project:', projectId);
    socket = io(import.meta.env.VITE_SOCKET_URL, {
        query: { projectId },
        withCredentials: true
    });

    socket.on('connect', () => {
        console.log('Socket connected successfully');
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    return socket;
};

export const getSocket = () => {
    if (!socket) {
        console.warn('Socket not initialized');
        return null;
    }
    return socket;
};

export const sendMessage = (event, data) => {
    console.log('Sending socket message:', { event, data });
    if (!socket) {
        console.error('Socket not initialized');
        return;
    }
    socket.emit(event, data);
};

export const recieveMessage = (event, callback) => {
    console.log('Setting up socket listener for:', event);
    if (!socket) {
        console.error('Socket not initialized');
        return;
    }
    socket.on(event, (data) => {
        console.log('Received socket message:', { event, data });
        callback(data);
    });
};

export const disconnectSocket = () => {
    console.log('Disconnecting socket');
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};