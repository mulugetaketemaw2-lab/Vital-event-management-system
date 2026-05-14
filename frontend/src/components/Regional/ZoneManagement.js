import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import ManageAccountModal from '../Common/ManageAccountModal';
import './ZoneManagement.css';

const ZoneManagement = ({ onZoneAction }) => {
  const { t } = useTranslation();
  const [zones, setZones] = useState([]);
  const [pendingZones, setPendingZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedZone, setSelectedZone] = useState(null);

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
      toast.error(t('error_fetching_zone_reps'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingZones = async () => {
    try {
      const response = await axios.get(`${API_URL}/representatives/pending-approvals`);
      setPendingZones(response.data.data.users);
    } catch (error) {
      toast.error(t('error_fetching_pending_zone_reps'));
    }
  };

  const activateZone = async (zoneId) => {
    try {
      await axios.patch(`${API_URL}/representatives/${zoneId}/activate`);
      toast.success(t('zone_rep_activated_success'));
      fetchZones();
      fetchPendingZones();
      onZoneAction();
    } catch (error) {
      toast.error(t('error_activating_zone_rep'));
    }
  };

  const getStatusBadge = (zone) => {
    if (!zone.isActive) {
      return <span className="status-badge pending">{t('pending_activation')}</span>;
    }
    return <span className="status-badge active">{t('active_status')}</span>;
  };

  if (loading) {
    return <div className="loading">{t('loading_zone_reps')}</div>;
  }

  const displayZones = activeTab === 'pending' ? pendingZones : zones;

  return (
    <div className="zone-management">
      <div className="management-header">
        <h3>{t('zone_reps_management')}</h3>
        <div className="management-tabs">
          <button
            className={`mgmt-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            {t('all_zones')} ({zones.length})
          </button>
          <button
            className={`mgmt-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            {t('pending_activation')} ({pendingZones.length})
          </button>
        </div>
      </div>

      <div className="zones-list">
        {displayZones.length === 0 ? (
          <div className="no-zones">
            {activeTab === 'pending' ? t('no_pending_zone_reps') : t('no_zone_reps_found')}
          </div>
        ) : (
          displayZones.map(zone => (
            <div key={zone._id} className="zone-card">
              <div className="zone-info">
                <div className="zone-main">
                  <h4>{zone.personalInfo.firstName} {zone.personalInfo.lastName}</h4>
                  <p className="username">@{zone.username}</p>
                  <p className="zone-location">
                    {t('zone_label')} <strong>{t(zone.location?.zone) || t('not_assigned')}</strong>
                  </p>
                </div>
                <div className="zone-details">
                  <div className="detail-group">
                    <span className="detail-label">{t('status_label')}</span>
                    {getStatusBadge(zone)}
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('phone_label')}</span>
                    <span>{zone.personalInfo.phone}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('email_label')}</span>
                    <span>{zone.personalInfo.email || t('not_provided')}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('office_label')}</span>
                    <span>{zone.officeInfo?.officeName || t('not_specified')}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">{t('created_label')}</span>
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
                    {t('activate_account_btn')}
                  </button>
                )}

                {zone.isActive && (
                  <button 
                    className="btn-view"
                    onClick={() => setSelectedZone(zone)}
                  >
                    {t('view_details_btn', 'View Details')}
                  </button>
                )}

                {zone.isActive && (
                  <button 
                    className="btn-contact"
                    onClick={() => {
                      if (zone.personalInfo?.email) {
                        window.location.href = `mailto:${zone.personalInfo.email}`;
                      } else if (zone.personalInfo?.phone) {
                        window.location.href = `tel:${zone.personalInfo.phone}`;
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

      {selectedZone && (
        <ManageAccountModal
          user={selectedZone}
          onClose={() => setSelectedZone(null)}
          onUpdate={() => {
            fetchZones();
            if (onZoneAction) onZoneAction();
          }}
        />
      )}
    </div>
  );
};

export default ZoneManagement;