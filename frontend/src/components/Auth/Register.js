import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LocationSelector from '../Common/LocationSelector';
import { useTranslation } from 'react-i18next';
import { transliterate } from '../../utils/geezUtil';
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
  const [showPassword, setShowPassword] = useState(false);
  const [phoneticMode, setPhoneticMode] = useState(false);
  const { t } = useTranslation();

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
    let filteredValue = value;

    // Strict validation logic
    if (name.includes('firstName') || name.includes('lastName')) {
      // Allow letters (Eng/Amh) and spaces
      filteredValue = value.replace(/[^a-zA-Z\s\u1200-\u137F]/g, '');

      // Phonetic Transliteration
      if (phoneticMode) {
        filteredValue = transliterate(filteredValue);
      }
    } else if (name.includes('phone')) {
      // Allow only digits
      filteredValue = value.replace(/\D/g, '');
    }

    if (name.startsWith('personalInfo.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          [field]: filteredValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: filteredValue
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
        <h2>{t('citizen_registration')}</h2>
        <p className="auth-subtitle">{t('create_account_desc')}</p>

        {/* Phonetic Mode Toggle */}
        <div className="phonetic-toggle-container" style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#ebf8ff',
          borderRadius: '8px',
          border: '1px solid #90cdf4',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
            <input
              type="checkbox"
              checked={phoneticMode}
              onChange={(e) => setPhoneticMode(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span className="slider round" style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: phoneticMode ? '#3182ce' : '#cbd5e0',
              transition: '.44s',
              borderRadius: '20px'
            }}>
              <span style={{
                position: 'absolute',
                height: '16px', width: '16px',
                left: phoneticMode ? '22px' : '2px',
                bottom: '2px',
                backgroundColor: 'white',
                transition: '.44s',
                borderRadius: '50%'
              }}></span>
            </span>
          </label>
          <div>
            <strong style={{ display: 'block', fontSize: '14px', color: '#2c5282' }}>{t('phonetic_typing')}</strong>
            <small style={{ color: '#4a5568', fontSize: '12px' }}>{t('phonetic_typing_desc')}</small>
          </div>
        </div>

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
              <div className="form-group password-group">
                <label>Password:</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group password-group">
                <label>Confirm Password:</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
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