import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import EventReview from '../Events/EventReview';
import CitizenEventReview from '../Kebele/CitizenEventReview';
import KebeleManagement from '../Woreda/KebeleManagement';
import CreateKebeleForm from '../Woreda/CreateKebeleForm';
import WoredaReports from '../Woreda/WoredaReports';
import ReportInbox from '../Common/ReportInbox';
import EventStatistics from '../Kebele/EventStatistics';
import LocalRecords from '../Kebele/LocalRecords';
import { getLocationName } from '../Common/LocationSelector';
import SearchBar from '../Common/SearchBar';
import './Dashboard.css';

const WoredaDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [events, setEvents] = useState([]);
  const [groupedEvents, setGroupedEvents] = useState(null);
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalKebeles: 0,
    pendingKebeles: 0,
    pendingEvents: 0,
    approvedEvents: 0,
    rejectedEvents: 0,
    pendingCitizens: 0,
    approvedCitizens: 0,
    rejectedCitizens: 0
  });

  const [updateRequests, setUpdateRequests] = useState([]);

  // Woreda Review State - Managed by CitizenEventReview component

  const { currentUser, API_URL, logout } = useAuth();

  useEffect(() => {
    if (activeTab === 'citizens') {
      fetchCitizensForReview();
    } else if (activeTab === 'events') {
      fetchEventsForReview();
    } else if (activeTab === 'overview') {
      fetchDashboardStats();
    } else if (activeTab === 'updates') {
      fetchWoredaPendingUpdates();
    }
  }, [activeTab]);

  useEffect(() => {
    // Sync active tab with URL hash for navigation from Layout
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['overview', 'citizens', 'events', 'updates', 'kebeles', 'create-kebele', 'statistics', 'records', 'reports', 'inbox'];
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    handleHashChange(); // Run once on mount
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const fetchWoredaPendingUpdates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/auth/update-requests/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        setUpdateRequests(response.data.data.citizens || []);
      }
    } catch (error) {
      console.error('Error fetching update requests:', error);
      toast.error('Failed to load update requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventsForReview = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/events/for-review`);
      setEvents(response.data.data.events);
      setGroupedEvents(response.data.data.grouped || null);
    } catch (error) {
      toast.error('Error fetching events for review');
    } finally {
      setLoading(false);
    }
  };

  const fetchCitizensForReview = async () => {
    // This is now mainly for the count in the tab
    try {
      const response = await axios.get(`${API_URL}/auth/citizens/woreda/pending`);
      if (response.data.status === 'success') {
        setCitizens(response.data.data.citizens || []);
      }
    } catch (error) {
      console.error('Error fetching citizens count:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const [kebelesRes, pendingKebelesRes, citizensRes, dashboardStatsRes] = await Promise.all([
        axios.get(`${API_URL}/representatives/my-representatives`),
        axios.get(`${API_URL}/representatives/pending-approvals`),
        axios.get(`${API_URL}/auth/citizens/woreda/pending`),
        axios.get(`${API_URL}/stats/dashboard-stats`)
      ]);

      const dashboardStats = dashboardStatsRes.data.data.stats;
      const pendingCitizens = citizensRes.data.data?.citizens || [];

      setStats({
        totalKebeles: kebelesRes.data.data.representatives.length,
        pendingKebeles: pendingKebelesRes.data.data.users.length,
        pendingEvents: dashboardStats.pendingEvents,
        approvedEvents: dashboardStats.approvedEvents,
        rejectedEvents: dashboardStats.rejectedEvents,
        pendingCitizens: pendingCitizens.length
      });
    } catch (error) {
      toast.error('Error fetching dashboard statistics');
    }
  };

  const handleEventReviewed = () => {
    fetchEventsForReview();
    fetchDashboardStats();
  };

  const handleCitizenReviewed = () => {
    fetchCitizensForReview();
    fetchDashboardStats();
  };

  // handleFileChange and handleWoredaReview moved to CitizenEventReview.js

  const handleKebeleAction = () => {
    fetchDashboardStats();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header woreda-header">
        <div className="header-content">
          <div>
            <h2>{t('woreda_dashboard')}</h2>
            <div className="welcome-announcement">
              <h3>{t('welcome')} {currentUser?.personalInfo?.firstName || currentUser?.username} to {currentUser?.location?.woredaName || getLocationName('woreda', currentUser?.location?.woreda) || 'this'} Wereda Representative Dashboard</h3>
            </div>
            <p className="kebele-info">
              <strong>{t('woreda')}:</strong> {currentUser?.location?.woredaName || getLocationName('woreda', currentUser?.location?.woreda)} | 
              <strong> {t('zone')}:</strong> {currentUser?.location?.zoneName || getLocationName('zone', currentUser?.location?.zone)}
            </p>
          </div>
          <div className="kebele-status">
            <span className="status-badge active">{t('active')}</span>
          </div>
        </div>
      </div>

      <SearchBar />

      {activeTab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card woreda-stat">
            <h3>{stats.totalKebeles}</h3>
            <p>{t('kebele_reps')}</p>
          </div>
          <div className="stat-card woreda-stat pending">
            <h3>{stats.pendingKebeles}</h3>
            <p>{t('pending_activations')}</p>
          </div>
          <div className="stat-card woreda-stat">
            <h3>{stats.pendingCitizens}</h3>
            <p>{t('pending_citizens')}</p>
          </div>
          <div className="stat-card woreda-stat">
            <h3>{stats.pendingEvents}</h3>
            <p>{t('pending_events')}</p>
          </div>
          <div className="stat-card woreda-stat">
            <h3>{stats.approvedEvents}</h3>
            <p>{t('approved_events')}</p>
          </div>
        </div>
      )}

      <div className="tabs activity-grid">
        <button
          className={`tab tab-overview ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-text">{t('woreda_overview')}</span>
        </button>
        <button
          className={`tab tab-citizens ${activeTab === 'citizens' ? 'active' : ''}`}
          onClick={() => setActiveTab('citizens')}
        >
          <span className="tab-icon">👥</span>
          <span className="tab-text">{t('citizen_registration')} ({citizens.length})</span>
        </button>
        <button
          className={`tab tab-events ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-text">{t('events_tab')} ({events.length})</span>
        </button>
        <button
          className={`tab tab-updates ${activeTab === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveTab('updates')}
        >
          <span className="tab-icon">🔄</span>
          <span className="tab-text">{t('update_requests')} ({updateRequests.length})</span>
        </button>
        <button
          className={`tab tab-management ${activeTab === 'kebeles' ? 'active' : ''}`}
          onClick={() => setActiveTab('kebeles')}
        >
          <span className="tab-icon">🏠</span>
          <span className="tab-text">{t('kebele_management')}</span>
        </button>
        <button
          className={`tab tab-create ${activeTab === 'create-kebele' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-kebele')}
        >
          <span className="tab-icon">➕</span>
          <span className="tab-text">{t('create_kebele')}</span>
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
          <span className="tab-icon">📂</span>
          <span className="tab-text">{t('records_tab')}</span>
        </button>
        <button
          className={`tab tab-reports ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="tab-icon">📈</span>
          <span className="tab-text">{t('reports_tab')}</span>
        </button>
        <button
          className={`tab tab-inbox ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          <span className="tab-icon">📬</span>
          <span className="tab-text">{t('report_inbox')}</span>
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
        {activeTab === 'overview' && (
          <div className="woreda-overview">
            <h3>{t('woreda_level_overview')} - {currentUser?.location?.woredaName || getLocationName('woreda', currentUser?.location?.woreda)}</h3>
            <div className="overview-actions">
              <div className="action-card">
                <h4>{t('woreda_rep_actions')}</h4>
                <p>{t('woreda_rep_desc_part1')} {currentUser?.location?.woredaName || getLocationName('woreda', currentUser?.location?.woreda)}{t('woreda_rep_desc_part2')}</p>
                <div className="action-buttons">
                  <button onClick={() => setActiveTab('kebeles')} className="action-btn">
                    {t('manage_kebele_reps')}
                  </button>
                  <button onClick={() => setActiveTab('create-kebele')} className="action-btn">
                    {t('create_new_kebele_rep')}
                  </button>
                  <button onClick={() => setActiveTab('citizens')} className="action-btn">
                    {t('review_citizen_registration')}
                  </button>
                  <button onClick={() => setActiveTab('events')} className="action-btn">
                    {t('review_vital_events')}
                  </button>
                  <button onClick={() => setActiveTab('statistics')} className="action-btn">
                    {t('view_woreda_statistics')}
                  </button>
                  <button onClick={() => setActiveTab('records')} className="action-btn">
                    {t('browse_woreda_records')}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'citizens' && (
          <CitizenEventReview
            level="woreda"
            onCitizenReviewed={handleCitizenReviewed}
          />
        )}

        {activeTab === 'events' && (
          <EventReview
            events={events}
            grouped={groupedEvents}
            loading={loading}
            onEventReviewed={handleEventReviewed}
            level="woreda"
          />
        )}

        {activeTab === 'statistics' && (
          <EventStatistics stats={stats} onRefresh={fetchDashboardStats} />
        )}

        {activeTab === 'records' && (
          <LocalRecords onRecordUpdated={fetchDashboardStats} />
        )}

        {activeTab === 'updates' && (
          <div className="update-requests-section">
            <h3>🔄 {t('pending')} {t('update_requests')} ({t('woreda')} {t('level') || 'Level'})</h3>
            <p>{t('review_finalize_updates_desc')}</p>
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
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('kebele') || 'Kebele'}</th>
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
                        <td style={{ padding: '13px 16px', color: '#555', whiteSpace: 'nowrap' }}>{req.location?.kebele || 'N/A'}</td>
                        <td style={{ padding: '13px 16px', color: '#555', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.updateRequest?.justification}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', fontWeight: 600, fontSize: '12px' }}>
                            ✅ {t('kebele_approved') || 'Kebele Approved'}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                          <button
                            className="review-btn"
                            onClick={() => window.location.href = `/review-update/${req._id}`}
                            style={{ padding: '7px 16px', background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}
                          >
                            🔘 {t('final_validation') || 'View Details'}
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

        {activeTab === 'kebeles' && (
          <KebeleManagement onKebeleAction={handleKebeleAction} />
        )}

        {activeTab === 'create-kebele' && (
          <CreateKebeleForm onKebeleCreated={handleKebeleAction} />
        )}

        {activeTab === 'reports' && (
          <WoredaReports />
        )}

        {activeTab === 'inbox' && (
          <ReportInbox />
        )}
      </div>
    </div>
  );
};

export default WoredaDashboard;