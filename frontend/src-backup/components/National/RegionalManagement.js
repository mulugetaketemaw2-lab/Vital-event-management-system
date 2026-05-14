import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './RegionalManagement.css';

const RegionalManagement = ({ onRegionalAction }) => {
  const [regions, setRegions] = useState([]);
  const [pendingRegions, setPendingRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const { API_URL } = useAuth();

  useEffect(() => {
    fetchRegions();
    fetchPendingRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/my-representatives`);
      setRegions(response.data.data.representatives);
    } catch (error) {
      toast.error('Error fetching regional representatives');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRegions = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/pending-approvals`);
      setPendingRegions(response.data.data.users);
    } catch (error) {
      toast.error('Error fetching pending regional representatives');
    }
  };

  const activateRegional = async (regionalId) => {
    try {
      await axios.patch(`${API_URL}/representatives/${regionalId}/activate`);
      toast.success('Regional Representative activated successfully');
      fetchRegions();
      fetchPendingRegions();
      onRegionalAction();
    } catch (error) {
      toast.error('Error activating regional representative');
    }
  };

  const getStatusBadge = (regional) => {
    if (!regional.isActive) {
      return <span className="status-badge pending">Pending Activation</span>;
    }
    return <span className="status-badge active">Active</span>;
  };

  if (loading) {
    return <div className="loading">Loading regional representatives...</div>;
  }

  const displayRegions = activeTab === 'pending' ? pendingRegions : regions;

  return (
    <div className="regional-management">
      <div className="management-header">
        <h3>Regional Representatives Management</h3>
        <div className="management-tabs">
          <button 
            className={`mgmt-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Regionals ({regions.length})
          </button>
          <button 
            className={`mgmt-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Activation ({pendingRegions.length})
          </button>
        </div>
      </div>

      <div className="regions-list">
        {displayRegions.length === 0 ? (
          <div className="no-regions">
            {activeTab === 'pending' ? 'No pending regional representatives' : 'No regional representatives found'}
          </div>
        ) : (
          displayRegions.map(regional => (
            <div key={regional._id} className="regional-card">
              <div className="regional-info">
                <div className="regional-main">
                  <h4>{regional.personalInfo.firstName} {regional.personalInfo.lastName}</h4>
                  <p className="username">@{regional.username}</p>
                  <p className="region-location">
                    Region: <strong>{regional.location?.region || 'Not assigned'}</strong>
                  </p>
                </div>
                <div className="regional-details">
                  <div className="detail-group">
                    <span className="detail-label">Status:</span>
                    {getStatusBadge(regional)}
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Phone:</span>
                    <span>{regional.personalInfo.phone}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Email:</span>
                    <span>{regional.personalInfo.email || 'Not provided'}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Office:</span>
                    <span>{regional.officeInfo?.officeName || 'Not specified'}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Created:</span>
                    <span>{new Date(regional.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="regional-actions">
                {!regional.isActive && (
                  <button 
                    onClick={() => activateRegional(regional._id)}
                    className="btn-activate"
                  >
                    Activate Account
                  </button>
                )}
                
                {regional.isActive && (
                  <button className="btn-view">
                    View Details
                  </button>
                )}
                
                <button className="btn-contact">
                  Contact
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RegionalManagement;