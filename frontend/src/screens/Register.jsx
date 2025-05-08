import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from '../config/axios.js'
import { UserContext } from '../context/user.context.jsx'

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  async function submitHandler(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post('/users/register', { 
        email, 
        password 
      });

      if (response.data) {
        console.log('Registration successful:', response.data);
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        navigate('/');
      } else {
        throw new Error('No data received from server');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response) {
        setError(err.response.data?.message || 'Registration failed. Please try again.');
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Register</h2>
        {error && (
          <div className="bg-red-500 text-white p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-1">Email</label>
            <input
              type="email"
              className="w-full p-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Password</label>
            <input
              type="password"
              className="w-full p-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg font-semibold transition ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="text-gray-400 text-center mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:underline">
            login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
