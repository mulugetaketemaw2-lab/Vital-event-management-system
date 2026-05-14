import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import ManageAccountModal from '../Common/ManageAccountModal';
import './RegionalManagement.css';

const RegionalManagement = ({ onRegionalAction }) => {
  const { t } = useTranslation();
  const [regions, setRegions] = useState([]);
  const [pendingRegions, setPendingRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedRegional, setSelectedRegional] = useState(null);

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
      toast.error(t('error_fetching_regional_reps'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRegions = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/pending-approvals`);
      setPendingRegions(response.data.data.users);
    } catch (error) {
      toast.error(t('error_fetching_pending_regional_reps'));
    }
  };

  const activateRegional = async (regionalId) => {
    try {
      await axios.patch(`${API_URL}/representatives/${regionalId}/activate`);
      toast.success(t('regional_rep_activated_success'));
      fetchRegions();
      fetchPendingRegions();
      onRegionalAction();
    } catch (error) {
      toast.error(t('error_activating_regional_rep'));
    }
  };

  const getStatusBadge = (regional) => {
    if (!regional.isActive) {
      return <span className="status-badge pending">{t('pending_activation')}</span>;
    }
    return <span className="status-badge active">{t('active_status')}</span>;
  };

  if (loading) {
    return <div className="loading">{t('loading_regional_reps')}</div>;
  }

  const displayRegions = activeTab === 'pending' ? pendingRegions : regions;

  return (
    <div className="regional-management">
      <div className="management-header">
        <h3>{t('regional_reps_management')}</h3>
        <div className="management-tabs">
          <button
            className={`mgmt-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            {t('all_regionals')} ({regions.length})
          </button>
          <button
            className={`mgmt-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            {t('pending_activation')} ({pendingRegions.length})
          </button>
        </div>
      </div>

      <div className="regions-list">
        {displayRegions.length === 0 ? (
          <div className="no-regions">
            {activeTab === 'pending' ? t('no_pending_regional_reps') : t('no_regional_reps_found')}
          </div>
        ) : (
          displayRegions.map(regional => (
            <div key={regional._id} className="regional-card">
              <div className="regional-info">
                <div className="regional-main">
                  <h4>{regional.personalInfo.firstName} {regional.personalInfo.lastName}</h4>
                  <p className="username">@{regional.username}</p>
                  <p className="region-location">
                    {t('region_label')} <strong>{t(regional.location?.region) || t('not_assigned')}</strong>
                  </p>
                </div>
                <div className="regional-details">
                  <div className="detail-group">
                    <span className="detail-label">{t('status_label')}</span>
                    {getStatusBadge(regional)}
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('phone_label')}</span>
                    <span>{regional.personalInfo.phone}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('email_label')}</span>
                    <span>{regional.personalInfo.email || t('not_provided')}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('office_label')}</span>
                    <span>{regional.officeInfo?.officeName || t('not_specified')}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('created_label')}</span>
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
                    {t('activate_account_btn')}
                  </button>
                )}

                {regional.isActive && (
                  <button 
                    className="btn-view"
                    onClick={() => setSelectedRegional(regional)}
                  >
                    {t('view_details_btn', 'View Details')}
                  </button>
                )}

                {regional.isActive && (
                  <button 
                    className="btn-contact"
                    onClick={() => {
                      if (regional.personalInfo?.email) {
                        window.location.href = `mailto:${regional.personalInfo.email}`;
                      } else if (regional.personalInfo?.phone) {
                        window.location.href = `tel:${regional.personalInfo.phone}`;
                      } else {
                        toast.info(t('no_contact_info', 'No contact info available'));
                      }
                    }}
                  >
                    {t('contact_btn', 'Contact')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedRegional && (
        <ManageAccountModal
          user={selectedRegional}
          onClose={() => setSelectedRegional(null)}
          onUpdate={() => {
            fetchRegions();
            if (onRegionalAction) onRegionalAction();
          }}
        />
      )}
    </div>
  );
};

export default RegionalManagement;