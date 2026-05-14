import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import EventForm from '../Events/EventForm';
import EventList from '../Events/EventList';
import CitizenProfile from './CitizenProfile';
import EditCitizenRegistration from '../Auth/EditCitizenRegistration';
import MyCertificates from './MyCertificates';
import MaturityWarningModal from '../Common/MaturityWarningModal';
import './Dashboard.css';

const CitizenDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMaturityModal, setShowMaturityModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    certificates: 0
  });

  const { currentUser, API_URL, logout } = useAuth();

  useEffect(() => {
    if (currentUser?.maturityStatus === 'action_required') {
      setShowMaturityModal(true);
    }

    // Sync active tab with URL hash for navigation from Layout
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['dashboard', 'register', 'my-events', 'certificates', 'other-certificates', 'registered-credentials', 'profile'];
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    handleHashChange(); // Run once on mount
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'my-events' || activeTab === 'registered-credentials') {
      fetchMyEvents();
    }
    fetchDashboardStats();
  }, [activeTab]);

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/events/my-events`);
      setEvents(response.data.data.events);
    } catch (error) {
      // toast.error('Error fetching your events');
    } finally {
      setLoading(false);
    }
  };


  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats/dashboard-stats`);
      const stats = response.data.data.stats;

      setStats({
        total: stats.totalEvents || 0,
        pending: stats.pendingEvents || 0,
        approved: stats.approvedEvents || 0,
        completed: stats.completedEvents || 0,
        certificates: stats.completedEvents || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // toast.error('Error fetching dashboard statistics');
    }
  };

  const handleEventCreated = () => {
    toast.success(t('event_registered_success'));
    fetchMyEvents();
    fetchDashboardStats();
    setActiveTab('my-events');
  };

  // Handle Editing State
  if (isEditing) {
    return (
      <EditCitizenRegistration
        onCancel={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false);
          window.location.reload(); // Refresh to get new pending status
        }}
      />
    );
  }

  // Handle Rejected Status
  if (currentUser?.status === 'rejected') {
    return (
      <div className="dashboard">
        <div className="dashboard-header" style={{ backgroundColor: '#ffebee', color: '#c62828' }}>
          <h2>⚠️ {t('registration_rejected')}</h2>
          <p>{t('registration_not_approved')}</p>
        </div>

        <div className="rejection-details" style={{ padding: '20px', background: 'white', borderRadius: '8px', margin: '20px 0', border: '1px solid #ffcdd2' }}>
          <h4 style={{ marginTop: 0 }}>{t('rejection_reason')}</h4>
          <p className="reason-text" style={{ fontSize: '1.1em', padding: '10px', background: '#fff', borderLeft: '4px solid #c62828' }}>
            {currentUser.verificationNotes || currentUser.reviewComments || t('no_reason_provided')}
          </p>

          <div className="action-area" style={{ marginTop: '20px' }}>
            <p>{t('fix_resubmit_desc')}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="action-btn"
              style={{ backgroundColor: '#c62828' }}
            >
              ✏️ {t('fix_resubmit')}
            </button>
          </div>
        </div>

        <div className="profile-preview">
          <h3>{t('current_profile_info')}</h3>
          <CitizenProfile />
        </div>
      </div>
    );
  }

  // Pending Verification Status
  if (currentUser?.status === 'pending' || currentUser?.status === 'pending_verification') {
    return (
      <div className="dashboard">
        <div className="dashboard-header" style={{ backgroundColor: '#e3f2fd', color: '#0d47a1' }}>
          <h2>⏳ {t('registration_pending')}</h2>
          <p>{t('registration_under_review')}</p>
        </div>
        <div className="pending-notice" style={{ padding: '20px', background: 'white', marginTop: '20px', borderRadius: '8px' }}>
          <p>{t('pending_notice_desc')}</p>
          <CitizenProfile />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {showMaturityModal && (
        <MaturityWarningModal
          user={currentUser}
          onClose={() => setShowMaturityModal(false)}
        />
      )}
      <div className="dashboard-header">
        <h2>{t('welcome')}, {currentUser?.personalInfo?.firstName}!</h2>
        <p>{t('your_personal_vital_events_dashboard') || 'Your Personal Vital Events Dashboard'}</p>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>{t('total_events')}</p>
        </div>
        <div className="stat-card pending">
          <h3>{stats.pending}</h3>
          <p>{t('pending')}</p>
        </div>
        <div className="stat-card approved">
          <h3>{stats.approved}</h3>
          <p>{t('approved')}</p>
        </div>
        <div className="stat-card completed">
          <h3>{stats.completed}</h3>
          <p>{t('completed')}</p>
        </div>
        <div className="stat-card certificate">
          <h3>{stats.certificates}</h3>
          <p>{t('certificates')}</p>
        </div>
      </div>

      <div className="tabs activity-grid">
        <button
          className={`tab tab-dashboard ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-text">{t('dashboard')}</span>
        </button>
        <button
          className={`tab tab-register ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          <span className="tab-icon">➕</span>
          <span className="tab-text">{t('register_event')}</span>
        </button>
        <button
          className={`tab tab-my-events ${activeTab === 'my-events' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-events')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-text">{t('my_events')} ({events.length})</span>
        </button>
        <button
          className={`tab tab-birth-certificate ${activeTab === 'certificates' ? 'active' : ''}`}
          onClick={() => setActiveTab('certificates')}
        >
          <span className="tab-icon">🪪</span>
          <span className="tab-text">{t('birth_certificate')}</span>
        </button>
        <button
          className={`tab tab-other-certificates ${activeTab === 'other-certificates' ? 'active' : ''}`}
          onClick={() => setActiveTab('other-certificates')}
        >
          <span className="tab-icon">📜</span>
          <span className="tab-text">{t('other_certificates')}</span>
        </button>
        <button
          className={`tab tab-registered-credentials ${activeTab === 'registered-credentials' ? 'active' : ''}`}
          onClick={() => setActiveTab('registered-credentials')}
        >
          <span className="tab-icon">🔐</span>
          <span className="tab-text">{t('registered_credentials')} ({events.filter(e => e.registeredUser || e.childAccountInfo?.username).length})</span>
        </button>
        <button
          className={`tab tab-my-profile ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="tab-icon">👤</span>
          <span className="tab-text">{t('my_profile')}</span>
        </button>
        <button
          className="tab tab-logout logout-tab"
          onClick={logout}
        >
          <span className="tab-icon">🚪</span>
          <span className="tab-text">{t('logout')}</span>
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-overview">
            <h3>{t('quick_overview')}</h3>
            <div className="overview-cards">
              <div className="overview-card">
                <h4>{t('register_event')}</h4>
                <p>{t('register_events_desc')}</p>
                <button
                  onClick={() => setActiveTab('register')}
                  className="action-btn"
                >
                  {t('start_registration')}
                </button>
              </div>
              <div className="overview-card">
                <h4>{t('view_events')}</h4>
                <p>{t('check_status_desc')}</p>
                <button
                  onClick={() => setActiveTab('my-events')}
                  className="action-btn"
                >
                  {t('view_events')}
                </button>
              </div>
              <div className="overview-card">
                <h4>{t('certificates')}</h4>
                <p>{t('view_certificates_desc')}</p>
                <button
                  onClick={() => setActiveTab('certificates')}
                  className="action-btn"
                >
                  {t('view_certificates')}
                </button>
              </div>
            </div>

            <div className="recent-activities">
              <h4>{t('recent_activities')}</h4>
              {events.length > 0 ? (
                <div className="activities-list">
                  {events.slice(0, 5).map(event => (
                    <div key={event._id} className="activity-item">
                      <span className={`activity-type ${event.type}`}>
                        {t(event.type) ? t(event.type).toUpperCase() : event.type.toUpperCase()}
                      </span>
                      <span className="activity-date">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </span>
                      <span className={`activity-status ${event.status}`}>
                        {event.status}
                      </span>
                      {event.certificateUrl && (
                        <span className="certificate-badge">📜</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-activities">{t('no_records')}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'register' && (
          <div className="registration-content">
            <EventForm onEventCreated={handleEventCreated} />
          </div>
        )}

        {activeTab === 'my-events' && (
          <EventList events={events} loading={loading} />
        )}

        {activeTab === 'certificates' && (
          <MyCertificates showOnlyID={true} />
        )}

        {activeTab === 'other-certificates' && (
          <MyCertificates showOnlyVital={true} />
        )}

        {activeTab === 'registered-credentials' && (
          <div className="registered-credentials">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', borderBottom: '2px solid #f0f4f8', paddingBottom: '15px' }}>
              <div style={{ padding: '12px', backgroundColor: '#ebf4ff', borderRadius: '12px', color: '#3182ce' }}>
                <span style={{ fontSize: '28px' }}>🔐</span>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#2d3748' }}>{t('credentials_registered')}</h3>
                <p style={{ margin: '5px 0 0 0', color: '#718096', fontSize: '0.95rem' }}>{t('credentials_registered_desc')}</p>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div className="loading-spinner"></div>
                <p style={{ marginTop: '15px', color: '#718096' }}>{t('loading_credentials')}</p>
              </div>
            ) : events.filter(e => e.registeredUser || e.childAccountInfo?.username).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px' }}>
                {events.filter(e => e.registeredUser || e.childAccountInfo?.username).map(event => (
                  <div key={event._id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', background: 'white', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                    <div style={{ padding: '18px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '800', color: '#2d3748', fontSize: '0.85rem', letterSpacing: '1px' }}>
                        {t(event.type) ? t(event.type).toUpperCase() : event.type.toUpperCase()} ACCOUNT
                      </span>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold',
                        color: event.status === 'completed' || event.status === 'approved' ? '#2f855a' : '#c53030', 
                        background: event.status === 'completed' || event.status === 'approved' ? '#f0fff4' : '#fff5f5', 
                        padding: '4px 10px', 
                        borderRadius: '20px',
                        border: `1px solid ${event.status === 'completed' || event.status === 'approved' ? '#c6f6d5' : '#fed7d7'}`
                      }}>
                        {t(event.status) || event.status}
                      </span>
                    </div>
                    <div style={{ padding: '24px' }}>
                      <div style={{ marginBottom: '20px' }}>
                        <span style={{ color: '#a0aec0', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                          {t('subject_name')}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '1.25rem', color: '#1a202c' }}>
                          {event.type === 'birth' ? event.birthDetails?.childName :
                            event.type === 'marriage' ? `${event.marriageDetails?.husbandName} & ${event.marriageDetails?.wifeName}` :
                              event.type === 'death' ? event.deathDetails?.deceasedName : 
                                (event.registeredUser?.personalInfo?.firstName ? `${event.registeredUser.personalInfo.firstName} ${event.registeredUser.personalInfo.lastName}` : 'Registered User')}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                        <div style={{ padding: '15px', backgroundColor: '#f7fafc', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                          <span style={{ color: '#718096', display: 'block', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>
                            {t('user_id_username')}
                          </span>
                          <code style={{ fontSize: '1rem', color: '#2d3748', fontWeight: '800', background: 'transparent' }}>
                            {event.childAccountInfo?.username || (typeof event.registeredUser === 'object' ? event.registeredUser?.username : t('na'))}
                          </code>
                        </div>
                        <div style={{ padding: '15px', backgroundColor: '#fff5f5', borderRadius: '12px', border: '1px solid #fed7d7' }}>
                          <span style={{ color: '#e53e3e', display: 'block', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>
                            {t('initial_password')}
                          </span>
                          <code style={{ fontSize: '1rem', color: '#c53030', fontWeight: '800', background: 'transparent' }}>
                            {event.childAccountInfo?.initialPassword || (event.certificate?.number) || t('na')}
                          </code>
                        </div>
                      </div>

                      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fffaf0', borderRadius: '8px', borderLeft: '4px solid #ed8936' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#744210', lineHeight: '1.4' }}>
                          <strong>Note:</strong> {t('note_credentials')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 40px', background: '#f8fafc', borderRadius: '20px', border: '3px dashed #e2e8f0' }}>
                <span style={{ fontSize: '60px', display: 'block', marginBottom: '20px' }}>📋</span>
                <h4 style={{ fontSize: '1.5rem', color: '#4a5568', margin: '0 0 10px 0' }}>{t('no_registered_accounts')}</h4>
                <p style={{ color: '#718096', maxWidth: '400px', margin: '0 auto' }}>{t('no_registered_accounts_desc')}</p>
                <button 
                  onClick={() => setActiveTab('register')}
                  style={{ marginTop: '25px', padding: '10px 25px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  + {t('register_event')}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <CitizenProfile />
        )}
      </div>
    </div>
  );
};

export default CitizenDashboard;