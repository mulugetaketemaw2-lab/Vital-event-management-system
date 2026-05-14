import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import ManageAccountModal from '../Common/ManageAccountModal';
import './WoredaManagement.css';

const WoredaManagement = ({ onWoredaAction }) => {
  const { t } = useTranslation();
  const [woredas, setWoredas] = useState([]);
  const [pendingWoredas, setPendingWoredas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedWoreda, setSelectedWoreda] = useState(null);

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
      toast.error(t('error_fetching_woreda_reps'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingWoredas = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/pending-approvals`);
      setPendingWoredas(response.data.data.users);
    } catch (error) {
      toast.error(t('error_fetching_pending_woreda_reps'));
    }
  };

  const activateWoreda = async (woredaId) => {
    try {
      await axios.patch(`${API_URL}/representatives/${woredaId}/activate`);
      toast.success(t('woreda_rep_activated_success'));
      fetchWoredas();
      fetchPendingWoredas();
      onWoredaAction();
    } catch (error) {
      toast.error(t('error_activating_woreda_rep'));
    }
  };

  const getStatusBadge = (woreda) => {
    if (!woreda.isActive) {
      return <span className="status-badge pending">{t('pending_activation')}</span>;
    }
    return <span className="status-badge active">{t('active_status')}</span>;
  };

  if (loading) {
    return <div className="loading">{t('loading_woreda_reps')}</div>;
  }

  const displayWoredas = activeTab === 'pending' ? pendingWoredas : woredas;

  return (
    <div className="woreda-management">
      <div className="management-header">
        <h3>{t('woreda_reps_management')}</h3>
        <div className="management-tabs">
          <button
            className={`mgmt-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            {t('all_woredas')} ({woredas.length})
          </button>
          <button
            className={`mgmt-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            {t('pending_activation')} ({pendingWoredas.length})
          </button>
        </div>
      </div>

      <div className="woredas-list">
        {displayWoredas.length === 0 ? (
          <div className="no-woredas">
            {activeTab === 'pending' ? t('no_pending_woreda_reps') : t('no_woreda_reps_found')}
          </div>
        ) : (
          displayWoredas.map(woreda => (
            <div key={woreda._id} className="woreda-card">
              <div className="woreda-info">
                <div className="woreda-main">
                  <h4>{woreda.personalInfo.firstName} {woreda.personalInfo.lastName}</h4>
                  <p className="username">@{woreda.username}</p>
                  <p className="woreda-location">
                    {t('woreda_label')} <strong>{t(woreda.location?.woreda) || t('not_assigned')}</strong>
                  </p>
                </div>
                <div className="woreda-details">
                  <div className="detail-group">
                    <span className="detail-label">{t('status_label')}</span>
                    {getStatusBadge(woreda)}
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('phone_label')}</span>
                    <span>{woreda.personalInfo.phone}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('email_label')}</span>
                    <span>{woreda.personalInfo.email || t('not_provided')}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('office_label')}</span>
                    <span>{woreda.officeInfo?.officeName || t('not_specified')}</span>
                  </div>
                </div>
              </div>

              <div className="woreda-actions">
                {!woreda.isActive && (
                  <button
                    onClick={() => activateWoreda(woreda._id)}
                    className="btn-activate"
                  >
                    {t('activate_account_btn')}
                  </button>
                )}

                {woreda.isActive && (
                  <button 
                    className="btn-view"
                    onClick={() => setSelectedWoreda(woreda)}
                  >
                    {t('view_details_btn', 'View Details')}
                  </button>
                )}

                {woreda.isActive && (
                  <button 
                    className="btn-contact"
                    onClick={() => {
                      if (woreda.personalInfo?.email) {
                        window.location.href = `mailto:${woreda.personalInfo.email}`;
                      } else if (woreda.personalInfo?.phone) {
                        window.location.href = `tel:${woreda.personalInfo.phone}`;
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

      {selectedWoreda && (
        <ManageAccountModal
          user={selectedWoreda}
          onClose={() => setSelectedWoreda(null)}
          onUpdate={() => {
            fetchWoredas();
            if (onWoredaAction) onWoredaAction();
          }}
        />
      )}
    </div>
  );
};

export default WoredaManagement;