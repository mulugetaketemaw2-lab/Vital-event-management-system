import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import ZoneManagement from '../Regional/ZoneManagement';
import CreateZoneForm from '../Regional/CreateZoneForm';
import CitizenEventReview from '../Kebele/CitizenEventReview';
import EventReview from '../Events/EventReview';
import RegionReports from '../Region/RegionReports';
import ReportInbox from '../Common/ReportInbox';
import EventStatistics from '../Kebele/EventStatistics';
import LocalRecords from '../Kebele/LocalRecords';
import { getLocationName } from '../Common/LocationSelector';
import SearchBar from '../Common/SearchBar';
import './Dashboard.css';

const RegionDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [citizens, setCitizens] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    citizens: { total: 0, approved: 0, rejected: 0, verified: 0 },
    events: { total: 0, completed: 0, rejected: 0 },
    zones: { total: 0, pending: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [updateRequests, setUpdateRequests] = useState([]);
  const { currentUser, API_URL, logout } = useAuth();

  const fetchRegionPendingUpdates = useCallback(async () => {
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
  }, [API_URL]);

  const fetchRegionalOverview = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching regional overview...');
      console.log('📡 API URL:', `${API_URL}/auth/regional/overview`);

      const response = await axios.get(`${API_URL}/auth/regional/overview`);

      console.log('📥 Response status:', response.status);
      console.log('📊 Response data:', response.data);

      if (response.data.status === 'success') {
        const data = response.data.data;
        console.log('✅ Success! Citizens found:', data.citizens?.length || 0);
        console.log('📈 Stats:', data.stats);

        setCitizens(data.citizens || []);
        setEvents(data.events || []);
        setStats(prevStats => ({ ...prevStats, ...data.stats }));

        console.log('🔄 State updated - Citizens:', data.citizens?.length || 0);
        // Clear any previous error toasts
        toast.dismiss();
      } else {
        console.log('❌ API Error:', response.data.message);
        toast.error(response.data.message || 'Error fetching regional overview');
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      if (error.response) {
        // Server responded with error status
        console.error('Error response:', error.response.data);
        toast.error(error.response.data?.message || 'Error fetching regional overview');
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request);
        toast.error('Network error - unable to connect to server');
      } else {
        // Something else happened
        console.error('Error:', error.message);
        toast.error('Error fetching regional overview');
      }
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const fetchZoneStats = useCallback(async () => {
    try {
      const [zonesRes, pendingZonesRes] = await Promise.all([
        axios.get(`${API_URL}/representatives/my-representatives`),
        axios.get(`${API_URL}/representatives/pending-approvals`)
      ]);

      setStats(prevStats => ({
        ...prevStats,
        zones: {
          total: zonesRes.data.data.representatives.length,
          pending: pendingZonesRes.data.data.users.length
        }
      }));
    } catch (error) {
      toast.error('Error fetching zone statistics');
    }
  }, [API_URL]);

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'citizens' || activeTab === 'events') {
      fetchRegionalOverview();
    } else if (activeTab === 'zones') {
      fetchZoneStats();
    } else if (activeTab === 'updates') {
      fetchRegionPendingUpdates();
    }
  }, [activeTab, fetchRegionalOverview, fetchZoneStats, fetchRegionPendingUpdates]);

  useEffect(() => {
    // Sync active tab with URL hash for navigation from Layout
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['overview', 'citizens', 'events', 'updates', 'reports', 'statistics', 'records', 'inbox', 'zones', 'create-zone'];
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    handleHashChange(); // Run once on mount
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const generateReport = async (reportType, startDate, endDate) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/regional/generate-report`, {
        reportType,
        startDate,
        endDate
      });

      if (response.data.status === 'success') {
        setReportData(response.data.data);
        toast.success('Report generated successfully');
      }
    } catch (error) {
      toast.error('Error generating report');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = () => {
    fetchRegionalOverview();
    fetchZoneStats();
    if (activeTab === 'updates') fetchRegionPendingUpdates();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header regional-header">
        <div className="header-content">
          <div>
            <h2>{t('region_dashboard')}</h2>
            <div className="welcome-announcement">
              <h3>{t('welcome')} {currentUser?.personalInfo?.firstName || currentUser?.username} to {currentUser?.location?.regionName || getLocationName('region', currentUser?.location?.region) || 'this'} Region Representative Dashboard</h3>
            </div>
            <p className="kebele-info">
              <strong>{t('region')}:</strong> {currentUser?.location?.regionName || getLocationName('region', currentUser?.location?.region)}
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
          <div className="stat-card regional-stat">
            <h3>{stats.zones.total}</h3>
            <p>{t('zone_reps')}</p>
          </div>
          <div className="stat-card regional-stat pending">
            <h3>{stats.zones.pending}</h3>
            <p>{t('pending_activations')}</p>
          </div>
          <div className="stat-card regional-stat">
            <h3>{stats.citizens.total}</h3>
            <p>{t('total_citizens')}</p>
          </div>
          <div className="stat-card regional-stat approved">
            <h3>{stats.citizens.approved}</h3>
            <p>{t('approved_citizens')}</p>
          </div>
          <div className="stat-card regional-stat rejected">
            <h3>{stats.citizens.rejected}</h3>
            <p>{t('rejected_citizens')}</p>
          </div>
          <div className="stat-card regional-stat completed">
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
          <span className="tab-text">{t('regional_overview')}</span>
        </button>
        <button
          className={`tab tab-citizens ${activeTab === 'citizens' ? 'active' : ''}`}
          onClick={() => setActiveTab('citizens')}
        >
          <span className="tab-icon">👥</span>
          <span className="tab-text">{t('citizens_tab')} ({citizens.length})</span>
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
          className={`tab tab-reports ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="tab-icon">📈</span>
          <span className="tab-text">{t('generate_reports')}</span>
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
          className={`tab tab-inbox ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          <span className="tab-icon">📬</span>
          <span className="tab-text">{t('report_inbox')}</span>
        </button>
        <button
          className={`tab tab-zones ${activeTab === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          <span className="tab-icon">🌍</span>
          <span className="tab-text">{t('zone_management')}</span>
        </button>
        <button
          className={`tab tab-create-zone ${activeTab === 'create-zone' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-zone')}
        >
          <span className="tab-icon">➕</span>
          <span className="tab-text">{t('create_zone')}</span>
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
          <div className="regional-overview">
            <h3>{t('region_level_overview')} - {currentUser?.location?.regionName || getLocationName('region', currentUser?.location?.region)}</h3>
            <div className="overview-actions">
              <div className="action-card">
                <h4>{t('region_rep_actions')}</h4>
                <p>{t('region_rep_desc_part1')} {currentUser?.location?.regionName || getLocationName('region', currentUser?.location?.region)}{t('region_rep_desc_part2')}</p>
                <div className="action-buttons">
                  <button onClick={() => setActiveTab('citizens')} className="action-btn">
                    {t('monitor_citizen_registrations')}
                  </button>
                  <button onClick={() => setActiveTab('events')} className="action-btn">
                    {t('monitor_vital_events')}
                  </button>
                  <button onClick={() => setActiveTab('updates')} className="action-btn">
                    {t('review_regional_updates')}
                  </button>
                  <button onClick={() => setActiveTab('reports')} className="action-btn">
                    {t('generate_regional_reports')}
                  </button>
                  <button onClick={() => setActiveTab('zones')} className="action-btn">
                    {t('manage_zone_reps')}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'citizens' && (
          <CitizenEventReview
            level="region"
            mode="monitor"
            onCitizenReviewed={handleSync}
          />
        )}

        {activeTab === 'events' && (
          <EventReview
            level="region"
            mode="monitor"
            onEventReviewed={handleSync}
          />
        )}

        {activeTab === 'updates' && (
          <div className="update-requests-section">
            <h3>🔄 {t('pending')} {t('update_requests')} ({t('region')} {t('level') || 'Level'})</h3>
            <p>{t('review_validate_regional_updates_desc')}</p>
            {updateRequests.length === 0 ? (
              <p>{t('no_records')}</p>
            ) : (
              <div className="update-list">
                {updateRequests.map(req => (
                  <div key={req._id} className="update-item-card">
                    <div className="update-item-header">
                      <h4>{req.personalInfo.firstName} {req.personalInfo.lastName} ({req.username})</h4>
                      <span className="badge zone-approved">{t('zone_approved')}</span>
                    </div>
                    <div className="update-meta">
                      <p><strong>{t('zone')}:</strong> {req.location.zone}</p>
                      <p><strong>{t('justification')}:</strong> {req.updateRequest.justification}</p>
                    </div>
                    <button
                      className="review-btn"
                      onClick={() => window.location.href = `/review-update/${req._id}`}
                    >
                      {t('regional_validation')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <RegionReports />
        )}

        {activeTab === 'statistics' && (
          <EventStatistics stats={stats} onRefresh={handleSync} />
        )}

        {activeTab === 'records' && (
          <LocalRecords onRecordUpdated={handleSync} />
        )}

        {activeTab === 'inbox' && (
          <ReportInbox />
        )}

        {activeTab === 'zones' && (
          <ZoneManagement onZoneAction={handleSync} />
        )}
        {activeTab === 'create-zone' && (
          <CreateZoneForm onZoneCreated={handleSync} />
        )}
      </div>
    </div>
  );
};

export default RegionDashboard;