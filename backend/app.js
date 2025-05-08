import express from 'express'
import morgan from 'morgan'
import connect from './db/db.js';
import userRoutes from './routes/user.routes.js'
import cookieParser from 'cookie-parser';
import cors from 'cors'
import projectRoutes from './routes/project.routes.js'
import aiRoutes from './routes/ai.routes.js'

connect();

const app = express();

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:5173', // Vite dev server
        'http://localhost:3000', // Local development
        'https://ai-code-collab.vercel.app', // Your specific Vercel URL
        'https://*.vercel.app'  // All Vercel deployments
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(morgan('dev'))

app.use(express.json());

app.use(express.urlencoded({ extended:true }))

app.use('/users', userRoutes)

app.use('/projects', projectRoutes)

app.use('/ai', aiRoutes)

app.use(cookieParser()) // middleware for parsing cookies

  
app.get('/', (req, res)=> {
    res.send('Hello world')
})


export default app 