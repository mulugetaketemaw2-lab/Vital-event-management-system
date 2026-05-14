import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import './NationalStatistics.css';

const PERIODS = [
  { key: 'daily', labelKey: 'daily', labelIcon: '📅 ', descKey: 'todays_entries' },
  { key: 'weekly', labelKey: 'weekly', labelIcon: '📆 ', descKey: 'this_week' },
  { key: 'monthly', labelKey: 'monthly', labelIcon: '🗓️ ', descKey: 'this_month' },
  { key: 'annually', labelKey: 'annual', labelIcon: '📊 ', descKey: 'this_year' },
];

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

const MiniBar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ minWidth: '30px', textAlign: 'right', fontWeight: '700', fontSize: '13px', color }}>{value}</span>
      <span style={{ fontSize: '11px', color: '#999', minWidth: '28px' }}>{pct}%</span>
    </div>
  );
};

const NationalStatistics = () => {
  const { t } = useTranslation();
  const { API_URL } = useAuth();
  const [activePeriod, setActivePeriod] = useState('monthly');
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/stats/national-statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status === 'success') {
        setStats(res.data.data.statistics);
        setTrends(res.data.data.trends || []);
        setGeneratedAt(res.data.data.generatedAt);
      }
    } catch (err) {
      console.error(err);
      toast.error(t('failed_load_national_statistics'));
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const d = stats?.[activePeriod];
  const maxEvents = d ? Math.max(d.events.byType.birth, d.events.byType.death, d.events.byType.marriage, d.events.byType.divorce, 1) : 1;

  return (
    <div className="national-statistics">
      {/* ── Header ── */}
      <div className="ns-header">
        <div>
          <h3>📊 {t('statistical_analytical_reporting')}</h3>
          <p className="ns-subtitle">
            {t('comprehensive_breakdown_desc')}
          </p>
        </div>
        <button className="ns-refresh-btn" onClick={fetchStats} disabled={loading}>
          {loading ? '⌛' : '🔄'} {t('refresh')}
        </button>
      </div>

      {/* ── Period Tabs ── */}
      <div className="ns-period-tabs">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`ns-period-tab ${activePeriod === p.key ? 'active' : ''}`}
            onClick={() => setActivePeriod(p.key)}
          >
            <span className="tab-main">{p.labelIcon}{t(p.labelKey)}</span>
            <span className="tab-desc">{t(p.descKey)}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="ns-loading">
          <div className="ns-spinner" />
          <p>{t('calculating_statistics')}</p>
        </div>
      )}

      {!loading && d && (
        <div className="ns-dashboard-grid">
          {/* ── Sparkline Cards Row ── */}
          <div className="ns-spark-cards">
            <StatCard 
              value={d.citizens.total} 
              label={t('citizens_stat')} 
              icon="👥" 
              color="#6366f1" 
              sub={t('total_registered')}
              trendData={trends.map(tData => ({ value: tData.citizens }))}
            />
            <StatCard 
              value={d.events.total} 
              label={t('vital_event_registration_stat')} 
              icon="📋" 
              color="#f59e0b" 
              sub={t('total_events')}
              trendData={trends.map(tData => ({ value: tData.events }))}
            />
            <StatCard 
              value={d.aggregate.approved} 
              label={t('approved_completed')} 
              icon="✅" 
              color="#10b981" 
              sub={t('total_success_rate')}
              trendData={trends.map(tData => ({ value: tData.approved }))}
            />
          </div>

          {/* ── Main Analytics Section ── */}
          <div className="ns-main-analytics">
            {/* Left: Event Distribution */}
            <div className="ns-analytics-card">
              <div className="ns-card-header">
                <div className="ns-card-title-box">
                  <h4>{t('breakdown_by_event_type')}</h4>
                  <p>{t('life_events_recorded_desc')}</p>
                </div>
                <div className="ns-card-total-badge blue">{d.events.total}</div>
              </div>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: t('birth_stat'), value: d.events.byType.birth, color: '#6366f1' },
                        { name: t('death_stat'), value: d.events.byType.death, color: '#94a3b8' },
                        { name: t('marriage_stat'), value: d.events.byType.marriage, color: '#ec4899' },
                        { name: t('divorce_stat'), value: d.events.byType.divorce, color: '#f97316' }
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[
                        { name: t('birth_stat'), value: d.events.byType.birth, color: '#6366f1' },
                        { name: t('death_stat'), value: d.events.byType.death, color: '#94a3b8' },
                        { name: t('marriage_stat'), value: d.events.byType.marriage, color: '#ec4899' },
                        { name: t('divorce_stat'), value: d.events.byType.divorce, color: '#f97316' }
                      ].filter(item => item.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                  <h4>{t('registration_activity_trends')}</h4>
                  <p>{t('direct_vs_indirect_desc') || 'Monthly distribution across categories'}</p>
                </div>
              </div>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={trends.map(tData => ({
                      name: tData.name,
                      citizens: tData.citizens,
                      events: tData.events
                    }))}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                    barGap={8}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <RechartsTooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                    />
                    <Bar dataKey="citizens" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12} name={t('citizens_stat')} />
                    <Bar dataKey="events" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={12} name={t('events_stat')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Status Breakdown Footer ── */}
          <div className="ns-status-summary">
            <div className="ns-status-item">
              <span className="dot" style={{ background: '#6366f1' }}></span>
              <span className="label">{t('citizens_stat')}</span>
              <span className="value">{d.citizens.total}</span>
            </div>
            <div className="ns-status-item">
              <span className="dot" style={{ background: '#f59e0b' }}></span>
              <span className="label">{t('events_stat')}</span>
              <span className="value">{d.events.total}</span>
            </div>
            <div className="ns-status-item">
              <span className="dot" style={{ background: '#10b981' }}></span>
              <span className="label">{t('approved_active')}</span>
              <span className="value">{d.aggregate.approved}</span>
            </div>
            <div className="ns-status-item">
              <span className="dot" style={{ background: '#ef4444' }}></span>
              <span className="label">{t('rejected')}</span>
              <span className="value">{d.aggregate.rejected}</span>
            </div>
          </div>

          {generatedAt && (
            <p className="ns-generated-at">
              🕐 {t('data_as_of')} {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default NationalStatistics;
