import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import EventReview from '../Events/EventReview'; // This shows vital events
import CitizenEventReview from '../Kebele/CitizenEventReview';
import EventStatistics from '../Kebele/EventStatistics';
import LocalRecords from '../Kebele/LocalRecords';
import KebeleReports from '../Kebele/KebeleReports';
import './Dashboard.css';

const KebeleDashboard = () => {
  const [activeTab, setActiveTab] = useState('review');
  const [loading, setLoading] = useState(false);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [reviewedEvents, setReviewedEvents] = useState([]);
  const [groupedEvents, setGroupedEvents] = useState(null);
  const [stats, setStats] = useState({
    totalEvents: 0,
    pendingReview: 0,
    approvedEvents: 0,
    completedEvents: 0,
    rejectedEvents: 0,
    forwardedEvents: 0
  });

  const { currentUser, API_URL } = useAuth();
  
  // Immediate authentication check
  console.log('=== KEBELE DASHBOARD IMMEDIATE AUTH CHECK ===');
  console.log('Current user from context:', currentUser);
  console.log('User role:', currentUser?.role);
  console.log('Token from localStorage:', localStorage.getItem('token') ? 'EXISTS' : 'MISSING');
  console.log('=== END IMMEDIATE CHECK ===');
  
  // Temporary fix: Use direct API_URL
  const API_URL_FIXED = 'http://localhost:5000/api';

  useEffect(() => {
    fetchPendingEvents();
    fetchReviewedEvents();
  }, []);
  
  useEffect(() => {
    updateStats();
  }, [pendingEvents, reviewedEvents]);

  
 const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      
      // Debug: Check token and user
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      console.log('=== KEBELE DASHBOARD AUTH DEBUG ===');
      console.log('Token exists:', !!token);
      console.log('Token length:', token?.length || 0);
      console.log('User exists:', !!user);
      console.log('Current user from context:', currentUser);
      console.log('User role:', currentUser?.role);
      console.log('=== END AUTH DEBUG ===');
      
      // CRITICAL FIX: Set axios headers globally before request
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Set global Authorization header:', `Bearer ${token}`);
      } else {
        console.error('No token found! User may not be logged in.');
        toast.error('Please log in to access this page');
        setLoading(false);
        return;
      }
      
      // Get citizens pending review for this kebele - NO explicit headers needed now
      console.log('Making request to:', `${API_URL_FIXED}/auth/citizens/pending`);
      console.log('Current axios headers:', axios.defaults.headers.common);
      
      const response = await axios.get(`${API_URL_FIXED}/auth/citizens/pending`);
      
      if (response.data.status === 'success') {
        const citizens = response.data.data.citizens || [];
        console.log(`Found ${citizens.length} citizens for review`);
        setPendingEvents(citizens);
      } else {
        console.log('Error response:', response.data);
        setPendingEvents([]);
        toast.error('Error loading pending citizens');
      }
    } catch (error) {
      console.error('Error fetching pending events:', error);
      
      // Handle 403 Forbidden specifically
      if (error.response && error.response.status === 403) {
        console.log('=== KEBELE 403 FORBIDDEN ERROR ===');
        console.log('Error response:', error.response.data);
        console.log('Current user:', currentUser);
        console.log('Token exists:', !!localStorage.getItem('token'));
        console.log('=== END KEBELE 403 DEBUG ===');
        
        // Show user-friendly message for 403
        toast.error('Authentication required. Please log in again.');
        setPendingEvents([]); // Show empty state instead of error
      } else if (error.response && error.response.status === 404) {
        toast.info('No pending citizens found');
        setPendingEvents([]);
      } else {
        toast.error('Error loading pending citizens');
        setPendingEvents([]);
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
      const [eventsRes, repsRes] = await Promise.all([
        axios.get(`${API_URL}/api/events/stats`),
        axios.get(`${API_URL}/api/representatives/stats`)
      ]);

      setStats({
        ...eventsRes.data.data.stats,
        ...repsRes.data.data.stats
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Error fetching dashboard statistics');
    }
  };

  const handleReportGenerated = () => {
    toast.success('Report generated successfully');
  };

  const handleRecordUpdated = () => {
    toast.success('Local records updated');
  };
    const updateStats = () => {
    const totalPending = pendingEvents.length;
    const totalApproved = reviewedEvents.filter(e => e.status === 'approved').length;
    const totalRejected = reviewedEvents.filter(e => e.status === 'rejected').length;
    
    setStats({ totalPending, totalApproved, totalRejected });
  };

  const handleEventReviewed = () => {
    fetchPendingEvents();
    fetchReviewedEvents();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header kebele-header">
        <div className="header-content">
          <div>
            <h2>Kebele Representative Dashboard</h2>
            <p className="kebele-info">
              <strong>Kebele:</strong> {currentUser?.location?.kebele || 'Not assigned'} | 
              <strong> Woreda:</strong> {currentUser?.location?.woreda} | 
              <strong> Zone:</strong> {currentUser?.location?.zone} | 
              <strong> Region:</strong> {currentUser?.location?.region}
            </p>
          </div>
          <div className="kebele-status">
            <span className="status-badge active">Active</span>
            <p className="welcome-msg">Welcome, {currentUser?.personalInfo?.firstName}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card kebele-stat total">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{stats.totalEvents}</h3>
            <p>Total Events</p>
          </div>
        </div>
        <div className="stat-card kebele-stat pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingReview}</h3>
            <p>Pending Review</p>
          </div>
        </div>
        <div className="stat-card kebele-stat approved">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.approvedEvents}</h3>
            <p>Approved</p>
          </div>
        </div>
        <div className="stat-card kebele-stat rejected">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>{stats.rejectedEvents}</h3>
            <p>Rejected</p>
          </div>
        </div>
        <div className="stat-card kebele-stat forwarded">
          <div className="stat-icon">📤</div>
          <div className="stat-content">
            <h3>{stats.forwardedEvents}</h3>
            <p>Forwarded to Woreda</p>
          </div>
        </div>
      </div>

      {/* Kebele Representative Responsibilities Info */}
      <div className="responsibilities-card">
        <h3>✅ Kebele Representative Responsibilities</h3>
        <div className="responsibilities-grid">
          <div className="responsibility-item">
            <span className="check-icon">✅</span>
            <div>
              <h4>Review Citizen Event Submissions</h4>
              <p>Examine all vital event registrations submitted by citizens in your kebele</p>
            </div>
          </div>
          <div className="responsibility-item">
            <span className="check-icon">✅</span>
            <div>
              <h4>Verify Information Accuracy</h4>
              <p>Check the correctness and completeness of submitted information</p>
            </div>
          </div>
          <div className="responsibility-item">
            <span className="check-icon">✅</span>
            <div>
              <h4>Approve & Forward Events</h4>
              <p>Approve valid events and forward them to Woreda Representative</p>
            </div>
          </div>
          <div className="responsibility-item">
            <span className="check-icon">✅</span>
            <div>
              <h4>Reject with Comments</h4>
              <p>Reject incorrect events with clear comments for citizen correction</p>
            </div>
          </div>
          <div className="responsibility-item">
            <span className="check-icon">✅</span>
            <div>
              <h4>Maintain Local Records</h4>
              <p>Keep accurate local records of all vital events in your kebele</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          <span className="tab-icon">👁️</span>
          <span className="tab-text">Review Events ({stats.pendingReview})</span>
        </button>
        <button 
          className={`tab ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-text">Event Statistics</span>
        </button>
        <button 
          className={`tab ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-text">Local Records</span>
        </button>
        <button 
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="tab-icon">📈</span>
          <span className="tab-text">Generate Reports</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'review' && (
          <CitizenEventReview 
            onCitizenReviewed={handleEventReviewed}
          />
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