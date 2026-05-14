import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './EventList.css';

const EventList = ({ events, loading }) => {
  const { t } = useTranslation();
  const [expandedRow, setExpandedRow] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return { bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' };
      case 'rejected': return { bg: '#ffebee', color: '#c62828', border: '#ffcdd2' };
      case 'completed': return { bg: '#e3f2fd', color: '#1565c0', border: '#bbdefb' };
      default: return { bg: '#fff8e1', color: '#e65100', border: '#ffecb3' };
    }
  };

  const getEventDetails = (event) => {
    if (!event) return {};
    return event[`${event.type}Details`] || {};
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-ET', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getSubjectName = (event) => {
    const d = getEventDetails(event);
    if (event.type === 'birth') return d.childName || 'N/A';
    if (event.type === 'marriage') return `${d.husbandName || ''} & ${d.wifeName || ''}`;
    if (event.type === 'death') return d.deceasedName || 'N/A';
    if (event.type === 'divorce') return `${d.husbandName || ''} & ${d.wifeName || ''}`;
    if (event.type === 'adoption') return d.childName || 'N/A';
    return 'N/A';
  };

  const getPlaceOfRegistration = (event) => {
    return event.location?.kebeleName
      || event.location?.kebele
      || event.location?.woredaName
      || event.location?.woreda
      || 'N/A';
  };

  const getCurrentLevelName = (level) => {
    const levelNames = {
      kebele: 'Kebele', woreda: 'Woreda',
      zone: 'Zone', region: 'Region', national: 'National'
    };
    return levelNames[level] || level || 'N/A';
  };

  const getEventTypeIcon = (type) => {
    const icons = { birth: '👶', death: '⚰️', marriage: '💍', divorce: '📜', adoption: '🤝' };
    return icons[type] || '📋';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{t('loading_events')}</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="no-events">
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h4>{t('no_events_registered')}</h4>
          <p>{t('no_events_registered_desc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-list">
      <div className="event-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#2c3e50' }}>{t('my_registered_events')}</h3>
        <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 14px', borderRadius: '20px', fontWeight: 600, fontSize: '14px' }}>
          {events.length} {t('total_events') || 'Events'}
        </span>
      </div>

      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #1a237e, #283593)', color: '#fff' }}>
              <th style={thStyle}>No.</th>
              <th style={thStyle}>{t('event_type') || 'Event Type'}</th>
              <th style={thStyle}>{t('registrant') || 'Registrant'}</th>
              <th style={thStyle}>{t('event_date') || 'Event Date'}</th>
              <th style={thStyle}>{t('registration_date') || 'Reg. Date'}</th>
              <th style={thStyle}>{t('place_of_registration') || 'Place of Reg.'}</th>
              <th style={thStyle}>{t('current_level') || 'Current Level'}</th>
              <th style={thStyle}>{t('status') || 'Status'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => {
              const statusStyle = getStatusColor(event.status);
              const details = getEventDetails(event);
              const isExpanded = expandedRow === event._id;
              return (
                <React.Fragment key={event._id}>
                  <tr
                    style={{
                      background: isExpanded ? '#f0f4ff' : index % 2 === 0 ? '#fff' : '#fafbfc',
                      borderBottom: '1px solid #e8ecf0',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#f5f7ff'; }}
                    onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fafbfc'; }}
                  >
                    <td style={tdStyle}>{index + 1}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#2c3e50' }}>
                        {getEventTypeIcon(event.type)} {event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Event'}
                      </span>
                    </td>
                    {/* Registrant cell with profile photo */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {(() => {
                          const d = getEventDetails(event);
                          const photoUrl =
                            event.type === 'birth' ? (d?.childPhoto?.url || d?.parentPhotos?.mother?.url) :
                            event.type === 'death' ? d?.deceasedPhoto?.url :
                            event.type === 'marriage' || event.type === 'divorce' ? (d?.husbandPhoto?.url || d?.wifePhoto?.url) :
                            event.type === 'adoption' ? d?.childPhoto?.url : null;
                          return photoUrl ? (
                            <img
                              src={`http://localhost:5000${photoUrl}`}
                              alt="Registrant"
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #c7d2fe', flexShrink: 0 }}
                              onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                              {getEventTypeIcon(event.type)}
                            </div>
                          );
                        })()}
                        <span style={{ fontWeight: 600, color: '#374151' }}>{getSubjectName(event)}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>{formatDate(event.eventDate)}</td>
                    <td style={tdStyle}>{formatDate(event.createdAt)}</td>
                    <td style={tdStyle}>{getPlaceOfRegistration(event)}</td>
                    <td style={tdStyle}>{getCurrentLevelName(event.currentLevel)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        border: `1px solid ${statusStyle.border}`,
                        fontWeight: 600,
                        fontSize: '12px',
                        whiteSpace: 'nowrap'
                      }}>
                        {event.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => setExpandedRow(isExpanded ? null : event._id)}
                        style={{
                          padding: '6px 14px',
                          background: isExpanded ? '#c8e6c9' : '#e3f2fd',
                          color: isExpanded ? '#2e7d32' : '#1565c0',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isExpanded ? '🔼 Hide' : '🔘 View Details'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {isExpanded && (
                    <tr style={{ background: '#f5f7ff', borderBottom: '2px solid #6366f1' }}>
                      <td colSpan="9" style={{ padding: '24px 30px', borderLeft: '4px solid #6366f1' }}>
                        <div style={{ display: 'grid', gap: '22px' }}>
                          <h4 style={{ margin: 0, color: '#1a237e', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getEventTypeIcon(event.type)} {event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : ''} Event — Full Details
                          </h4>

                          {/* Profile Photos Section */}
                          {(() => {
                            const d = getEventDetails(event);
                            if (!d) return null;
                            const photos = [];
                            if (d.childPhoto?.url) photos.push({ label: '👶 Child Photo', url: d.childPhoto.url });
                            if (d.deceasedPhoto?.url) photos.push({ label: '📸 Deceased Photo', url: d.deceasedPhoto.url });
                            if (d.husbandPhoto?.url) photos.push({ label: '🤵 Husband Photo', url: d.husbandPhoto.url });
                            if (d.wifePhoto?.url) photos.push({ label: '👰 Wife Photo', url: d.wifePhoto.url });
                            if (d.parentPhotos?.father?.url) photos.push({ label: '👨 Father Photo', url: d.parentPhotos.father.url });
                            if (d.parentPhotos?.mother?.url) photos.push({ label: '👩 Mother Photo', url: d.parentPhotos.mother.url });
                            if (photos.length === 0) return null;
                            return (
                              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e0e7ff' }}>
                                {photos.map((photo, idx) => (
                                  <div key={idx} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>{photo.label}</div>
                                    <img
                                      src={`http://localhost:5000${photo.url}`}
                                      alt={photo.label}
                                      style={{ width: '110px', height: '120px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #c7d2fe', display: 'block' }}
                                      onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/110x120?text=No+Photo'; }}
                                    />
                                    <a href={`http://localhost:5000${photo.url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#6366f1', marginTop: '5px', display: 'block' }}>🔍 Full Size</a>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {/* Core Event Info */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                            <DetailItem label="Event ID" value={`#${event._id?.toString().slice(-8).toUpperCase()}`} />
                            <DetailItem label={t('event_type') || 'Event Type'} value={event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'N/A'} />
                            <DetailItem label={t('event_date') || 'Event Date'} value={formatDate(event.eventDate)} />
                            <DetailItem label={t('registration_date') || 'Registration Date'} value={formatDate(event.createdAt)} />
                            <DetailItem label={t('status') || 'Status'} value={event.status || 'pending'} />
                            <DetailItem label={t('current_level') || 'Current Level'} value={getCurrentLevelName(event.currentLevel)} />
                          </div>

                          {/* Location Info */}
                          <div>
                            <h5 style={{ margin: '0 0 10px 0', color: '#283593', fontSize: '14px' }}>📍 Place of Registration</h5>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                              <DetailItem label="Region" value={event.location?.regionName || event.location?.region || 'N/A'} />
                              <DetailItem label="Zone" value={event.location?.zoneName || event.location?.zone || 'N/A'} />
                              <DetailItem label="Woreda" value={event.location?.woredaName || event.location?.woreda || 'N/A'} />
                              <DetailItem label="Kebele" value={event.location?.kebeleName || event.location?.kebele || 'N/A'} />
                            </div>
                          </div>

                          {/* Event-specific details — ALL fields */}
                          {details && Object.keys(details).length > 0 && (
                            <div>
                              <h5 style={{ margin: '0 0 10px 0', color: '#283593', fontSize: '14px' }}>📋 {event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Event'} Registration Details</h5>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                {Object.entries(details).map(([key, value]) => {
                                  // Skip photo keys (shown above) and empty values
                                  const photoKeys = ['childPhoto', 'photo', 'deceasedPhoto', 'husbandPhoto', 'wifePhoto', 'parentPhotos'];
                                  if (photoKeys.includes(key)) return null;
                                  if (value === null || value === undefined || value === '') return null;
                                  // For nested objects (non-photo), stringify
                                  const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                                  return (
                                    <DetailItem
                                      key={key}
                                      label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                      value={displayValue}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Approval Progress */}
                          {event.verification && event.verification.length > 0 && (
                            <div>
                              <h5 style={{ margin: '0 0 10px 0', color: '#283593' }}>✅ {t('approval_progress') || 'Approval Progress'}</h5>
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {event.verification.map((ver, idx) => (
                                  <div key={idx} style={{
                                    padding: '8px 14px',
                                    background: ver.status === 'approved' ? '#e8f5e9' : '#ffebee',
                                    borderRadius: '8px',
                                    border: `1px solid ${ver.status === 'approved' ? '#c8e6c9' : '#ffcdd2'}`,
                                    fontSize: '13px',
                                    fontWeight: 600
                                  }}>
                                    {ver.status === 'approved' ? '✓' : '✗'} {ver.level} — {formatDate(ver.verifiedAt)}
                                    {ver.comments && <div style={{ fontWeight: 400, fontSize: '12px', color: '#666', marginTop: '4px' }}>{ver.comments}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Certificate */}
                          {event.certificateUrl && (
                            <div>
                              <button
                                onClick={() => window.open(event.certificateUrl, '_blank')}
                                style={{ padding: '8px 18px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                              >
                                📜 {t('view_certificate') || 'View Certificate'}
                              </button>
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
    </div>
  );
};

const thStyle = {
  padding: '14px 16px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '13px',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '13px 16px',
  color: '#2c3e50',
  whiteSpace: 'nowrap'
};

const DetailItem = ({ label, value }) => (
  <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e0e4f0' }}>
    <div style={{ fontSize: '11px', color: '#7986cb', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontWeight: 600, color: '#2c3e50', fontSize: '14px' }}>{value || 'N/A'}</div>
  </div>
);

export default EventList;