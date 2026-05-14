import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getLocationName } from '../Common/LocationSelector';
import { useTranslation } from 'react-i18next';
import './CitizenProfile.css';

const CitizenProfile = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const getLocationString = () => {
    const { location } = currentUser;
    if (!location) return 'Not specified';

    const parts = [];
    if (location.kebele) parts.push(getLocationName('kebele', location.kebele));
    if (location.woreda) parts.push(getLocationName('woreda', location.woreda));
    if (location.zone) parts.push(getLocationName('zone', location.zone));
    if (location.region) parts.push(getLocationName('region', location.region));

    return parts.join(', ') || 'Not specified';
  };

  const BASE_URL = 'http://localhost:5000';

  return (
    <div className="citizen-profile">
      <div className="profile-header">
        <div className="profile-avatar-container">
          {currentUser?.personalInfo?.photo?.url || currentUser?.profilePhoto?.url ? (
            <img
              src={`${BASE_URL}${currentUser?.personalInfo?.photo?.url || currentUser?.profilePhoto?.url}`}
              alt={`${currentUser.personalInfo?.firstName} ${currentUser.personalInfo?.lastName}`}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              <span>👤</span>
            </div>
          )}
        </div>
        <h3>{t('my_profile_title')}</h3>
        <p>{t('personal_info_desc')}</p>

        {currentUser?.updateRequest?.status && currentUser.updateRequest.status !== 'none' && (
          <div className={`update-status-banner ${currentUser.updateRequest.status}`}>
            <span>🔄 {t('update_request')} <strong>{currentUser.updateRequest.status.replace('_', ' ').toUpperCase()}</strong></span>
            {currentUser.updateRequest.status === 'rejected' && (
              <p className="rejection-reason">{t('reason')} {currentUser.updateRequest.kebeleReview?.comments || currentUser.updateRequest.woredaReview?.comments}</p>
            )}
          </div>
        )}

        <div className="profile-actions">
          <button
            className="update-request-btn"
            onClick={() => window.location.href = '/initiate-update'}
          >
            📝 {t('update_profile_info')}
          </button>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h4>{t('personal_information')}</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>{t('first_name')}:</label>
              <span>{currentUser?.personalInfo?.firstName || t('not_provided')}</span>
            </div>
            <div className="info-item">
              <label>{t('last_name')}:</label>
              <span>{currentUser?.personalInfo?.lastName || t('not_provided')}</span>
            </div>
            <div className="info-item">
              <label>{t('email_address')}:</label>
              <span>{currentUser?.personalInfo?.email || t('not_provided')}</span>
            </div>
            <div className="info-item">
              <label>{t('phone_number')}:</label>
              <span>{currentUser?.personalInfo?.phone || t('not_provided')}</span>
            </div>
            <div className="info-item">
              <label>{t('date_of_birth')}:</label>
              <span>{currentUser?.personalInfo?.dateOfBirth ? new Date(currentUser.personalInfo.dateOfBirth).toLocaleDateString() : t('not_provided')}</span>
            </div>
            <div className="info-item">
              <label>{t('gender')}:</label>
              <span>{currentUser?.personalInfo?.gender ? t(`gender_${currentUser.personalInfo.gender.toLowerCase()}`) : t('not_specified')}</span>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h4>{t('account_information')}</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>{t('username')}:</label>
              <span>{currentUser?.username}</span>
            </div>
            <div className="info-item">
              <label>{t('user_role')}</label>
              <span className="role-badge">{t('citizen_role')}</span>
            </div>
            <div className="info-item">
              <label>{t('account_created')}</label>
              <span>{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : t('unknown')}</span>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h4>{t('location_information')}</h4>
          <div className="location-info">
            <p><strong>{t('registered_location')}</strong> {getLocationString()}</p>
            <small>
              {t('location_info_desc')}
            </small>
          </div>
        </div>

        <div className="profile-section">
          <h4>{t('uploaded_documents')}</h4>
          <div className="documents-grid">
            {currentUser?.idCard?.url && (
              <div className="document-card">
                <div className="document-icon">🆔</div>
                <div className="document-info">
                  <span className="document-title">{t('id_card_document')}</span>
                  <a
                    href={`${BASE_URL}${currentUser.idCard.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-link"
                  >
                    {t('view_document')}
                  </a>
                </div>
              </div>
            )}

            {currentUser?.documents?.map((doc, index) => (
              <div key={index} className="document-card">
                <div className="document-icon">📄</div>
                <div className="document-info">
                  <span className="document-title">{doc.originalName || `${t('document')} ${index + 1}`}</span>
                  <a
                    href={`${BASE_URL}${doc.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-link"
                  >
                    {t('view_document')}
                  </a>
                </div>
              </div>
            ))}

            {!currentUser?.idCard?.url && (!currentUser?.documents || currentUser.documents.length === 0) && (
              <p className="no-documents">{t('no_documents_uploaded')}</p>
            )}
          </div>
        </div>

        <div className="profile-section">
          <h4>{t('system_information')}</h4>
          <div className="system-info">
            <p>
              <strong>{t('status')}</strong>
              <span className="status-active">{t('active')}</span>
            </p>
            <p>
              <strong>{t('events_processing')}</strong>
              {t('events_processing_desc')}
            </p>
            <p>
              <strong>{t('support')}</strong>
              {t('support_desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenProfile;