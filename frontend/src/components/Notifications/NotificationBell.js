import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiCheckCircle, FiInfo, FiAlertCircle } from 'react-icons/fi';
import './NotificationBell.css';

/* ── Modern Blue Bell SVG (matches the provided icon image) ── */
const BellSVG = ({ hasUnread }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`bell-svg ${hasUnread ? 'bell-ring' : ''}`}
  >
    {/* Outer bell shape */}
    <path
      d="M32 5C22 5 14 13.4 14 24v14l-4 6h44l-4-6V24C50 13.4 42 5 32 5z"
      fill="#dbeafe"
      stroke="#3b82f6"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Clapper / handle */}
    <path
      d="M26 44c0 3.3 2.7 6 6 6s6-2.7 6-6"
      stroke="#3b82f6"
      strokeWidth="3"
      strokeLinecap="round"
    />
    {/* Hanger at top */}
    <line x1="32" y1="5" x2="32" y2="2" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
    {/* Horizontal bar inside bell */}
    <line x1="20" y1="38" x2="44" y2="38" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get('http://localhost:5000/api/notifications/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        const notifs = response.data.data.notifications;
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* Optimistic update — mark immediately in local state, then sync */
  const markAsRead = async (id) => {
    // Immediately update UI
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      fetchNotifications(); // revert on error
    }
  };

  const markAllAsRead = async () => {
    // Immediately update UI
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const token = localStorage.getItem('token');
      await axios.patch('http://localhost:5000/api/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      fetchNotifications(); // revert on error
    }
  };

  const getIcon = (category) => {
    switch (category) {
      case 'success':      return <FiCheckCircle className="notif-icon success" />;
      case 'action_required': return <FiAlertCircle className="notif-icon danger" />;
      case 'pending':     return <FiInfo className="notif-icon pending" />;
      default:            return <FiInfo className="notif-icon system" />;
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="bell-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        aria-label="Open notifications"
      >
        <BellSVG hasUnread={unreadCount > 0} />
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notif-header">
            <div className="notif-header-title">
              <span className="notif-header-icon">
                <BellSVG hasUnread={false} />
              </span>
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="notif-count-badge">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-btn">
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="empty-notif">
                <BellSVG hasUnread={false} />
                <p>You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`notif-item ${!notif.read ? 'unread' : ''}`}
                  onClick={() => !notif.read && markAsRead(notif._id)}
                >
                  <div className="notif-content-wrapper">
                    {getIcon(notif.category)}
                    <div className="notif-content">
                      <p className="notif-message">{notif.message}</p>
                      <span className="notif-time">{getTimeAgo(notif.createdAt)}</span>
                    </div>
                  </div>
                  {!notif.read && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>

          <div className="notif-footer">
            <button onClick={() => setIsOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
