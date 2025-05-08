import express from 'express'
import morgan from 'morgan'
import connect from './db/db.js';
import userRoutes from './routes/user.routes.js'
import cookieParser from 'cookie-parser';
import cors from 'cors'
import projectRoutes from './routes/project.routes.js'
import aiRoutes from './routes/ai.routes.js'
import testRoutes from './routes/test.routes.js'

connect();

const app = express();

// CORS configuration
const corsOptions = {
    origin: ['https://ai-code-collab.vercel.app', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Move cookieParser before routes

// Routes
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/ai', aiRoutes);
app.use('/test', testRoutes);

app.get('/', (req, res) => {
    res.send('Hello world');
});

export default app 