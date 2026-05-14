import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './LocalRecords.css';

const LocalRecords = ({ onRecordUpdated }) => {
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

  // Fetch citizen registrations for this kebele
  const fetchLocalRecords = async () => {
    try {
      setLoading(true);
      
      // Check if user is kebele representative
      if (!currentUser || !['kebele', 'kebele_representative', 'kebele_admin'].includes(currentUser.role)) {
        toast.error('Only kebele representatives can access this page');
        setRecords([]);
        setLoading(false);
        return;
      }

      // Get kebele from current user
      const userKebele = currentUser.location?.kebele;
      if (!userKebele) {
        toast.error('Your kebele information is not set');
        setRecords([]);
        setLoading(false);
        return;
      }

      // Fetch citizens from this kebele
      const response = await axios.get(`${API_URL}/auth/citizens/kebele/${userKebele}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.status === 'success') {
        const citizens = response.data.data?.citizens || response.data.data || [];
        
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
          toast.info(`No citizen registrations found for kebele: ${userKebele}`);
        } else {
          toast.success(`Loaded ${realCitizens.length} citizen registration(s)`);
        }
      } else {
        setRecords([]);
        toast.error('Failed to load citizen records');
      }
    } catch (error) {
      console.error('Error fetching local records:', error);
      
      // NO DEMO DATA - show empty state
      setRecords([]);
      
      if (error.response?.status === 404) {
        toast.info('No citizens have registered in your kebele yet');
      } else if (error.response?.status === 401) {
        toast.error('Please log in as kebele representative');
      } else {
        toast.error('Error loading citizen records. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle citizen approval/rejection
  const handleReviewCitizen = async () => {
    if (!selectedCitizen || !reviewAction) {
      toast.error('Please select an action');
      return;
    }

    if (reviewAction === 'rejected' && !reviewComments.trim()) {
      toast.error('Please provide reason for rejection');
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
        toast.success(`Citizen ${reviewAction} successfully`);
        
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
      toast.error('Failed to update citizen status');
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
      pending: { class: 'pending', label: 'Pending Review' },
      approved: { class: 'approved', label: 'Approved' },
      rejected: { class: 'rejected', label: 'Rejected' },
      verified: { class: 'verified', label: 'Verified' }
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

      toast.success('Records exported successfully');
    } catch (error) {
      console.error('Error exporting records:', error);
      toast.error('Failed to export records');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading citizen registrations...</p>
      </div>
    );
  }

  return (
    <div className="local-records">
      <div className="records-header">
        <h3>📋 Citizen Registrations - {currentUser?.location?.kebele || 'Your Kebele'}</h3>
        <p className="subtitle">Review and manage citizen registrations in your kebele</p>
      </div>

      <div className="records-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filters">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="verified">Verified</option>
          </select>

          <button onClick={fetchLocalRecords} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>

        <div className="actions">
          <button onClick={handleExportRecords} className="action-btn export">
            📥 Export CSV
          </button>
          <button onClick={() => window.print()} className="action-btn print">
            🖨️ Print List
          </button>
        </div>
      </div>

      <div className="records-summary">
        <div className="summary-card">
          <h4>Total Registrations</h4>
          <h2>{records.length}</h2>
          <p>All citizen registrations</p>
        </div>
        <div className="summary-card">
          <h4>Pending Review</h4>
          <h2>{records.filter(r => r.status === 'pending').length}</h2>
          <p>Awaiting your action</p>
        </div>
        <div className="summary-card">
          <h4>Approved</h4>
          <h2>{records.filter(r => r.status === 'approved').length}</h2>
          <p>Successfully approved</p>
        </div>
        <div className="summary-card">
          <h4>This Month</h4>
          <h2>{records.filter(r => {
            const regDate = new Date(r.registrationDate || r.createdAt);
            const now = new Date();
            return regDate.getMonth() === now.getMonth() && 
                   regDate.getFullYear() === now.getFullYear();
          }).length}</h2>
          <p>Registered this month</p>
        </div>
      </div>

      <div className="records-table-container">
        <table className="records-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Registration Date</th>
              <th>Status</th>
              <th>Documents</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-records">
                  <div className="no-records-message">
                    <span className="icon">📭</span>
                    <p>No citizen registrations found</p>
                    <small>
                      {searchTerm || filterStatus !== 'all' 
                        ? 'Try changing your search or filter' 
                        : 'Citizens will appear here after they register in your kebele'}
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
                        <div className="gender-badge">{citizen.personalInfo?.gender || 'Not specified'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <div className="phone">{citizen.personalInfo?.phone || 'No phone'}</div>
                      <div className="email">{citizen.personalInfo?.email || 'No email'}</div>
                    </div>
                  </td>
                  <td className="reg-date">
                    {formatDate(citizen.registrationDate || citizen.createdAt)}
                  </td>
                  <td>{getStatusBadge(citizen.status || 'pending')}</td>
                  <td>
                    <div className="documents-count">
                      <span className="doc-icon">📄</span>
                      <span>{citizen.documents?.length || 0} document(s)</span>
                    </div>
                  </td>
                  <td>
                    <div className="record-actions">
                      <button 
                        onClick={() => setSelectedCitizen(citizen)}
                        className="action-btn review"
                        disabled={citizen.status !== 'pending'}
                      >
                        {citizen.status === 'pending' ? '👁️ Review' : '✅ Reviewed'}
                      </button>
                      <button 
                        onClick={() => {
                          // View details modal
                          setSelectedCitizen(citizen);
                          setReviewAction('');
                        }}
                        className="action-btn view"
                      >
                        ℹ️ Details
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
                {reviewAction ? 'Review Citizen' : 'Citizen Details'} - {selectedCitizen.personalInfo?.firstName} {selectedCitizen.personalInfo?.lastName}
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
                    <h4>Personal Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Full Name:</label>
                        <span>{selectedCitizen.personalInfo?.firstName} {selectedCitizen.personalInfo?.lastName}</span>
                      </div>
                      <div className="detail-item">
                        <label>Gender:</label>
                        <span>{selectedCitizen.personalInfo?.gender || 'Not specified'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Date of Birth:</label>
                        <span>{selectedCitizen.personalInfo?.dateOfBirth ? formatDate(selectedCitizen.personalInfo.dateOfBirth) : 'Not specified'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Place of Birth:</label>
                        <span>{selectedCitizen.placeOfBirth || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Contact Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Phone:</label>
                        <span>{selectedCitizen.personalInfo?.phone || 'Not provided'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Email:</label>
                        <span>{selectedCitizen.personalInfo?.email || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Location</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Kebele:</label>
                        <span>{selectedCitizen.location?.kebele || 'Not specified'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Woreda:</label>
                        <span>{selectedCitizen.location?.woreda || 'Not specified'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Zone:</label>
                        <span>{selectedCitizen.location?.zone || 'Not specified'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Region:</label>
                        <span>{selectedCitizen.location?.region || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Registration Status</h4>
                    <div className="status-display">
                      {getStatusBadge(selectedCitizen.status || 'pending')}
                      {selectedCitizen.reviewedAt && (
                        <div className="review-info">
                          <small>Reviewed on: {formatDate(selectedCitizen.reviewedAt)}</small>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedCitizen.status === 'pending' && (
                    <div className="action-buttons">
                      <button 
                        onClick={() => setReviewAction('approved')}
                        className="btn-approve"
                      >
                        ✅ Approve Citizen
                      </button>
                      <button 
                        onClick={() => setReviewAction('rejected')}
                        className="btn-reject"
                      >
                        ❌ Reject Citizen
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Review Mode
                <div className="review-form">
                  <h4>You are about to {reviewAction} this citizen</h4>
                  
                  <div className="form-group">
                    <label>Review Comments:</label>
                    <textarea
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      placeholder={
                        reviewAction === 'approved' 
                          ? 'Add optional comments about this approval...'
                          : 'Please provide clear reasons for rejection...'
                      }
                      rows="4"
                      required={reviewAction === 'rejected'}
                    />
                  </div>

                  <div className="modal-footer">
                    <button 
                      onClick={handleReviewCitizen}
                      className="btn-confirm"
                      disabled={reviewAction === 'rejected' && !reviewComments.trim()}
                    >
                      {reviewAction === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
                    </button>
                    <button 
                      onClick={() => setReviewAction('')}
                      className="btn-cancel"
                    >
                      Back to Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="records-guidelines">
        <h4>📋 Citizen Review Guidelines</h4>
        <div className="guidelines-content">
          <div className="guideline">
            <h5>✅ When to Approve:</h5>
            <ul>
              <li>All required documents are provided and valid</li>
              <li>3×4 profile photo meets requirements</li>
              <li>Information matches supporting documents</li>
              <li>Citizen resides within your kebele jurisdiction</li>
            </ul>
          </div>
          <div className="guideline">
            <h5>❌ When to Reject:</h5>
            <ul>
              <li>Missing or invalid identification documents</li>
              <li>Incorrect or fraudulent information</li>
              <li>Citizen does not reside in your kebele</li>
              <li>Poor quality or inappropriate profile photo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalRecords;