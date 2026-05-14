import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      toast.success(`Welcome back, ${result.user.personalInfo?.firstName || result.user.username}!`);
      // Redirect based on user role
      navigate(`/${result.user.role}`);
    } else {
      toast.error(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Ethiopia Vital Events System</h2>
          <p className="auth-subtitle">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
            />
          </div>
          
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>
          
          <button type="submit" disabled={loading} className="auth-btn login-btn">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>
            Are you a citizen? <Link to="/register-citizen">Register as Citizen</Link>
          </p>
          <p>
            <Link to="/">Back to Home</Link>
          </p>
        </div>

        <div className="login-help">
          <h5>Login Help:</h5>
          <ul>
            <li><strong>Citizens:</strong> Register vital events and track status</li>
            <li><strong>Representatives:</strong> Use credentials provided by your supervisor</li>
            <li>Contact your supervisor if you forgot your password</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;