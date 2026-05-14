import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const StandardizedExcelReport = () => {
    const { t } = useTranslation();
    const { API_URL } = useAuth();
    const [period, setPeriod] = useState('daily');
    const [loading, setLoading] = useState(false);
    const [customDates, setCustomDates] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [showMinistryModal, setShowMinistryModal] = useState(false);
    const [selectedMinistry, setSelectedMinistry] = useState(null);

    const ministriesList = [
        {
            id: 'moh',
            name: 'Ministry of Health',
            icon: '🏥',
            email: 'reports@moh.gov.et',
            telegram: '@MoHEthiopia',
            whatsapp: '+251 911 000 000',
            color: '#ef4444'
        },
        {
            id: 'csa',
            name: 'National Population Census Agency',
            icon: '📊',
            email: 'info@statsethiopia.gov.et',
            telegram: '@StatEthiopia',
            whatsapp: '+251 911 111 111',
            color: '#3b82f6'
        },
        {
            id: 'moe',
            name: 'Ministry of Education',
            icon: '🎓',
            email: 'info@moe.gov.et',
            telegram: '@MoEEthiopia',
            whatsapp: '+251 911 222 222',
            color: '#f59e0b'
        },
        {
            id: 'mfa',
            name: 'Ministry of Foreign Affairs',
            icon: '🌍',
            email: 'info@mfa.gov.et',
            telegram: '@MFAEthiopia',
            whatsapp: '+251 911 333 333',
            color: '#10b981'
        },
        {
            id: 'moj',
            name: 'Ministry of Justice',
            icon: '⚖️',
            email: 'info@moj.gov.et',
            telegram: '@JusticeEthiopia',
            whatsapp: '+251 911 444 444',
            color: '#6366f1'
        },
        {
            id: 'mor',
            name: 'Ministry of Revenue',
            icon: '💰',
            email: 'info@mor.gov.et',
            telegram: '@RevenuesEthiopia',
            whatsapp: '+251 911 555 555',
            color: '#f43f5e'
        },
        {
            id: 'nid',
            name: 'National ID Program (NIDP)',
            icon: '🆔',
            email: 'info@id.gov.et',
            telegram: '@FaydaEthiopia',
            whatsapp: '+251 911 666 666',
            color: '#8b5cf6'
        },
        {
            id: 'mof',
            name: 'Ministry of Finance',
            icon: '🏦',
            email: 'info@mofed.gov.et',
            telegram: '@MoFEthiopia',
            whatsapp: '+251 911 777 777',
            color: '#0ea5e9'
        }
    ];

    const handleSendAction = (method, target) => {
        let url = '';
        const reportTitle = "Standardized Administrative Report (Excel)";
        
        if (method === 'Email') {
            url = `mailto:${target}?subject=${encodeURIComponent(reportTitle)}&body=${encodeURIComponent("Please find the attached standardized administrative report.")}`;
        } else if (method === 'Telegram') {
            const username = target.startsWith('@') ? target.substring(1) : target;
            url = `https://t.me/${username}`;
        } else if (method === 'WhatsApp') {
            const phone = target.replace(/[^0-9+]/g, '');
            url = `https://wa.me/${phone}`;
        }

        if (url) {
            window.open(url, '_blank');
            toast.info(`Opening ${method} for report transmission...`);
        } else {
            toast.success(`Report prepared for ${selectedMinistry.name} via ${method}`);
        }
        
        // Simulating the sending action
        setTimeout(() => {
            setShowMinistryModal(false);
            setSelectedMinistry(null);
        }, 600);
    };

    const downloadExcelReport = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // Build query params for custom dates
            let queryParams = "";
            if (period === 'custom') {
                queryParams = `?startDate=${customDates.startDate}&endDate=${customDates.endDate}`;
            }

            const response = await axios.get(`${API_URL}/reports/standardized/${period}${queryParams}`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                },
                responseType: 'blob' // Important for file downloads
            });

            // Create a URL for the blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Set filename based on role and period
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = period === 'custom' 
                ? `Custom_Report_${customDates.startDate}_to_${customDates.endDate}.xlsx`
                : `Standardized_Report_${period}_${timestamp}.xlsx`;
            
            link.setAttribute('download', filename);
            
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success(t('excel_report_generated_success') || 'Excel report generated successfully!');
        } catch (error) {
            console.error('Error downloading Excel report:', error);
            toast.error(t('failed_to_generate_excel_report') || 'Failed to generate Excel report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            padding: '30px',
            borderRadius: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            marginTop: '30px',
            marginBottom: '40px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Accent */}
            <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '150px',
                height: '150px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                borderRadius: '50%',
                zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)'
                    }}>📑</div>
                    <div>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px' }}>
                            {t('standardized_excel_report') || 'Standardized Administrative Report (Excel)'}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                            {t('standardized_report_desc') || 'Generate professional, standardized reports in Microsoft Excel format.'}
                        </p>
                    </div>
                </div>

                <div style={{ 
                    background: '#f8fafc', 
                    padding: '20px', 
                    borderRadius: '18px', 
                    border: '1px solid #f1f5f9',
                    marginBottom: '20px'
                }}>
                    <label style={{ 
                        display: 'block', 
                        fontSize: '13px', 
                        fontWeight: '800', 
                        color: '#334155', 
                        marginBottom: '15px', 
                        textTransform: 'uppercase', 
                        letterSpacing: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ color: '#2563eb' }}>📅</span> {t('select_reporting_period') || 'Select Reporting Period'}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '8px' }}>
                        {[
                            { id: 'daily', color: '#3b82f6', icon: '☀️' },
                            { id: 'weekly', color: '#8b5cf6', icon: '📅' },
                            { id: 'monthly', color: '#db2777', icon: '📊' },
                            { id: 'semi-annual', color: '#0ea5e9', icon: '🌓' },
                            { id: 'annual', color: '#10b981', icon: '🌟' },
                            { id: 'custom', color: '#6366f1', icon: '⚙️' }
                        ].map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                style={{
                                    padding: '10px 6px',
                                    borderRadius: '12px',
                                    border: '2px solid',
                                    borderColor: p.color,
                                    background: period === p.id ? `${p.color}` : `${p.color}10`,
                                    color: period === p.id ? 'white' : p.color,
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: period === p.id ? `0 8px 20px ${p.color}40` : `0 4px 10px ${p.color}10`,
                                    transform: period === p.id ? 'scale(1.05)' : 'scale(1)'
                                }}
                            >
                                <span style={{ 
                                    fontSize: '18px',
                                    filter: period === p.id ? 'brightness(1.2)' : 'none',
                                    marginBottom: '2px'
                                }}>{p.icon}</span>
                                {t(p.id) || p.id.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                            </button>
                        ))}
                    </div>

                    {period === 'custom' && (
                        <div style={{ 
                            marginTop: '20px', 
                            display: 'flex', 
                            gap: '15px', 
                            padding: '15px', 
                            background: '#fff', 
                            borderRadius: '14px',
                            border: '1px dashed #cbd5e1'
                        }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '5px' }}>FROM:</label>
                                <input 
                                    type="date" 
                                    value={customDates.startDate}
                                    onChange={(e) => setCustomDates({ ...customDates, startDate: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '700' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '5px' }}>TO:</label>
                                <input 
                                    type="date" 
                                    value={customDates.endDate}
                                    onChange={(e) => setCustomDates({ ...customDates, endDate: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '700' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ 
                        flex: 1,
                        padding: '12px 15px', 
                        background: '#fffbeb', 
                        borderRadius: '12px',
                        borderLeft: '5px solid #f59e0b',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '18px' }}>ℹ️</span>
                        <div>
                            <span style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase' }}>{t('note') || 'Note'}</span>
                            <p style={{ margin: 0, fontSize: '12px', color: '#b45309', fontWeight: '500', lineHeight: '1.4' }}>
                                {t('excel_report_note') || 'Standardized federal format: includes Summary Tables & individual Registrant Details.'}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => {
                                setShowMinistryModal(true);
                            }}
                            disabled={loading}
                            style={{
                                padding: '16px 32px',
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '16px',
                                fontWeight: '900',
                                fontSize: '15px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                boxShadow: '0 10px 25px rgba(37, 99, 235, 0.3)',
                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                minWidth: '220px',
                                justifyContent: 'center'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
                                e.currentTarget.style.boxShadow = '0 15px 30px rgba(37, 99, 235, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 10px 25px rgba(37, 99, 235, 0.3)';
                            }}
                        >
                            📤 {t('send_to_ministry') || 'Send to Ministry'}
                        </button>
                        
                        <button
                            onClick={downloadExcelReport}
                            disabled={loading}
                            style={{
                                padding: '16px 32px',
                                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '16px',
                                fontWeight: '900',
                                fontSize: '15px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                minWidth: '220px',
                                justifyContent: 'center'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
                                e.currentTarget.style.boxShadow = '0 15px 30px rgba(16, 185, 129, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)';
                            }}
                        >
                            {loading ? '🔄 ...' : '📥'} {t('export_to_excel') || 'Export to Excel'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Ministry Selection Modal */}
            {showMinistryModal && (
                <div 
                    onClick={() => { setShowMinistryModal(false); setSelectedMinistry(null); }}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        animation: 'fadeIn 0.2s ease-out',
                        padding: '20px'
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            width: '100%',
                            maxWidth: '550px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            position: 'relative'
                        }}
                    >
                        <div style={{ padding: '25px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                                📤 {t('send_to_ministry') || 'Send to Ministry'}
                            </h3>
                            <button 
                                onClick={() => { setShowMinistryModal(false); setSelectedMinistry(null); }}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8', padding: '5px' }}
                            >
                                ✖
                            </button>
                        </div>
                        
                        <div style={{ padding: '30px', overflowY: 'auto' }}>
                            {!selectedMinistry ? (
                                <div>
                                    <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '15px', fontWeight: '500' }}>
                                        {t('select_ministry_desc') || 'Select a government ministry or institution to transmit this report to.'}
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {ministriesList.map(ministry => (
                                            <button
                                                key={ministry.id}
                                                onClick={() => setSelectedMinistry(ministry)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '15px',
                                                    padding: '16px 20px',
                                                    background: '#ffffff',
                                                    border: '2px solid #e2e8f0',
                                                    borderRadius: '16px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    textAlign: 'left'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.borderColor = ministry.color;
                                                    e.currentTarget.style.boxShadow = `0 4px 15px ${ministry.color}20`;
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                <div style={{ 
                                                    width: '45px', height: '45px', borderRadius: '12px', 
                                                    background: `${ministry.color}15`, display: 'flex', 
                                                    alignItems: 'center', justifyContent: 'center', fontSize: '22px' 
                                                }}>
                                                    {ministry.icon}
                                                </div>
                                                <span style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>
                                                    {ministry.name}
                                                </span>
                                                <span style={{ marginLeft: 'auto', color: '#cbd5e1' }}>▶</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ 
                                        display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px',
                                        padding: '15px', background: `${selectedMinistry.color}10`, borderRadius: '16px', border: `1px solid ${selectedMinistry.color}30`
                                    }}>
                                        <div style={{ 
                                            width: '50px', height: '50px', borderRadius: '12px', 
                                            background: selectedMinistry.color, color: 'white', display: 'flex', 
                                            alignItems: 'center', justifyContent: 'center', fontSize: '24px' 
                                        }}>
                                            {selectedMinistry.icon}
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{selectedMinistry.name}</h4>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Select transmission method</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                        <button
                                            onClick={() => handleSendAction('Email', selectedMinistry.email)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '15px', padding: '16px',
                                                background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px',
                                                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                        >
                                            <div style={{ fontSize: '24px' }}>📧</div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155' }}>Send via Official Email</div>
                                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{selectedMinistry.email}</div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleSendAction('Telegram', selectedMinistry.telegram)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '15px', padding: '16px',
                                                background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '14px',
                                                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.borderColor = '#7dd3fc'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.borderColor = '#bae6fd'; }}
                                        >
                                            <div style={{ fontSize: '24px', color: '#0ea5e9' }}>✈️</div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#0369a1' }}>Send via Telegram</div>
                                                <div style={{ fontSize: '13px', color: '#0284c7', marginTop: '2px' }}>{selectedMinistry.telegram}</div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleSendAction('WhatsApp', selectedMinistry.whatsapp)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '15px', padding: '16px',
                                                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px',
                                                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#86efac'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
                                        >
                                            <div style={{ fontSize: '24px', color: '#22c55e' }}>💬</div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#166534' }}>Send via WhatsApp</div>
                                                <div style={{ fontSize: '13px', color: '#15803d', marginTop: '2px' }}>{selectedMinistry.whatsapp}</div>
                                            </div>
                                        </button>
                                    </div>
                                    
                                    <button 
                                        onClick={() => setSelectedMinistry(null)}
                                        style={{ 
                                            width: '100%', padding: '12px', marginTop: '20px', 
                                            background: 'none', border: 'none', color: '#64748b', 
                                            fontWeight: '600', cursor: 'pointer', fontSize: '14px' 
                                        }}
                                    >
                                        ← Back to Ministry List
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StandardizedExcelReport;
