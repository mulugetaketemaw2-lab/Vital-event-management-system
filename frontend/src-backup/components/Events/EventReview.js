import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './EventReview.css';

const EventReview = ({ events, grouped, loading, onEventReviewed, level }) => {
  const [reviewingEvent, setReviewingEvent] = useState(null);
  const [reviewComments, setReviewComments] = useState('');

  const { API_URL } = useAuth();

  const handleReview = async (eventId, status) => {
    try {
      await axios.patch(`${API_URL}/events/${eventId}/review`, {
        status,
        comments: reviewComments
      }, { headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
      });
      
      toast.success(`Event ${status} successfully`);
      setReviewingEvent(null);
      setReviewComments('');
      onEventReviewed();
    } catch (error) {
      toast.error('Error reviewing event');
    }
  };

  const getNextLevel = (currentLevel) => {
    const levels = {
      'kebele': 'Woreda',
      'woreda': 'Certificate Generation'
    };
    return levels[currentLevel] || 'Next Level';
  };

  const getEventDetails = (event) => {
    return event[`${event.type}Details`];
  };

  const renderEvents = (eventsToRender, allowActions) => {
    if (!eventsToRender || eventsToRender.length === 0) {
      return <div className="no-events">No events</div>;
    }

    return (
      <>
        {eventsToRender.map(event => (
          <div key={event._id} className="event-card">
            <div className="event-header">
              <h4>{event.type.toUpperCase()} Event</h4>
              <span className={`status ${event.status}`}>{event.status}</span>
            </div>
            
            <div className="event-details">
              <p><strong>Event Date:</strong> {new Date(event.eventDate).toLocaleDateString()}</p>
              <p><strong>Citizen:</strong> {event.citizen?.personalInfo?.firstName} {event.citizen?.personalInfo?.lastName}</p>
              <p><strong>Location:</strong> {event.location?.kebele}, {event.location?.woreda}, {event.location?.zone}, {event.location?.region}</p>
              <p><strong>Current Level:</strong> {event.currentLevel}</p>
              {event.status === 'pending' && event.currentLevel === 'woreda' && (
                <p><strong>Note:</strong> Forwarded by Kebele — waiting for Woreda approval</p>
              )}
              
              {getEventDetails(event) && (
                <div className="event-specific-details">
                  <h5>Event Details:</h5>
                  {Object.entries(getEventDetails(event)).map(([key, value]) => (
                    <p key={key}><strong>{key}:</strong> {value}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="verification-history">
              <h5>Approval History:</h5>
              {event.verification.map((ver, index) => (
                <div key={index} className="verification-item">
                  <span className={`ver-status ${ver.status}`}>
                    {ver.level}: {ver.status}
                  </span>
                  {ver.comments && <span> - {ver.comments}</span>}
                  <span className="ver-date">
                    {new Date(ver.reviewedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>

            {allowActions && (
              <div className="review-actions">
                {reviewingEvent === event._id ? (
                  <div className="review-form">
                    <textarea
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      placeholder={`Enter comments for ${level} level review${level === 'kebele' ? ' (required for rejection)' : ''}`}
                      rows="3"
                    />
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleReview(event._id, 'approved')}
                        className="approve-btn"
                      >
                        Approve & Send to {getNextLevel(level)}
                      </button>
                      <button 
                        onClick={() => handleReview(event._id, 'rejected')}
                        className="reject-btn"
                        disabled={level === 'kebele' && !reviewComments.trim()}
                      >
                        Reject & Return
                      </button>
                      <button 
                        onClick={() => setReviewingEvent(null)}
                        className="cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setReviewingEvent(event._id)}
                    className="review-btn"
                  >
                    Review This Event
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </>
    );
  };

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

  const hasGrouped = grouped && (grouped.pending || grouped.approved || grouped.rejected);
  const pendingList = hasGrouped ? (grouped.pending || []) : (events || []);
  const approvedList = hasGrouped ? (grouped.approved || []) : [];
  const rejectedList = hasGrouped ? (grouped.rejected || []) : [];

  if (pendingList.length === 0 && approvedList.length === 0 && rejectedList.length === 0) {
    return <div className="no-events">No events to review at {level} level</div>;
  }

  return (
    <div className="event-review">
      <div className="review-header">
        <h3>Events for {level} Level Review</h3>
        <p>
          {['kebele', 'woreda'].includes(level)
            ? `Events that need your approval before moving to ${getNextLevel(level)}`
            : 'View-only: you can monitor events and generate reports at this level'}
        </p>
      </div>

      <div className="review-section">
        <h4>Pending</h4>
        {renderEvents(pendingList, ['kebele', 'woreda'].includes(level))}
      </div>

      {hasGrouped && (
        <>
          <div className="review-section">
            <h4>Approved</h4>
            {renderEvents(approvedList, false)}
          </div>

          <div className="review-section">
            <h4>Rejected</h4>
            {renderEvents(rejectedList, false)}
          </div>
        </>
      )}
    </div>
  );
};

export default EventReview;