import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import ManageAccountModal from '../Common/ManageAccountModal';
import './KebeleManagement.css';

const KebeleManagement = ({ onKebeleAction }) => {
  const { t } = useTranslation();
  const [kebeles, setKebeles] = useState([]);
  const [pendingKebeles, setPendingKebeles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedKebele, setSelectedKebele] = useState(null);

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
      toast.error(t('error_fetching_kebele_reps'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingKebeles = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/pending-approvals`);
      setPendingKebeles(response.data.data.users);
    } catch (error) {
      toast.error(t('error_fetching_pending_kebele_reps'));
    }
  };

  const activateKebele = async (kebeleId) => {
    try {
      await axios.patch(`${API_URL}/representatives/${kebeleId}/activate`);
      toast.success(t('kebele_rep_activated_success'));
      fetchKebeles();
      fetchPendingKebeles();
      onKebeleAction();
    } catch (error) {
      toast.error(t('error_activating_kebele_rep'));
    }
  };

  const getStatusBadge = (kebele) => {
    if (!kebele.isActive) {
      return <span className="status-badge pending">{t('pending_activation')}</span>;
    }
    return <span className="status-badge active">{t('active_status')}</span>;
  };

  if (loading) {
    return <div className="loading">{t('loading_kebele_reps')}</div>;
  }

  const displayKebeles = activeTab === 'pending' ? pendingKebeles : kebeles;

  return (
    <div className="kebele-management">
      <div className="management-header">
        <h3>{t('kebele_reps_management')}</h3>
        <div className="management-tabs">
          <button
            className={`mgmt-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            {t('all_kebeles')} ({kebeles.length})
          </button>
          <button
            className={`mgmt-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            {t('pending_activation')} ({pendingKebeles.length})
          </button>
        </div>
      </div>

      <div className="kebeles-list">
        {displayKebeles.length === 0 ? (
          <div className="no-kebeles">
            {activeTab === 'pending' ? t('no_pending_kebele_reps') : t('no_kebele_reps_found')}
          </div>
        ) : (
          displayKebeles.map(kebele => (
            <div key={kebele._id} className="kebele-card">
              <div className="kebele-info">
                <div className="kebele-main">
                  <h4>{kebele.personalInfo.firstName} {kebele.personalInfo.lastName}</h4>
                  <p className="username">@{kebele.username}</p>
                  <p className="kebele-location">
                    {t('kebele_label')} <strong>{t(kebele.location?.kebele) || t('not_assigned')}</strong>
                  </p>
                </div>
                <div className="kebele-details">
                  <div className="detail-group">
                    <span className="detail-label">{t('status_label')}</span>
                    {getStatusBadge(kebele)}
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('phone_label')}</span>
                    <span>{kebele.personalInfo.phone}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('email_label')}</span>
                    <span>{kebele.personalInfo.email || t('not_provided')}</span>
                  </div>
                </div>
              </div>

              <div className="kebele-actions">
                {!kebele.isActive && (
                  <button
                    onClick={() => activateKebele(kebele._id)}
                    className="btn-activate"
                  >
                    {t('activate_account_btn')}
                  </button>
                )}

                {kebele.isActive && (
                  <button 
                    className="btn-view"
                    onClick={() => setSelectedKebele(kebele)}
                  >
                    {t('view_details_btn', 'View Details')}
                  </button>
                )}

                {kebele.isActive && (
                  <button 
                    className="btn-contact"
                    onClick={() => {
                      if (kebele.personalInfo?.email) {
                        window.location.href = `mailto:${kebele.personalInfo.email}`;
                      } else if (kebele.personalInfo?.phone) {
                        window.location.href = `tel:${kebele.personalInfo.phone}`;
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

      {selectedKebele && (
        <ManageAccountModal
          user={selectedKebele}
          onClose={() => setSelectedKebele(null)}
          onUpdate={() => {
            fetchKebeles();
            if (onKebeleAction) onKebeleAction();
          }}
        />
      )}
    </div>
  );
};

export default KebeleManagement;
