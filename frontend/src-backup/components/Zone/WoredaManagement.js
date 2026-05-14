import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './WoredaManagement.css';

const WoredaManagement = ({ onWoredaAction }) => {
  const [woredas, setWoredas] = useState([]);
  const [pendingWoredas, setPendingWoredas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const { API_URL } = useAuth();

  useEffect(() => {
    fetchWoredas();
    fetchPendingWoredas();
  }, []);

  const fetchWoredas = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/my-representatives`);
      setWoredas(response.data.data.representatives);
    } catch (error) {
      toast.error('Error fetching woreda representatives');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingWoredas = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/pending-approvals`);
      setPendingWoredas(response.data.data.users);
    } catch (error) {
      toast.error('Error fetching pending woreda representatives');
    }
  };

  const activateWoreda = async (woredaId) => {
    try {
      await axios.patch(`${API_URL}/representatives/${woredaId}/activate`);
      toast.success('Woreda Representative activated successfully');
      fetchWoredas();
      fetchPendingWoredas();
      onWoredaAction();
    } catch (error) {
      toast.error('Error activating woreda representative');
    }
  };

  const getStatusBadge = (woreda) => {
    if (!woreda.isActive) {
      return <span className="status-badge pending">Pending Activation</span>;
    }
    return <span className="status-badge active">Active</span>;
  };

  if (loading) {
    return <div className="loading">Loading woreda representatives...</div>;
  }

  const displayWoredas = activeTab === 'pending' ? pendingWoredas : woredas;

  return (
    <div className="woreda-management">
      <div className="management-header">
        <h3>Woreda Representatives Management</h3>
        <div className="management-tabs">
          <button 
            className={`mgmt-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Woredas ({woredas.length})
          </button>
          <button 
            className={`mgmt-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Activation ({pendingWoredas.length})
          </button>
        </div>
      </div>

      <div className="woredas-list">
        {displayWoredas.length === 0 ? (
          <div className="no-woredas">
            {activeTab === 'pending' ? 'No pending woreda representatives' : 'No woreda representatives found'}
          </div>
        ) : (
          displayWoredas.map(woreda => (
            <div key={woreda._id} className="woreda-card">
              <div className="woreda-info">
                <div className="woreda-main">
                  <h4>{woreda.personalInfo.firstName} {woreda.personalInfo.lastName}</h4>
                  <p className="username">@{woreda.username}</p>
                  <p className="woreda-location">
                    Woreda: <strong>{woreda.location?.woreda || 'Not assigned'}</strong>
                  </p>
                </div>
                <div className="woreda-details">
                  <div className="detail-group">
                    <span className="detail-label">Status:</span>
                    {getStatusBadge(woreda)}
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Phone:</span>
                    <span>{woreda.personalInfo.phone}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Email:</span>
                    <span>{woreda.personalInfo.email || 'Not provided'}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Office:</span>
                    <span>{woreda.officeInfo?.officeName || 'Not specified'}</span>
                  </div>
                </div>
              </div>
              
              <div className="woreda-actions">
                {!woreda.isActive && (
                  <button 
                    onClick={() => activateWoreda(woreda._id)}
                    className="btn-activate"
                  >
                    Activate Account
                  </button>
                )}
                
                {woreda.isActive && (
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

export default WoredaManagement;