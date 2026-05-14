import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import EventReview from '../Events/EventReview';
import KebeleManagement from '../Woreda/KebeleManagement';
import CreateKebeleForm from '../Woreda/CreateKebeleForm';
import './Dashboard.css';

const WoredaDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [events, setEvents] = useState([]);
  const [groupedEvents, setGroupedEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalKebeles: 0,
    pendingKebeles: 0,
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
      const [kebelesRes, pendingKebelesRes, dashboardStatsRes] = await Promise.all([
        axios.get(`${API_URL}/representatives/my-representatives`),
        axios.get(`${API_URL}/representatives/pending-approvals`),
        axios.get(`${API_URL}/stats/dashboard-stats`)
      ]);

      const dashboardStats = dashboardStatsRes.data.data.stats;

      setStats({
        totalKebeles: kebelesRes.data.data.representatives.length,
        pendingKebeles: pendingKebelesRes.data.data.users.length,
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

  const handleKebeleAction = () => {
    fetchDashboardStats();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header woreda-header">
        <h2>Woreda Representative Dashboard</h2>
        <p>Woreda: {currentUser?.location?.woreda} - Zone: {currentUser?.location?.zone}</p>
      </div>

      {activeTab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card woreda-stat">
            <h3>{stats.totalKebeles}</h3>
            <p>Kebele Representatives</p>
          </div>
          <div className="stat-card woreda-stat pending">
            <h3>{stats.pendingKebeles}</h3>
            <p>Pending Activations</p>
          </div>
          <div className="stat-card woreda-stat">
            <h3>{stats.pendingEvents}</h3>
            <p>Pending Events</p>
          </div>
          <div className="stat-card woreda-stat">
            <h3>{stats.approvedEvents}</h3>
            <p>Approved Events</p>
          </div>
          <div className="stat-card woreda-stat">
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
          📊 Woreda Overview
        </button>
        <button 
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          📋 Review Events ({events.length})
        </button>
        <button 
          className={`tab ${activeTab === 'kebeles' ? 'active' : ''}`}
          onClick={() => setActiveTab('kebeles')}
        >
          🏠 Kebele Management
        </button>
        <button 
          className={`tab ${activeTab === 'create-kebele' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-kebele')}
        >
          ➕ Create Kebele
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="woreda-overview">
            <h3>Woreda Level Overview - {currentUser?.location?.woreda}</h3>
            <div className="overview-actions">
              <div className="action-card">
                <h4>Woreda Representative Actions</h4>
                <p>As the Woreda Representative for {currentUser?.location?.woreda}, you manage kebele representatives and review woreda events.</p>
                <div className="action-buttons">
                  <button onClick={() => setActiveTab('kebeles')} className="action-btn">
                    Manage Kebele Representatives
                  </button>
                  <button onClick={() => setActiveTab('create-kebele')} className="action-btn">
                    Create New Kebele Representative
                  </button>
                  <button onClick={() => setActiveTab('review')} className="action-btn">
                    Review Woreda Level Events
                  </button>
                </div>
              </div>
              <div className="system-info-card">
                <h4>Woreda Level Responsibilities</h4>
                <ul>
                  <li>✅ Register and activate Kebele Representatives in your woreda</li>
                  <li>✅ Review events approved by Kebele Representatives</li>
                  <li>✅ Forward approved events to Zone level</li>
                  <li>✅ Monitor woreda vital events statistics</li>
                  <li>✅ Coordinate multiple kebeles in your woreda</li>
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
            level="woreda"
          />
        )}
        
        {activeTab === 'kebeles' && (
          <KebeleManagement onKebeleAction={handleKebeleAction} />
        )}
        
        {activeTab === 'create-kebele' && (
          <CreateKebeleForm onKebeleCreated={handleKebeleAction} />
        )}
      </div>
    </div>
  );
};

export default WoredaDashboard;