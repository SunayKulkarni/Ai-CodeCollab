import userModel from '../models/user.model.js';
import * as userService from '../services/user.service.js'
import { validationResult } from 'express-validator'
import redisClient from '../services/redis.service.js';

export const createUserController = async (req, res) => {
    console.log('Registration request received:', { body: req.body });
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        console.log('Creating user with data:', req.body);
        const user = await userService.createUser(req.body);
        console.log('User created successfully:', { id: user._id, email: user.email });
        
        const token = await user.generateJWT()
        console.log('JWT token generated');

        delete user._doc.password; // remove password from response
        console.log('Password removed from response');

        res.status(200).json({ user, token });
        console.log('Registration response sent');
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(400).send(error.message);
    }
}


export const loginController = async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        // Find user by email and 'select: false' as add password to return password
        const user = await userModel.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const isMatch = await user.isValidPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const token = await user.generateJWT()

        delete user._doc.password; // remove password from response

        res.status(200).json({ user, token });
    }
    catch (err) {
        res.status(400).send(err.message);
    }
}


export const profileController = async (req, res) => {
    console.log('Profile request received for user:', req.user);
    
    try {
        // Find user by email instead of _id since that's what we have in the token
        const user = await userModel.findOne({ email: req.user.email });
        if (!user) {
            console.log('User not found in database for email:', req.user.email);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('Found user in database:', {
            _id: user._id,
            email: user.email
        });

        res.status(200).json({
            user: {
                _id: user._id,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ message: 'Error fetching profile' });
    }
}


export const logoutController = async (req, res) => {

    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

        redisClient.set(token, 'logout', 'EX', 60 * 60 * 24 );

        res.status(200).json(
            { message: 'Logged Out successfully' }
        );
    }
    catch (err) {
        console.log(err);
        res.status(500).send(err.message);
    }
}



export const getAllUsersController = async (req, res) => {
    try {
        const loggedInUser = await userModel.findOne({ email: req.user.email });

        const allUsers = await userService.getAllUsers({ userId : loggedInUser._id });
        res.status(200).json({
            users: allUsers
        });
    } 
    catch (err) {
        res.status(400).send(err.message);
    }
}