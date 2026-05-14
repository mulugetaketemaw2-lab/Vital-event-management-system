import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import BirthForm from './BirthForm';
import DeathForm from './DeathForm';
import MarriageForm from './MarriageForm';
import DivorceForm from './DivorceForm';
import AdoptionForm from './AdoptionForm';
import { useTranslation } from 'react-i18next';
import './EventForm.css';
import './BirthForm.css';
const EventForm = ({ onEventCreated }) => {
  const { t } = useTranslation();
  const [eventType, setEventType] = useState('');
  const [loading, setLoading] = useState(false);

  const { API_URL, currentUser } = useAuth();

  const renderForm = () => {
    const commonProps = {
      onSubmit: handleSubmit,
      loading: loading
    };

    switch (eventType) {
      case 'birth':
        return <BirthForm {...commonProps} />;
      case 'death':
        return <DeathForm {...commonProps} />;
      case 'marriage':
        return <MarriageForm {...commonProps} />;
      case 'divorce':
        return <DivorceForm {...commonProps} />;
      case 'adoption':
        return <AdoptionForm {...commonProps} />;
      default:
        return <div>{t('please_select_event_type')}</div>;
    }
  };

  const handleSubmit = async (eventData) => {
    // If the child form already handled submission (e.g. BirthForm, DeathForm with multipart data),
    // they pass the saved event object. We just need to trigger the completion logic.
    if (eventData && eventData._id) {
      toast.success(t('Registration completed successfully!'));
      onEventCreated();
      setEventType('');
      return;
    }

    // Otherwise, handle simple JSON submission here
    try {
      setLoading(true);
      await axios.post(`${API_URL}/events`, {
        type: eventType,
        ...eventData
      });

      toast.success(t('Event registered successfully!'));
      onEventCreated();
      setEventType('');
    } catch (error) {
      console.error('Event registration error:', error);
      toast.error(error.response?.data?.message || t('Error registering event'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-form">
      <div className="form-group">
        <label>{t('select_event_type')}:</label>
        <div className="event-type-buttons">
          <button
            type="button"
            className={`event-type-btn ${eventType === 'birth' ? 'active' : ''}`}
            onClick={() => setEventType('birth')}
          >
            👶 {t('birth')}
          </button>
          <button
            type="button"
            className={`event-type-btn ${eventType === 'death' ? 'active' : ''}`}
            onClick={() => setEventType('death')}
          >
            🪦 {t('death')}
          </button>
          <button
            type="button"
            className={`event-type-btn ${eventType === 'marriage' ? 'active' : ''}`}
            onClick={() => setEventType('marriage')}
          >
            💑 {t('marriage')}
          </button>
          <button
            type="button"
            className={`event-type-btn ${eventType === 'divorce' ? 'active' : ''}`}
            onClick={() => setEventType('divorce')}
          >
            💔 {t('divorce')}
          </button>
          <button
            type="button"
            className={`event-type-btn ${eventType === 'adoption' ? 'active' : ''}`}
            onClick={() => setEventType('adoption')}
          >
            🏠 {t('adoption')}
          </button>
        </div>
      </div>

      {eventType && (
        (currentUser?.isChild || 
         currentUser?.identityLinkage?.is_temporary_id || 
         currentUser?.identityLinkage?.id_type === 'Parental Reference') ? (
          <div className="restriction-notice-container" style={{ 
            padding: '25px', 
            backgroundColor: '#fff5f5', 
            border: '1px solid #fed7d7', 
            borderLeft: '5px solid #e53e3e', 
            borderRadius: '12px',
            marginTop: '25px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h4 style={{ color: '#c53030', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span> {t('independent_registrations_blocked')}
            </h4>
            <p style={{ color: '#744210', margin: '0 0 18px 0', fontSize: '1rem', lineHeight: '1.6' }}>
              {t('temporary_id_restriction_notice') || 'Because your account is currently linked via Parental Reference, you are restricted from registering certain independent life events until you upgrade to a unique National ID.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => window.location.href = '/citizen-dashboard?tab=profile'}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#e53e3e', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c53030'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e53e3e'}
              >
                {t('upgrade_account_now') || 'Upgrade Account Selection'}
              </button>
            </div>
          </div>
        ) : renderForm()
      )}
    </div>
  );
};

export default EventForm;