import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import './ManageAccountModal.css';

const ManageAccountModal = ({ user, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const { API_URL } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('details'); // details, edit, actions
  const [formData, setFormData] = useState({
    firstName: user?.personalInfo?.firstName || '',
    lastName: user?.personalInfo?.lastName || '',
    phone: user?.personalInfo?.phone || '',
    email: user?.personalInfo?.email || '',
    username: user?.username || '',
    officeName: user?.officeInfo?.officeName || '',
    specialInformation: user?.personalInfo?.specialInformation || ''
  });

  if (!user) return null;

  const getStatus = () => {
    if (user.identityLinkage?.is_banned) return t('status_banned', 'Banned');
    if (!user.isActive) return t('status_paused_or_pending', 'Pending / Paused');
    return t('status_active', 'Active');
  };

  const handleStatusChange = async (status) => {
    if (!window.confirm(t(`confirm_${status}_action`, `Are you sure you want to change status to ${status}?`))) return;
    setLoading(true);
    try {
      await axios.patch(`${API_URL}/representatives/${user._id}/status`, { status });
      toast.success(t(`status_updated_to_${status}`, `Status updated successfully`));
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.message || t('action_failed', 'Action failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('confirm_delete_account', 'Are you absolutely sure you want to delete this account? This action cannot be undone.'))) return;
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/representatives/${user._id}`);
      toast.success(t('account_deleted_success', 'Account deleted successfully'));
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || t('delete_failed', 'Delete failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API_URL}/representatives/${user._id}`, {
        username: formData.username,
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email,
          specialInformation: formData.specialInformation
        },
        officeInfo: {
          ...user.officeInfo,
          officeName: formData.officeName
        }
      });
      toast.success(t('account_updated_success', 'Account updated successfully'));
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.message || t('update_failed', 'Update failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="manage-account-modal">
        <div className="modal-header">
          <h2>{t('manage_account', 'Manage Account')} - {user.role.toUpperCase()}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-tabs">
          <button className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}>
            {t('view_details', 'View Details')}
          </button>
          <button className={tab === 'edit' ? 'active' : ''} onClick={() => setTab('edit')}>
            {t('edit_info', 'Edit Info')}
          </button>
          <button className={tab === 'actions' ? 'active' : ''} onClick={() => setTab('actions')}>
            {t('administrative_actions', 'Administrative Actions')}
          </button>
        </div>

        <div className="modal-body">
          {tab === 'details' && (
            <div className="details-view">
              <div className="detail-row">
                <strong>{t('name', 'Name')}:</strong> {user.personalInfo?.firstName} {user.personalInfo?.lastName}
              </div>
              <div className="detail-row">
                <strong>{t('username', 'Username')}:</strong> @{user.username}
              </div>
              <div className="detail-row">
                <strong>{t('current_status', 'Status')}:</strong> <span className={`status-badge ${getStatus().toLowerCase()}`}>{getStatus()}</span>
              </div>
              <div className="detail-row">
                <strong>{t('phone', 'Phone')}:</strong> {user.personalInfo?.phone || t('not_provided', 'Not provided')}
              </div>
              <div className="detail-row">
                <strong>{t('email', 'Email')}:</strong> {user.personalInfo?.email || t('not_provided', 'Not provided')}
              </div>
              <div className="detail-row">
                <strong>{t('national_id', 'National ID')}:</strong> {user.personalInfo?.idNumber || t('not_provided', 'Not provided')}
              </div>
              <div className="detail-row">
                <strong>{t('location', 'Location')}:</strong> {user.location?.region} / {user.location?.zone} / {user.location?.woreda} / {user.location?.kebele}
              </div>
              <div className="detail-row">
                <strong>{t('office_name', 'Office')}:</strong> {user.officeInfo?.officeName}
              </div>
              {user.personalInfo?.specialInformation && (
                <div className="detail-row">
                  <strong>{t('special_info', 'Special Info')}:</strong> {user.personalInfo?.specialInformation}
                </div>
              )}
            </div>
          )}

          {tab === 'edit' && (
            <form onSubmit={handleUpdate} className="edit-form">
              <div className="form-group row">
                <div className="col">
                  <label>{t('first_name', 'First Name')}</label>
                  <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="col">
                  <label>{t('last_name', 'Last Name')}</label>
                  <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              <div className="form-group row">
                <div className="col">
                  <label>{t('phone', 'Phone')}</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="col">
                  <label>{t('email', 'Email')}</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="form-group row">
                <div className="col">
                  <label>{t('username', 'Username')}</label>
                  <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div className="col">
                  <label>{t('office_name', 'Office Name')}</label>
                  <input type="text" value={formData.officeName} onChange={e => setFormData({...formData, officeName: e.target.value})} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-save">{t('save_changes', 'Save Changes')}</button>
            </form>
          )}

          {tab === 'actions' && (
            <div className="actions-view">
              <p className="description">{t('actions_description', 'Perform administrative actions on this account. These actions affect the user\'s ability to access the system.')}</p>
              
              <div className="action-buttons">
                {!user.isActive || user.identityLinkage?.is_banned ? (
                  <button onClick={() => handleStatusChange('active')} disabled={loading} className="btn-action activate">
                    {t('activate_access', 'Restore / Activate Access')}
                  </button>
                ) : (
                  <button onClick={() => handleStatusChange('paused')} disabled={loading} className="btn-action pause">
                    {t('pause_access', 'Pause Accessibility')}
                  </button>
                )}

                <button onClick={() => handleStatusChange('banned')} disabled={loading} className="btn-action ban">
                  {t('ban_account', 'Ban / Block Account')}
                </button>

                <div className="danger-zone">
                  <h4>{t('danger_zone', 'Danger Zone')}</h4>
                  <button onClick={handleDelete} disabled={loading} className="btn-action delete">
                    {t('delete_account', 'Permanently Delete Account')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageAccountModal;
