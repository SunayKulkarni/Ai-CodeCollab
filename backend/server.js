import http from 'http'
import app from './app.js'
import dotenv from 'dotenv'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import projectModal from './models/project.model.js'
import chatModel from './models/chat.model.js'
import { generateResult } from './services/ai.service.js'
dotenv.config()

const port = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app)

// Socket.IO configuration
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL
            : '*',
        methods: ['GET', 'POST'],
        credentials: true
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
    socket.roomId = socket.project._id.toString();

    console.log('a user connected');

    socket.join(socket.roomId);

    // Send chat history when user connects
    chatModel.find({ projectId: socket.project._id })
        .sort({ timestamp: 1 })
        .then(messages => {
            socket.emit('chat-history', messages);
        })
        .catch(err => {
            console.error('Error fetching chat history:', err);
        });

    socket.on('project-message', async (data) => {
        console.log('Received message:', data);
        const aiIsPresentInMessage = data.message.toLowerCase().includes('@ai');
        console.log('AI present in message:', aiIsPresentInMessage);
        
        try {
            // Save the user message to database
            const chatMessage = new chatModel({
                projectId: socket.project._id,
                message: data.message,
                sender: {
                    _id: data.sender._id,
                    email: data.sender.email,
                    type: 'user'
                }
            });
            await chatMessage.save();
            console.log('User message saved to database');
            
            socket.broadcast.to(socket.roomId).emit('project-message', data);
            console.log('User message broadcasted to room');
            
            if(aiIsPresentInMessage){
                console.log('Processing AI request...');
                const prompt = data.message.replace('@ai', '').trim();
                console.log('AI prompt:', prompt);
                
                const result = await generateResult(prompt);
                console.log('AI response:', result);
                
                // Save AI response to database
                const aiMessage = new chatModel({
                    projectId: socket.project._id,
                    message: result,
                    sender: {
                        email: 'AI',
                        type: 'ai'
                    }
                });
                await aiMessage.save();
                console.log('AI message saved to database');

                io.to(socket.roomId).emit('project-message', {
                    message: result,
                    sender: {
                        email: 'AI',
                        type: 'ai'
                    }
                });
                console.log('AI response sent to room');
            }
        } catch (err) {
            console.error('Error in project-message handler:', err);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.leave(socket.roomId);
    });
});

// Start server
server.listen(port, () => {
    console.log(`Server is running on port ${port}.`)
})

// Export for Vercel
export default server

 