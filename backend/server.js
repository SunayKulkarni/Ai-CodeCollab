import http from 'http'
import app from './app.js'
import dotenv from 'dotenv'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import projectModal from './models/project.model.js'
import chatModel from './models/chat.model.js'
import { generateResult } from './services/ai.service.js'
import Message from './models/message.model.js'
import cors from 'cors'
dotenv.config()

const port = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app)

// Socket.IO configuration
const io = new Server(server, {
    cors: {
        origin: ['https://ai-code-collab.vercel.app', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 10000,
    allowEIO3: true
});

// Socket.IO middleware
io.use(async(socket, next) => {
    try {
        console.log('Socket connection attempt...');
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
        const projectId = socket.handshake.query.projectId;

        console.log('Project ID:', projectId);
        console.log('Token present:', !!token);

        if(!mongoose.Types.ObjectId.isValid(projectId)){
            console.error('Invalid project ID:', projectId);
            return next(new Error('Project ID is invalid or missing'));
        }

        socket.project = await projectModal.findById(projectId);
        if (!socket.project) {
            console.error('Project not found:', projectId);
            return next(new Error('Project not found'));
        }

        if(!token){
            console.error('No token provided');
            return next(new Error('Authentication error'));
        }   

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if(!decoded){
            console.error('Invalid token');
            return next(new Error('Authentication error'));
        }

        socket.userId = decoded;
        console.log('Socket authenticated successfully');
        next();
    }
    catch(err){
        console.error('Socket middleware error:', err);
        return next(new Error('Invalid token'));
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    const projectId = socket.handshake.query.projectId;
    console.log('Client joined project:', projectId);

    if (projectId) {
        socket.join(projectId);
        console.log(`Socket ${socket.id} joined room: ${projectId}`);

        // Send chat history when user connects
        chatModel.find({ projectId: projectId })
            .sort({ timestamp: 1 })
            .populate('sender._id', 'email _id')
            .then(messages => {
                console.log('Sending chat history:', messages);
                socket.emit('chat-history', messages);
            })
            .catch(err => {
                console.error('Error fetching chat history:', err);
            });
    }

    socket.on('project-message', async (data) => {
        console.log('Received project message:', data);
        try {
            const { message, sender } = data;
            console.log('Message details:', { message, sender });

            // Store message in database
            const newMessage = new chatModel({
                projectId: projectId,
                message: message,
                sender: {
                    _id: sender._id,
                    email: sender.email,
                    type: 'user'
                },
                timestamp: new Date()
            });

            try {
                const savedMessage = await newMessage.save();
                console.log('Message saved to database successfully:', savedMessage);
            } catch (saveError) {
                console.error('Error saving message to database:', saveError);
                throw saveError;
            }

            // Broadcast to all clients in the project room
            io.to(projectId).emit('project-message', {
                message: message,
                sender: {
                    _id: sender._id,
                    email: sender.email,
                    type: 'user'
                },
                timestamp: new Date()
            });
            console.log('Message broadcasted to room:', projectId);

            // Check for AI request
            if (message.toLowerCase().includes('@ai')) {
                console.log('Processing AI request...');
                const prompt = message.replace('@ai', '').trim();
                console.log('AI prompt:', prompt);

                try {
                    const result = await generateResult(prompt);
                    console.log('AI response:', result);

                    // Save AI response to database
                    const aiMessage = new chatModel({
                        projectId: projectId,
                        message: result,
                        sender: {
                            email: 'AI',
                            type: 'ai'
                        },
                        timestamp: new Date()
                    });

                    try {
                        const savedAiMessage = await aiMessage.save();
                        console.log('AI message saved to database successfully:', savedAiMessage);
                    } catch (saveError) {
                        console.error('Error saving AI message to database:', saveError);
                        throw saveError;
                    }

                    // Broadcast AI response to all clients in the project room
                    io.to(projectId).emit('project-message', {
                        message: result,
                        sender: {
                            email: 'AI',
                            type: 'ai'
                        },
                        timestamp: new Date()
                    });
                    console.log('AI response broadcasted to room:', projectId);
                } catch (error) {
                    console.error('Error generating AI response:', error);
                    socket.emit('error', { message: 'Error generating AI response' });
                }
            }
        } catch (error) {
            console.error('Error handling project message:', error);
            socket.emit('error', { message: 'Error processing message' });
        }
    });

    // Add user presence tracking
    socket.on('user-joined', (userData) => {
        console.log('User joined:', userData);
        io.to(projectId).emit('user-joined', {
            userId: userData._id,
            email: userData.email,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Notify other users about the disconnection
        io.to(projectId).emit('user-left', {
            socketId: socket.id,
            timestamp: new Date()
        });
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Start server
server.listen(port, () => {
    console.log(`Server is running on port ${port}.`)
})

// Export for Vercel
export default server

// CORS configuration
app.use(cors({
    origin: ['https://ai-code-collab.vercel.app', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

 