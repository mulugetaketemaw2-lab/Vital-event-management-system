import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LocationSelector from '../Common/LocationSelector';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    location: {
      region: '',
      zone: '',
      woreda: '',
      kebele: ''
    }
  });
  const [loading, setLoading] = useState(false);
  
  const { registerCitizen } = useAuth();
  const navigate = useNavigate();

  // Use useCallback to memoize the location change handler
  const handleLocationChange = useCallback((locationData) => {
    setFormData(prev => ({
      ...prev,
      location: locationData
    }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('personalInfo.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!formData.location.region || !formData.location.zone || 
        !formData.location.woreda || !formData.location.kebele) {
      toast.error('Please select your complete location (Region, Zone, Woreda, and Kebele)');
      return;
    }

    setLoading(true);

    const userData = {
      username: formData.username,
      password: formData.password,
      personalInfo: formData.personalInfo,
      location: formData.location
    };

    const result = await registerCitizen(userData);
    
    if (result.success) {
      toast.success('Registration successful! Welcome to your personal dashboard.');
      navigate('/citizen');
    } else {
      toast.error(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Citizen Registration</h2>
        <p className="auth-subtitle">Create your account to register vital events</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h4>Account Information</h4>
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Choose a username"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Minimum 6 characters"
                />
              </div>
              
              <div className="form-group">
                <label>Confirm Password:</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter your password"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Personal Information</h4>
            <div className="form-row">
              <div className="form-group">
                <label>First Name:</label>
                <input
                  type="text"
                  name="personalInfo.firstName"
                  value={formData.personalInfo.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Your first name"
                />
              </div>

              <div className="form-group">
                <label>Last Name:</label>
                <input
                  type="text"
                  name="personalInfo.lastName"
                  value={formData.personalInfo.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Your last name"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="personalInfo.email"
                  value={formData.personalInfo.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label>Phone:</label>
                <input
                  type="tel"
                  name="personalInfo.phone"
                  value={formData.personalInfo.phone}
                  onChange={handleChange}
                  placeholder="Your phone number"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Location Information</h4>
            <p className="location-help">
              Select your location to ensure your events are processed through the correct administrative hierarchy.
            </p>
            <LocationSelector onLocationChange={handleLocationChange} />
          </div>

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Creating Account...' : 'Create Account & Continue'}
          </button>
        </form>
        
        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;