import React, { useContext, useEffect, useState } from 'react'
import { UserContext } from '../context/user.context.jsx'
import { useNavigate } from'react-router-dom';
import axios from '../config/axios.js';

const UserAuth = ({ children }) => {
    const { user, setUser } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                // Try to get user profile to validate token
                const response = await axios.get('/users/profile');
                if (response.data && response.data.user) {
                    setUser(response.data.user);
                    setLoading(false);
                } else {
                    throw new Error('Invalid user data');
                }
            } catch (error) {
                console.error('Auth error:', error);
                localStorage.removeItem('token');
                navigate('/login');
            }
        };

        validateToken();
    }, [token, navigate, setUser]);
    
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return children;
}

export default UserAuth
