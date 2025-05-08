import jwt from 'jsonwebtoken';
import redisClient from '../services/redis.service.js';

export const authUser = async (req, res, next) => {
    try {
        console.log('Auth middleware - Headers:', req.headers);
        console.log('Auth middleware - Cookies:', req.cookies);
        
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        console.log('Auth middleware - Extracted token:', token ? 'Token exists' : 'No token');

        if (!token) {
            console.log('Auth middleware - No token found');
            return res.status(401).json({ error: 'Not authorized, token is missing' });
        }

        // check if token is expired
        const isBlacklisted = await redisClient.get(token);
        console.log('Auth middleware - Token blacklist check:', isBlacklisted ? 'Blacklisted' : 'Not blacklisted');

        if (isBlacklisted) {
            console.log('Auth middleware - Token is blacklisted');
            res.cookie('token', '', { expires: new Date(0) });
            return res.status(401).json({ error: 'Token is expired' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Auth middleware - Token decoded:', decoded);
        
        req.user = decoded;
        next();
    }
    catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(401).json({ error: 'Unauthorized User' });
    }
}