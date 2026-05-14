import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './Auth.css';

const ResetPassword = () => {
    const { t } = useTranslation();
    const { token } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    const API_URL = `http://${window.location.hostname}:5000/api`;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password.length < 6) {
            return toast.error(t('password_min_6'));
        }

        if (formData.password !== formData.confirmPassword) {
            return toast.error(t('passwords_do_not_match'));
        }

        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/auth/reset-password/${token}`, {
                password: formData.password
            });

            if (response.data.status === 'success') {
                setSuccess(true);
                toast.success(t('password_reset_success'));
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || t('error_resetting_password'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>🔑 {t('reset_password_title')}</h2>
                    <p className="auth-subtitle">{t('reset_password_desc')}</p>
                </div>

                {!success ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group password-group">
                            <label>{t('new_password')}:</label>
                            <div className="password-input-container">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    required
                                    placeholder={t('enter_new_password')}
                                    minLength="6"
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

                        <div className="form-group password-group">
                            <label>{t('confirm_new_password')}:</label>
                            <div className="password-input-container">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    required
                                    placeholder={t('confirm_new_password')}
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

                        <button type="submit" disabled={loading} className="auth-btn login-btn">
                            {loading ? t('resetting') : t('reset_password_btn')}
                        </button>
                    </form>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '30px 20px',
                        background: '#e8f5e9',
                        borderRadius: '12px',
                        margin: '20px 0'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
                        <h3 style={{ color: '#2e7d32', marginBottom: '10px' }}>{t('password_reset_success')}</h3>
                        <p style={{ color: '#555', lineHeight: '1.6' }}>
                            {t('redirecting_to_login')}
                        </p>
                    </div>
                )}

                <div className="auth-links">
                    <p>
                        <Link to="/login">{t('back_to_login')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
