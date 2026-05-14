import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import EventReview from '../Events/EventReview';
import RegionalManagement from '../National/RegionalManagement';
import CreateRegionalForm from '../National/CreateRegionalForm';
import './Dashboard.css';

const NationalDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [events, setEvents] = useState([]);
  const [groupedEvents, setGroupedEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRegions: 0,
    pendingRegions: 0,
    pendingEvents: 0,
    approvedEvents: 0,
    rejectedEvents: 0,
    completedEvents: 0
  });

  const { currentUser, API_URL } = useAuth();

  useEffect(() => {
    if (activeTab === 'review') {
      fetchEventsForReview();
    } else if (activeTab === 'overview') {
      fetchDashboardStats();
    }
  }, [activeTab]);

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

  const fetchDashboardStats = async () => {
    try {
      const [regionsRes, pendingRegionsRes, dashboardStatsRes] = await Promise.all([
        axios.get(`${API_URL}/representatives/my-representatives`),
        axios.get(`${API_URL}/representatives/pending-approvals`),
        axios.get(`${API_URL}/stats/dashboard-stats`)
      ]);

      const dashboardStats = dashboardStatsRes.data.data.stats;

      setStats({
        totalRegions: regionsRes.data.data.representatives.length,
        pendingRegions: pendingRegionsRes.data.data.users.length,
        pendingEvents: dashboardStats.pendingEvents,
        approvedEvents: dashboardStats.approvedEvents,
        rejectedEvents: dashboardStats.rejectedEvents,
        completedEvents: dashboardStats.completedEvents
      });
    } catch (error) {
      toast.error('Error fetching dashboard statistics');
    }
  };

  const handleEventReviewed = () => {
    fetchEventsForReview();
    fetchDashboardStats();
  };

  const handleRegionalAction = () => {
    fetchDashboardStats();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header national-header">
        <h2>National Representative Dashboard</h2>
        <p>Central Statistics Office - Manage regional representatives and national events</p>
      </div>

      {activeTab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card national-stat">
            <h3>{stats.totalRegions}</h3>
            <p>Regional Representatives</p>
          </div>
          <div className="stat-card national-stat pending">
            <h3>{stats.pendingRegions}</h3>
            <p>Pending Activations</p>
          </div>
          <div className="stat-card national-stat">
            <h3>{stats.pendingEvents}</h3>
            <p>Pending Events</p>
          </div>
          <div className="stat-card national-stat">
            <h3>{stats.approvedEvents}</h3>
            <p>Approved Events</p>
          </div>
          <div className="stat-card national-stat">
            <h3>{stats.rejectedEvents}</h3>
            <p>Rejected Events</p>
          </div>
          <div className="stat-card national-stat completed">
            <h3>{stats.completedEvents}</h3>
            <p>Completed Events</p>
          </div>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 National Overview
        </button>
        <button 
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          📋 Review Events ({events.length})
        </button>
        <button 
          className={`tab ${activeTab === 'regions' ? 'active' : ''}`}
          onClick={() => setActiveTab('regions')}
        >
          🌍 Regional Management
        </button>
        <button 
          className={`tab ${activeTab === 'create-regional' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-regional')}
        >
          ➕ Create Regional
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="national-overview">
            <h3>National Level Overview</h3>
            <div className="overview-actions">
              <div className="action-card">
                <h4>National Representative Actions</h4>
                <p>As the National Representative, you have the highest authority in the system.</p>
                <div className="action-buttons">
                  <button onClick={() => setActiveTab('regions')} className="action-btn">
                    Manage Regional Representatives
                  </button>
                  <button onClick={() => setActiveTab('create-regional')} className="action-btn">
                    Create New Regional Representative
                  </button>
                  <button onClick={() => setActiveTab('review')} className="action-btn">
                    Review National Level Events
                  </button>
                </div>
              </div>
              <div className="system-info-card">
                <h4>National Level Responsibilities</h4>
                <ul>
                  <li>✅ Register and activate Regional Representatives</li>
                  <li>✅ Review events approved by Regional Representatives</li>
                  <li>✅ Generate final certificates for citizens</li>
                  <li>✅ Monitor national vital events statistics</li>
                  <li>✅ Ensure data quality and compliance</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'review' && (
          <EventReview 
            events={events} 
            grouped={groupedEvents}
            loading={loading}
            onEventReviewed={handleEventReviewed}
            level="national"
          />
        )}
        
        {activeTab === 'regions' && (
          <RegionalManagement onRegionalAction={handleRegionalAction} />
        )}
        
        {activeTab === 'create-regional' && (
          <CreateRegionalForm onRegionalCreated={handleRegionalAction} />
        )}
      </div>
    </div>
  );
};

export default NationalDashboard;