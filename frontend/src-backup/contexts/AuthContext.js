import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import 'react-toastify/dist/ReactToastify.css';
const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [API_URL] = useState('http://localhost:5000/api');
// axios.defaults.baseURL = 'http://localhost:5000/api';
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setCurrentUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
            console.log('Attempting login for:', username);
      
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
           }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
      const { token, data } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  // FIXED: Updated to use the correct endpoint for citizen registration
const registerCitizen = async (userData) => {
  try {
    console.log('Registering citizen with data:', userData);
    
    const response = await axios.post(`${API_URL}/auth/register-citizen`, userData);

    console.log('Citizen registration response:', response.data);

    if (response.data && response.data.token && response.data.data) {
      const { token, data } = response.data;
      
      // Auto-login after registration
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } else {
      console.error('Invalid response structure:', response.data);
      return { 
        success: false, 
        message: 'Invalid response from server' 
      };
    }
  } catch (error) {
    console.error('Citizen registration error:', error.response?.data || error.message);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Registration failed' 
    };
  }
};

  const registerRepresentative = async (userData, role) => {
  try {
    console.log('Registering representative with data:', { ...userData, role });
    
    const response = await axios.post(`${API_URL}/auth/register`, {
      ...userData,
      role: role
    });

    console.log('Representative registration response:', response.data);
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Representative registration error:', error.response?.data || error.message);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Registration failed' 
    };
  }
};

  const createLowerLevelRepresentative = async (userData, targetRole) => {
    try {
      console.log('Creating lower level representative:', { ...userData, targetRole });
      
      const response = await axios.post(`${API_URL}/admin/users/representative`, {
        ...userData,
        role: targetRole
      });

      console.log('Lower level representative creation response:', response.data);
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Lower level representative creation error:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Creation failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    registerCitizen,
    registerRepresentative,
    createLowerLevelRepresentative,
    logout,
    API_URL
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;