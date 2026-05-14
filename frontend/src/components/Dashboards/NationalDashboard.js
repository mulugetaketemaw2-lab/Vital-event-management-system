import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import RegionalManagement from '../National/RegionalManagement';
import CreateRegionalForm from '../National/CreateRegionalForm';
import CitizenEventReview from '../Kebele/CitizenEventReview';
import EventReview from '../Events/EventReview';
import NationalStatistics from '../National/NationalStatistics';
import NationalReports from '../National/NationalReports';
import ReportInbox from '../Common/ReportInbox';
import LocalRecords from '../Kebele/LocalRecords';
import SearchBar from '../Common/SearchBar';
import './Dashboard.css';

const NationalDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [regionFilter, setRegionFilter] = useState('All');
  const [contentType, setContentType] = useState('all'); // 'citizens' | 'events' | 'all'
  const [citizens, setCitizens] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    citizens: { total: 0, approved: 0, rejected: 0, verified: 0 },
    events: { total: 0, completed: 0, rejected: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [updateRequests, setUpdateRequests] = useState([]);
  const { currentUser, API_URL, logout } = useAuth();

  const fetchNationalPendingUpdates = async () => {
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
      toast.error(t('failed_load_update_requests'));
    } finally {
      setLoading(false);
    }
  };

  const ethiopianRegions = [
    'All', 'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz',
    'Dire Dawa', 'Gambela', 'Harari', 'Oromia',
    'Sidama', 'Somali', 'Southern Nations, Nationalities, and Peoples\' Region',
    'South West Ethiopia Peoples\' Region', 'Tigray'
  ];

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'registrations') {
      fetchNationalOverview();
    } else if (activeTab === 'updates') {
      fetchNationalPendingUpdates();
    }
  }, [activeTab]);

  useEffect(() => {
    // Sync active tab with URL hash for navigation from Layout
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['overview', 'registrations', 'updates', 'statistics', 'records', 'reports', 'inbox', 'regions', 'create-regional'];
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    handleHashChange(); // Run once on mount
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const fetchNationalOverview = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/auth/national/overview`);

      if (response.data.status === 'success') {
        const data = response.data.data;
        setCitizens(data.citizens || []);
        setEvents(data.events || []);
        setStats(prevStats => ({ ...prevStats, ...data.stats }));
      }
    } catch (error) {
      toast.error(t('error_fetching_national_overview'));
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType, startDate, endDate) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/national/generate-report`, {
        reportType,
        startDate,
        endDate
      });

      if (response.data.status === 'success') {
        setReportData(response.data.data);
        toast.success(t('report_generated_success'));
      }
    } catch (error) {
      toast.error(t('error_generating_report'));
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = () => {
    fetchNationalOverview();
  };

  const fetchDashboardStats = async () => {
    try {
      const [regionsRes, pendingRegionsRes, dashboardStatsRes] = await Promise.all([
        axios.get(`${API_URL}/representatives/my-representatives`),
        axios.get(`${API_URL}/representatives/pending-approvals`),
        axios.get(`${API_URL}/stats/dashboard-stats`)
      ]);

      const dashboardStats = dashboardStatsRes.data.data.stats;

      setStats(prevStats => ({
        ...prevStats,
        totalRegions: regionsRes.data.data.representatives.length,
        pendingRegions: pendingRegionsRes.data.data.users.length,
        pendingEvents: dashboardStats.pendingEvents,
        approvedEvents: dashboardStats.approvedEvents,
        rejectedEvents: dashboardStats.rejectedEvents,
        completedEvents: dashboardStats.completedEvents
      }));
    } catch (error) {
      toast.error(t('error_fetching_dashboard_stats'));
    }
  };

  const handleEventReviewed = () => {
    fetchNationalOverview();
    fetchDashboardStats();
  };

  const handleRegionalAction = () => {
    fetchDashboardStats();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header national-header">
        <div className="header-content">
          <div>
            <h2>{t('national_dashboard')}</h2>
            <div className="welcome-announcement">
              <h3>{t('welcome')} {currentUser?.personalInfo?.firstName || currentUser?.username} to the National Representative Dashboard</h3>
            </div>
            <p className="kebele-info">
              <strong>{t('national_monitoring')}</strong>
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
          <div className="stat-card national-stat">
            <h3>{stats.citizens.total}</h3>
            <p>{t('total_citizens')}</p>
          </div>
          <div className="stat-card national-stat approved">
            <h3>{stats.citizens.approved}</h3>
            <p>{t('approved_citizens')}</p>
          </div>
          <div className="stat-card national-stat rejected">
            <h3>{stats.citizens.rejected}</h3>
            <p>{t('rejected_citizens')}</p>
          </div>
          <div className="stat-card national-stat">
            <h3>{stats.events.total}</h3>
            <p>{t('total_events')}</p>
          </div>
          <div className="stat-card national-stat completed">
            <h3>{stats.events.completed}</h3>
            <p>{t('completed_events')}</p>
          </div>
        </div>
      )}

      <div className="tabs activity-grid">
        <button
          className={`tab tab-overview ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-text">{t('national_overview')}</span>
        </button>
        <button
          className={`tab tab-registrations ${activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrations')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-text">{t('registrations_tab')} ({citizens.length + events.length})</span>
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
          <span className="tab-icon">📂</span>
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
          className={`tab tab-inbox ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          <span className="tab-icon">📬</span>
          <span className="tab-text">{t('report_inbox')}</span>
        </button>
        <button
          className={`tab tab-regions ${activeTab === 'regions' ? 'active' : ''}`}
          onClick={() => setActiveTab('regions')}
        >
          <span className="tab-icon">🌍</span>
          <span className="tab-text">{t('regional_management')}</span>
        </button>
        <button
          className={`tab tab-create-regional ${activeTab === 'create-regional' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-regional')}
        >
          <span className="tab-icon">➕</span>
          <span className="tab-text">{t('create_regional')}</span>
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
          <div className="national-overview">
            <h3>{t('national_level_overview')}</h3>
            <div className="overview-actions">
              <div className="action-card">
                <h4>{t('national_rep_actions')}</h4>
                <p>{t('national_rep_desc')}</p>
                <div className="action-buttons">
                  <button onClick={() => { setActiveTab('registrations'); setContentType('citizens'); }} className="action-btn">
                    {t('monitor_citizen_registrations')}
                  </button>
                  <button onClick={() => { setActiveTab('registrations'); setContentType('events'); }} className="action-btn">
                    {t('monitor_vital_events')}
                  </button>
                  <button onClick={() => setActiveTab('updates')} className="action-btn">
                    {t('finalize_profile_updates')}
                  </button>
                  <button onClick={() => { setActiveTab('registrations'); setContentType('all'); }} className="action-btn">
                    {t('view_all_registrations')}
                  </button>
                  <button onClick={() => setActiveTab('reports')} className="action-btn">
                    {t('generate_national_reports')}
                  </button>
                  <button onClick={() => setActiveTab('regions')} className="action-btn">
                    {t('manage_regional_reps')}
                  </button>
                </div>
              </div>
              <div className="system-info-card">
                <h4>{t('national_responsibilities')}</h4>
                <ul>
                  <li>✅ {t('nat_resp_1')}</li>
                  <li>✅ {t('nat_resp_2')}</li>
                  <li>✅ {t('nat_resp_3')}</li>
                  <li>✅ {t('nat_resp_4')}</li>
                  <li>✅ {t('nat_resp_5')}</li>
                  <li>✅ {t('nat_resp_6')}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div className="national-registrations-view">

            {/* ── Region Filter ── */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', padding: '14px 16px', background: '#fff', borderRadius: '10px', border: '1px solid #e1e8ed', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
              <h4 style={{ width: '100%', margin: '0 0 10px 0', color: '#2c3e50', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🌍 {t('filter_by_region')}
              </h4>
              {ethiopianRegions.map(region => (
                <button
                  key={region}
                  onClick={() => setRegionFilter(region)}
                  style={{
                    padding: '5px 14px',
                    border: `1.5px solid ${regionFilter === region ? '#2980b9' : '#d0d7de'}`,
                    background: regionFilter === region ? '#2980b9' : '#f6f8fa',
                    color: regionFilter === region ? '#fff' : '#555',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: regionFilter === region ? '700' : '400',
                    transition: 'all 0.2s'
                  }}
                >
                  {t(region)}
                </button>
              ))}
            </div>

            {/* ── Registration Type Buttons ── */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', padding: '16px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderRadius: '10px', border: '1px solid #dee2e6', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: '#2c3e50', fontSize: '14px', marginRight: '4px', whiteSpace: 'nowrap' }}>📂 {t('view')}</span>

              {/* Citizen Birth Registration */}
              <button
                onClick={() => setContentType('citizens')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px',
                  border: `2px solid ${contentType === 'citizens' ? '#1a7f64' : '#c3e6cb'}`,
                  background: contentType === 'citizens' ? 'linear-gradient(135deg, #1a7f64, #28a745)' : '#fff',
                  color: contentType === 'citizens' ? '#fff' : '#155724',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                  fontWeight: contentType === 'citizens' ? '700' : '500',
                  boxShadow: contentType === 'citizens' ? '0 4px 12px rgba(26,127,100,0.35)' : 'none',
                  transition: 'all 0.25s ease', flex: 1, justifyContent: 'center'
                }}
              >
                👥 {t('citizen_birth_registration')}
              </button>

              {/* Vital Event Registration */}
              <button
                onClick={() => setContentType('events')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px',
                  border: `2px solid ${contentType === 'events' ? '#1565c0' : '#bbdefb'}`,
                  background: contentType === 'events' ? 'linear-gradient(135deg, #1565c0, #1976d2)' : '#fff',
                  color: contentType === 'events' ? '#fff' : '#0d47a1',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                  fontWeight: contentType === 'events' ? '700' : '500',
                  boxShadow: contentType === 'events' ? '0 4px 12px rgba(21,101,192,0.35)' : 'none',
                  transition: 'all 0.25s ease', flex: 1, justifyContent: 'center'
                }}
              >
                📋 {t('vital_event_registration')}
              </button>

              {/* All */}
              <button
                onClick={() => setContentType('all')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px',
                  border: `2px solid ${contentType === 'all' ? '#6a1b9a' : '#e1bee7'}`,
                  background: contentType === 'all' ? 'linear-gradient(135deg, #6a1b9a, #8e24aa)' : '#fff',
                  color: contentType === 'all' ? '#fff' : '#4a148c',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                  fontWeight: contentType === 'all' ? '700' : '500',
                  boxShadow: contentType === 'all' ? '0 4px 12px rgba(106,27,154,0.35)' : 'none',
                  transition: 'all 0.25s ease', flex: 1, justifyContent: 'center'
                }}
              >
                🗂️ {t('all')}
              </button>
            </div>

            {/* ── Data Panels ── */}
            {(contentType === 'citizens' || contentType === 'all') && (
              <div style={{ marginBottom: contentType === 'all' ? '32px' : '0' }}>
                {contentType === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '2px solid #c3e6cb' }}>
                    <span style={{ fontSize: '20px' }}>👥</span>
                    <h3 style={{ margin: 0, color: '#1a7f64', fontSize: '17px' }}>{t('citizen_birth_registrations_title')}</h3>
                    {regionFilter !== 'All' && <span style={{ background: '#d4edda', color: '#155724', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>{t(regionFilter)}</span>}
                  </div>
                )}
                <CitizenEventReview
                  level="national"
                  mode="monitor"
                  regionFilter={regionFilter}
                  onCitizenReviewed={handleSync}
                />
              </div>
            )}

            {(contentType === 'events' || contentType === 'all') && (
              <div>
                {contentType === 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '2px solid #bbdefb' }}>
                    <span style={{ fontSize: '20px' }}>📋</span>
                    <h3 style={{ margin: 0, color: '#1565c0', fontSize: '17px' }}>{t('vital_event_registrations_title')}</h3>
                    {regionFilter !== 'All' && <span style={{ background: '#bbdefb', color: '#0d47a1', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>{t(regionFilter)}</span>}
                  </div>
                )}
                <EventReview
                  level="national"
                  mode="monitor"
                  regionFilter={regionFilter}
                  onEventReviewed={handleSync}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'updates' && (
          <div className="update-requests-section">
            <h3>🔄 {t('pending')} {t('update_requests')} ({t('national')} {t('level') || 'Level'})</h3>
            <p>{t('review_finalize_national_updates_desc')}</p>
            {updateRequests.length === 0 ? (
              <p>{t('no_records')}</p>
            ) : (
              <div className="update-list">
                {updateRequests.map(req => (
                  <div key={req._id} className="update-item-card">
                    <div className="update-item-header">
                      <h4>{req.personalInfo.firstName} {req.personalInfo.lastName} ({req.username})</h4>
                      <span className="badge region-approved">{t('region_approved')}</span>
                    </div>
                    <div className="update-meta">
                      <p><strong>{t('region_text')}</strong> {req.location.regionName || req.location.region}</p>
                      <p><strong>{t('justification')}:</strong> {req.updateRequest.justification}</p>
                    </div>
                    <button
                      className="review-btn"
                      onClick={() => window.location.href = `/review-update/${req._id}`}
                    >
                      {t('final_validation_apply')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && (
          <NationalStatistics />
        )}

        {activeTab === 'records' && (
          <LocalRecords onRecordUpdated={handleSync} />
        )}

        {activeTab === 'reports' && (
          <NationalReports />
        )}

        {activeTab === 'inbox' && (
          <ReportInbox />
        )}

        {activeTab === 'regions' && (
          <RegionalManagement onRegionalAction={() => fetchNationalOverview()} />
        )}

        {activeTab === 'create-regional' && (
          <CreateRegionalForm onRegionalCreated={() => fetchNationalOverview()} />
        )}
      </div>
    </div>
  );
};

export default NationalDashboard;