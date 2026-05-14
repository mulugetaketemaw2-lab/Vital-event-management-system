import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './CitizenProfile.css';

const CitizenProfile = () => {
  const { currentUser } = useAuth();

  const getLocationString = () => {
    const { location } = currentUser;
    if (!location) return 'Not specified';
    
    const parts = [];
    if (location.kebele) parts.push(location.kebele);
    if (location.woreda) parts.push(location.woreda);
    if (location.zone) parts.push(location.zone);
    if (location.region) parts.push(location.region);
    
    return parts.join(', ') || 'Not specified';
  };

  return (
    <div className="citizen-profile">
      <div className="profile-header">
        <h3>My Profile</h3>
        <p>Your personal information and account details</p>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h4>Personal Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>First Name:</label>
              <span>{currentUser?.personalInfo?.firstName || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <label>Last Name:</label>
              <span>{currentUser?.personalInfo?.lastName || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{currentUser?.personalInfo?.email || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <label>Phone:</label>
              <span>{currentUser?.personalInfo?.phone || 'Not provided'}</span>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h4>Account Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>Username:</label>
              <span>{currentUser?.username}</span>
            </div>
            <div className="info-item">
              <label>User Role:</label>
              <span className="role-badge">Citizen</span>
            </div>
            <div className="info-item">
              <label>Account Created:</label>
              <span>{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h4>Location Information</h4>
          <div className="location-info">
            <p><strong>Registered Location:</strong> {getLocationString()}</p>
            <small>
              This is the location you selected during registration. 
              All your event registrations will be processed through this location's administrative hierarchy.
            </small>
          </div>
        </div>

        <div className="profile-section">
          <h4>System Information</h4>
          <div className="system-info">
            <p>
              <strong>Status:</strong> 
              <span className="status-active">Active</span>
            </p>
            <p>
              <strong>Events Processing:</strong> 
              Your events are processed through the Kebele → Woreda → Zone → Region → National hierarchy
            </p>
            <p>
              <strong>Support:</strong> 
              Contact your local Kebele office for assistance with event registrations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenProfile;