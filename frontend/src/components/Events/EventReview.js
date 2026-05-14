import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { getLocationName } from '../Common/LocationSelector';
import SignaturePad from '../Common/SignaturePad';
import './EventReview.css';

const EventReview = ({ events: initialEvents, grouped: initialGrouped, loading: initialLoading, onEventReviewed, level: propLevel, mode = 'review', regionFilter = 'All' }) => {
  const { t } = useTranslation();
  const [events, setEvents] = useState(initialEvents || []);
  const [grouped, setGrouped] = useState(initialGrouped || { pending: [], approved: [], rejected: [] });
  const [loading, setLoading] = useState(initialLoading !== undefined ? initialLoading : (initialEvents ? false : true));
  const [reviewingEvent, setReviewingEvent] = useState(null);
  const [reviewComments, setReviewComments] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [sealFile, setSealFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [sealPreview, setSealPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'birth' | 'death' | 'marriage' | 'divorce' | 'adoption'

  const { currentUser, API_URL } = useAuth();
  const effectiveLevel = propLevel || currentUser?.role?.split('_')[0] || 'kebele';
  const API_BASE = API_URL?.replace('/api', '') || 'http://localhost:5000';

  // Always pre-fill officer name from the logged-in user's profile
  const getOfficerFullName = () => {
    const { firstName, lastName } = currentUser?.personalInfo || {};
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return currentUser?.username || '';
  };

  useEffect(() => {
    if (!initialEvents && !initialGrouped && effectiveLevel) {
      fetchEvents();
    } else {
      setEvents(initialEvents || []);
      setGrouped(initialGrouped || { pending: [], approved: [], rejected: [] });
      setLoading(initialLoading !== undefined ? initialLoading : false);
    }
  }, [initialEvents, initialGrouped, effectiveLevel]);

  // When review panel opens, auto-populate officer name from user profile
  useEffect(() => {
    if (reviewingEvent) {
      setOfficerName(getOfficerFullName());
    }
  }, [reviewingEvent]);

  // Also populate on initial mount or when currentUser becomes available
  useEffect(() => {
    const name = getOfficerFullName();
    if (name) setOfficerName(name);
  }, [currentUser]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      if (['kebele', 'woreda', 'zone', 'region', 'national'].includes(effectiveLevel)) {
        // Use for-review endpoint for all levels to get pending tasks
        endpoint = `${API_URL}/events/for-review`;
      } else if (mode === 'monitor') {
        const endpointLevel = effectiveLevel === 'region' ? 'regional' : effectiveLevel;
        endpoint = `${API_URL}/auth/${endpointLevel}/overview`;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.status === 'success') {
        const data = response.data.data;
        setEvents(data.events || []);
        setGrouped(data.eventsByStatus || data.grouped || { pending: [], approved: [], rejected: [] });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error(t('error_loading_events'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('please_upload_image'));
      return;
    }

    if (type === 'seal') {
      setSealFile(file);
      setSealPreview(URL.createObjectURL(file));
    } else {
      setSignatureFile(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const resetReviewForm = () => {
    setReviewingEvent(null);
    setReviewComments('');
    setOfficerName('');
    setSealFile(null);
    setSignatureFile(null);
    setSealPreview(null);
    setSignaturePreview(null);
  };

  const handleReview = async (eventId, status) => {
    try {
      // Validate Kebele/Woreda approval requirements
      if (['kebele', 'woreda'].includes(effectiveLevel) && status === 'approved') {
        if (!officerName.trim()) {
          toast.error(t('officer_name_required'));
          return;
        }
        if (!sealFile) {
          toast.error(t('official_seal_required'));
          return;
        }
        if (!signatureFile) {
          toast.error(t('officer_signature_required'));
          return;
        }
      }

      setSubmitting(true);

      // Build FormData for multipart upload
      const formData = new FormData();
      formData.append('status', status);
      formData.append('comments', reviewComments);

      if (['kebele', 'woreda'].includes(effectiveLevel) && status === 'approved') {
        formData.append('officerName', officerName);
        if (sealFile) formData.append('seal', sealFile);
        if (signatureFile) {
          // signatureFile is a Blob from SignaturePad; wrap as a File
          const sigFile = new File([signatureFile], `signature-${Date.now()}.png`, { type: 'image/png' });
          formData.append('signature', sigFile);
        }
      }

      await axios.patch(`${API_URL}/events/${eventId}/review`, formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`${t('event')} ${t(status)} ${t('successfully')}`);
      resetReviewForm();
      if (onEventReviewed) onEventReviewed();
      else fetchEvents();
    } catch (error) {
      console.error('Review error:', error);
      toast.error(error.response?.data?.message || t('error_reviewing_event'));
    } finally {
      setSubmitting(false);
    }
  };

  const getNextLevel = (currentLevel) => {
    const levels = {
      'kebele': 'Woreda Review',
      'woreda': 'Zone Review (Forward)',
      'zone': 'Region Review (Forward)',
      'region': 'National Review (Forward)',
      'national': 'Final Archive'
    };
    return levels[currentLevel] || 'Next Level';
  };

  const getEventDetails = (event) => {
    return event[`${event.type}Details`];
  };

  const renderVerificationFields = () => {
    if (!['kebele', 'woreda'].includes(effectiveLevel)) return null;

    return (
      <div className="verification-approval-fields" style={{ marginTop: '15px', padding: '15px', background: '#f0f4f8', borderRadius: '8px', border: '1px solid #d1d9e6' }}>
        <h5 className="approval-section-title" style={{ marginBottom: '12px', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {effectiveLevel === 'kebele' ? '🏛️ ' + t('kebele') : '🏢 ' + t('woreda')} {t('approval_details')}
        </h5>
        <div className="approval-field" style={{ marginBottom: '15px' }}>
          <label htmlFor="officerName" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
            {t('officer_name')} <span className="required" style={{ color: 'red' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="officerName"
              type="text"
              value={officerName}
              readOnly
              placeholder={t('enter_officer_full_name')}
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
        <div className="approval-field">
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>{t('upload_official_seal_signature')} <span style={{ color: 'red' }}>*</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="upload-box">
              <span style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>{t('seal_stamp')}:</span>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'seal')} style={{ fontSize: '12px', width: '100' }} />
              {sealPreview && <img src={sealPreview} alt="Seal Preview" style={{ height: '60px', marginTop: '10px', border: '1px solid #ddd' }} />}
            </div>
            <div className="upload-box" style={{ gridColumn: '1 / -1' }}>
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
      </div>
    );
  };

  const renderWoredaVerification = (event) => {
    const woredaVerification = event.verification?.find(v => v.level === 'woreda' && v.status === 'approved');
    if (!woredaVerification || (!woredaVerification.officerName && !woredaVerification.seal && !woredaVerification.signature)) {
      return null;
    }

    return (
      <div className="woreda-verification-info" style={{ background: '#e3f2fd', padding: '10px', borderRadius: '5px', marginBottom: '10px', border: '1px solid #90caf9' }}>
        <h5>🏢 {t('woreda')} {t('approval_details')}</h5>
        {woredaVerification.officerName && (
          <p><strong>{t('approving_officer')}:</strong> {woredaVerification.officerName}</p>
        )}
        <div style={{ display: 'flex', gap: '20px' }}>
          {woredaVerification.seal?.url && (
            <div>
              <span style={{ fontSize: '12px' }}>{t('seal')}:</span>
              <img src={`${API_BASE}${woredaVerification.seal.url}`} alt={t('woreda') + " " + t('seal')} style={{ height: '60px', display: 'block' }} />
            </div>
          )}
          {woredaVerification.signature?.url && (
            <div>
              <span style={{ fontSize: '12px' }}>{t('signature')}:</span>
              <img src={`${API_BASE}${woredaVerification.signature.url}`} alt={t('woreda') + " " + t('signature')} style={{ height: '60px', display: 'block' }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderKebeleVerification = (event) => {
    const kebeleVerification = event.verification?.find(v => v.level === 'kebele' && v.status === 'approved');
    if (!kebeleVerification || (!kebeleVerification.officerName && !kebeleVerification.seal && !kebeleVerification.signature)) {
      return null;
    }

    return (
      <div className="kebele-verification-info" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}>
        <h5>🏛️ {t('kebele')} {t('approval_details')}</h5>
        {kebeleVerification.officerName && (
          <p><strong>{t('approving_officer')}:</strong> {kebeleVerification.officerName}</p>
        )}
        <div style={{ display: 'flex', gap: '20px' }}>
          {kebeleVerification.seal?.url && (
            <div>
              <span style={{ fontSize: '12px' }}>{t('seal')}:</span>
              <img src={`${API_BASE}${kebeleVerification.seal.url}`} alt={t('seal')} style={{ height: '60px', display: 'block' }} />
            </div>
          )}
          {kebeleVerification.signature?.url && (
            <div>
              <span style={{ fontSize: '12px' }}>{t('signature')}:</span>
              <img src={`${API_BASE}${kebeleVerification.signature.url}`} alt={t('signature')} style={{ height: '60px', display: 'block' }} />
            </div>
          )}
        </div>
      </div>
    );
  };


  const renderEvents = (eventsToRender, allowActions) => {
    if (!eventsToRender || eventsToRender.length === 0) {
      return <div className="no-events">{t('no_events_found_category')}</div>;
    }

    return (
      <div className="events-list table-responsive" style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', padding: '15px' }}>
        <table className="events-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #1a237e, #283593)', color: '#fff' }}>
              <th style={{ padding: '13px 15px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{t('event_type') || 'Event Type'}</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold' }}>{t('registrar') || 'Registrar'}</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold' }}>{t('registrant') || 'Registrant'}</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold' }}>{t('registration_date') || 'Reg. Date'}</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{t('status') || 'Status'}</th>
              <th style={{ padding: '13px 15px', fontWeight: 'bold', textAlign: 'center' }}>{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {eventsToRender.map((event, rowIndex) => {
                const isExpanded = reviewingEvent === event._id;
                const details = getEventDetails(event);

                // Determine subject name
                const subjectName = (() => {
                  if (event.type === 'birth') return details?.childName || t('unnamed_child');
                  if (event.type === 'death') return details?.deceasedName || t('unnamed_deceased');
                  if (event.type === 'marriage') return `${details?.husbandName || ''} & ${details?.wifeName || ''}`;
                  if (event.type === 'divorce') return `${details?.husbandName || ''} & ${details?.wifeName || ''}`;
                  if (event.type === 'adoption') return details?.childName || t('unnamed_child');
                  return t('event_details');
                })();

                // Determine best profile photo for this event type
                const profilePhotoUrl = (() => {
                  if (!details) return null;
                  if (event.type === 'birth') return details.childPhoto?.url || details.parentPhotos?.mother?.url || null;
                  if (event.type === 'death') return details.deceasedPhoto?.url || null;
                  if (event.type === 'marriage') return details.husbandPhoto?.url || details.wifePhoto?.url || null;
                  if (event.type === 'divorce') return details.husbandPhoto?.url || details.wifePhoto?.url || null;
                  if (event.type === 'adoption') return details.childPhoto?.url || null;
                  return null;
                })();

                const eventIcons = { birth: '👶', death: '⚰️', marriage: '💍', divorce: '💔', adoption: '🤝' };
                const eventIcon = eventIcons[event.type] || '📋';
                
                return (
                  <React.Fragment key={event._id}>
                    <tr style={{
                      borderBottom: '1px solid #edf2f7',
                      transition: 'background-color 0.2s',
                      background: isExpanded ? '#eef2ff' : rowIndex % 2 === 0 ? '#fff' : '#fafbfc'
                    }}>
                      {/* Event Type cell */}
                      <td style={{ padding: '14px 15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e8ecf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                            {eventIcon}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1a237e', fontSize: '14px', textTransform: 'capitalize' }}>{t(event.type)}</div>
                            <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px', fontFamily: 'monospace' }}>#{event._id?.toString().slice(-6).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>

                      {/* Registrant (citizen who submitted) with profile photo */}
                      <td style={{ padding: '14px 15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {event.citizen?.personalInfo?.photo?.url ? (
                            <img
                              src={`${API_BASE}${event.citizen.personalInfo.photo.url}`}
                              alt="Registrant"
                              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #c7d2fe', flexShrink: 0 }}
                              onError={e => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e0e7ff', display: event.citizen?.personalInfo?.photo?.url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>👤</div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#2c3e50', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                              {event.citizen?.personalInfo?.firstName || ''} {event.citizen?.personalInfo?.lastName || ''}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '12px' }}>{event.citizen?.personalInfo?.phone || ''}</div>
                          </div>
                        </div>
                      </td>

                      {/* Subject of the event with preview photo */}
                      <td style={{ padding: '14px 15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {profilePhotoUrl ? (
                            <img
                              src={`${API_BASE}${profilePhotoUrl}`}
                              alt="Subject"
                              style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #e9d5ff', flexShrink: 0 }}
                              onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{eventIcon}</div>
                          )}
                          <div style={{ fontWeight: 600, color: '#374151', fontSize: '13.5px' }}>{subjectName}</div>
                        </div>
                      </td>

                      {/* Registration date */}
                      <td style={{ padding: '14px 15px', color: '#555', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                        {new Date(event.eventDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: '14px 15px' }}>
                        <span style={{
                          padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                          textTransform: 'uppercase',
                          background: event.status === 'completed' ? '#d1fae5' : event.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                          color: event.status === 'completed' ? '#065f46' : event.status === 'rejected' ? '#991b1b' : '#92400e'
                        }}>
                          {t(event.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 15px', textAlign: 'center' }}>
                        <button
                          onClick={() => setReviewingEvent(isExpanded ? null : event._id)}
                          style={{
                            padding: '8px 16px',
                            background: isExpanded ? '#c7d2fe' : '#e0e7ff',
                            color: '#3730a3',
                            border: 'none', borderRadius: '8px', cursor: 'pointer',
                            fontWeight: 700, fontSize: '13px',
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                          }}
                        >
                          🔘 {isExpanded ? t('hide_details') || 'Hide' : t('view_details') || 'View Details'}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED DETAILS */}
                    {isExpanded && (
                      <tr style={{ background: '#f5f7ff', borderBottom: '2px solid #818cf8' }}>
                        <td colSpan="6" style={{ padding: '24px 28px', borderLeft: '4px solid #6366f1' }}>
                          <div className="event-details" style={{ padding: '0px' }}>
                            {/* 📸 TOP SECTION: PROFILE PHOTOS */}
                            {(() => {
                              const details = getEventDetails(event);
                              if (!details) return null;

                              const photos = [];
                              if (details.deceasedPhoto?.url) photos.push({ label: '📸 ' + t('deceased_profile_picture'), url: details.deceasedPhoto.url });
                              if (details.childPhoto?.url) photos.push({ label: "👶 " + t('child_profile_photo'), url: details.childPhoto.url });
                              if (details.husbandPhoto?.url) photos.push({ label: "🤵 " + t('husband_photo'), url: details.husbandPhoto.url });
                              if (details.wifePhoto?.url) photos.push({ label: "👰 " + t('wife_photo'), url: details.wifePhoto.url });
                              if (details.parentPhotos?.father?.url) photos.push({ label: "👨 " + t('father_photo'), url: details.parentPhotos.father.url });
                              if (details.parentPhotos?.mother?.url) photos.push({ label: "👩 " + t('mother_photo'), url: details.parentPhotos.mother.url });

                              if (photos.length === 0) return null;

                              return (
                                <div className="top-photo-section" style={{ textAlign: 'center', marginBottom: '25px', padding: '20px', background: 'linear-gradient(to bottom, #ffffff, #f7fafc)', borderRadius: '15px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px' }}>
                                    {photos.map((photo, idx) => (
                                      <div key={idx} style={{ textAlign: 'center' }}>
                                        <strong style={{ display: 'block', marginBottom: '12px', color: '#4a5568', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{photo.label}</strong>
                                        <div style={{ padding: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'inline-block' }}>
                                          <img
                                            src={`${API_BASE}${photo.url}`}
                                            alt={photo.label}
                                            style={{ height: '220px', width: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #f0f0f0' }}
                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/200x220?text=Photo+Not+Found'; }}
                                          />
                                          <div style={{ marginTop: '10px' }}>
                                            <a href={`${API_BASE}${photo.url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: '700', color: '#3182ce', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                              🔍 {t('view_max_quality')}
                                            </a>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '25px', marginBottom: '20px', background: '#fff', padding: '20px', borderRadius: '12px', border: '1.5px solid #edf2f7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                              {/* 📍 HIERARCHICAL LOCATION REGIME */}
                              <div style={{ borderRight: '1.5px solid #f0f4f8', paddingRight: '20px' }}>
                                <h6 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#2b6cb0', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  📍 {t('registration_location_details')}
                                </h6>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                  <p style={{ margin: '0', fontSize: '14px' }}><strong style={{ color: '#718096', fontSize: '12px' }}>{t('region').toUpperCase()}:</strong><br /> <span style={{ fontWeight: '700', color: '#2d3748' }}>{event.location?.region || t('na')}</span></p>
                                  <p style={{ margin: '0', fontSize: '14px' }}><strong style={{ color: '#718096', fontSize: '12px' }}>{t('zone').toUpperCase()}:</strong><br /> <span style={{ fontWeight: '700', color: '#2d3748' }}>{event.location?.zone || t('na')}</span></p>
                                  <p style={{ margin: '0', fontSize: '14px' }}><strong style={{ color: '#718096', fontSize: '12px' }}>{t('woreda').toUpperCase()}:</strong><br /> <span style={{ fontWeight: '700', color: '#2d3748' }}>{event.location?.woreda || t('na')}</span></p>
                                  <p style={{ margin: '0', fontSize: '14px' }}><strong style={{ color: '#718096', fontSize: '12px' }}>{t('kebele').toUpperCase()}:</strong><br /> <span style={{ fontWeight: '700', color: '#2d3748' }}>{event.location?.kebele || t('na')}</span></p>
                                </div>
                              </div>

                              <div>
                                <div style={{ marginBottom: '15px' }}>
                                  <strong style={{ color: '#718096', fontSize: '12px', display: 'block', marginBottom: '4px' }}>🆔 {t('national_id_number').toUpperCase()}</strong>
                                  <span style={{ fontFamily: 'monospace', fontWeight: '800', letterSpacing: '2px', background: '#1a365d', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '16px', display: 'inline-block' }}>
                                    {event.nationalId}
                                  </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                  <p style={{ margin: '0', fontSize: '14px' }}><strong style={{ color: '#718096' }}>📅 {t('event_date')}:</strong> <span style={{ fontWeight: '600' }}>{new Date(event.eventDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span></p>
                                  <p style={{ margin: '0', fontSize: '14px' }}><strong style={{ color: '#718096' }}>👤 {t('registrant')}:</strong> <span style={{ fontWeight: '600' }}>{event.citizen?.personalInfo?.firstName} {event.citizen?.personalInfo?.lastName}</span></p>
                                  <p style={{ margin: '0', fontSize: '14px' }}><strong style={{ color: '#718096' }}>⚖️ {t('status_level')}:</strong> <span style={{ textTransform: 'uppercase', fontWeight: '800', color: '#2c5282', background: '#ebf8ff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{t(event.currentLevel)}</span></p>
                                </div>
                              </div>
                            </div>

                            {getEventDetails(event) && (
                              <div className="event-details-content" style={{ marginTop: '10px' }}>
                                <h5 style={{ margin: '20px 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1a365d', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #edf2f7', paddingBottom: '8px' }}>
                                  📋 {t('full_registration_details')}
                                </h5>

                                <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  {Object.entries(getEventDetails(event)).map(([key, value]) => {
                                    if (value === null || value === undefined) return null;
                                    if (key === '_id' || (typeof value === 'object' && Object.keys(value).length === 0)) return null;

                                    const formattedLabel = key
                                      .replace(/([A-Z])/g, '_$1')
                                      .toLowerCase();

                                    // SKIP PHOTOS IN GRID (shown at top)
                                    if (['childPhoto', 'photo', 'deceasedPhoto', 'husbandPhoto', 'wifePhoto', 'parentPhotos'].includes(key)) {
                                      return null;
                                    }

                                    return (
                                      <p key={key} className="detail-field" style={{ margin: '0', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <strong style={{ color: '#555' }}>{t(formattedLabel)}:</strong>
                                        <span style={{ marginLeft: '8px', color: '#111', fontWeight: '500' }}>
                                          {typeof value === 'object'
                                            ? (value.url
                                              ? <a href={`${API_BASE}${value.url}`} target="_blank" rel="noopener noreferrer" className="file-link">📄 {t('view_file')}</a>
                                              : JSON.stringify(value))
                                            : String(value)
                                          }
                                        </span>
                                      </p>
                                    );
                                  })}
                                </div>

                                <div style={{ marginTop: '20px' }}>
                                  {renderKebeleVerification(event)}
                                  {renderWoredaVerification(event)}
                                </div>

                                {/* Supporting Evidence Section */}
                                {(event.idCard || (event.documents && event.documents.length > 0)) && (
                                  <div className="supporting-docs" style={{ marginTop: '20px', padding: '15px', background: '#f0f4f8', border: '1px solid #cbd5e0', borderRadius: '10px' }}>
                                    <h5 style={{ margin: '0 0 12px 0', borderBottom: '2px solid #cbd5e0', paddingBottom: '5px', color: '#2c5282', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      📄 {t('supporting_evidence')}
                                    </h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                      {event.idCard?.url && (
                                        <a href={`${API_BASE}${event.idCard.url}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#fff', border: '1px solid #3182ce', borderRadius: '8px', textDecoration: 'none', color: '#2c5282', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                          🏷️ {t('proof_of_id')}
                                        </a>
                                      )}
                                      {event.documents?.map((doc, idx) => (
                                        <a key={idx} href={`${API_BASE}${doc.url}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', textDecoration: 'none', color: '#4a5568', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                          📄 {t('support_doc')} {idx + 1}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {!getEventDetails(event) && (
                              <>
                                {renderKebeleVerification(event)}
                                {renderWoredaVerification(event)}
                              </>
                            )}

                            <div className="approval-history" style={{ marginTop: '10px', fontSize: '0.9em' }}>
                              <h5>{t('history')}:</h5>
                              {event.verification.map((ver, idx) => (
                                <div key={idx} style={{ borderBottom: '1px solid #eee', padding: '2px 0' }}>
                                  {t(ver.level)}: {t(ver.status)} {ver.officerName && `(${ver.officerName})`} - {new Date(ver.verifiedAt || ver.reviewedAt).toLocaleDateString()}
                                </div>
                              ))}
                            </div>

                            {allowActions && (
                              <div className="review-actions" style={{ marginTop: '15px' }}>
                                <div className="review-form">
                                  <textarea
                                    value={reviewComments}
                                    onChange={(e) => setReviewComments(e.target.value)}
                                    placeholder={t('comments') + "..."}
                                    style={{ width: '100%', marginBottom: '10px' }}
                                  />
                                  {renderVerificationFields()}
                                  <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => handleReview(event._id, 'approved')} className="approve-btn">{t('approve')}</button>
                                    <button onClick={() => handleReview(event._id, 'rejected')} className="reject-btn">{t('reject')}</button>
                                  </div>
                                </div>
                              </div>
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
      </div>
    );
  };

  // Code Correction: Erase pending button and cert button for high levels (meaningless)
  const isHighLevel = ['zone', 'region', 'national'].includes(effectiveLevel);
  const isMonitorMode = (mode === 'monitor' && !['kebele', 'woreda', 'zone', 'region', 'national'].includes(effectiveLevel)) || isHighLevel;
  const [activeFilter, setActiveFilter] = useState(isHighLevel ? 'approved' : 'pending');

  const filterByRegion = (eventsList) => {
    if (!regionFilter || regionFilter === 'All') return eventsList;
    return eventsList.filter(e => {
      const region = e.location?.region || e.location?.regionName || e.citizen?.location?.region || e.citizen?.location?.regionName;
      return region === regionFilter;
    });
  };

  const hasGrouped = grouped && (grouped.pending || grouped.approved || grouped.rejected);

  const applyFilters = (eventsList) => {
    let filtered = filterByRegion(eventsList);
    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.type === typeFilter);
    }
    return filtered;
  };

  const pendingList = applyFilters(hasGrouped ? (grouped.pending || []) : (events || []));
  const approvedList = applyFilters(hasGrouped ? (grouped.approved || []) : []);
  const rejectedList = applyFilters(hasGrouped ? (grouped.rejected || []) : []);

  // Get counts for the type filter buttons (ignoring current type filter but respecting tab/region)
  const getTypeCount = (type) => {
    const list = activeFilter === 'approved' ? (hasGrouped ? (grouped.approved || []) : []) :
      activeFilter === 'rejected' ? (hasGrouped ? (grouped.rejected || []) : []) :
        (hasGrouped ? (grouped.pending || []) : (events || []));

    return filterByRegion(list).filter(e => type === 'all' ? true : e.type === type).length;
  };

  if (loading) return <div className="loading">{t('loading_events')}</div>;

  const eventsToRender = activeFilter === 'approved' ? approvedList : (activeFilter === 'rejected' ? rejectedList : pendingList);

  return (
    <div className="event-review">
      {/* 📂 Type Specific Sub-Menu */}
      <div className="type-filter-menu" style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: '700', color: '#64748b', fontSize: '13px', marginRight: '5px' }}>📂 {t('category')}:</span>
        {[
          { id: 'all', label: t('all_events'), icon: '🗂️' },
          { id: 'birth', label: t('birth'), icon: '👶' },
          { id: 'death', label: t('death'), icon: '⚰️' },
          { id: 'marriage', label: t('marriage'), icon: '💍' },
          { id: 'divorce', label: t('divorce'), icon: '💔' },
          { id: 'adoption', label: t('adoption'), icon: '👨‍👩‍👧' }
        ].map(type => (
          <button
            key={type.id}
            onClick={() => setTypeFilter(type.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: typeFilter === type.id ? '#1a365d' : '#fff',
              color: typeFilter === type.id ? '#fff' : '#475569',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: typeFilter === type.id ? '0 4px 6px -1px rgba(26, 54, 93, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
              border: typeFilter === type.id ? 'none' : '1.5px solid #e2e8f0'
            }}
          >
            <span>{type.icon}</span>
            {type.label}
            <span style={{
              background: typeFilter === type.id ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px'
            }}>
              {getTypeCount(type.id)}
            </span>
          </button>
        ))}
      </div>

      <div className="review-header">
        <h3>{t(effectiveLevel).toUpperCase()} {t('level_review')}</h3>
        <div className="filter-tabs">
          {!isMonitorMode && (
            <button
              onClick={() => setActiveFilter('pending')}
              className={`filter-tab pending ${activeFilter === 'pending' ? 'active' : ''}`}
            >
              <span className="tab-icon">⏳</span>
              <span className="tab-label">{t('pending')}</span>
              <span className="tab-count">{pendingList.length}</span>
            </button>
          )}
          <button
            onClick={() => setActiveFilter('approved')}
            className={`filter-tab approved ${activeFilter === 'approved' ? 'active' : ''}`}
          >
            <span className="tab-icon">✅</span>
            <span className="tab-label">{t('approved')}</span>
            <span className="tab-count">{approvedList.length}</span>
          </button>
          <button
            onClick={() => setActiveFilter('rejected')}
            className={`filter-tab rejected ${activeFilter === 'rejected' ? 'active' : ''}`}
          >
            <span className="tab-icon">❌</span>
            <span className="tab-label">{t('rejected')}</span>
            <span className="tab-count">{rejectedList.length}</span>
          </button>
        </div>
      </div>
      <div className="review-section">
        {renderEvents(eventsToRender, !isMonitorMode && activeFilter === 'pending')}
      </div>

    </div>
  );
};

export default EventReview;