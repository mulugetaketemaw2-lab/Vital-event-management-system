import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './Auth.css';

const ForgotPassword = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const API_URL = `http://${window.location.hostname}:5000/api`;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            return toast.error(t('please_enter_email'));
        }

        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });

            if (response.data.status === 'success') {
                setSent(true);
                toast.success(t('reset_link_sent'));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || t('error_sending_reset'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>🔐 {t('forgot_password_title')}</h2>
                    <p className="auth-subtitle">{t('forgot_password_desc')}</p>
                </div>

                {!sent ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>{t('email')}:</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder={t('enter_registered_email')}
                                autoComplete="off"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="auth-btn login-btn">
                            {loading ? t('sending') : t('send_reset_link')}
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
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📧</div>
                        <h3 style={{ color: '#2e7d32', marginBottom: '10px' }}>{t('email_sent_title')}</h3>
                        <p style={{ color: '#555', lineHeight: '1.6' }}>
                            {t('email_sent_desc')}
                        </p>
                        <p style={{ color: '#888', fontSize: '13px', marginTop: '15px' }}>
                            {t('check_spam_folder')}
                        </p>
                    </div>
                )}

                <div className="auth-links">
                    <p>
                        {t('remember_password')} <Link to="/login">{t('back_to_login')}</Link>
                    </p>
                    <p>
                        <Link to="/">{t('back_to_home')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
