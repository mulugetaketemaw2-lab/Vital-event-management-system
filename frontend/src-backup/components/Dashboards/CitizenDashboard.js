import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import EventForm from '../Events/EventForm';
import EventList from '../Events/EventList';
import CitizenProfile from './CitizenProfile';
import './Dashboard.css';

const CitizenDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    certificates: 0
  });

  const { currentUser, API_URL } = useAuth();

   useEffect(() => {
    if (activeTab === 'my-events') {
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
      toast.error('Error fetching your events');
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
    toast.error('Error fetching dashboard statistics');
  }
};

  const handleEventCreated = () => {
    toast.success('Event registered successfully!');
    fetchMyEvents();
    fetchDashboardStats();
    setActiveTab('my-events');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Welcome, {currentUser?.personalInfo?.firstName}!</h2>
        <p>Your Personal Vital Events Dashboard</p>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total Events</p>
        </div>
        <div className="stat-card pending">
          <h3>{stats.pending}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card approved">
          <h3>{stats.approved}</h3>
          <p>Approved</p>
        </div>
        <div className="stat-card completed">
          <h3>{stats.completed}</h3>
          <p>Completed</p>
        </div>
        <div className="stat-card certificate">
          <h3>{stats.certificates}</h3>
          <p>Certificates</p>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          ➕ Register Event
        </button>
        <button 
          className={`tab ${activeTab === 'my-events' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-events')}
        >
          📋 My Events ({events.length})
        </button>
        <button 
          className={`tab ${activeTab === 'certificates' ? 'active' : ''}`}
          onClick={() => setActiveTab('certificates')}
        >
          📜 Certificates ({stats.certificates})
        </button>
        <button 
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 My Profile
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-overview">
            <h3>Quick Overview</h3>
            <div className="overview-cards">
              <div className="overview-card">
                <h4>Register New Event</h4>
                <p>Register birth, death, marriage, divorce, or adoption events</p>
                <button 
                  onClick={() => setActiveTab('register')}
                  className="action-btn"
                >
                  Start Registration
                </button>
              </div>
              <div className="overview-card">
                <h4>View My Events</h4>
                <p>Check the status of your submitted events</p>
                <button 
                  onClick={() => setActiveTab('my-events')}
                  className="action-btn"
                >
                  View Events
                </button>
              </div>
              <div className="overview-card">
                <h4>My Certificates</h4>
                <p>View and download your issued certificates</p>
                <button 
                  onClick={() => setActiveTab('certificates')}
                  className="action-btn"
                >
                  View Certificates
                </button>
              </div>
            </div>
            
            <div className="recent-activities">
              <h4>Recent Activities</h4>
              {events.length > 0 ? (
                <div className="activities-list">
                  {events.slice(0, 5).map(event => (
                    <div key={event._id} className="activity-item">
                      <span className={`activity-type ${event.type}`}>
                        {event.type.toUpperCase()}
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
                <p className="no-activities">No recent activities</p>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'register' && (
          <EventForm onEventCreated={handleEventCreated} />
        )}
        
        {activeTab === 'my-events' && (
          <EventList events={events} loading={loading} />
        )}
        
        {activeTab === 'certificates' && (
          <div className="certificates-section">
            <h3>My Certificates</h3>
            <p>Certificates will appear here after your events are fully approved.</p>
            
            {events.filter(e => e.certificateUrl).length > 0 ? (
              <div className="certificates-list">
                {events
                  .filter(e => e.certificateUrl)
                  .map(event => (
                    <div key={event._id} className="certificate-item">
                      <h4>{event.type.toUpperCase()} Certificate</h4>
                      <p>Issued: {event.certificateIssuedDate ? new Date(event.certificateIssuedDate).toLocaleDateString() : 'Pending'}</p>
                      <a 
                        href={`${API_URL}${event.certificateUrl}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="download-certificate-btn"
                      >
                        Download Certificate
                      </a>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="no-certificates">
                <p>No certificates issued yet.</p>
                <p>Certificates are issued after events complete the full approval process.</p>
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