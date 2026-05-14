import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './ZoneManagement.css';

const ZoneManagement = ({ onZoneAction }) => {
  const [zones, setZones] = useState([]);
  const [pendingZones, setPendingZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const { API_URL } = useAuth();

  useEffect(() => {
    fetchZones();
    fetchPendingZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/my-representatives`);
      setZones(response.data.data.representatives);
    } catch (error) {
      toast.error('Error fetching zone representatives');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingZones = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/pending-approvals`);
      setPendingZones(response.data.data.users);
    } catch (error) {
      toast.error('Error fetching pending zone representatives');
    }
  };

  const activateZone = async (zoneId) => {
    try {
      await axios.patch(`${API_URL}/representatives/${zoneId}/activate`);
      toast.success('Zone Representative activated successfully');
      fetchZones();
      fetchPendingZones();
      onZoneAction();
    } catch (error) {
      toast.error('Error activating zone representative');
    }
  };

  const getStatusBadge = (zone) => {
    if (!zone.isActive) {
      return <span className="status-badge pending">Pending Activation</span>;
    }
    return <span className="status-badge active">Active</span>;
  };

  if (loading) {
    return <div className="loading">Loading zone representatives...</div>;
  }

  const displayZones = activeTab === 'pending' ? pendingZones : zones;

  return (
    <div className="zone-management">
      <div className="management-header">
        <h3>Zone Representatives Management</h3>
        <div className="management-tabs">
          <button 
            className={`mgmt-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Zones ({zones.length})
          </button>
          <button 
            className={`mgmt-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Activation ({pendingZones.length})
          </button>
        </div>
      </div>

      <div className="zones-list">
        {displayZones.length === 0 ? (
          <div className="no-zones">
            {activeTab === 'pending' ? 'No pending zone representatives' : 'No zone representatives found'}
          </div>
        ) : (
          displayZones.map(zone => (
            <div key={zone._id} className="zone-card">
              <div className="zone-info">
                <div className="zone-main">
                  <h4>{zone.personalInfo.firstName} {zone.personalInfo.lastName}</h4>
                  <p className="username">@{zone.username}</p>
                  <p className="zone-location">
                    Zone: <strong>{zone.location?.zone || 'Not assigned'}</strong>
                  </p>
                </div>
                <div className="zone-details">
                  <div className="detail-group">
                    <span className="detail-label">Status:</span>
                    {getStatusBadge(zone)}
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Phone:</span>
                    <span>{zone.personalInfo.phone}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Email:</span>
                    <span>{zone.personalInfo.email || 'Not provided'}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Office:</span>
                    <span>{zone.officeInfo?.officeName || 'Not specified'}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Created:</span>
                    <span>{new Date(zone.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="zone-actions">
                {!zone.isActive && (
                  <button 
                    onClick={() => activateZone(zone._id)}
                    className="btn-activate"
                  >
                    Activate Account
                  </button>
                )}
                
                {zone.isActive && (
                  <button className="btn-view">
                    View Details
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ZoneManagement;