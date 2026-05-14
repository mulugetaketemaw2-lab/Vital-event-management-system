import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import EventReview from '../Events/EventReview';
import WoredaManagement from '../Zone/WoredaManagement';
import CreateWoredaForm from '../Zone/CreateWoredaForm';
import './Dashboard.css';

const ZoneDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [events, setEvents] = useState([]);
  const [groupedEvents, setGroupedEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalWoredas: 0,
    pendingWoredas: 0,
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
      const [woredasRes, pendingWoredasRes, dashboardStatsRes] = await Promise.all([
        axios.get(`${API_URL}/representatives/my-representatives`),
        axios.get(`${API_URL}/representatives/pending-approvals`),
        axios.get(`${API_URL}/stats/dashboard-stats`)
      ]);

      const dashboardStats = dashboardStatsRes.data.data.stats;

      setStats({
        totalWoredas: woredasRes.data.data.representatives.length,
        pendingWoredas: pendingWoredasRes.data.data.users.length,
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

  const handleWoredaAction = () => {
    fetchDashboardStats();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header zone-header">
        <h2>Zone Representative Dashboard</h2>
        <p>Zone: {currentUser?.location?.zone} - Region: {currentUser?.location?.region}</p>
      </div>

      {activeTab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card zone-stat">
            <h3>{stats.totalWoredas}</h3>
            <p>Woreda Representatives</p>
          </div>
          <div className="stat-card zone-stat pending">
            <h3>{stats.pendingWoredas}</h3>
            <p>Pending Activations</p>
          </div>
          <div className="stat-card zone-stat">
            <h3>{stats.pendingEvents}</h3>
            <p>Pending Events</p>
          </div>
          <div className="stat-card zone-stat">
            <h3>{stats.approvedEvents}</h3>
            <p>Approved Events</p>
          </div>
          <div className="stat-card zone-stat">
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
          📊 Zone Overview
        </button>
        <button 
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          📋 Review Events ({events.length})
        </button>
        <button 
          className={`tab ${activeTab === 'woredas' ? 'active' : ''}`}
          onClick={() => setActiveTab('woredas')}
        >
          🏢 Woreda Management
        </button>
        <button 
          className={`tab ${activeTab === 'create-woreda' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-woreda')}
        >
          ➕ Create Woreda
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="zone-overview">
            <h3>Zone Level Overview - {currentUser?.location?.zone}</h3>
            <div className="overview-actions">
              <div className="action-card">
                <h4>Zone Representative Actions</h4>
                <p>As the Zone Representative for {currentUser?.location?.zone}, you manage woreda representatives and review zonal events.</p>
                <div className="action-buttons">
                  <button onClick={() => setActiveTab('woredas')} className="action-btn">
                    Manage Woreda Representatives
                  </button>
                  <button onClick={() => setActiveTab('create-woreda')} className="action-btn">
                    Create New Woreda Representative
                  </button>
                  <button onClick={() => setActiveTab('review')} className="action-btn">
                    Review Zone Level Events
                  </button>
                </div>
              </div>
              <div className="system-info-card">
                <h4>Zone Level Responsibilities</h4>
                <ul>
                  <li>✅ Register and activate Woreda Representatives in your zone</li>
                  <li>✅ Review events approved by Woreda Representatives</li>
                  <li>✅ Forward approved events to Regional level</li>
                  <li>✅ Monitor zonal vital events statistics</li>
                  <li>✅ Coordinate multiple woredas in your zone</li>
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
            level="zone"
          />
        )}
        
        {activeTab === 'woredas' && (
          <WoredaManagement onWoredaAction={handleWoredaAction} />
        )}
        
        {activeTab === 'create-woreda' && (
          <CreateWoredaForm onWoredaCreated={handleWoredaAction} />
        )}
      </div>
    </div>
  );
};

export default ZoneDashboard;