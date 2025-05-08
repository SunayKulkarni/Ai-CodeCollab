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
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL] // Add your frontend URL in production
        : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use(morgan('dev'))

app.use(express.json());

app.use(express.urlencoded({ extended:true }))

app.use('/users', userRoutes)

app.use('/projects', projectRoutes)

app.use('/ai', aiRoutes)

app.use('/test', testRoutes)

app.use(cookieParser()) // middleware for parsing cookies

  
app.get('/', (req, res)=> {
    res.send('Hello world')
})


export default app 