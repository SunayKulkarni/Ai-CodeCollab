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
        const token = socket.handshake.auth?.token;
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

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded){
                console.error('Invalid token');
            return next(new Error('Authentication error'));
        }
        socket.userId = decoded;
            console.log('Socket authenticated successfully');
        next();
        } catch (jwtError) {
            console.error('JWT verification error:', jwtError);
            return next(new Error('Invalid token'));
        }
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
        try {
            console.log('Received project message:', data);
            const { message, sender, projectId, id } = data;

            // Check if message already exists in database
            const existingMessage = await chatModel.findOne({ _id: id });
            if (existingMessage) {
                console.log('Message already exists in database, skipping:', id);
                return;
            }

            // Save the message to the database
            console.log('Attempting to save message to MongoDB Atlas:', {
                projectId,
                message,
                sender: {
                    _id: sender._id,
                    email: sender.email,
                    type: 'user'
                },
                timestamp: new Date()
            });

            const savedMessage = await chatModel.create({
                _id: id, // Use the provided ID
                projectId,
                message,
                sender: {
                    _id: sender._id,
                    email: sender.email,
                    type: 'user'
                },
                timestamp: new Date()
            });
            console.log('Successfully saved message to MongoDB Atlas. Document ID:', savedMessage._id);

            // Broadcast the message to all clients in the project room
            io.to(projectId).emit('project-message', savedMessage);

            // Check if this is an AI request
            if (message.toLowerCase().startsWith('@ai ')) {
                console.log('AI request detected:', message);
                try {
                    // Generate AI response
                    const prompt = message.substring(4).trim(); // Remove '@ai ' prefix
                    console.log('Sending prompt to AI:', prompt);
                    const aiResponse = await generateResult(prompt);
                    console.log('AI generated response:', aiResponse);

                    // Generate unique ID for AI message
                    const aiMessageId = `ai_${Date.now()}`;

                    // Save AI response to database
                    console.log('Saving AI response to MongoDB Atlas...');
                    const aiMessage = await chatModel.create({
                        _id: aiMessageId,
                        projectId,
                        message: aiResponse,
                    sender: {
                            _id: 'ai',
                            email: 'ai@assistant.com',
                        type: 'ai'
                        },
                        timestamp: new Date()
                    });
                    console.log('Successfully saved AI response to MongoDB Atlas. Document ID:', aiMessage._id);

                    // Broadcast AI response to all clients
                    io.to(projectId).emit('project-message', aiMessage);
                } catch (error) {
                    console.error('Error generating AI response:', error);
                    // Send error message to the client
                    const errorMessageId = `error_${Date.now()}`;
                    const errorMessage = await chatModel.create({
                        _id: errorMessageId,
                        projectId,
                        message: `Error: ${error.message}`,
                    sender: {
                            _id: 'ai',
                            email: 'ai@assistant.com',
                        type: 'ai'
                        },
                        timestamp: new Date()
                    });
                    io.to(projectId).emit('project-message', errorMessage);
                }
            }
        } catch (error) {
            console.error('Error handling project message:', error);
        }
    });

    // When a user connects, send them the chat history
    socket.on('join-project', async (projectId) => {
        try {
            console.log('User joining project:', projectId);
            socket.join(projectId);
            
            // Fetch chat history from database
            console.log('Fetching chat history for project:', projectId);
            const chatHistory = await chatModel.find({ projectId })
                .sort({ timestamp: 1 })
                .populate('sender._id', 'email _id');
                
            console.log('Found chat history:', {
                count: chatHistory.length,
                messages: chatHistory.map(msg => ({
                    id: msg._id,
                    message: msg.message,
                    sender: msg.sender,
                    timestamp: msg.timestamp
                }))
            });
            
            socket.emit('chat-history', chatHistory);
        } catch (error) {
            console.error('Error fetching chat history:', error);
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

 