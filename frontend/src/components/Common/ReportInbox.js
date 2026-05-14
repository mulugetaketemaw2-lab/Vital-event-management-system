import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import './ReportInbox.css';

const ReportInbox = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('received');
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { currentUser, API_URL } = useAuth();

  useEffect(() => {
    fetchReports();
  }, [activeTab, currentPage, statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error(t('no_auth_token'));
        return;
      }

      const endpoint = activeTab === 'received' ? 'received' : 'sent';
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await axios.get(
        `${API_URL}/report-transmission/${endpoint}?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setReports(response.data.data.transmissions);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error(t('failed_fetch_reports'));
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = async (report) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/report-transmission/${report.reportId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSelectedReport(response.data.data);
    } catch (error) {
      console.error('Error fetching report details:', error);
      toast.error(t('failed_fetch_report_details'));
    }
  };

  const markAsReceived = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/report-transmission/${reportId}/receive`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(t('report_marked_received'));
      fetchReports();
      if (selectedReport && selectedReport.reportId === reportId) {
        setSelectedReport({ ...selectedReport, status: 'received', receivedAt: new Date() });
      }
    } catch (error) {
      console.error('Error marking report as received:', error);
      toast.error(t('failed_update_report_status'));
    }
  };

  const markAsReviewed = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/report-transmission/${reportId}/review`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(t('report_marked_reviewed'));
      fetchReports();
      if (selectedReport && selectedReport.reportId === reportId) {
        setSelectedReport({ ...selectedReport, status: 'reviewed', reviewedAt: new Date() });
      }
    } catch (error) {
      console.error('Error marking report as reviewed:', error);
      toast.error(t('failed_update_report_status'));
    }
  };

  const downloadReportAsExcel = (reportData) => {
    if (!reportData) return;

    try {
      const wb = XLSX.utils.book_new();

      // Report Summary Sheet
      const summaryData = [
        [t('transmitted_report_summary')],
        [],
        [t('report_id_label'), reportData.reportId],
        [t('report_type_label'), reportData.reportType],
        [t('report_level_label'), reportData.reportLevel],
        [t('from_level'), reportData.fromLevel],
        [t('to_level'), reportData.toLevel],
        [t('period_label'), `${reportData.period?.startDate || 'N/A'} - ${reportData.period?.endDate || 'N/A'}`],
        [t('transmitted_at'), new Date(reportData.transmittedAt).toLocaleString()],
        [t('status_label'), reportData.status],
        [],
        [t('from_user'), `${reportData.fromUser?.personalInfo?.firstName} ${reportData.fromUser?.personalInfo?.lastName}`],
        [t('from_role'), reportData.fromUser?.role],
        [t('to_user'), `${reportData.toUser?.personalInfo?.firstName} ${reportData.toUser?.personalInfo?.lastName}`],
        [t('to_role'), reportData.toUser?.role]
      ];

      if (reportData.notes) {
        summaryData.push([t('notes'), reportData.notes]);
      }

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, t('summary_sheet'));

      // Citizens Data Sheet
      if (reportData.reportData?.citizens) {
        const citizensData = [
          [t('citizens_statistics')],
          [],
          [t('metric'), t('count')]
        ];

        const citizens = reportData.reportData.citizens;
        Object.entries(citizens).forEach(([key, value]) => {
          if (typeof value === 'number') {
            citizensData.push([key.charAt(0).toUpperCase() + key.slice(1), value]);
          }
        });

        // Add byWoreda or byZone data if available
        if (citizens.byWoreda) {
          citizensData.push([], [t('citizens_by_woreda')]);
          Object.entries(citizens.byWoreda).forEach(([woreda, count]) => {
            citizensData.push([woreda, count]);
          });
        } else if (citizens.byZone) {
          citizensData.push([], [t('citizens_by_zone')]);
          Object.entries(citizens.byZone).forEach(([zone, count]) => {
            citizensData.push([zone, count]);
          });
        }

        const citizensWs = XLSX.utils.aoa_to_sheet(citizensData);
        XLSX.utils.book_append_sheet(wb, citizensWs, t('citizens'));
      }

      // Events Data Sheet
      if (reportData.reportData?.events) {
        const eventsData = [
          [t('events_statistics')],
          [],
          [t('metric'), t('count')]
        ];

        const events = reportData.reportData.events;
        Object.entries(events).forEach(([key, value]) => {
          if (typeof value === 'number') {
            eventsData.push([key.charAt(0).toUpperCase() + key.slice(1), value]);
          }
        });

        // Add byType data if available
        if (events.byType) {
          eventsData.push([], [t('events_by_type')]);
          Object.entries(events.byType).forEach(([type, count]) => {
            eventsData.push([t(type), count]);
          });
        }

        // Add byStatus data if available
        if (events.byStatus) {
          eventsData.push([], [t('events_by_status')]);
          Object.entries(events.byStatus).forEach(([status, count]) => {
            eventsData.push([t(status), count]);
          });
        }

        // Add geographic data if available
        if (events.byWoreda) {
          eventsData.push([], [t('events_by_woreda')]);
          Object.entries(events.byWoreda).forEach(([woreda, count]) => {
            eventsData.push([woreda, count]);
          });
        } else if (events.byZone) {
          eventsData.push([], [t('events_by_zone')]);
          Object.entries(events.byZone).forEach(([zone, count]) => {
            eventsData.push([zone, count]);
          });
        }

        const eventsWs = XLSX.utils.aoa_to_sheet(eventsData);
        XLSX.utils.book_append_sheet(wb, eventsWs, t('events'));
      }

      const fileName = `transmitted-report-${reportData.reportId}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(t('report_downloaded_success'));
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error(t('failed_download_report'));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: { color: 'blue', text: t('sent_status') },
      received: { color: 'yellow', text: t('received_status') },
      reviewed: { color: 'green', text: t('reviewed_status') },
      archived: { color: 'gray', text: t('archived_status') }
    };

    const config = statusConfig[status] || { color: 'gray', text: status };
    return <span className={`status-badge status-${config.color}`}>{config.text}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="report-inbox-container">
      <div className="inbox-header">
        <h2>📬 {t('report_inbox_title')}</h2>
        <p>{t('view_manage_reports')}</p>
      </div>

      <div className="inbox-tabs">
        <button
          className={`tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          📥 {t('received_reports')}
        </button>
        <button
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          📤 {t('sent_reports')}
        </button>
      </div>

      <div className="inbox-filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-filter"
        >
          <option value="">{t('all_status')}</option>
          <option value="sent">{t('sent_status')}</option>
          <option value="received">{t('received_status')}</option>
          <option value="reviewed">{t('reviewed_status')}</option>
          <option value="archived">{t('archived_status')}</option>
        </select>
        <button onClick={fetchReports} className="refresh-btn">
          🔄 {t('refresh')}
        </button>
      </div>

      <div className="inbox-content">
        <div className="reports-list">
          {loading ? (
            <div className="loading">{t('loading_reports')}</div>
          ) : reports.length === 0 ? (
            <div className="no-reports">
              <p>{t('no_reports_found')}</p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report._id}
                className={`report-item ${selectedReport?._id === report._id ? 'selected' : ''}`}
                onClick={() => handleReportClick(report)}
              >
                <div className="report-header">
                  <h4>{t(report.reportType)} {t('report')}</h4>
                  {getStatusBadge(report.status)}
                </div>
                <div className="report-details">
                  <p><strong>{t('from')}:</strong> {report.fromUser?.personalInfo?.firstName} {report.fromUser?.personalInfo?.lastName} ({t(report.fromLevel)})</p>
                  <p><strong>{t('to')}:</strong> {report.toUser?.personalInfo?.firstName} {report.toUser?.personalInfo?.lastName} ({t(report.toLevel)})</p>
                  <p><strong>{t('period')}:</strong> {report.period?.startDate} - {report.period?.endDate}</p>
                  <p><strong>{t('sent_label')}:</strong> {formatDate(report.transmittedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedReport && (
          <div className="report-details-panel">
            <div className="panel-header">
              <h3>{t('report_details')}</h3>
              <div className="panel-actions">
                <button
                  onClick={() => downloadReportAsExcel(selectedReport)}
                  className="download-btn"
                >
                  📊 {t('download_excel')}
                </button>
                {activeTab === 'received' && selectedReport.status === 'sent' && (
                  <button
                    onClick={() => markAsReceived(selectedReport.reportId)}
                    className="receive-btn"
                  >
                    ✓ {t('mark_as_received')}
                  </button>
                )}
                {activeTab === 'received' && selectedReport.status === 'received' && (
                  <button
                    onClick={() => markAsReviewed(selectedReport.reportId)}
                    className="review-btn"
                  >
                    ✓ {t('mark_as_reviewed')}
                  </button>
                )}
                <button
                  onClick={() => setSelectedReport(null)}
                  className="close-btn"
                >
                  ✕ {t('close')}
                </button>
              </div>
            </div>

            <div className="panel-content">
              <div className="detail-section">
                <h4>{t('report_information')}</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>{t('report_id_label')}:</label>
                    <span>{selectedReport.reportId}</span>
                  </div>
                  <div className="detail-item">
                    <label>{t('type')}:</label>
                    <span>{t(selectedReport.reportType)}</span>
                  </div>
                  <div className="detail-item">
                    <label>{t('level')}:</label>
                    <span>{t(selectedReport.reportLevel)}</span>
                  </div>
                  <div className="detail-item">
                    <label>{t('status')}:</label>
                    <span>{getStatusBadge(selectedReport.status)}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>{t('transmission_details')}</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>{t('from')}:</label>
                    <span>{selectedReport.fromUser?.personalInfo?.firstName} {selectedReport.fromUser?.personalInfo?.lastName}</span>
                  </div>
                  <div className="detail-item">
                    <label>{t('from_level')}:</label>
                    <span>{t(selectedReport.fromLevel)}</span>
                  </div>
                  <div className="detail-item">
                    <label>{t('to')}:</label>
                    <span>{selectedReport.toUser?.personalInfo?.firstName} {selectedReport.toUser?.personalInfo?.lastName}</span>
                  </div>
                  <div className="detail-item">
                    <label>{t('to_level')}:</label>
                    <span>{t(selectedReport.toLevel)}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>{t('timeline')}</h4>
                <div className="timeline">
                  <div className="timeline-item">
                    <strong>{t('sent')}:</strong> {formatDate(selectedReport.transmittedAt)}
                  </div>
                  {selectedReport.receivedAt && (
                    <div className="timeline-item">
                      <strong>{t('received')}:</strong> {formatDate(selectedReport.receivedAt)}
                    </div>
                  )}
                  {selectedReport.reviewedAt && (
                    <div className="timeline-item">
                      <strong>{t('reviewed')}:</strong> {formatDate(selectedReport.reviewedAt)}
                    </div>
                  )}
                </div>
              </div>

              {selectedReport.reportData && (
                <div className="detail-section">
                  <h4>{t('report_data')}</h4>
                  {selectedReport.reportData.citizens && (
                    <div className="data-summary">
                      <h5>{t('citizens')}</h5>
                      <div className="data-grid">
                        <div className="data-item">
                          <label>{t('total')}:</label>
                          <span>{selectedReport.reportData.citizens.total || 0}</span>
                        </div>
                        <div className="data-item">
                          <label>{t('approved')}:</label>
                          <span>{selectedReport.reportData.citizens.approved || 0}</span>
                        </div>
                        <div className="data-item">
                          <label>{t('rejected')}:</label>
                          <span>{selectedReport.reportData.citizens.rejected || 0}</span>
                        </div>
                        <div className="data-item">
                          <label>{t('verified')}:</label>
                          <span>{selectedReport.reportData.citizens.verified || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedReport.reportData.events && (
                    <div className="data-summary">
                      <h5>{t('events')}</h5>
                      <div className="data-grid">
                        <div className="data-item">
                          <label>{t('total')}:</label>
                          <span>{selectedReport.reportData.events.total || 0}</span>
                        </div>
                        <div className="data-item">
                          <label>{t('completed')}:</label>
                          <span>{selectedReport.reportData.events.completed || 0}</span>
                        </div>
                        <div className="data-item">
                          <label>{t('rejected')}:</label>
                          <span>{selectedReport.reportData.events.rejected || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedReport.notes && (
                <div className="detail-section">
                  <h4>{t('notes')}</h4>
                  <p>{selectedReport.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            {t('previous')}
          </button>
          <span>{t('page')} {currentPage} {t('of')} {totalPages}</span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            {t('next')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportInbox;
