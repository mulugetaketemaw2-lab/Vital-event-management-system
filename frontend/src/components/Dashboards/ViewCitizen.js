import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { getLocationName } from '../Common/LocationSelector';
import './CitizenProfile.css';

const ViewCitizen = () => {
    const { citizenId } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { API_URL } = useAuth();
    const [citizen, setCitizen] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCitizen = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/representatives/citizens/${citizenId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.status === 'success') {
                    setCitizen(response.data.data.citizen);
                }
            } catch (error) {
                console.error('Error fetching citizen:', error);
                toast.error(t('failed_load_citizen'));
            } finally {
                setLoading(false);
            }
        };

        fetchCitizen();
    }, [citizenId, API_URL, t]);

    if (loading) return <div className="loading-spinner">Loading...</div>;
    if (!citizen) return <div className="error-msg">Citizen not found.</div>;

    const getLocationString = () => {
        const { location } = citizen;
        if (!location) return 'Not specified';
        const parts = [];
        if (location.kebele) parts.push(getLocationName('kebele', location.kebele));
        if (location.woreda) parts.push(getLocationName('woreda', location.woreda));
        if (location.zone) parts.push(getLocationName('zone', location.zone));
        if (location.region) parts.push(getLocationName('region', location.region));
        return parts.join(', ') || 'Not specified';
    };

    const BASE_URL = API_URL.replace('/api', '');

    return (
        <div className="citizen-profile">
            <div className="profile-header">
                <button onClick={() => navigate(-1)} className="back-btn">← {t('back')}</button>
                <div className="profile-avatar-container">
                    {citizen?.profilePhoto?.url || citizen?.personalInfo?.photo?.url ? (
                        <img
                            src={`${BASE_URL}${citizen?.profilePhoto?.url || citizen?.personalInfo?.photo?.url}`}
                            alt={`${citizen.personalInfo?.firstName} ${citizen.personalInfo?.lastName}`}
                            className="profile-avatar"
                        />
                    ) : (
                        <div className="profile-avatar-placeholder">
                            <span>👤</span>
                        </div>
                    )}
                </div>
                <h3>{citizen.personalInfo.firstName} {citizen.personalInfo.lastName}</h3>
                <p>National ID: {citizen.personalInfo.idNumber || 'PENDING'}</p>

                <div className="status-badge-container">
                    <span className={`status-badge ${citizen.status}`}>
                        {citizen.status.toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="profile-content">
                <div className="profile-section">
                    <h4>{t('personal_information')}</h4>
                    <div className="info-grid">
                        <div className="info-item"><label>{t('first_name')}:</label> <span>{citizen.personalInfo.firstName}</span></div>
                        <div className="info-item"><label>{t('last_name')}:</label> <span>{citizen.personalInfo.lastName}</span></div>
                        <div className="info-item"><label>{t('gender')}:</label> <span>{citizen.personalInfo.gender || 'N/A'}</span></div>
                        <div className="info-item"><label>{t('date_of_birth')}:</label> <span>{new Date(citizen.personalInfo.dateOfBirth).toLocaleDateString()}</span></div>
                        <div className="info-item"><label>{t('phone')}:</label> <span>{citizen.personalInfo.phone || 'N/A'}</span></div>
                        <div className="info-item"><label>{t('email')}:</label> <span>{citizen.personalInfo.email || 'N/A'}</span></div>
                    </div>
                </div>

                <div className="profile-section">
                    <h4>{t('location_information')}</h4>
                    <div className="location-info">
                        <p><strong>{t('registered_location')}</strong> {getLocationString()}</p>
                    </div>
                </div>

                <div className="profile-section">
                    <h4>{t('family_information')}</h4>
                    <div className="info-grid">
                        <div className="info-item"><label>Father's Name:</label> <span>{citizen.personalInfo.familyInfo?.fatherName || 'N/A'}</span></div>
                        <div className="info-item"><label>Mother's Name:</label> <span>{citizen.personalInfo.familyInfo?.motherName || 'N/A'}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewCitizen;
