import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import './EventStatistics.css';

const StatCard = ({ value, label, sub, color, icon, trendData }) => {
  const calculateTrend = () => {
    if (!trendData || trendData.length < 2) return null;
    const latest = trendData[trendData.length - 1].value;
    const previous = trendData[trendData.length - 2].value;
    if (previous === 0) return latest > 0 ? 100 : 0;
    return Math.round(((latest - previous) / previous) * 100);
  };

  const trend = calculateTrend();

  return (
    <div className="ns-stat-card">
      <div className="ns-stat-header-row">
        <div className="ns-stat-label-group">
          <div className="ns-stat-label">{label}</div>
          <div className="ns-stat-value" style={{ color }}>{value ?? '—'}</div>
        </div>
        <div className="ns-stat-icon-wrapper" style={{ background: color + '12', color }}>{icon}</div>
      </div>
      
      <div className="ns-stat-sparkline">
        <ResponsiveContainer width="100%" height={60}>
          <AreaChart data={trendData && trendData.length > 0 ? trendData : [
            { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }
          ]}>
            <defs>
              <linearGradient id={`color-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={`url(#color-${color.replace('#', '')})`} 
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {sub && (
        <div className="ns-stat-footer">
          {trend !== null && (
            <span className="ns-stat-trend-indicator" style={{ 
              background: trend >= 0 ? '#10b98120' : '#ef444420', 
              color: trend >= 0 ? '#10b981' : '#ef4444' 
            }}>
              <span style={{ fontSize: '10px' }}>{trend >= 0 ? '▲' : '▼'}</span> {Math.abs(trend)}%
            </span>
          )}
          <span className="ns-stat-sub-text">{sub}</span>
        </div>
      )}
    </div>
  );
};

const EventStatistics = ({ stats, onRefresh }) => {
    const { t } = useTranslation();
    const [timeframe, setTimeframe] = useState('month');
    const [detailedStats, setDetailedStats] = useState({
        byType: {},
        byStatus: {},
        byMonth: {},
        trends: []
    });
    const [loading, setLoading] = useState(false);

    const { API_URL, currentUser } = useAuth();

    useEffect(() => {
        fetchDetailedStatistics();
    }, [timeframe]);

    const [overallStats, setOverallStats] = useState({
        totalEvents: stats?.totalEvents || 0,
        pendingReview: stats?.pendingReview || 0,
        approvedEvents: stats?.approvedEvents || 0,
        rejectedEvents: stats?.rejectedEvents || 0
    });

    const fetchDetailedStatistics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/events/jurisdiction-statistics`, {
                params: { timeframe },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'success') {
                setDetailedStats(response.data.data);
                if (response.data.data.overallStats) {
                    setOverallStats(response.data.data.overallStats);
                }
            }
        } catch (error) {
            console.error('Error fetching detailed statistics:', error);
            setDetailedStats({
                byType: {},
                byStatus: {},
                byMonth: {},
                trends: []
            });
            toast.error(t('failed_to_load_statistics'));
        } finally {
            setLoading(false);
        }
    };

    const getEventTypeColor = (type) => {
        const colors = {
            citizen_registration: '#2196F3',
            birth: '#4CAF50',
            death: '#9E9E9E',
            marriage: '#E91E63',
            divorce: '#FF9800',
            adoption: '#9C27B0'
        };
        return colors[type] || '#2196F3';
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: '#FFC107',
            approved: '#4CAF50',
            rejected: '#F44336',
            forwarded: '#2196F3'
        };
        return colors[status] || '#9E9E9E';
    };

    return (
        <div className="event-statistics">
            <div className="stats-header">
                <h3>{t('total_registration_statistics')}</h3>
                <div className="stats-controls">
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="timeframe-select"
                    >
                        <option value="week">{t('last_week')}</option>
                        <option value="month">{t('last_month')}</option>
                        <option value="quarter">{t('last_quarter')}</option>
                        <option value="year">{t('last_year')}</option>
                        <option value="all">{t('all_time')}</option>
                    </select>
                    <button
                        onClick={() => {
                            fetchDetailedStatistics();
                            onRefresh();
                        }}
                        className="refresh-btn"
                        disabled={loading}
                    >
                        {loading ? t('refreshing') : `🔄 ${t('refresh')}`}
                    </button>
                </div>
            </div>

        <div className="ns-dashboard-grid">
          {/* ── Sparkline Cards Row ── */}
          <div className="ns-spark-cards">
            <StatCard 
              value={overallStats.totalEvents} 
              label={t('total_events_stats')} 
              icon="📊" 
              color="#6366f1" 
              sub={t('all_events_jurisdiction')}
              trendData={detailedStats.trends.map(tData => ({ value: tData.events }))}
            />
            <StatCard 
              value={overallStats.pendingReview} 
              label={t('pending_review_stats')} 
              icon="⏳" 
              color="#f59e0b" 
              sub={t('awaiting_action')}
              trendData={detailedStats.trends.map(tData => ({ value: tData.pending }))}
            />
            <StatCard 
              value={overallStats.approvedEvents} 
              label={t('approval_rate_stats')} 
              icon="✅" 
              color="#10b981" 
              sub={`${Math.round((overallStats.approvedEvents / (overallStats.totalEvents || 1)) * 100)}% Success`}
              trendData={detailedStats.trends.map(tData => ({ value: tData.approved }))}
            />
          </div>

          {/* ── Main Analytics Section ── */}
          <div className="ns-main-analytics">
            {/* Left: Event Distribution */}
            <div className="ns-analytics-card">
              <div className="ns-card-header">
                <div className="ns-card-title-box">
                  <h4>{t('events_by_type')}</h4>
                  <p>{t('life_events_recorded_desc')}</p>
                </div>
                <div className="ns-card-total-badge blue">{overallStats.totalEvents}</div>
              </div>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={Object.entries(detailedStats.byType).map(([name, value]) => ({ 
                        name: t(name).toUpperCase(), 
                        value, 
                        originalName: name 
                      }))}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {Object.entries(detailedStats.byType).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getEventTypeColor(entry[0])} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Registration Trends */}
            <div className="ns-analytics-card">
              <div className="ns-card-header">
                <div className="ns-card-title-box">
                  <h4>{t('monthly_trends')}</h4>
                  <p>{t('direct_vs_indirect_desc') || 'Registration volume over time'}</p>
                </div>
              </div>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={detailedStats.trends.map(tData => ({
                      name: t(tData.month.toLowerCase().replace(/[^a-z0-9_]/g, '')) || tData.month,
                      events: tData.events
                    }))}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <RechartsTooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                    />
                    <Bar dataKey="events" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} name={t('events_stat')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Status Breakdown Footer ── */}
          <div className="ns-status-summary">
            <div className="ns-status-item">
              <span className="dot" style={{ background: '#6366f1' }}></span>
              <span className="label">{t('total')}</span>
              <span className="value">{overallStats.totalEvents}</span>
            </div>
            <div className="ns-status-item">
              <span className="dot" style={{ background: '#f59e0b' }}></span>
              <span className="label">{t('pending')}</span>
              <span className="value">{overallStats.pendingReview}</span>
            </div>
            <div className="ns-status-item">
              <span className="dot" style={{ background: '#10b981' }}></span>
              <span className="label">{t('approved')}</span>
              <span className="value">{overallStats.approvedEvents}</span>
            </div>
            <div className="ns-status-item">
              <span className="dot" style={{ background: '#ef4444' }}></span>
              <span className="label">{t('rejected')}</span>
              <span className="value">{overallStats.rejectedEvents}</span>
            </div>
          </div>
        </div>

            <div className="statistics-actions">
                <button className="export-btn">
                    📥 {t('export_statistics')}
                </button>
                <button className="print-btn">
                    🖨️ {t('print_report')}
                </button>
            </div>

            <div className="statistics-insights">
                <h4>📈 {t('insights_recommendations')}</h4>
                <div className="insights-content">
                    {overallStats.pendingReview > 5 && (
                        <div className="insight warning">
                            <strong>⚠️ {t('high_pending_load')}:</strong> {t('you_have_pending_events', { count: overallStats.pendingReview })}
                            {t('consider_allocating_time')}
                        </div>
                    )}
                    {overallStats.rejectedEvents > 0 && (
                        <div className="insight info">
                            <strong>ℹ️ {t('rejection_analysis')}:</strong> {t('events_rejected', { count: overallStats.rejectedEvents })}
                            {t('review_rejection_reasons')}
                        </div>
                    )}
                    {overallStats.approvedEvents > 0 && (
                        <div className="insight success">
                            <strong>✅ {t('good_work')}:</strong> {t('successfully_approved_events', { count: overallStats.approvedEvents })}
                            {t('forwarded_to_next_level')}
                        </div>
                    )}
                    {overallStats.totalEvents === 0 && (
                        <div className="insight neutral">
                            <strong>📭 {t('no_events_yet')}:</strong> {t('no_registrations_submitted')}
                            {t('encourage_registrations')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventStatistics;