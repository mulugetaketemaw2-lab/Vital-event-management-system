import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import EventReview from '../Events/EventReview';
import ZoneManagement from '../Regional/ZoneManagement';
import CreateZoneForm from '../Regional/CreateZoneForm';
import './Dashboard.css';

const RegionDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [events, setEvents] = useState([]);
  const [groupedEvents, setGroupedEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalZones: 0,
    pendingZones: 0,
    pendingEvents: 0,
    approvedEvents: 0,
    rejectedEvents: 0
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
      const [zonesRes, pendingZonesRes, dashboardStatsRes] = await Promise.all([
        axios.get(`${API_URL}/representatives/my-representatives`),
        axios.get(`${API_URL}/representatives/pending-approvals`),
        axios.get(`${API_URL}/stats/dashboard-stats`)
      ]);

      const dashboardStats = dashboardStatsRes.data.data.stats;

      setStats({
        totalZones: zonesRes.data.data.representatives.length,
        pendingZones: pendingZonesRes.data.data.users.length,
        pendingEvents: dashboardStats.pendingEvents,
        approvedEvents: dashboardStats.approvedEvents,
        rejectedEvents: dashboardStats.rejectedEvents
      });
    } catch (error) {
      toast.error('Error fetching dashboard statistics');
    }
  };

  const handleEventReviewed = () => {
    fetchEventsForReview();
    fetchDashboardStats();
  };

  const handleZoneAction = () => {
    fetchDashboardStats();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header regional-header">
        <h2>Regional Representative Dashboard</h2>
        <p>Region: {currentUser?.location?.region} - Manage zone representatives and regional events</p>
      </div>

      {activeTab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card regional-stat">
            <h3>{stats.totalZones}</h3>
            <p>Zone Representatives</p>
          </div>
          <div className="stat-card regional-stat pending">
            <h3>{stats.pendingZones}</h3>
            <p>Pending Activations</p>
          </div>
          <div className="stat-card regional-stat">
            <h3>{stats.pendingEvents}</h3>
            <p>Pending Events</p>
          </div>
          <div className="stat-card regional-stat">
            <h3>{stats.approvedEvents}</h3>
            <p>Approved Events</p>
          </div>
          <div className="stat-card regional-stat">
            <h3>{stats.rejectedEvents}</h3>
            <p>Rejected Events</p>
          </div>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Regional Overview
        </button>
        <button 
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          📋 Review Events ({events.length})
        </button>
        <button 
          className={`tab ${activeTab === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          🌍 Zone Management
        </button>
        <button 
          className={`tab ${activeTab === 'create-zone' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-zone')}
        >
          ➕ Create Zone
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="regional-overview">
            <h3>Regional Level Overview - {currentUser?.location?.region}</h3>
            <div className="overview-actions">
              <div className="action-card">
                <h4>Regional Representative Actions</h4>
                <p>As the Regional Representative for {currentUser?.location?.region}, you manage zone representatives and review regional events.</p>
                <div className="action-buttons">
                  <button onClick={() => setActiveTab('zones')} className="action-btn">
                    Manage Zone Representatives
                  </button>
                  <button onClick={() => setActiveTab('create-zone')} className="action-btn">
                    Create New Zone Representative
                  </button>
                  <button onClick={() => setActiveTab('review')} className="action-btn">
                    Review Regional Level Events
                  </button>
                </div>
              </div>
              <div className="system-info-card">
                <h4>Regional Level Responsibilities</h4>
                <ul>
                  <li>✅ Register and activate Zone Representatives in your region</li>
                  <li>✅ Review events approved by Zone Representatives</li>
                  <li>✅ Forward approved events to National level</li>
                  <li>✅ Monitor regional vital events statistics</li>
                  <li>✅ Ensure data quality within your region</li>
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
            level="region"
          />
        )}
        
        {activeTab === 'zones' && (
          <ZoneManagement onZoneAction={handleZoneAction} />
        )}
        
        {activeTab === 'create-zone' && (
          <CreateZoneForm onZoneCreated={handleZoneAction} />
        )}
      </div>
    </div>
  );
};

export default RegionDashboard;