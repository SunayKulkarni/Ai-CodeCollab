import React, { useEffect, useContext } from 'react'
import { UserContext } from '../context/user.context.jsx'
import { useNavigate } from'react-router-dom';
import jwtDecode from 'jwt-decode';

const UserAuth = ({ children }) => {
    const { user, setUser } = useContext(UserContext);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                console.log('No token found, redirecting to login');
                navigate('/login');
                return;
            }

            try {
                console.log('Validating token...');
                const decodedToken = jwtDecode(token);
                console.log('Decoded token:', decodedToken);
                
                if (decodedToken && decodedToken.email) {
                    console.log('Setting user data from token');
                    setUser({
                        email: decodedToken.email,
                        _id: decodedToken._id
                    });
                } else {
                    console.log('Invalid token data, redirecting to login');
                    localStorage.removeItem('token');
                    navigate('/login');
                }
            } catch (err) {
                console.error('Token validation error:', err);
                localStorage.removeItem('token');
                navigate('/login');
            }
        };

        validateToken();
    }, [token, navigate, setUser]);
    
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return children;
}

export default UserAuth
