import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import './LocalRecords.css';

const LocalRecords = ({ onRecordUpdated }) => {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewAction, setReviewAction] = useState('');

  const { API_URL, currentUser } = useAuth();

  useEffect(() => {
    fetchLocalRecords();
  }, []);

  // Fetch citizen registrations for current actor level (jurisdiction filtered)
  const fetchLocalRecords = async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_URL}/auth/citizens/for-review`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.status === 'success') {
        // Use the citizens list returned by the unified review endpoint
        const citizens = response.data.data?.citizens || [];

        // Filter out any test data
        const realCitizens = citizens.filter(citizen => {
          const isTestData =
            citizen.personalInfo?.firstName?.toLowerCase().includes('test') ||
            citizen.personalInfo?.lastName?.toLowerCase().includes('test') ||
            citizen.personalInfo?.email?.includes('test@') ||
            citizen.personalInfo?.firstName === 'melkamu' ||
            citizen.personalInfo?.firstName === 'abebe';

          return !isTestData;
        });

        setRecords(realCitizens);

        if (realCitizens.length === 0) {
          toast.info(t('no_citizen_registrations_found'));
        } else {
          toast.success(t('loaded_citizen_registrations', { count: realCitizens.length }));
        }
      } else {
        setRecords([]);
        toast.error(t('failed_load_citizen_records'));
      }
    } catch (error) {
      console.error('Error fetching local records:', error);
      setRecords([]);

      if (error.response?.status === 401) {
        toast.error(t('please_login_again'));
      } else {
        toast.error(t('error_loading_citizen_records'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle citizen approval/rejection
  const handleReviewCitizen = async () => {
    if (!selectedCitizen || !reviewAction) {
      toast.error(t('please_select_action'));
      return;
    }

    if (reviewAction === 'rejected' && !reviewComments.trim()) {
      toast.error(t('please_provide_rejection_reason'));
      return;
    }

    try {
      const response = await axios.patch(
        `${API_URL}/auth/citizens/${selectedCitizen._id}/review`,
        {
          status: reviewAction,
          comments: reviewComments,
          reviewedBy: currentUser._id,
          reviewDate: new Date().toISOString()
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success(t('citizen_status_success', { status: reviewAction }));

        // Update local state
        setRecords(prev =>
          prev.map(citizen =>
            citizen._id === selectedCitizen._id
              ? { ...citizen, status: reviewAction, reviewedAt: new Date() }
              : citizen
          )
        );

        // Close modal and reset
        setSelectedCitizen(null);
        setReviewComments('');
        setReviewAction('');

        // Notify parent component
        if (onRecordUpdated) onRecordUpdated();
      }
    } catch (error) {
      console.error('Error reviewing citizen:', error);
      toast.error(t('failed_update_citizen_status'));
    }
  };

  // Filter records based on search and status filter
  const filteredRecords = records.filter(record => {
    const matchesSearch =
      `${record.personalInfo?.firstName || ''} ${record.personalInfo?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.personalInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.personalInfo?.phone?.includes(searchTerm);

    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Get status badge with appropriate color
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'pending', label: t('pending_review') },
      approved: { class: 'approved', label: t('approved') },
      rejected: { class: 'rejected', label: t('reject') },
      verified: { class: 'verified', label: t('verified_status') || 'Verified' }
    };

    const config = statusConfig[status] || { class: 'unknown', label: status };

    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-ET', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Export records
  const handleExportRecords = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/reports/citizens/export`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `citizen-records-${currentUser.location?.kebele}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(t('records_exported_success'));
    } catch (error) {
      console.error('Error exporting records:', error);
      toast.error(t('failed_export_records'));
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{t('loading_citizen_registrations')}</p>
      </div>
    );
  }

  return (
    <div className="local-records">
      <div className="records-header">
        <h3>📋 {t('citizen_registrations')} - {currentUser?.location?.kebele || t('your_kebele')}</h3>
        <p className="subtitle">{t('review_manage_citizen_registrations')}</p>
      </div>

      <div className="records-summary">
        <div className="summary-card">
          <h4>{t('total_registrations')}</h4>
          <h2>{records.length}</h2>
          <p>{t('all_citizen_registrations')}</p>
        </div>
        <div className="summary-card">
          <h4>{t('pending_review')}</h4>
          <h2>{records.filter(r => r.status === 'pending').length}</h2>
          <p>{t('awaiting_your_action')}</p>
        </div>
        <div className="summary-card">
          <h4>{t('approved')}</h4>
          <h2>{records.filter(r => r.status === 'approved').length}</h2>
          <p>{t('successfully_approved')}</p>
        </div>
        <div className="summary-card">
          <h4>{t('this_month')}</h4>
          <h2>{records.filter(r => {
            const regDate = new Date(r.registrationDate || r.createdAt);
            const now = new Date();
            return regDate.getMonth() === now.getMonth() &&
              regDate.getFullYear() === now.getFullYear();
          }).length}</h2>
          <p>{t('registered_this_month')}</p>
        </div>
      </div>

      <div className="records-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder={t('search_placeholder_name')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="status-tabs">
          {[
            { id: 'all', label: t('all'), icon: '📋' },
            { id: 'pending', label: t('pending'), icon: '⏳' },
            { id: 'approved', label: t('approved'), icon: '✅' },
            { id: 'rejected', label: t('reject'), icon: '❌' },
            { id: 'verified', label: t('verified_status') || 'Verified', icon: '🛡️' }
          ].map(status => (
            <button
              key={status.id}
              onClick={() => setFilterStatus(status.id)}
              className={`status-tab ${filterStatus === status.id ? 'active' : ''}`}
            >
              <span className="tab-icon">{status.icon}</span>
              <span className="tab-label">{status.label}</span>
              <span className="tab-count">
                {status.id === 'all'
                  ? records.length
                  : records.filter(r => r.status === status.id).length
                }
              </span>
            </button>
          ))}
        </div>

        <div className="filters">
          <button onClick={fetchLocalRecords} className="refresh-btn">
            🔄 {t('refresh')}
          </button>
        </div>

        <div className="actions">
          <button onClick={handleExportRecords} className="action-btn export">
            📥 {t('export_csv')}
          </button>
          <button onClick={() => window.print()} className="action-btn print">
            🖨️ {t('print_list')}
          </button>
        </div>
      </div>

      <div className="records-table-container">
        <table className="records-table">
          <thead>
            <tr>
              <th>{t('full_name')}</th>
              <th>{t('contact')}</th>
              <th>{t('registration_date')}</th>
              <th>{t('status')}</th>
              <th>{t('documents')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-records">
                  <div className="no-records-message">
                    <span className="icon">📭</span>
                    <p>{t('no_citizen_registrations_found')}</p>
                    <small>
                      {searchTerm || filterStatus !== 'all'
                        ? t('try_changing_search')
                        : t('citizens_will_appear_here')}
                    </small>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map(citizen => (
                <tr key={citizen._id}>
                  <td>
                    <div className="citizen-name-cell">
                      <div className="citizen-avatar">
                        {citizen.profilePhoto?.url ? (
                          <img
                            src={`${API_URL}${citizen.profilePhoto.url}`}
                            alt={`${citizen.personalInfo?.firstName || ''} ${citizen.personalInfo?.lastName || ''}`}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${citizen.personalInfo?.firstName || ''}+${citizen.personalInfo?.lastName || ''}&background=1a237e&color=fff`;
                            }}
                          />
                        ) : (
                          <div className="avatar-placeholder">
                            {(citizen.personalInfo?.firstName || '').charAt(0)}{(citizen.personalInfo?.lastName || '').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="citizen-info">
                        <strong>{citizen.personalInfo?.firstName} {citizen.personalInfo?.lastName}</strong>
                        <div className="gender-badge">{citizen.personalInfo?.gender || t('not_specified')}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <div className="phone">{citizen.personalInfo?.phone || t('no_phone')}</div>
                      <div className="email">{citizen.personalInfo?.email || t('no_email')}</div>
                    </div>
                  </td>
                  <td className="reg-date">
                    {formatDate(citizen.registrationDate || citizen.createdAt)}
                  </td>
                  <td>{getStatusBadge(citizen.status || 'pending')}</td>
                  <td>
                    <div className="documents-count">
                      <span className="doc-icon">📄</span>
                      <span>{citizen.documents?.length || 0} {t('documents')}</span>
                    </div>
                  </td>
                  <td>
                    <div className="record-actions">
                      <button
                        onClick={() => {
                          setSelectedCitizen(citizen);
                          setReviewAction('');
                        }}
                        className="action-btn view"
                      >
                        👁️ {t('view_details')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Citizen Details/Review Modal */}
      {selectedCitizen && (
        <div className="citizen-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {reviewAction ? t('review_citizen') : t('citizen_details')} - {selectedCitizen.personalInfo?.firstName} {selectedCitizen.personalInfo?.lastName}
              </h3>
              <button
                onClick={() => {
                  setSelectedCitizen(null);
                  setReviewAction('');
                  setReviewComments('');
                }}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {!reviewAction ? (
                // View Mode
                <div className="citizen-details">
                  <div className="detail-section">
                    <h4>{t('personal_information')}</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>{t('full_name')}:</label>
                        <span>{selectedCitizen.personalInfo?.firstName} {selectedCitizen.personalInfo?.lastName}</span>
                      </div>
                      <div className="detail-item">
                        <label>{t('gender')}:</label>
                        <span>{selectedCitizen.personalInfo?.gender || t('not_specified')}</span>
                      </div>
                      <div className="detail-item">
                        <label>{t('date_of_birth')}:</label>
                        <span>{selectedCitizen.personalInfo?.dateOfBirth ? formatDate(selectedCitizen.personalInfo.dateOfBirth) : t('not_specified')}</span>
                      </div>
                      <div className="detail-item">
                        <label>{t('place_of_birth')}:</label>
                        <span>{selectedCitizen.placeOfBirth || t('not_specified')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>{t('contact_information')}</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>{t('phone')}:</label>
                        <span>{selectedCitizen.personalInfo?.phone || t('not_provided')}</span>
                      </div>
                      <div className="detail-item">
                        <label>{t('email')}:</label>
                        <span>{selectedCitizen.personalInfo?.email || t('not_provided')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>{t('location')}</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>{t('kebele')}:</label>
                        <span>{selectedCitizen.location?.kebele || t('not_specified')}</span>
                      </div>
                      <div className="detail-item">
                        <label>{t('woreda')}:</label>
                        <span>{selectedCitizen.location?.woreda || t('not_specified')}</span>
                      </div>
                      <div className="detail-item">
                        <label>{t('zone')}:</label>
                        <span>{selectedCitizen.location?.zone || t('not_specified')}</span>
                      </div>
                      <div className="detail-item">
                        <label>{t('region')}:</label>
                        <span>{selectedCitizen.location?.region || t('not_specified')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>{t('registration_status')}</h4>
                    <div className="status-display">
                      {getStatusBadge(selectedCitizen.status || 'pending')}
                      {selectedCitizen.reviewedAt && (
                        <div className="review-info">
                          <small>{t('reviewed_on')}: {formatDate(selectedCitizen.reviewedAt)}</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setSelectedCitizen(null)}
                className="btn-cancel"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalRecords;