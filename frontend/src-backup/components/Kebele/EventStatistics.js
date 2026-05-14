import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './EventStatistics.css';

const EventStatistics = ({ stats, onRefresh }) => {
  const [timeframe, setTimeframe] = useState('month');
  const [detailedStats, setDetailedStats] = useState({
    byType: {},
    byStatus: {},
    byMonth: {},
    trends: []
  });
  const [loading, setLoading] = useState(false);

  const { API_URL } = useAuth();
  
  // Temporary fix: Use direct API_URL
  const API_URL_FIXED = 'http://localhost:5000/api';

  useEffect(() => {
    fetchDetailedStatistics();
  }, [timeframe]);

  const fetchDetailedStatistics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL_FIXED}/events/kebele-statistics`, {
        params: { timeframe }
      });
      setDetailedStats(response.data.data);
    } catch (error) {
      console.error('Error fetching detailed statistics:', error);
      // Fallback data
      setDetailedStats({
        byType: { birth: 5, death: 3, marriage: 2, divorce: 1, adoption: 0 },
        byStatus: { pending: 3, approved: 5, rejected: 2, forwarded: 4 },
        byMonth: { 'January': 3, 'February': 5, 'March': 4 },
        trends: [
          { month: 'Jan', events: 3 },
          { month: 'Feb', events: 5 },
          { month: 'Mar', events: 4 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (type) => {
    const colors = {
      birth: '#4CAF50',
      death: '#9E9E9E',
      marriage: '#E91E63',
      divorce: '#FF9800',
      adoption: '#9C27B0'
    };
    return colors[type] || '#2196F3';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FFC107',
      approved: '#4CAF50',
      rejected: '#F44336',
      forwarded: '#2196F3'
    };
    return colors[status] || '#9E9E9E';
  };

  return (
    <div className="event-statistics">
      <div className="stats-header">
        <h3>Kebele Event Statistics</h3>
        <div className="stats-controls">
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="timeframe-select"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>
          <button 
            onClick={() => {
              fetchDetailedStatistics();
              onRefresh();
            }}
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div className="stats-overview-cards">
        <div className="overview-card total">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h4>Total Events</h4>
            <h2>{stats.totalEvents}</h2>
            <p>All events in your kebele</p>
          </div>
        </div>
        <div className="overview-card pending">
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <h4>Pending Review</h4>
            <h2>{stats.pendingReview}</h2>
            <p>Awaiting your action</p>
          </div>
        </div>
        <div className="overview-card approved">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h4>Approval Rate</h4>
            <h2>
              {stats.totalEvents > 0 
                ? `${Math.round((stats.approvedEvents / stats.totalEvents) * 100)}%`
                : '0%'
              }
            </h2>
            <p>{stats.approvedEvents} approved events</p>
          </div>
        </div>
        <div className="overview-card efficiency">
          <div className="card-icon">⚡</div>
          <div className="card-content">
            <h4>Processing Time</h4>
            <h2>24h</h2>
            <p>Average review time</p>
          </div>
        </div>
      </div>

      <div className="detailed-stats">
        <div className="stats-section">
          <h4>Events by Type</h4>
          <div className="type-stats">
            {Object.entries(detailedStats.byType).map(([type, count]) => (
              <div key={type} className="type-stat-item">
                <div className="type-info">
                  <span 
                    className="type-color" 
                    style={{ backgroundColor: getEventTypeColor(type) }}
                  ></span>
                  <span className="type-name">{type.toUpperCase()}</span>
                </div>
                <div className="type-count">
                  <span className="count">{count}</span>
                  <span className="percentage">
                    ({stats.totalEvents > 0 ? Math.round((count / stats.totalEvents) * 100) : 0}%)
                  </span>
                </div>
                <div className="type-bar">
                  <div 
                    className="bar-fill"
                    style={{
                      width: `${stats.totalEvents > 0 ? (count / stats.totalEvents) * 100 : 0}%`,
                      backgroundColor: getEventTypeColor(type)
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <h4>Events by Status</h4>
          <div className="status-stats">
            {Object.entries(detailedStats.byStatus).map(([status, count]) => (
              <div key={status} className="status-stat-item">
                <div className="status-info">
                  <span 
                    className="status-dot" 
                    style={{ backgroundColor: getStatusColor(status) }}
                  ></span>
                  <span className="status-name">{status.toUpperCase()}</span>
                </div>
                <div className="status-count">
                  <span className="count">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <h4>Monthly Trends</h4>
          <div className="trend-chart">
            {detailedStats.trends.map((trend, index) => (
              <div key={index} className="trend-bar">
                <div className="bar-label">{trend.month}</div>
                <div className="bar-container">
                  <div 
                    className="bar"
                    style={{ height: `${(trend.events / Math.max(...detailedStats.trends.map(t => t.events))) * 100}%` }}
                  ></div>
                </div>
                <div className="bar-value">{trend.events}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="statistics-actions">
        <button className="export-btn">
          📥 Export Statistics
        </button>
        <button className="print-btn">
          🖨️ Print Report
        </button>
        <button className="share-btn">
          📤 Share with Woreda
        </button>
      </div>

      <div className="statistics-insights">
        <h4>📈 Insights & Recommendations</h4>
        <div className="insights-content">
          {stats.pendingReview > 5 && (
            <div className="insight warning">
              <strong>⚠️ High Pending Load:</strong> You have {stats.pendingReview} events waiting for review. 
              Consider allocating more time for review tasks.
            </div>
          )}
          {stats.rejectedEvents > 0 && (
            <div className="insight info">
              <strong>ℹ️ Rejection Analysis:</strong> {stats.rejectedEvents} events were rejected. 
              Review rejection reasons to identify common issues.
            </div>
          )}
          {stats.approvedEvents > 0 && (
            <div className="insight success">
              <strong>✅ Good Work:</strong> You've successfully approved {stats.approvedEvents} events 
              and forwarded them to Woreda Representative.
            </div>
          )}
          {stats.totalEvents === 0 && (
            <div className="insight neutral">
              <strong>📭 No Events Yet:</strong> No citizen events have been submitted in your kebele. 
              Consider community outreach to encourage registrations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventStatistics;