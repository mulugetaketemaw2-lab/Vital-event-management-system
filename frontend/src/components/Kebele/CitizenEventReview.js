import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { getLocationName } from '../Common/LocationSelector';
import { toast } from 'react-toastify';
import SignaturePad from '../Common/SignaturePad';
import { useTranslation } from 'react-i18next';
import './CitizenEventReview.css';

const CitizenEventReview = ({ onCitizenReviewed, level = 'kebele', mode = 'review', regionFilter = 'All' }) => {
  const { API_URL, currentUser } = useAuth();
  const { t } = useTranslation();
  const API_URL_FIXED = API_URL || 'http://localhost:5000/api';

  // STATE FOR CITIZEN REGISTRATIONS (NOT EVENTS)
  const [citizens, setCitizens] = useState([]);
  const [groupedCitizens, setGroupedCitizens] = useState({ pending: [], approved: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [reviewingCitizen, setReviewingCitizen] = useState(null);
  const [reviewComments, setReviewComments] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('approved');
  const [showDetails, setShowDetails] = useState({});
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Derive the officer's full name from their profile (firstName + lastName)
  const getOfficerFullName = () => {
    const { firstName, lastName } = currentUser?.personalInfo || {};
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return currentUser?.username || '';
  };

  // Verification State (used for Kebele and Woreda)
  const [officerName, setOfficerName] = useState('');
  const [sealFile, setSealFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [sealPreview, setSealPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

  const isHighLevel = ['zone', 'region', 'national'].includes(level);
  const isMonitorMode = (mode === 'monitor' && !['kebele', 'woreda', 'zone', 'region', 'national'].includes(level)) || isHighLevel;
  const [activeFilter, setActiveFilter] = useState(isMonitorMode ? 'approved' : 'pending');

  // LOAD CITIZENS FOR REVIEW
  useEffect(() => {
    fetchCitizensForReview();
  }, [level, currentUser]);

  // When a citizen's review is opened, always pre-fill officer name from profile
  useEffect(() => {
    if (reviewingCitizen) {
      setOfficerName(getOfficerFullName());
    }
  }, [reviewingCitizen]);

  // On initial mount, pre-fill officer name if currentUser is already available
  useEffect(() => {
    const name = getOfficerFullName();
    if (name) setOfficerName(name);
  }, [currentUser]);

  const fetchCitizensForReview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error(t('please_log_in_to_access'));
        setLoading(false);
        return;
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      let endpoint = `${API_URL_FIXED}/auth/citizens/for-review`;
      console.log(`📡 Fetching ${level} citizens from:`, endpoint);

      const response = await axios.get(endpoint);

      if (response.data.status === 'success') {
        const data = response.data.data;
        if (data.grouped) {
          setGroupedCitizens(data.grouped);
          console.log(`Found grouped citizens: P:${data.grouped.pending?.length}, A:${data.grouped.approved?.length}, R:${data.grouped.rejected?.length}`);
        } else if (data.citizens) {
          // If not grouped by backend, group them locally or show as pending if we are in review mode
          const all = data.citizens;
          const grouped = {
            pending: all.filter(c => c.status.includes('pending')),
            approved: all.filter(c => c.status === 'approved' || c.status === 'verified'),
            rejected: all.filter(c => c.status.includes('rejected'))
          };
          setGroupedCitizens(grouped);
        }
      } else {
        toast.error(t('failed_to_load_citizens'));
      }
    } catch (error) {
      console.error('Error fetching citizens:', error);
      if (error.response?.status !== 404) {
        toast.error(t('error_loading_citizens'));
      }
      setGroupedCitizens({ pending: [], approved: [], rejected: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(t('please_upload_image'));
        return;
      }
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // HANDLE CITIZEN REVIEW (APPROVE/REJECT)
  const handleCitizenReview = async (citizenId) => {
    if (!reviewComments.trim() && selectedStatus === 'rejected') {
      toast.error(t('please_provide_rejection_reason'));
      return;
    }

    try {
      setIsSubmittingReview(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      if (selectedStatus === 'approved') {
        if (!officerName.trim()) {
          toast.error(t('officer_name_required'));
          setIsSubmittingReview(false);
          return;
        }
        if (!sealFile) {
          toast.error(t('official_seal_required'));
          setIsSubmittingReview(false);
          return;
        }
        if (!signatureFile) {
          toast.error(t('officer_signature_required_draw'));
          setIsSubmittingReview(false);
          return;
        }

        const formData = new FormData();
        formData.append('officerName', officerName);
        formData.append('seal', sealFile);
        // signatureFile is a Blob from the SignaturePad; wrap it as a File
        const sigFile = new File([signatureFile], `signature-${Date.now()}.png`, { type: 'image/png' });
        formData.append('signature', sigFile);
        formData.append('status', 'approved');
        formData.append('comments', reviewComments);

        if (level === 'kebele') {
          await axios.patch(
            `${API_URL_FIXED}/auth/citizens/${citizenId}/review`,
            formData,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
        } else {
          // Woreda, Zone, Region, National
          await axios.patch(
            `${API_URL_FIXED}/auth/citizens/${citizenId}/review-high-level`,
            formData,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
        }
      } else {
        // Rejection logic
        if (level === 'kebele') {
          await axios.patch(
            `${API_URL_FIXED}/auth/citizens/${citizenId}/review`,
            { status: 'rejected', comments: reviewComments },
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
        } else {
          const formData = new FormData();
          formData.append('status', 'rejected');
          formData.append('comments', reviewComments);

          await axios.patch(
            `${API_URL_FIXED}/auth/citizens/${citizenId}/review-high-level`,
            formData,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
        }
      }

      toast.success(selectedStatus === 'approved' ? t('citizen_registration_approved') : t('citizen_registration_rejected'));

      // Reset form
      setReviewingCitizen(null);
      setReviewComments('');
      setOfficerName('');
      setSealFile(null);
      setSignatureFile(null);
      setSealPreview(null);
      setSignaturePreview(null);
      setSelectedStatus('approved');

      // Refresh list
      fetchCitizensForReview();

      // Notify parent component
      if (onCitizenReviewed) {
        onCitizenReviewed();
      }
    } catch (error) {
      console.error('Review error:', error);
      toast.error(error.response?.data?.message || t('error_reviewing_citizen'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const toggleDetails = (citizenId) => {
    setShowDetails(prev => ({
      ...prev,
      [citizenId]: !prev[citizenId]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('not_provided');
    return new Date(dateString).toLocaleDateString('en-ET', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getVerificationIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{t('loading_citizen_registrations_review')}</p>
      </div>
    );
  }

  const filterByRegion = (citizensList) => {
    if (!regionFilter || regionFilter === 'All') return citizensList;
    return citizensList.filter(c => c.location?.region === regionFilter || c.location?.regionName === regionFilter);
  };

  const pendingCitizens = filterByRegion(groupedCitizens?.pending || []);
  const approvedCitizens = filterByRegion(groupedCitizens?.approved || []);
  const rejectedCitizens = filterByRegion(groupedCitizens?.rejected || []);

  if (pendingCitizens.length === 0 && approvedCitizens.length === 0 && rejectedCitizens.length === 0) {
    return (
      <div className="no-citizens-container">
        <div className="no-citizens-icon">👥</div>
        <h3>{t('no_citizen_registrations_found')}</h3>

        <p>{t('no_citizen_submissions')}</p>
        <p className="subtext">
          {t('citizens_will_appear_here')}
          {t('you_can_also')} <button onClick={fetchCitizensForReview} className="refresh-link">{t('refresh')}</button> {t('to_check_new_submissions')}
        </p>
        <div className="kebele-info">
          <h5>{t('your_current_jurisdiction')}:</h5>
          <p><strong>{level.toUpperCase()}:</strong> {currentUser?.location?.[`${level}Name`] || currentUser?.location?.[level] || t('not_assigned')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="citizen-event-review">
      <div className="review-header">
        <h3>👥 {t('citizen_registration_review')}</h3>

        <p className="subtitle">
          {t('review_verify_citizens_desc')}
          <span className="highlight"> {t('approved_citizens_can_submit')}</span>
        </p>
        {!isMonitorMode && (
          <div className="stats-badge">
            <span className="count">{pendingCitizens.length}</span>
            <span className="label">{t('pending_registrations')}</span>
          </div>
        )}
        <div className="stats-badge" style={{ marginLeft: '10px' }}>
          <span className="count">{approvedCitizens.length}</span>
          <span className="label">{t('approved')}</span>
        </div>
        <div className="stats-badge" style={{ marginLeft: '10px' }}>
          <span className="count">{rejectedCitizens.length}</span>
          <span className="label">{t('rejected')}</span>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          {!isMonitorMode && (
            <button
              onClick={() => setActiveFilter('pending')}
              className={`filter-tab ${activeFilter === 'pending' ? 'active' : ''}`}
              style={{
                padding: '10px 20px',
                backgroundColor: activeFilter === 'pending' ? '#ff9800' : '#f5f5f5',
                color: activeFilter === 'pending' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeFilter === 'pending' ? 'bold' : 'normal',
                transition: 'all 0.3s'
              }}
            >
              ⏳ {t('pending')} ({pendingCitizens.length})
            </button>
          )}
          <button
            onClick={() => setActiveFilter('approved')}
            className={`filter-tab ${activeFilter === 'approved' ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              backgroundColor: activeFilter === 'approved' ? '#4caf50' : '#f5f5f5',
              color: activeFilter === 'approved' ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: activeFilter === 'approved' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            ✅ {t('approved')} ({approvedCitizens.length})
          </button>
          <button
            onClick={() => setActiveFilter('rejected')}
            className={`filter-tab ${activeFilter === 'rejected' ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              backgroundColor: activeFilter === 'rejected' ? '#f44336' : '#f5f5f5',
              color: activeFilter === 'rejected' ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: activeFilter === 'rejected' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            ❌ {t('rejected')} ({rejectedCitizens.length})
          </button>
        </div>
      </div>

      <div className="citizens-list table-responsive" style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', padding: '15px' }}>
        <table className="citizens-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #1a237e, #283593)', color: '#fff' }}>
              <th style={{ padding: '13px 15px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>No.</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{t('full_name') || 'Full Name'}</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold' }}>{t('contact') || 'Contact'}</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold' }}>{t('registration_date') || 'Registration Date'}</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold' }}>{t('place_of_registration') || 'Place of Registration'}</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{t('status') || 'Status'}</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold', textAlign: 'center' }}>{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {(activeFilter === 'pending' ? pendingCitizens :
              activeFilter === 'approved' ? approvedCitizens :
              rejectedCitizens).map((citizen, rowIndex) => {
                const docCount = (citizen.idCard ? 1 : 0) + (citizen.documents?.length || 0);
                return (
                  <React.Fragment key={citizen._id}>
                    <tr style={{ borderBottom: '1px solid #edf2f7', transition: 'background-color 0.2s', background: showDetails[citizen._id] ? '#eef2ff' : rowIndex % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      {/* No. */}
                      <td style={{ padding: '14px 15px', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>{rowIndex + 1}</td>
                      {/* Full Name with photo */}
                      <td style={{ padding: '14px 15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {citizen.personalInfo?.photo?.url ? (
                            <img
                              src={`${API_URL?.replace('/api', '') || 'http://localhost:5000'}${citizen.personalInfo.photo.url}`}
                              alt={`${citizen.personalInfo?.firstName} ${citizen.personalInfo?.lastName}`}
                              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #c7d2fe', flexShrink: 0 }}
                              onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>👤</div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: '#1a237e', fontSize: '14px', whiteSpace: 'nowrap' }}>{citizen.personalInfo?.firstName} {citizen.personalInfo?.lastName}</div>
                            <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>{citizen.personalInfo?.gender ? t(citizen.personalInfo.gender.toLowerCase()) : ''}</div>
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td style={{ padding: '14px 15px' }}>
                        <div style={{ color: '#374151', fontWeight: 500, fontSize: '13.5px', whiteSpace: 'nowrap' }}>{citizen.personalInfo?.phone || t('not_provided')}</div>
                        <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '3px' }}>{citizen.personalInfo?.email || ''}</div>
                      </td>
                      {/* Registration Date */}
                      <td style={{ padding: '14px 15px', color: '#555', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                        {formatDate(citizen.createdAt)}
                      </td>
                      {/* Place of Registration */}
                      <td style={{ padding: '14px 15px' }}>
                        <div style={{ fontSize: '13px', color: '#374151' }}>
                          {citizen.location?.kebeleName || citizen.location?.kebele || ''}
                          {(citizen.location?.kebeleName || citizen.location?.kebele) && (citizen.location?.woreda || citizen.location?.woredaName) ? ', ' : ''}
                          {citizen.location?.woredaName || citizen.location?.woreda || ''}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                          {citizen.location?.zoneName || citizen.location?.zone || ''}
                          {(citizen.location?.zoneName || citizen.location?.zone) && (citizen.location?.region || citizen.location?.regionName) ? ' · ' : ''}
                          {citizen.location?.regionName || citizen.location?.region || ''}
                        </div>
                      </td>
                      {/* Status */}
                      <td style={{ padding: '14px 15px' }}>
                        <span className={`status-badge ${citizen.status}`}>
                          {t(citizen.status)}
                        </span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '14px 15px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleDetails(citizen._id)}
                          style={{
                            padding: '8px 16px',
                            background: showDetails[citizen._id] ? '#c7d2fe' : '#e0e7ff',
                            color: '#3730a3',
                            border: 'none', borderRadius: '8px', cursor: 'pointer',
                            fontWeight: 700, fontSize: '13px',
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                          }}
                        >
                          🔘 {showDetails[citizen._id] ? t('hide_details') || 'Hide' : t('view_details') || 'View Details'}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED DETAILS */}
                    {showDetails[citizen._id] && (
                      <tr style={{ background: '#f5f7ff', borderBottom: '2px solid #6366f1' }}>
                        <td colSpan="7" style={{ padding: '24px 30px', borderLeft: '4px solid #6366f1' }}>
                          <div style={{ display: 'grid', gap: '20px' }}>

                            {/* Header with profile photo */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e0e7ff' }}>
                              {citizen.personalInfo?.photo?.url ? (
                                <img
                                  src={`${API_URL?.replace('/api', '') || 'http://localhost:5000'}${citizen.personalInfo.photo.url}`}
                                  alt="Profile"
                                  style={{ width: '90px', height: '100px', borderRadius: '12px', objectFit: 'cover', border: '3px solid #c7d2fe', flexShrink: 0 }}
                                  onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div style={{ width: '90px', height: '100px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', flexShrink: 0 }}>👤</div>
                              )}
                              <div>
                                <h4 style={{ margin: '0 0 6px 0', color: '#1a237e', fontSize: '18px' }}>{citizen.personalInfo?.firstName} {citizen.personalInfo?.lastName}</h4>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                  <span style={{ padding: '3px 10px', borderRadius: '12px', background: '#e0e7ff', color: '#3730a3', fontSize: '12px', fontWeight: 600 }}>{citizen.personalInfo?.gender || ''}</span>
                                  <span className={`status-badge ${citizen.status}`}>{t(citizen.status)}</span>
                                  <span style={{ padding: '3px 10px', borderRadius: '12px', background: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: 600 }}>ID: #{citizen._id?.toString().slice(-8).toUpperCase()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Personal Information */}
                            <div>
                              <h5 style={{ margin: '0 0 10px 0', color: '#283593', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>👤 {t('personal_information') || 'Personal Information'}</h5>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                <CzDetailItem label={t('full_name') || 'Full Name'} value={`${citizen.personalInfo?.firstName || ''} ${citizen.personalInfo?.lastName || ''}`} />
                                <CzDetailItem label={t('date_of_birth') || 'Date of Birth'} value={citizen.personalInfo?.dateOfBirth ? formatDate(citizen.personalInfo.dateOfBirth) : t('not_provided')} />
                                <CzDetailItem label={t('gender') || 'Gender'} value={citizen.personalInfo?.gender || t('not_provided')} />
                                <CzDetailItem label={t('marital_status') || 'Marital Status'} value={citizen.personalInfo?.maritalStatus || t('not_provided')} />
                                <CzDetailItem label={t('occupation') || 'Occupation'} value={citizen.personalInfo?.occupation || t('not_provided')} />
                                <CzDetailItem label={t('education') || 'Education'} value={citizen.personalInfo?.educationLevel || t('not_provided')} />
                                <CzDetailItem label={t('nationality') || 'Nationality'} value={citizen.personalInfo?.nationality || t('not_provided')} />
                                <CzDetailItem label={t('registration_date') || 'Registration Date'} value={formatDate(citizen.createdAt)} />
                              </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                              <h5 style={{ margin: '0 0 10px 0', color: '#283593', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>📞 {t('contact_information') || 'Contact Information'}</h5>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                <CzDetailItem label={t('phone') || 'Phone'} value={citizen.personalInfo?.phone || t('not_provided')} />
                                <CzDetailItem label={t('email') || 'Email'} value={citizen.personalInfo?.email || t('not_provided')} />
                              </div>
                            </div>

                            {/* Place of Registration / Location */}
                            <div>
                              <h5 style={{ margin: '0 0 10px 0', color: '#283593', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>📍 {t('place_of_registration') || 'Place of Registration'}</h5>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                                <CzDetailItem label={t('region') || 'Region'} value={citizen.location?.regionName || getLocationName('region', citizen.location?.region) || t('not_specified')} />
                                <CzDetailItem label={t('zone') || 'Zone'} value={citizen.location?.zoneName || getLocationName('zone', citizen.location?.zone) || t('not_specified')} />
                                <CzDetailItem label={t('woreda') || 'Woreda'} value={citizen.location?.woredaName || getLocationName('woreda', citizen.location?.woreda) || t('not_specified')} />
                                <CzDetailItem label={t('kebele') || 'Kebele'} value={citizen.location?.kebeleName || getLocationName('kebele', citizen.location?.kebele) || t('not_specified')} />
                              </div>
                            </div>

                            {/* Residential Address */}
                            {(citizen.personalInfo?.address?.houseNumber || citizen.personalInfo?.address?.specificLocation) && (
                              <div>
                                <h5 style={{ margin: '0 0 10px 0', color: '#283593', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>🏠 {t('residential_address') || 'Residential Address'}</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                  <CzDetailItem label={t('house_number') || 'House Number'} value={citizen.personalInfo?.address?.houseNumber || t('not_provided')} />
                                  <CzDetailItem label={t('specific_location') || 'Specific Location'} value={citizen.personalInfo?.address?.specificLocation || t('not_provided')} />
                                </div>
                              </div>
                            )}

                            {/* Family Information */}
                            {(citizen.personalInfo?.familyInfo?.fatherName || citizen.personalInfo?.familyInfo?.motherName) && (
                              <div>
                                <h5 style={{ margin: '0 0 10px 0', color: '#283593', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>👪 {t('family_information') || 'Family Information'}</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                  <CzDetailItem label={t('fathers_name') || "Father's Name"} value={citizen.personalInfo?.familyInfo?.fatherName || t('not_provided')} />
                                  <CzDetailItem label={t('mothers_name') || "Mother's Name"} value={citizen.personalInfo?.familyInfo?.motherName || t('not_provided')} />
                                  <CzDetailItem label={t('fathers_occupation') || "Father's Occupation"} value={citizen.personalInfo?.familyInfo?.fatherOccupation || t('not_provided')} />
                                  <CzDetailItem label={t('mothers_occupation') || "Mother's Occupation"} value={citizen.personalInfo?.familyInfo?.motherOccupation || t('not_provided')} />
                                </div>
                              </div>
                            )}

                            {/* Kebele Verification */}
                            {citizen.kebeleVerification && (
                              <div style={{ padding: '14px', background: '#e8f5e9', borderRadius: '10px', border: '1px solid #c8e6c9' }}>
                                <h5 style={{ margin: '0 0 10px 0', color: '#2e7d32', fontSize: '14px' }}>🏛️ {t('kebele_approval_initial') || 'Kebele Approval'}</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                                  <CzDetailItem label={t('approving_officer') || 'Approving Officer'} value={citizen.kebeleVerification.officerName} />
                                  <CzDetailItem label={t('approved_at') || 'Approved At'} value={formatDate(citizen.kebeleVerification.approvedAt)} />
                                </div>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                  {citizen.kebeleVerification.seal?.url && (
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '11px', color: '#2e7d32', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>{t('official_seal') || 'Seal'}</div>
                                      <img src={`${API_URL?.replace('/api', '') || 'http://localhost:5000'}${citizen.kebeleVerification.seal.url}`} alt="Seal" style={{ height: '70px', border: '1px solid #a5d6a7', borderRadius: '6px' }} />
                                    </div>
                                  )}
                                  {citizen.kebeleVerification.signature?.url && (
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '11px', color: '#2e7d32', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>{t('officer_signature') || 'Signature'}</div>
                                      <img src={`${API_URL?.replace('/api', '') || 'http://localhost:5000'}${citizen.kebeleVerification.signature.url}`} alt="Signature" style={{ height: '70px', border: '1px solid #a5d6a7', borderRadius: '6px' }} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Woreda Verification */}
                            {citizen.woredaVerification && (
                              <div style={{ padding: '14px', background: '#e3f2fd', borderRadius: '10px', border: '1px solid #90caf9' }}>
                                <h5 style={{ margin: '0 0 10px 0', color: '#1565c0', fontSize: '14px' }}>🏢 {t('woreda_approval_tier2') || 'Woreda Approval'}</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                                  <CzDetailItem label={t('approving_officer') || 'Approving Officer'} value={citizen.woredaVerification.officerName} />
                                  <CzDetailItem label={t('approved_at') || 'Approved At'} value={formatDate(citizen.woredaVerification.approvedAt)} />
                                </div>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                  {citizen.woredaVerification.seal?.url && (
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '11px', color: '#1565c0', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>{t('woreda_seal') || 'Seal'}</div>
                                      <img src={`${API_URL?.replace('/api', '') || 'http://localhost:5000'}${citizen.woredaVerification.seal.url}`} alt="Seal" style={{ height: '70px', border: '1px solid #90caf9', borderRadius: '6px' }} />
                                    </div>
                                  )}
                                  {citizen.woredaVerification.signature?.url && (
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '11px', color: '#1565c0', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>{t('woreda_officer_signature') || 'Signature'}</div>
                                      <img src={`${API_URL?.replace('/api', '') || 'http://localhost:5000'}${citizen.woredaVerification.signature.url}`} alt="Signature" style={{ height: '70px', border: '1px solid #90caf9', borderRadius: '6px' }} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Supporting Documents */}
                            {(citizen.idCard?.url || (citizen.documents && citizen.documents.length > 0)) && (
                              <div>
                                <h5 style={{ margin: '0 0 10px 0', color: '#283593', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>📄 {t('documents') || 'Documents'}</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {citizen.idCard?.url && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', border: '1px solid #c7d2fe', borderRadius: '8px' }}>
                                      <span style={{ fontWeight: 600, color: '#374151' }}>🆔 {t('id_card_pdf') || 'ID Card'}</span>
                                      <button onClick={() => window.open(`${API_URL?.replace('/api', '') || 'http://localhost:5000'}${citizen.idCard.url}`, '_blank')} style={{ padding: '5px 14px', background: '#3730a3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>{t('view_pdf') || 'View'}</button>
                                    </div>
                                  )}
                                  {citizen.documents?.map((doc, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                      <span style={{ color: '#374151' }}>📄 {doc.originalName || doc.originalname || doc.name || `${t('supporting_document') || 'Document'} ${idx + 1}`}</span>
                                      <button onClick={() => window.open(`${API_URL?.replace('/api', '') || 'http://localhost:5000'}${doc.url || doc.path}`, '_blank')} style={{ padding: '5px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>{t('view_document') || 'View'}</button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                  {/* REVIEW ACTIONS - Only for Kebele/Woreda in Pending tab */}
                  {!isMonitorMode && activeFilter === 'pending' && (
                    reviewingCitizen === citizen._id ? (
                      <div className="review-form" style={{ marginTop: '15px', padding: '20px', background: '#fff', border: '2px solid #ff9800', borderRadius: '12px' }}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>{t('select_action')}:</label>
                          <div className="action-buttons" style={{ display: 'flex', gap: '15px' }}>
                            <button
                              className={`action-btn ${selectedStatus === 'approved' ? 'selected' : ''}`}
                              onClick={() => setSelectedStatus('approved')}
                              style={{
                                padding: '12px 20px',
                                border: '2px solid #4caf50',
                                background: selectedStatus === 'approved' ? '#4caf50' : '#fff',
                                color: selectedStatus === 'approved' ? '#fff' : '#4caf50',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                flex: 1
                              }}
                            >
                              ✅ {t('approve_registration')}
                            </button>
                            <button
                              className={`action-btn ${selectedStatus === 'rejected' ? 'selected' : ''}`}
                              onClick={() => setSelectedStatus('rejected')}
                              style={{
                                padding: '12px 20px',
                                border: '2px solid #f44336',
                                background: selectedStatus === 'rejected' ? '#f44336' : '#fff',
                                color: selectedStatus === 'rejected' ? '#fff' : '#f44336',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                flex: 1
                              }}
                            >
                              ❌ {t('reject_registration')}
                            </button>
                          </div>
                        </div>

                        {selectedStatus === 'approved' && (
                          <div className="approval-fields" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                            <h5 style={{ marginTop: 0, marginBottom: '15px', color: '#2c3e50' }}>🏛️ {t(level)} {t('level_approval_details')}</h5>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                              <label style={{ display: 'block', marginBottom: '5px' }}>{t('officer_name')} <span style={{ color: 'red' }}>*</span></label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  value={officerName}
                                  readOnly
                                  placeholder={t('enter_approving_officer_name')}
                                  style={{
                                    width: '100%',
                                    padding: '10px 36px 10px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #a5b4fc',
                                    backgroundColor: '#eef2ff',
                                    color: '#3730a3',
                                    fontWeight: 600,
                                    cursor: 'not-allowed',
                                    boxSizing: 'border-box'
                                  }}
                                />
                                <span
                                  title="Auto-filled from your profile"
                                  style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '16px',
                                    pointerEvents: 'none'
                                  }}
                                >🔒</span>
                              </div>
                              <small style={{ color: '#6366f1', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                ✅ Auto-filled from your profile. Cannot be changed.
                              </small>
                            </div>
                            <div className="file-upload-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              <div className="upload-field">
                                <label style={{ display: 'block', marginBottom: '5px' }}>{t('official_seal')} <span style={{ color: 'red' }}>*</span></label>
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setSealFile, setSealPreview)} />
                                {sealPreview && <img src={sealPreview} alt="Seal Preview" style={{ height: '60px', marginTop: '5px' }} />}
                              </div>
                              <div className="upload-field" style={{ gridColumn: '1 / -1' }}>
                                <SignaturePad
                                  label={t('officer_signature')}
                                  required={true}
                                  height={140}
                                  onSignatureChange={(blob, dataUrl) => {
                                    setSignatureFile(blob);
                                    setSignaturePreview(dataUrl);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>{t('review_comments')}:</label>
                          <textarea
                            value={reviewComments}
                            onChange={(e) => setReviewComments(e.target.value)}
                            placeholder={t('add_verification_notes')}
                            rows="4"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
                          />
                        </div>

                        <div className="review-action-buttons" style={{ display: 'flex', gap: '15px' }}>
                          <button
                            onClick={() => handleCitizenReview(citizen._id)}
                            className="submit-review-btn"
                            disabled={isSubmittingReview || (selectedStatus === 'rejected' && !reviewComments.trim())}
                            style={{
                              padding: '12px 25px',
                              background: selectedStatus === 'approved' ? '#4caf50' : '#f44336',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: (isSubmittingReview || (selectedStatus === 'rejected' && !reviewComments.trim())) ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold',
                              flex: 2,
                              opacity: (isSubmittingReview || (selectedStatus === 'rejected' && !reviewComments.trim())) ? 0.6 : 1
                            }}
                          >
                            {isSubmittingReview ? `⌛ ${t('processing')}` : selectedStatus === 'approved' ? `✅ ${t('complete_approval')}` : `❌ ${t('confirm_rejection')}`}
                          </button>
                          <button
                            onClick={() => {
                              setReviewingCitizen(null);
                              setReviewComments('');
                            }}
                            className="cancel-review-btn"
                            disabled={isSubmittingReview}
                            style={{
                              padding: '12px 20px',
                              background: '#f0f0f0',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              flex: 1
                            }}
                          >
                            {t('cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="review-actions" style={{ marginTop: '15px' }}>
                        <button
                          onClick={() => setReviewingCitizen(citizen._id)}
                          className="start-review-btn"
                          style={{
                            padding: '10px 25px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          📝 {t('start_review_process')}
                        </button>
                      </div>
                    )
                  )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>
        {(activeFilter === 'pending' ? pendingCitizens :
          activeFilter === 'approved' ? approvedCitizens :
            rejectedCitizens).length === 0 && (
            <div className="no-citizens-container" style={{ padding: '40px', textAlign: 'center', background: '#f9f9f9', borderRadius: '12px' }}>
              <p style={{ fontSize: '18px', color: '#666' }}>{t('no_citizens_in_level', { filter: t(activeFilter), level: t(level) })}</p>
            </div>
          )}
      </div>

      <div className="review-guidelines" style={{ marginTop: '40px', padding: '30px', background: '#fff', borderRadius: '15px', border: '2px solid #edf2f7', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h4 style={{ margin: '0 0 20px 0', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
          📋 {t('citizen_registration_review_guidelines')}
        </h4>
        <div className="guidelines-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div className="guideline">
            <h5 style={{ color: '#2f855a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>✅ {t('when_to_approve')}:</h5>
            <ul style={{ paddingLeft: '20px', color: '#4a5568', lineHeight: '1.6' }}>
              <li>{t('guideline_approve_1')}</li>
              <li>{t('guideline_approve_2')}</li>
              <li>{t('guideline_approve_3')}</li>
              <li>{t('guideline_approve_4', { level: t(level) })}</li>
              <li>{t('guideline_approve_5')}</li>
            </ul>
          </div>
          <div className="guideline">
            <h5 style={{ color: '#c53030', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>❌ {t('when_to_reject')}:</h5>
            <ul style={{ paddingLeft: '20px', color: '#4a5568', lineHeight: '1.6' }}>
              <li>{t('guideline_reject_1')}</li>
              <li>{t('guideline_reject_2')}</li>
              <li>{t('guideline_reject_3', { level: t(level) })}</li>
              <li>{t('guideline_reject_4')}</li>
              <li>{t('guideline_reject_5')}</li>
            </ul>
          </div>
        </div>
        <div className="guideline" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #edf2f7' }}>
          <h5 style={{ color: '#2b6cb0', marginBottom: '10px' }}>⚠️ {t('important_notes')}:</h5>
          <ul style={{ paddingLeft: '20px', color: '#4a5568', fontSize: '0.9rem' }}>
            <li>{t('important_note_1')}</li>
            <li>{t('important_note_2')}</li>
            <li>{t('important_note_3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CitizenEventReview;

const CzDetailItem = ({ label, value }) => (
  <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
    <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.3px' }}>{label}</div>
    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13.5px', wordBreak: 'break-word' }}>{value || '—'}</div>
  </div>
);