import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './KebeleManagement.css';

const KebeleManagement = ({ onKebeleAction }) => {
  const [kebeles, setKebeles] = useState([]);
  const [pendingKebeles, setPendingKebeles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const { API_URL } = useAuth();

  useEffect(() => {
    fetchKebeles();
    fetchPendingKebeles();
  }, []);

  const fetchKebeles = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/my-representatives`);
      setKebeles(response.data.data.representatives);
    } catch (error) {
      toast.error('Error fetching kebele representatives');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingKebeles = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/pending-approvals`);
      setPendingKebeles(response.data.data.users);
    } catch (error) {
      toast.error('Error fetching pending kebele representatives');
    }
  };

  const activateKebele = async (kebeleId) => {
    try {
      await axios.patch(`${API_URL}/representatives/${kebeleId}/activate`);
      toast.success('Kebele Representative activated successfully');
      fetchKebeles();
      fetchPendingKebeles();
      onKebeleAction();
    } catch (error) {
      toast.error('Error activating kebele representative');
    }
  };

  const getStatusBadge = (kebele) => {
    if (!kebele.isActive) {
      return <span className="status-badge pending">Pending Activation</span>;
    }
    return <span className="status-badge active">Active</span>;
  };

  if (loading) {
    return <div className="loading">Loading kebele representatives...</div>;
  }

  const displayKebeles = activeTab === 'pending' ? pendingKebeles : kebeles;

  return (
    <div className="kebele-management">
      <div className="management-header">
        <h3>Kebele Representatives Management</h3>
        <div className="management-tabs">
          <button 
            className={`mgmt-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Kebeles ({kebeles.length})
          </button>
          <button 
            className={`mgmt-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Activation ({pendingKebeles.length})
          </button>
        </div>
      </div>

      <div className="kebeles-list">
        {displayKebeles.length === 0 ? (
          <div className="no-kebeles">
            {activeTab === 'pending' ? 'No pending kebele representatives' : 'No kebele representatives found'}
          </div>
        ) : (
          displayKebeles.map(kebele => (
            <div key={kebele._id} className="kebele-card">
              <div className="kebele-info">
                <div className="kebele-main">
                  <h4>{kebele.personalInfo.firstName} {kebele.personalInfo.lastName}</h4>
                  <p className="username">@{kebele.username}</p>
                  <p className="kebele-location">
                    Kebele: <strong>{kebele.location?.kebele || 'Not assigned'}</strong>
                  </p>
                </div>
                <div className="kebele-details">
                  <div className="detail-group">
                    <span className="detail-label">Status:</span>
                    {getStatusBadge(kebele)}
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Phone:</span>
                    <span>{kebele.personalInfo.phone}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Email:</span>
                    <span>{kebele.personalInfo.email || 'Not provided'}</span>
                  </div>
                </div>
              </div>
              
              <div className="kebele-actions">
                {!kebele.isActive && (
                  <button 
                    onClick={() => activateKebele(kebele._id)}
                    className="btn-activate"
                  >
                    Activate Account
                  </button>
                )}
                
                {kebele.isActive && (
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

export default KebeleManagement;
