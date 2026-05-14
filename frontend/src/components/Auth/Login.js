import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import './Auth.css';

const Login = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    category: 'Citizen',
    level: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Force form reset on mount to clear any browser-cached values
  React.useEffect(() => {
    setFormData({ username: '', password: '', category: 'Citizen', level: '' });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.username, formData.password, formData.category, formData.level);

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
          <h2>{t('ethiopia_vital_events')}</h2>
          <p className="auth-subtitle">{t('login_to_account')}</p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Dummy hidden fields to catch browser autofill */}
          <input type="text" name="prevent_autofill" style={{ display: 'none' }} tabIndex="-1" />
          <input type="password" name="prevent_autofill_pwd" style={{ display: 'none' }} tabIndex="-1" />

          <div className="form-group">
            <label>{t('username')}:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder={t('enter_username')}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group password-group">
            <label>{t('password')}:</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder={t('enter_password')}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Triple-Factor: User Type Selection moved here between password and login */}
          <div className="form-group">
            <label>User Type:</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="Citizen">Citizen</option>
              <option value="Representative">Representative</option>
            </select>
          </div>

          {/* Conditional Logic: Representation Level */}
          {formData.category === 'Representative' && (
            <div className="form-group animate-fade-in">
              <label>Representation Level:</label>
              <select
                name="level"
                value={formData.level}
                onChange={handleChange}
                required
              >
                <option value="">Select Level</option>
                <option value="Kebele">Kebele</option>
                <option value="Wereda">Wereda</option>
                <option value="Zone">Zone</option>
                <option value="Region">Region</option>
                <option value="National">National</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-btn login-btn">
            {loading ? t('logging_in') : t('login')}
          </button>

          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <Link to="/forgot-password" style={{
              fontSize: '0.9rem',
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '500'
            }}>
              {t('forgot_password')}?
            </Link>
          </div>
        </form>

        <div className="auth-links">
          <p>
            {t('are_you_citizen')} <Link to="/register-citizen">{t('register_citizen')}</Link>
          </p>
          <p>
            <Link to="/">{t('back_to_home')}</Link>
          </p>
        </div>

        <div className="login-help">
          <h5>{t('login_help')}:</h5>
          <ul>
            <li>Select "Citizen" for individual resident accounts.</li>
            <li>Select "Representative" and your level for official government accounts.</li>
            <li>Your category and level must match your registered profile.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;