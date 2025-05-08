import socket from "socket.io-client";

let socketInstance = null;

export const initializeSocket = (projectId) => {
    console.log('Initializing socket connection...');
    console.log('API URL:', import.meta.env.VITE_API_URL);
    console.log('Project ID:', projectId);
    
    if (socketInstance) {
        console.log('Socket already exists, disconnecting...');
        socketInstance.disconnect();
    }
    
    socketInstance = socket.io(import.meta.env.VITE_API_URL, {
        auth: { token: localStorage.getItem('token') },
        query: { projectId },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    });

    socketInstance.on('connect', () => {
        console.log('Socket connected successfully');
    });

    socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        if (error.message === 'Invalid token') {
            console.log('Token is invalid, redirecting to login...');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    });

    socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
    });

    socketInstance.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
            // Server initiated disconnect, try to reconnect
            socketInstance.connect();
        }
    });

    return socketInstance;
}

export const recieveMessage = (eventName, callback) => {
    if (!socketInstance) {
        console.error('Socket not initialized');
        return;
    }
    console.log('Registering listener for event:', eventName);
    socketInstance.on(eventName, (data) => {
        console.log(`Received ${eventName} event:`, data);
        callback(data);
    });
}

export const sendMessage = (eventName, data) => {
    if (!socketInstance) {
        console.error('Socket not initialized');
        return;
    }
    console.log(`Sending ${eventName} event:`, data);
    socketInstance.emit(eventName, data);
}