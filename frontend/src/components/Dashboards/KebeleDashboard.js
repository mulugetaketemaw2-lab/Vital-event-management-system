import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import EventReview from '../Events/EventReview'; // This shows vital events
import CitizenEventReview from '../Kebele/CitizenEventReview';
import EventStatistics from '../Kebele/EventStatistics';
import LocalRecords from '../Kebele/LocalRecords';
import KebeleReports from '../Kebele/KebeleReports';
import { getLocationName } from '../Common/LocationSelector';
import SearchBar from '../Common/SearchBar';
import './Dashboard.css';

const KebeleDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('citizens');
  const [loading, setLoading] = useState(false);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [reviewedEvents, setReviewedEvents] = useState([]);
  const [groupedEvents, setGroupedEvents] = useState(null);
  const [citizens, setCitizens] = useState([]);
  const [vitalEvents, setVitalEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    pendingReview: 0,
    approvedEvents: 0,
    completedEvents: 0,
    rejectedEvents: 0,
    forwardedEvents: 0,
    pendingCitizens: 0,
    approvedCitizens: 0,
    rejectedCitizens: 0
  });

  const { currentUser, API_URL, logout } = useAuth();

  // Immediate authentication check
  console.log('=== KEBELE DASHBOARD IMMEDIATE AUTH CHECK ===');
  console.log('Current user from context:', currentUser);
  console.log('User role:', currentUser?.role);
  console.log('Token from localStorage:', localStorage.getItem('token') ? 'EXISTS' : 'MISSING');
  console.log('=== END IMMEDIATE CHECK ===');

  // Temporary fix: Use direct API_URL
  const API_URL_FIXED = 'http://localhost:5000/api';

  const [updateRequests, setUpdateRequests] = useState([]);

  useEffect(() => {
    if (activeTab === 'citizens') {
      fetchPendingCitizens();
    } else if (activeTab === 'events') {
      fetchPendingVitalEvents();
    } else if (activeTab === 'updates') {
      fetchPendingUpdates();
    }
    fetchReviewedEvents();
  }, [activeTab]);

  useEffect(() => {
    // Sync active tab with URL hash for navigation from Layout
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['citizens', 'events', 'updates', 'statistics', 'records', 'reports'];
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    handleHashChange(); // Run once on mount
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const fetchPendingUpdates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL_FIXED}/auth/update-requests/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        setUpdateRequests(response.data.data.citizens || []);
      }
    } catch (error) {
      console.error('Error fetching update requests:', error);
      toast.error(t('failed_load_update_requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateStats();
  }, [pendingEvents, reviewedEvents]);


  const fetchPendingCitizens = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error(t('please_login'));
        setLoading(false);
        return;
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const response = await axios.get(`${API_URL_FIXED}/auth/citizens/pending`);

      if (response.data.status === 'success') {
        const citizens = response.data.data.citizens || [];
        setCitizens(citizens);
        console.log(`Found ${citizens.length} citizens pending kebele review`);
      } else {
        setCitizens([]);
        toast.error(t('error_loading_citizens_review'));
      }
    } catch (error) {
      console.error('Error fetching citizens:', error);
      if (error.response && error.response.status === 403) {
        toast.error(t('auth_required'));
      } else if (error.response && error.response.status === 404) {
        toast.info(t('no_citizens_review'));
        setCitizens([]);
      } else {
        toast.error(t('error_loading_citizens'));
        setCitizens([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingVitalEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error(t('please_login'));
        setLoading(false);
        return;
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const response = await axios.get(`${API_URL_FIXED}/events/for-review`);

      if (response.data.status === 'success') {
        const events = response.data.data.events || [];
        setVitalEvents(events);
        setGroupedEvents(response.data.data.grouped || null);
        console.log(`Found ${events.length} vital events pending kebele review`);
      } else {
        setVitalEvents([]);
        toast.error(t('error_loading_events_review'));
      }
    } catch (error) {
      console.error('Error fetching vital events:', error);
      if (error.response && error.response.status === 403) {
        toast.error(t('auth_required'));
      } else if (error.response && error.response.status === 404) {
        toast.info(t('no_events_review'));
        setVitalEvents([]);
      } else {
        toast.error(t('error_loading_events'));
        setVitalEvents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewedEvents = async () => {
    try {
      // This endpoint should return events reviewed by this kebele representative
      const response = await axios.get(`${API_URL}/events/my-events`);

      setReviewedEvents(response.data.data.events || []);
    } catch (error) {
      console.error('Error fetching reviewed events:', error);
      // Don't show error if endpoint doesn't exist yet
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const [eventsRes, repsRes] = await Promise.all([
        axios.get(`${API_URL}/events/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/representatives/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (eventsRes.data.status === 'success' && repsRes.data.status === 'success') {
        setStats({
          ...eventsRes.data.data.stats,
          ...repsRes.data.data.stats,
          pendingCitizens: citizens.length,
          pendingVitalEvents: vitalEvents.length
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      // toast.error('Error fetching dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleReportGenerated = () => {
    toast.success(t('report_generated_success'));
  };

  const handleRecordUpdated = () => {
    toast.success(t('local_records_updated'));
  };

  const updateStats = () => {
    const totalPending = pendingEvents.length;
    const totalApproved = reviewedEvents.filter(e => e.status === 'approved').length;
    const totalRejected = reviewedEvents.filter(e => e.status === 'rejected').length;

    setStats({
      totalPending,
      totalApproved,
      totalRejected,
      pendingCitizens: citizens.length,
      pendingVitalEvents: vitalEvents.length
    });
  };

  const handleEventReviewed = () => {
    fetchReviewedEvents();
    if (activeTab === 'citizens') {
      fetchPendingCitizens();
    } else if (activeTab === 'events') {
      fetchPendingVitalEvents();
    }
  };

  const handleCitizenReviewed = () => {
    fetchPendingCitizens();
    fetchReviewedEvents();
  };

  const handleVitalEventReviewed = () => {
    fetchPendingVitalEvents();
    fetchReviewedEvents();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header kebele-header">
        <div className="header-content">
          <div>
            <h2>{t('kebele_dashboard')}</h2>
            <div className="welcome-announcement">
              <h3>{t('welcome')} {currentUser?.personalInfo?.firstName || currentUser?.username} to {currentUser?.location?.kebeleName || currentUser?.location?.kebele || 'this'} Kebele Representative Dashboard</h3>
            </div>
            <p className="kebele-info">
              <strong>{t('kebele')}:</strong> {currentUser?.location?.kebeleName || getLocationName('kebele', currentUser?.location?.kebele) || t('not_assigned')} |
              <strong> {t('woreda')}:</strong> {currentUser?.location?.woredaName || getLocationName('woreda', currentUser?.location?.woreda)} |
              <strong> {t('zone')}:</strong> {currentUser?.location?.zoneName || getLocationName('zone', currentUser?.location?.zone)} |
              <strong> {t('region')}:</strong> {currentUser?.location?.regionName || getLocationName('region', currentUser?.location?.region)}
            </p>
          </div>
          <div className="kebele-status">
            <span className="status-badge active">{t('active')}</span>
          </div>
        </div>
      </div>

      <SearchBar />

      {/* Quick Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card kebele-stat total">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.pendingCitizens}</h3>
            <p>{t('pending_citizens')}</p>
          </div>
        </div>
        <div className="stat-card kebele-stat pending">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{stats.pendingVitalEvents || 0}</h3>
            <p>{t('pending_events')}</p>
          </div>
        </div>
        <div className="stat-card kebele-stat approved">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.approvedEvents}</h3>
            <p>{t('approved')}</p>
          </div>
        </div>
        <div className="stat-card kebele-stat rejected">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>{stats.rejectedEvents}</h3>
            <p>{t('reject')}</p>
          </div>
        </div>
        <div className="stat-card kebele-stat forwarded">
          <div className="stat-icon">📤</div>
          <div className="stat-content">
            <h3>{stats.forwardedEvents}</h3>
            <p>{t('forwarded_to_woreda')}</p>
          </div>
        </div>
      </div>

      {/* Kebele Representative Responsibilities Info */}


      {/* Navigation Tabs */}
      <div className="tabs activity-grid">
        <button
          className={`tab tab-citizens ${activeTab === 'citizens' ? 'active' : ''}`}
          onClick={() => setActiveTab('citizens')}
        >
          <span className="tab-icon">👥</span>
          <span className="tab-text">{t('citizen_registration')} ({stats.pendingCitizens})</span>
        </button>
        <button
          className={`tab tab-events ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-text">{t('events_tab')} ({stats.pendingVitalEvents || 0})</span>
        </button>
        <button
          className={`tab tab-updates ${activeTab === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveTab('updates')}
        >
          <span className="tab-icon">🔄</span>
          <span className="tab-text">{t('update_requests')} ({updateRequests.length})</span>
        </button>
        <button
          className={`tab tab-statistics ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-text">{t('statistics_tab')}</span>
        </button>
        <button
          className={`tab tab-records ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-text">{t('records_tab')}</span>
        </button>
        <button
          className={`tab tab-reports ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="tab-icon">📈</span>
          <span className="tab-text">{t('generate_reports')}</span>
        </button>
        <button
          className="tab tab-logout logout-tab"
          onClick={logout}
        >
          <span className="tab-icon">🚪</span>
          <span className="tab-text">{t('logout')}</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'citizens' && (
          <CitizenEventReview
            onCitizenReviewed={handleCitizenReviewed}
          />
        )}

        {activeTab === 'events' && (
          <EventReview
            events={vitalEvents}
            grouped={groupedEvents}
            loading={loading}
            onEventReviewed={handleVitalEventReviewed}
            level="kebele"
          />
        )}

        {activeTab === 'updates' && (
          <div className="update-requests-section">
            <h3>🔄 {t('pending')} {t('update_requests')}</h3>
            {updateRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '12px', color: '#666' }}>
                <span style={{ fontSize: '40px' }}>📭</span>
                <p style={{ marginTop: '10px' }}>{t('no_records')}</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #1a237e, #283593)', color: '#fff' }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>#</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('full_name') || 'Full Name'}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('username') || 'Username'}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700 }}>{t('justification') || 'Justification'}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('status') || 'Status'}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('actions') || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {updateRequests.map((req, index) => (
                      <tr key={req._id} style={{ background: index % 2 === 0 ? '#fff' : '#fafbfc', borderBottom: '1px solid #e8ecf0' }}>
                        <td style={{ padding: '13px 16px', color: '#666' }}>{index + 1}</td>
                        <td style={{ padding: '13px 16px', fontWeight: 600, color: '#2c3e50', whiteSpace: 'nowrap' }}>
                          {req.personalInfo?.firstName} {req.personalInfo?.lastName}
                        </td>
                        <td style={{ padding: '13px 16px', color: '#555', whiteSpace: 'nowrap' }}>{req.username}</td>
                        <td style={{ padding: '13px 16px', color: '#555', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.updateRequest?.justification}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#fff8e1', color: '#e65100', border: '1px solid #ffecb3', fontWeight: 600, fontSize: '12px' }}>
                            ⏳ {t('update_pending') || 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                          <button
                            className="review-btn"
                            onClick={() => navigate(`/review-update/${req._id}`)}
                            style={{ padding: '7px 16px', background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}
                          >
                            🔘 {t('review_changes') || 'View Details'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && (
          <EventStatistics
            stats={stats}
            onRefresh={fetchDashboardStats}
          />
        )}

        {activeTab === 'records' && (
          <LocalRecords
            onRecordUpdated={handleRecordUpdated}
          />
        )}

        {activeTab === 'reports' && (
          <KebeleReports
            onReportGenerated={handleReportGenerated}
          />
        )}
      </div>
    </div>
  );
};

export default KebeleDashboard;