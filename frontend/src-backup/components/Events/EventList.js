import React from 'react';
import './EventList.css';

const EventList = ({ events, loading }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'completed': return 'status-completed';
      default: return 'status-pending';
    }
  };

  const getEventDetails = (event) => {
    if (!event) return null;
    return event[`${event.type}Details`] || {};
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getCurrentLevelName = (level) => {
    const levelNames = {
      'kebele': 'Kebele Representative',
      'woreda': 'Woreda Representative',
      'zone': 'Zone Representative',
      'region': 'Regional Representative',
      'national': 'National Representative'
    };
    return levelNames[level] || level;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="no-events">
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h4>No Events Registered</h4>
          <p>You haven't registered any vital events yet.</p>
          <p>Start by registering a birth, death, marriage, divorce, or adoption event.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-list">
      <div className="event-list-header">
        <h3>My Registered Events</h3>
        <p>Total: {events.length} events</p>
      </div>

      <div className="events-container">
        {events.map(event => {
          const details = getEventDetails(event);
          
          return (
            <div key={event._id} className="event-card">
              <div className="event-header">
                <div className="event-title">
                  <h4>{event.type ? event.type.toUpperCase() : 'EVENT'}</h4>
                  <span className="event-id">#{event._id?.toString().slice(-6).toUpperCase()}</span>
                </div>
                <span className={`status ${getStatusColor(event.status)}`}>
                  {event.status || 'pending'}
                </span>
              </div>
              
              <div className="event-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <label>Event Date:</label>
                    <span>{formatDate(event.eventDate)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Registration Date:</label>
                    <span>{formatDate(event.createdAt)}</span>
                  </div>
                </div>
                
                <div className="detail-row">
                  <div className="detail-item">
                    <label>Current Level:</label>
                    <span className="current-level">{getCurrentLevelName(event.currentLevel)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Location:</label>
                    <span>{event.location?.kebele || 'N/A'}</span>
                  </div>
                </div>

                {details && Object.keys(details).length > 0 && (
                  <div className="event-specific-details">
                    <h5>Event Details:</h5>
                    <div className="details-grid">
                      {Object.entries(details).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="detail-grid-item">
                          <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</label>
                          <span>{value || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {event.verification && event.verification.length > 0 && (
                <div className="verification-history">
                  <h5>Approval Progress:</h5>
                  <div className="verification-steps">
                    {event.verification.map((ver, index) => (
                      <div key={index} className="verification-step">
                        <div className={`step-icon ${ver.status}`}>
                          {ver.status === 'approved' ? '✓' : '✗'}
                        </div>
                        <div className="step-details">
                          <span className="step-level">{ver.level}</span>
                          <span className="step-date">{formatDate(ver.verifiedAt)}</span>
                          {ver.comments && (
                            <span className="step-comments">{ver.comments}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {event.certificateUrl && (
                <div className="certificate-section">
                  <h5>📜 Certificate Issued</h5>
                  <a 
                    href={event.certificateUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="certificate-link"
                  >
                    Download Certificate
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventList;