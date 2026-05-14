import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import paymentService from '../../services/paymentService';

console.log('Payment service in MyCertificates:', paymentService);
console.log('Payment service imported:', paymentService);
console.log('Payment service methods:', Object.keys(paymentService));
const MyCertificates = ({ showOnlyID = false, showOnlyVital = false }) => {
    const { t } = useTranslation();
    const { currentUser, API_URL, token: contextToken, refreshUser } = useAuth();
    const token = contextToken || localStorage.getItem('token');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [vitalEvents, setVitalEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [showVitalModal, setShowVitalModal] = useState(false);
    const [error, setError] = useState(null);
    const [selectedVitalEvent, setSelectedVitalEvent] = useState(null);
    const [pollingInterval, setPollingInterval] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [paymentModalData, setPaymentModalData] = useState(null); // { type, eventId }
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('chapa');

    // Check for successful payment return and auto-verify
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tx_ref = urlParams.get('tx_ref');
        const paymentStatus = urlParams.get('status');
        const reason = urlParams.get('reason');

        if (tx_ref && paymentStatus === 'success') {
            verifyPaymentTransaction(tx_ref);
        } else if (tx_ref && paymentStatus === 'failed') {
            toast.error(`Payment was not completed. ${reason ? `Reason: ${reason}` : 'Please try again.'}`);
        }

        // Clean up polling interval on unmount
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, []);

    // Fetch vital events on mount
    useEffect(() => {
        fetchVitalEvents();
    }, []);

    const fetchVitalEvents = async () => {
        try {
            setLoadingEvents(true);
            const response = await axios.get(`${API_URL}/events/my-events`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.data.status === 'success') {
                // Show events that are completed OR approved (woreda final approval sets 'approved') AND have a certificate
                const filteredEvents = response.data.data.events.filter(e =>
                    (e.status === 'completed' || e.status === 'approved' || e.certificate?.number) && e.certificate
                );
                console.log('📋 Loaded vital events:', filteredEvents.length);
                filteredEvents.forEach(e => {
                    console.log(`  - Event ${e._id}: type=${e.type}, verifications=${e.verification?.length || 0}`);
                });
                setVitalEvents(filteredEvents);
            }
        } catch (error) {
            console.error('Error fetching vital events:', error);
            toast.error('Failed to load vital events');
        } finally {
            setLoadingEvents(false);
        }
    };

    const verifyPaymentTransaction = async (tx_ref) => {
        try {
            setVerifying(true);
            toast.info('Verifying your payment...', { autoClose: 3000 });

            const response = await axios.get(`${API_URL}/payment/verify/${tx_ref}?redirect=false`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'success') {
                toast.success('Payment verified! You can now download your certificate.');
                // Refresh user data to get updated payment status
                await refreshUser();
                // Refresh vital events to update payment status
                await fetchVitalEvents();

                // Remove query parameters from URL
                window.history.replaceState({}, document.title, '/my-certificates');
            } else {
                toast.error('Payment verification failed. Please contact support.');
            }
        } catch (error) {
            console.error('Verification error:', error);
            toast.error('Could not verify payment. Please contact support.');
        } finally {
            setVerifying(false);
        }
    };


    const checkEventBeforePayment = async (eventId) => {
        try {
            console.log('Checking event before payment:', eventId);

            // Check if paymentService exists and has checkEvent method
            if (!paymentService || typeof paymentService.checkEvent !== 'function') {
                console.error('paymentService.checkEvent is not available');
                toast.error('Payment service not properly configured');
                return false;
            }

            const result = await paymentService.checkEvent(eventId);
            console.log('Event check result:', result);

            if (result && result.status === 'success') {
                const event = result.data;
                console.log('Event details:', event);

                if (!event.isOwner) {
                    toast.error('You do not own this event');
                    return false;
                }

                if (event.paymentStatus === 'paid') {
                    toast.error('This certificate has already been paid for');
                    return false;
                }

                if (!event.certificate) {
                    toast.warning('This event does not have a certificate yet');
                    return false;
                }

                return true;
            } else {
                const errorMsg = result?.message || 'Could not verify event. Please try again.';
                toast.error(errorMsg);
                return false;
            }
        } catch (error) {
            console.error('Error in checkEventBeforePayment:', error);
            toast.error('Error checking event status');
            return false;
        }
    };
    const handlePayAndDownload = (type, eventId = null) => {
        console.log('🎯 Opening payment selection modal for:', { type, eventId });
        setPaymentModalData({ type, eventId });
    };

    const executePayment = async () => {
        const { type, eventId } = paymentModalData;
        const method = selectedPaymentMethod;

        try {
            setError(null);
            setLoading(true);

            console.log('🚀 executePayment called with:', { type, eventId, method });

            if (method !== 'chapa') {
                toast.info(`${t(method + '_payment')} ${t('not_implemented_yet', 'is not yet integrated. Only Chapa is currently active for testing.')}`);
                setLoading(false);
                return;
            }

            // Check if paymentService exists
            if (!paymentService) {
                console.error('❌ paymentService is undefined');
                setError('Payment service not available. Please refresh the page and try again.');
                setLoading(false);
                return;
            }

            // Call the payment service with method
            const result = await paymentService.initializePayment(type, eventId, method);
            console.log('📦 Payment result:', result);

            if (result && result.success) {
                if (result.checkout_url) {
                    toast.success(t('redirecting_to_payment'));
                    window.location.href = result.checkout_url;
                } else {
                    setError('No checkout URL received. Please try again.');
                    setLoading(false);
                }
            } else {
                const errorMsg = result?.message || 'Payment initialization failed. Please try again.';
                setError(errorMsg);
                toast.error(errorMsg);
                setLoading(false);
            }
        } catch (error) {
            console.error('❌ Payment error:', error);
            let errorMsg = error.response?.data?.message || error.message || 'Failed to process payment. Please try again.';
            setError(errorMsg);
            toast.error(errorMsg);
            setLoading(false);
        }
    };

    // Add this useEffect to test the import
    useEffect(() => {
        console.log('🔍 Testing payment service import:');
        console.log('- paymentService:', paymentService);
        console.log('- type of paymentService:', typeof paymentService);
        console.log('- methods:', Object.keys(paymentService || {}));

        // Try to import dynamically
        import('../../services/paymentService').then(module => {
            console.log('📦 Dynamic import result:', module);
            console.log('📦 Default export:', module.default);
        }).catch(err => {
            console.error('❌ Dynamic import failed:', err);
        });
    }, []);

    const handleDownloadResidentID = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('📥 Downloading resident ID for user:', currentUser._id);
            
            const response = await axios.get(`${API_URL}/certificates/resident-id/${currentUser._id}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `resident-id-${currentUser.personalInfo?.firstName}-${currentUser.personalInfo?.lastName}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Download started!');
        } catch (error) {
            console.error('Download error:', error);
            let errorMsg = 'Error downloading certificate.';
            
            if (error.response?.status === 402) {
                errorMsg = 'Payment is required before downloading. Please complete payment first.';
            } else if (error.response?.status === 404) {
                errorMsg = 'Certificate not found. Please contact support.';
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            }
            if (typeof errorMsg === 'object') {
                errorMsg = JSON.stringify(errorMsg);
            }
            
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadVitalCertificate = async (eventId) => {
        try {
            setLoading(true);
            setError(null);
            console.log('📥 Downloading certificate for event:', eventId);
            
            const response = await axios.get(`${API_URL}/certificates/${eventId}/download`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `certificate-${eventId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Certificate download started!');
        } catch (error) {
            console.error('Download error:', error);
            let errorMsg = 'Error downloading certificate.';
            
            if (error.response?.status === 402) {
                errorMsg = 'Payment is required before downloading. Please complete payment first.';
            } else if (error.response?.status === 404) {
                errorMsg = 'Certificate not found. Please contact support.';
            } else if (error.response?.status === 400) {
                errorMsg = error.response?.data?.message || 'Certificate not yet available. Please try again later.';
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            }
            if (typeof errorMsg === 'object') {
                errorMsg = JSON.stringify(errorMsg);
            }
            
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Check if user is approved for Resident ID
    const isApproved = currentUser?.isApproved ||
        ['approved', 'verified'].includes(currentUser?.status) ||
        (currentUser?.kebeleVerification?.approvedAt && currentUser?.woredaVerification?.approvedAt);

    const isPaid = currentUser?.certificatePayment?.status === 'paid';

    const handleView = async () => {
        setLoading(true);
        try {
            await refreshUser(); // Ensure we have latest verification info
            
            // For child accounts, check if they have a birth vital event
            if (currentUser?.isChild) {
                // Fetch the child's birth event
                const response = await axios.get(`${API_URL}/events/my-events`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                
                if (response.data.status === 'success') {
                    const birthEvent = response.data.data.events.find(e => e.type === 'birth');
                    if (birthEvent) {
                        // Show the vital event modal instead
                        setSelectedVitalEvent(birthEvent);
                        setShowVitalModal(true);
                        setLoading(false);
                        return;
                    }
                }
            }
            
            setShowViewModal(true);
        } catch (err) {
            console.error('View error:', err);
            toast.error('Error loading certificate preview.');
        } finally {
            setLoading(false);
        }
    };

    const handleVitalView = (event) => {
        setSelectedVitalEvent(event);
        setShowVitalModal(true);
    };

    // Get payment status display
    const getPaymentStatusDisplay = (status) => {
        switch (status) {
            case 'paid':
                return { text: '✅ Paid', color: '#38a169' };
            case 'pending':
                return { text: '⏳ Pending', color: '#d69e2e' };
            default:
                return { text: '❌ Unpaid', color: '#e53e3e' };
        }
    };

    if (verifying) {
        return (
            <div className="certificates-section" style={{ textAlign: 'center', padding: '50px' }}>
                <div className="spinner" style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #3498db',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }}></div>
                <h3>Verifying Your Payment...</h3>
                <p style={{ color: '#666' }}>Please wait while we confirm your transaction with Chapa.</p>
                <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
                    This may take a few moments. You will be redirected automatically.
                </p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="certificates-section">
            {error && (
                <div style={{
                    backgroundColor: '#fee',
                    color: '#c00',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #fcc'
                }}>
                    {error}
                </div>
            )}

            {!showOnlyVital && (
                <>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        borderBottom: '2px solid #eee',
                        paddingBottom: '10px',
                        flexWrap: 'wrap',
                        gap: '10px'
                    }}>
                        <h3 style={{ margin: 0 }}>📜 My Certificates</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{
                                backgroundColor: '#f0f4f8',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                color: '#555',
                                fontWeight: 'bold'
                            }}>
                                Account Status: {currentUser?.status?.toUpperCase()}
                            </span>
                            {currentUser?.residentIdVersion > 1 && (
                                <span style={{
                                    backgroundColor: '#ebf8ff',
                                    color: '#2c5282',
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: 'bold'
                                }}>
                                    Version {currentUser.residentIdVersion}
                                </span>
                            )}
                        </div>
                    </div>

                    <p style={{ color: '#666', marginBottom: '25px' }}>
                        Access your official identity documents and certificates here after full approval.
                    </p>
                </>
            )}

            {/* Resident ID Certificate Card */}
            {!showOnlyVital && (
                <div className="certificate-card" style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    maxWidth: '600px',
                    marginBottom: '30px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h4 style={{ margin: 0, color: '#2d3748', fontSize: '1.2rem' }}>
                                {t('official_birth_cert')}
                                {currentUser?.residentIdVersion > 1 &&
                                    <span style={{ fontSize: '0.9rem', color: '#3182ce', marginLeft: '10px' }}>
                                        (Version {currentUser.residentIdVersion})
                                    </span>
                                }
                            </h4>
                            <p style={{ margin: '5px 0 0 0', color: '#718096', fontSize: '0.9rem' }}>
                                {t('official_doc_desc')}
                            </p>
                        </div>
                        <div style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: isApproved ? '#f0fff4' : '#fffaf0',
                            color: isApproved ? '#22543d' : '#9c4221',
                            border: `1px solid ${isApproved ? '#c6f6d5' : '#feebc8'}`
                        }}>
                            {isApproved ? t('approved') : t('pending_approval')}
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #cbd5e0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                            <div>
                                <span style={{ color: '#718096', display: 'block' }}>{t('full_name')}</span>
                                <span style={{ fontWeight: 'bold' }}>
                                    {currentUser?.personalInfo?.firstName} {currentUser?.personalInfo?.lastName}
                                </span>
                            </div>
                            <div>
                                <span style={{ color: '#718096', display: 'block' }}>{t('status')}</span>
                                <span style={{
                                    fontWeight: 'bold',
                                    color: getPaymentStatusDisplay(currentUser?.certificatePayment?.status).color
                                }}>
                                    {getPaymentStatusDisplay(currentUser?.certificatePayment?.status).text}
                                </span>
                            </div>
                            {currentUser?.certificatePayment?.paidAt && (
                                <div style={{ gridColumn: 'span 2' }}>
                                    <span style={{ color: '#718096', fontSize: '12px' }}>
                                        {t('paid_on')}: {new Date(currentUser.certificatePayment.paidAt).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isApproved ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '10px',
                            backgroundColor: '#fff5f5',
                            borderRadius: '6px',
                            color: '#c53030',
                            fontSize: '14px'
                        }}>
                            {t('pending_approval_msg', 'Certificate will be available once the verification process is complete.')}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {currentUser?.certificatePayment?.status !== 'paid' ? (
                                <button
                                    onClick={() => handlePayAndDownload('resident_id')}
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        minWidth: '200px',
                                        padding: '12px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 11px rgba(0, 123, 255, 0.35)',
                                        opacity: loading ? 0.7 : 1
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <div className="spinner-small"></div>
                                            {t('processing')}...
                                        </>
                                    ) : (
                                        <>
                                            💳 {t('pay_now')} ({process.env.REACT_APP_CERTIFICATE_PRICE || 100} ETB)
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={handleDownloadResidentID}
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        minWidth: '200px',
                                        padding: '12px',
                                        backgroundColor: '#38a169',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        opacity: loading ? 0.7 : 1
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <div className="spinner-small"></div>
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            📥 {t('download_pdf')}
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: '#fff',
                                    color: '#4a5568',
                                    border: '1px solid #cbd5e0',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    minWidth: '100px'
                                }}
                                onClick={handleView}
                                disabled={loading}
                            >
                                👁️ Preview
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Resident ID Modal */}
            {showViewModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setShowViewModal(false)}>
                    <div className="id-card-modal" style={{
                        backgroundColor: 'white',
                        borderRadius: '15px',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div style={{
                            backgroundColor: '#1a365d',
                            color: 'white',
                            padding: '15px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                                {currentUser?.certificatePayment?.status === 'paid' ? 'OFFICIAL CERTIFICATE' : 'UNOFFICIAL PREVIEW (REQUIRES PAYMENT)'}
                            </h3>
                            <button
                                onClick={() => setShowViewModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    padding: '0 10px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Card Content */}
                        <div style={{ padding: '25px' }}>
                            <div style={{
                                border: '2px solid #2d3748',
                                borderRadius: '10px',
                                padding: '20px',
                                position: 'relative',
                                minHeight: '400px',
                                userSelect: 'none',
                                overflow: 'hidden'
                            }}>
                                {currentUser?.certificatePayment?.status !== 'paid' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%) rotate(-45deg)',
                                        fontSize: '4.5rem',
                                        fontWeight: '900',
                                        color: 'rgba(230, 0, 0, 0.15)',
                                        whiteSpace: 'nowrap',
                                        pointerEvents: 'none',
                                        zIndex: 0,
                                        textTransform: 'uppercase',
                                        border: '10px solid rgba(230, 0, 0, 0.15)',
                                        padding: '10px 30px',
                                        borderRadius: '20px',
                                        letterSpacing: '5px'
                                    }}>
                                        PREVIEW ONLY
                                    </div>
                                )}
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    {/* Flag */}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                                        <div style={{
                                            width: '80px',
                                            height: '48px',
                                            overflow: 'hidden',
                                            border: '1px solid #ddd',
                                            borderRadius: '2px'
                                        }}>
                                            <img
                                                src={`${API_URL.replace('/api', '')}/uploads/ethiopia_flag.png`}
                                                alt="Ethiopia Flag"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/71/Flag_of_Ethiopia.svg';
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Card Header */}
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#1a365d', fontWeight: 'bold', textAlign: 'center' }}>
                                        FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA
                                    </h4>
                                    <h4 style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#1a365d', fontWeight: 'bold', textAlign: 'center' }}>
                                        VITAL EVENT REGISTRATION
                                    </h4>
                                    <h4 style={{
                                        margin: '12px 0 0 0',
                                        fontSize: '1.2rem',
                                        color: '#2c5282',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        textAlign: 'center',
                                        textDecoration: 'underline'
                                    }}>
                                        OFFICIAL BIRTH REGISTRATION
                                    </h4>

                                    <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                                        {/* Photo */}
                                        <div style={{
                                            width: '100px',
                                            height: '125px',
                                            backgroundColor: '#edf2f7',
                                            border: '1px solid #cbd5e0',
                                            overflow: 'hidden',
                                            flexShrink: 0
                                        }}>
                                            {currentUser?.profilePhoto?.url ? (
                                                <img
                                                    src={`${API_URL.replace('/api', '')}${currentUser.profilePhoto.url}`}
                                                    alt="Profile"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: '100%',
                                                    color: '#a0aec0',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    Photo
                                                </div>
                                            )}
                                        </div>

                                        {/* Personal Info */}
                                        <div style={{ flex: 1, fontSize: '0.85rem' }}>
                                            <p style={{ margin: '0 0 5px 0' }}>
                                                <strong style={{ color: '#718096', fontSize: '0.7rem', display: 'block' }}>
                                                    FULL NAME
                                                </strong>
                                                {currentUser?.personalInfo?.firstName || ''} {currentUser?.personalInfo?.lastName || ''}
                                            </p>
                                            <p style={{ margin: '0 0 5px 0' }}>
                                                <strong style={{ color: '#718096', fontSize: '0.7rem', display: 'block' }}>
                                                    ID NUMBER
                                                </strong>
                                                {currentUser?.personalInfo?.idNumber || 'PENDING'}
                                            </p>
                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                <p style={{ margin: '0 0 5px 0' }}>
                                                    <strong style={{ color: '#718096', fontSize: '0.7rem', display: 'block' }}>
                                                        SEX
                                                    </strong>
                                                    {currentUser?.personalInfo?.gender || 'N/A'}
                                                </p>
                                                <p style={{ margin: '0 0 5px 0' }}>
                                                    <strong style={{ color: '#718096', fontSize: '0.7rem', display: 'block' }}>
                                                        DOB
                                                    </strong>
                                                    {currentUser?.personalInfo?.dateOfBirth ?
                                                        new Date(currentUser.personalInfo.dateOfBirth).toLocaleDateString() :
                                                        'N/A'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location & Extended Info */}
                                    <div style={{
                                        marginTop: '10px',
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr',
                                        gap: '5px',
                                        fontSize: '0.75rem'
                                    }}>
                                        <p style={{ margin: 0 }}>
                                            <strong style={{ color: '#718096' }}>REGION:</strong>
                                            {currentUser?.location?.regionName || currentUser?.location?.region || 'N/A'}
                                        </p>
                                        <p style={{ margin: 0 }}>
                                            <strong style={{ color: '#718096' }}>WOREDA:</strong>
                                            {currentUser?.location?.woredaName || currentUser?.location?.woreda || 'N/A'}
                                        </p>
                                        <p style={{ margin: 0 }}>
                                            <strong style={{ color: '#718096' }}>KEBELE:</strong>
                                            {currentUser?.location?.kebeleName || currentUser?.location?.kebele || 'N/A'}
                                        </p>
                                    </div>

                                    <div style={{
                                        marginTop: '10px',
                                        borderTop: '1px solid #eee',
                                        paddingTop: '10px',
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '10px',
                                        fontSize: '0.75rem'
                                    }}>
                                        <p style={{ margin: 0 }}>
                                            <strong style={{ color: '#718096' }}>PHONE:</strong>
                                            {typeof currentUser?.personalInfo?.phone === 'string' ? currentUser.personalInfo.phone : 'N/A'}
                                        </p>
                                        <p style={{ margin: 0 }}>
                                            <strong style={{ color: '#718096' }}>EMAIL:</strong>
                                            {typeof currentUser?.personalInfo?.email === 'string' ? currentUser.personalInfo.email : 'N/A'}
                                        </p>
                                        <p style={{ margin: 0 }}>
                                            <strong style={{ color: '#718096' }}>OCCUPATION:</strong>
                                            {typeof currentUser?.personalInfo?.occupation === 'string' ? currentUser.personalInfo.occupation : 'N/A'}
                                        </p>
                                        <p style={{ margin: 0 }}>
                                            <strong style={{ color: '#718096' }}>MARITAL STATUS:</strong>
                                            {typeof currentUser?.personalInfo?.maritalStatus === 'string' ? currentUser.personalInfo.maritalStatus : 'N/A'}
                                        </p>
                                        <p style={{ margin: 0 }}>
                                            <strong style={{ color: '#718096' }}>EDUCATION:</strong>
                                            {typeof currentUser?.personalInfo?.educationLevel === 'string' ? currentUser.personalInfo.educationLevel : 'N/A'}
                                        </p>
                                        <p style={{ margin: 0, gridColumn: 'span 2' }}>
                                            <strong style={{ color: '#718096' }}>KEBELE APPROVAL DATE:</strong>
                                            {currentUser?.kebeleVerification?.approvedAt ?
                                                new Date(currentUser.kebeleVerification.approvedAt).toLocaleDateString() :
                                                'Not available'
                                            }
                                        </p>
                                    </div>

                                    {/* Verification Section */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '15px',
                                        marginTop: '15px',
                                        paddingTop: '10px',
                                        borderTop: '1px dashed #cbd5e0'
                                    }}>
                                        {/* Kebele Verification */}
                                        <div style={{ textAlign: 'center', borderRight: '1px dashed #e2e8f0', paddingRight: '10px' }}>
                                            <p style={{ margin: '0 0 6px 0', fontSize: '0.65rem', fontWeight: 'bold', color: '#2d3748' }}>
                                                KEBELE OFFICER
                                            </p>
                                            {currentUser?.kebeleVerification?.seal?.url && (
                                                <img
                                                    src={`${API_URL.replace('/api', '')}${currentUser.kebeleVerification.seal.url}`}
                                                    alt="Kebele Seal"
                                                    style={{ width: '44px', height: '44px', objectFit: 'contain', display: 'block', margin: '0 auto 4px' }}
                                                />
                                            )}
                                            {currentUser?.kebeleVerification?.signature?.url ? (
                                                <img
                                                    src={`${API_URL.replace('/api', '')}${currentUser.kebeleVerification.signature.url}`}
                                                    alt="Kebele Signature"
                                                    style={{ width: '100%', maxWidth: '120px', height: '36px', objectFit: 'contain', display: 'block', margin: '0 auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                                />
                                            ) : (
                                                <div style={{ height: '36px', borderBottom: '1.5px dashed #a0aec0', margin: '4px 0', width: '80%', marginLeft: 'auto', marginRight: 'auto' }} />
                                            )}
                                            <span style={{ fontSize: '0.55rem', color: '#718096', display: 'block', marginTop: '4px' }}>
                                                {currentUser?.kebeleVerification?.officerName || 'Kebele Officer'}
                                            </span>
                                        </div>

                                        {/* Woreda Verification */}
                                        <div style={{ textAlign: 'center', paddingLeft: '10px' }}>
                                            <p style={{ margin: '0 0 6px 0', fontSize: '0.65rem', fontWeight: 'bold', color: '#2d3748' }}>
                                                WOREDA OFFICER
                                            </p>
                                            {currentUser?.woredaVerification?.seal?.url && (
                                                <img
                                                    src={`${API_URL.replace('/api', '')}${currentUser.woredaVerification.seal.url}`}
                                                    alt="Woreda Seal"
                                                    style={{ width: '44px', height: '44px', objectFit: 'contain', display: 'block', margin: '0 auto 4px' }}
                                                />
                                            )}
                                            {currentUser?.woredaVerification?.signature?.url ? (
                                                <img
                                                    src={`${API_URL.replace('/api', '')}${currentUser.woredaVerification.signature.url}`}
                                                    alt="Woreda Signature"
                                                    style={{ width: '100%', maxWidth: '120px', height: '36px', objectFit: 'contain', display: 'block', margin: '0 auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                                />
                                            ) : (
                                                <div style={{ height: '36px', borderBottom: '1.5px dashed #a0aec0', margin: '4px 0', width: '80%', marginLeft: 'auto', marginRight: 'auto' }} />
                                            )}
                                            <span style={{ fontSize: '0.55rem', color: '#718096', display: 'block', marginTop: '4px' }}>
                                                {currentUser?.woredaVerification?.officerName || 'Woreda Officer'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '15px 20px',
                                backgroundColor: '#f7fafc',
                                textAlign: 'center',
                                borderTop: '1px solid #e2e8f0',
                                position: 'sticky',
                                bottom: 0
                            }}>
                                {currentUser?.certificatePayment?.status !== 'paid' && (
                                    <p style={{ fontSize: '0.85rem', color: '#e53e3e', margin: '0 0 10px 0' }}>
                                        This is a preview. To download the official PDF, please complete the payment.
                                    </p>
                                )}
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    style={{
                                        padding: '8px 25px',
                                        backgroundColor: '#4a5568',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vital Events Certificates Section */}
            {!showOnlyID && (
                <div style={{ marginTop: '40px', marginBottom: '40px' }}>
                    <h4 style={{ color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                        Other Vital Event Certificates
                    </h4>
                    <p style={{ fontSize: '14px', color: '#718096', marginBottom: '20px' }}>
                        Certificates for birth, marriage, death and other vital events you've registered.
                    </p>

                    {loadingEvents ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <div className="spinner-small" style={{
                                margin: '0 auto',
                                width: '30px',
                                height: '30px',
                                border: '3px solid #f3f3f3',
                                borderTop: '3px solid #3182ce',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }}></div>
                            <p style={{ fontSize: '12px', color: '#718096', marginTop: '10px' }}>
                                Loading certificates...
                            </p>
                        </div>
                    ) : vitalEvents.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {vitalEvents.map(event => {
                                const eventName = event.type === 'birth' ? event.birthDetails?.childName :
                                    event.type === 'marriage' ? `${event.marriageDetails?.husbandName} & ${event.marriageDetails?.wifeName}` :
                                        event.type === 'death' ? event.deathDetails?.deceasedName :
                                            `${event.type.toUpperCase()} Entry`;

                                const paymentStatus = getPaymentStatusDisplay(event.certificate?.paymentStatus);

                                return (
                                    <div key={event._id} className="certificate-card" style={{
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '24px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '15px',
                                        maxWidth: '600px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                                            <div>
                                                <h4 style={{ margin: 0, color: '#2d3748', fontSize: '1.2rem', textTransform: 'capitalize' }}>
                                                    Official {event.type === 'birth' ? 'Birth Registration' : event.type + ' Registration'}
                                                </h4>
                                                <p style={{ margin: '5px 0 0 0', color: '#718096', fontSize: '0.9rem' }}>
                                                    Federal Democratic Republic of Ethiopia
                                                </p>
                                            </div>
                                            <div style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                backgroundColor: '#f0fff4',
                                                color: '#22543d',
                                                border: '1px solid #c6f6d5'
                                            }}>
                                                {t('approved')}
                                            </div>
                                        </div>

                                        <div style={{
                                            backgroundColor: '#f8fafc',
                                            padding: '15px',
                                            borderRadius: '8px',
                                            borderLeft: '4px solid #3182ce'
                                        }}>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '15px',
                                                fontSize: '14px'
                                            }}>
                                                <div>
                                                    <span style={{ color: '#718096', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                        {t('subject_name')}
                                                    </span>
                                                    <span style={{ fontWeight: 'bold', color: '#2d3748' }}>
                                                        {eventName}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#718096', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                        {t('status')}
                                                    </span>
                                                    <span style={{ fontWeight: 'bold', color: paymentStatus.color }}>
                                                        {paymentStatus.text}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#718096', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                        {t('certificate_no')}
                                                    </span>
                                                    <span style={{ fontWeight: 'bold', color: '#2d3748' }}>
                                                        {event.certificate?.number || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#718096', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                        {t('issue_date')}
                                                    </span>
                                                    <span style={{ fontWeight: 'bold' }}>
                                                        {event.certificate?.issueDate ?
                                                            new Date(event.certificate.issueDate).toLocaleDateString() :
                                                            'N/A'
                                                        }
                                                    </span>
                                                </div>
                                                {event.certificate?.paidAt && (
                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <span style={{ color: '#718096', fontSize: '12px' }}>
                                                            Paid on: {new Date(event.certificate.paidAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px', marginTop: '5px', flexWrap: 'wrap' }}>
                                            {event.certificate?.paymentStatus !== 'paid' ? (
                                                <button
                                                    onClick={() => handlePayAndDownload('vital_event', event._id)}
                                                    disabled={loading}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: '200px',
                                                        padding: '12px',
                                                        backgroundColor: '#007bff',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontWeight: 'bold',
                                                        cursor: loading ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        boxShadow: '0 4px 11px rgba(0, 123, 255, 0.35)',
                                                        opacity: loading ? 0.7 : 1
                                                    }}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <div className="spinner-small"></div>
                                                            {t('processing')}...
                                                        </>
                                                    ) : (
                                                        <>
                                                            💳 {t('pay_now')} ({process.env.REACT_APP_CERTIFICATE_PRICE || 100} ETB)
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDownloadVitalCertificate(event._id)}
                                                    disabled={loading}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: '200px',
                                                        padding: '12px',
                                                        backgroundColor: '#38a169',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontWeight: 'bold',
                                                        cursor: loading ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        opacity: loading ? 0.7 : 1
                                                    }}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <div className="spinner-small"></div>
                                                            Downloading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            📥 Download Certificate (PDF)
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            <button
                                                style={{
                                                    padding: '12px 20px',
                                                    backgroundColor: '#fff',
                                                    color: '#4a5568',
                                                    border: '1px solid #cbd5e0',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    minWidth: '100px'
                                                }}
                                                onClick={() => handleVitalView(event)}
                                            >
                                                👁️ Preview
                                            </button>
                                        </div>

                                        <div style={{ fontSize: '11px', color: '#a0aec0', textAlign: 'center' }}>
                                            Registration Reference: {event._id.toUpperCase()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{
                            padding: '30px',
                            border: '2px dashed #e2e8f0',
                            borderRadius: '12px',
                            textAlign: 'center',
                            color: '#a0aec0'
                        }}>
                            No vital event certificates found yet.
                        </div>
                    )}
                </div>
            )}

            {/* Vital Event Certificate Modal */}
            {showVitalModal && selectedVitalEvent && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setShowVitalModal(false)}>
                    <div className="certificate-modal" style={{
                        backgroundColor: 'white',
                        borderRadius: '15px',
                        width: '100%',
                        maxWidth: '550px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            backgroundColor: '#1a365d',
                            color: 'white',
                            padding: '15px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                                {selectedVitalEvent?.certificate?.paymentStatus === 'paid' ? `OFFICIAL ${selectedVitalEvent.type.toUpperCase()} CERTIFICATE` : `UNOFFICIAL ${selectedVitalEvent.type.toUpperCase()} PREVIEW`}
                            </h3>
                            <button
                                onClick={() => setShowVitalModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    padding: '0 10px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ padding: '25px' }}>
                            <div style={{
                                border: '3px double #2d3748',
                                borderRadius: '12px',
                                padding: '25px',
                                position: 'relative',
                                background: '#fff',
                                userSelect: 'none',
                                overflow: 'hidden'
                            }}>
                                {selectedVitalEvent?.certificate?.paymentStatus !== 'paid' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%) rotate(-45deg)',
                                        fontSize: '4.5rem',
                                        fontWeight: '900',
                                        color: 'rgba(230, 0, 0, 0.15)',
                                        whiteSpace: 'nowrap',
                                        pointerEvents: 'none',
                                        zIndex: 0,
                                        textTransform: 'uppercase',
                                        border: '10px solid rgba(230, 0, 0, 0.15)',
                                        padding: '10px 30px',
                                        borderRadius: '20px',
                                        letterSpacing: '5px'
                                    }}>
                                        PREVIEW ONLY
                                    </div>
                                )}
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    {/* Header */}
                                    <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
                                        <div style={{
                                            width: '80px',
                                            height: '48px',
                                            overflow: 'hidden',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            margin: '0 auto 12px'
                                        }}>
                                            <img
                                                src={`${API_URL.replace('/api', '')}/uploads/ethiopia_flag.png`}
                                                alt="Flag"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/71/Flag_of_Ethiopia.svg';
                                                }}
                                            />
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: '1rem', color: '#1a365d', fontWeight: 'bold' }}>
                                            FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA
                                        </h4>
                                        <h5 style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#1a365d' }}>
                                            VITAL EVENT REGISTRATION
                                        </h5>
                                        <h3 style={{
                                            margin: '12px 0 0 0',
                                            fontSize: '1.45rem',
                                            color: '#1a365d',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1.5px',
                                            textDecoration: 'underline',
                                            textUnderlineOffset: '8px'
                                        }}>
                                            {selectedVitalEvent.type === 'birth' ? 'OFFICIAL BIRTH REGISTRATION' : `${selectedVitalEvent.type} REGISTRATION`}
                                        </h3>
                                    </div>



                                    {/* Top Section: Info & Photo */}
                                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                <div style={{ fontSize: '0.85rem' }}>
                                                    <span style={{ color: '#718096', fontWeight: 'bold', display: 'block', fontSize: '0.7rem' }}>
                                                        CERTIFICATE NO:
                                                    </span>
                                                    <span style={{ color: '#2d3748', fontWeight: 'bold' }}>
                                                        {selectedVitalEvent.certificate?.number || 'CERT-' + selectedVitalEvent._id.slice(-8).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem' }}>
                                                    <span style={{ color: '#718096', fontWeight: 'bold', display: 'block', fontSize: '0.7rem' }}>
                                                        ISSUE DATE:
                                                    </span>
                                                    <span style={{ color: '#2d3748' }}>
                                                        {selectedVitalEvent.certificate?.issueDate ?
                                                            new Date(selectedVitalEvent.certificate.issueDate).toLocaleDateString() :
                                                            new Date().toLocaleDateString()
                                                        }
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem' }}>
                                                    <span style={{ color: '#718096', fontWeight: 'bold', display: 'block', fontSize: '0.7rem' }}>
                                                        REF ID:
                                                    </span>
                                                    <span style={{ color: '#2d3748', fontFamily: 'monospace' }}>
                                                        {selectedVitalEvent._id.toUpperCase().slice(-10)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Profile/Child Photo */}
                                        <div style={{ width: '120px', textAlign: 'center', margin: '0 auto' }}>
                                            <div style={{
                                                width: '100px',
                                                height: '120px',
                                                border: '2px solid #edf2f7',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                margin: '0 auto 8px',
                                                backgroundColor: '#f7fafc',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {selectedVitalEvent.type === 'birth' && selectedVitalEvent.birthDetails?.childPhoto?.url ? (
                                                    <img
                                                        src={selectedVitalEvent.birthDetails.childPhoto.url.startsWith('http') ?
                                                            selectedVitalEvent.birthDetails.childPhoto.url :
                                                            `${API_URL.replace('/api', '')}${selectedVitalEvent.birthDetails.childPhoto.url}`
                                                        }
                                                        alt="Profile"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : selectedVitalEvent.type === 'death' && selectedVitalEvent.deathDetails?.deceasedPhoto?.url ? (
                                                    <img
                                                        src={`${API_URL.replace('/api', '')}${selectedVitalEvent.deathDetails.deceasedPhoto.url}`}
                                                        alt="Deceased"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : selectedVitalEvent.type === 'marriage' ? (
                                                    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                                                        <div style={{ flex: 1, borderRight: '1px solid #eee' }}>
                                                            {selectedVitalEvent.marriageDetails?.husbandPhoto?.url ? (
                                                                <img
                                                                    src={`${API_URL.replace('/api', '')}${selectedVitalEvent.marriageDetails.husbandPhoto.url}`}
                                                                    alt="Husband"
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    title="Husband"
                                                                />
                                                            ) : (
                                                                <span style={{ fontSize: '20px' }}>🤵</span>
                                                            )}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            {selectedVitalEvent.marriageDetails?.wifePhoto?.url ? (
                                                                <img
                                                                    src={`${API_URL.replace('/api', '')}${selectedVitalEvent.marriageDetails.wifePhoto.url}`}
                                                                    alt="Wife"
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    title="Wife"
                                                                />
                                                            ) : (
                                                                <span style={{ fontSize: '20px' }}>👰</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '40px', color: '#cbd5e0' }}>👤</span>
                                                )}
                                            </div>
                                            {selectedVitalEvent.certificate?.qrCode && (
                                                <img
                                                    src={selectedVitalEvent.certificate.qrCode}
                                                    alt="QR"
                                                    style={{ height: '60px', border: '1px solid #edf2f7' }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Subject Information Section */}
                                    <div style={{
                                        backgroundColor: '#f8fafc',
                                        padding: '18px',
                                        borderRadius: '10px',
                                        marginBottom: '20px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <h5 style={{
                                            margin: '0 0 12px 0',
                                            color: '#2d3748',
                                            borderBottom: '1.5px solid #cbd5e0',
                                            paddingBottom: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                        }}>
                                            SUBJECT INFORMATION
                                        </h5>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <span style={{ color: '#718096', display: 'block', fontSize: '0.7rem' }}>FULL NAME</span>
                                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1a365d' }}>
                                                    {selectedVitalEvent.type === 'birth' ? selectedVitalEvent.birthDetails?.childName :
                                                        selectedVitalEvent.type === 'marriage' ? `${selectedVitalEvent.marriageDetails?.husbandName} & ${selectedVitalEvent.marriageDetails?.wifeName}` :
                                                            selectedVitalEvent.type === 'death' ? selectedVitalEvent.deathDetails?.deceasedName : ''
                                                    }
                                                </span>
                                            </div>

                                            <div>
                                                <span style={{ color: '#718096', display: 'block', fontSize: '0.7rem' }}>DATE OF BIRTH / EVENT</span>
                                                <span style={{ fontWeight: 'bold' }}>
                                                    {selectedVitalEvent.eventDate ?
                                                        new Date(selectedVitalEvent.eventDate).toLocaleDateString() :
                                                        'N/A'
                                                    }
                                                </span>
                                            </div>
                                            <div>
                                                <span style={{ color: '#718096', display: 'block', fontSize: '0.7rem' }}>SEX</span>
                                                <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                                    {selectedVitalEvent.type === 'birth' ? selectedVitalEvent.birthDetails?.gender :
                                                        selectedVitalEvent.type === 'death' ? selectedVitalEvent.deathDetails?.gender :
                                                            selectedVitalEvent.type === 'marriage' ? 'N/A' : 'N/A'
                                                    }
                                                </span>
                                            </div>

                                            <div style={{ gridColumn: 'span 2' }}>
                                                <span style={{ color: '#718096', display: 'block', fontSize: '0.7rem' }}>PLACE OF BIRTH / EVENT</span>
                                                <span style={{ fontWeight: 'bold' }}>
                                                    {selectedVitalEvent.type === 'birth' ? selectedVitalEvent.birthDetails?.placeOfBirth :
                                                        selectedVitalEvent.type === 'death' ? selectedVitalEvent.deathDetails?.placeOfDeath :
                                                            selectedVitalEvent.type === 'marriage' ? selectedVitalEvent.location?.woreda : 'N/A'
                                                    }
                                                </span>
                                            </div>

                                            <div>
                                                <span style={{ color: '#718096', display: 'block', fontSize: '0.7rem' }}>REGION</span>
                                                <span style={{ fontWeight: 'bold' }}>{selectedVitalEvent.location?.region || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: '#718096', display: 'block', fontSize: '0.7rem' }}>WOREDA</span>
                                                <span style={{ fontWeight: 'bold' }}>{selectedVitalEvent.location?.woreda || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: '#718096', display: 'block', fontSize: '0.7rem' }}>KEBELE</span>
                                                <span style={{ fontWeight: 'bold' }}>{selectedVitalEvent.location?.kebele || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Parent and Professional Information */}
                                    {selectedVitalEvent.type === 'birth' && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                                                <div style={{ borderLeft: '3px solid #3182ce', paddingLeft: '10px' }}>
                                                    <h6 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 'bold', color: '#2b6cb0' }}>
                                                        FATHER'S INFORMATION
                                                    </h6>
                                                    <div style={{ fontSize: '0.75rem', display: 'grid', gap: '4px' }}>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>Name:</span>
                                                            <span style={{ fontWeight: 'bold' }}> {selectedVitalEvent.birthDetails?.fatherName || 'N/A'}</span>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>Nationality:</span>
                                                            {selectedVitalEvent.birthDetails?.fatherNationality || 'Ethiopian'}
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>Occupation:</span>
                                                            {selectedVitalEvent.birthDetails?.fatherOccupation || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ borderLeft: '3px solid #d53f8c', paddingLeft: '10px' }}>
                                                    <h6 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 'bold', color: '#b83280' }}>
                                                        MOTHER'S INFORMATION
                                                    </h6>
                                                    <div style={{ fontSize: '0.75rem', display: 'grid', gap: '4px' }}>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>Name:</span>
                                                            <span style={{ fontWeight: 'bold' }}> {selectedVitalEvent.birthDetails?.motherName || 'N/A'}</span>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>Nationality:</span>
                                                            {selectedVitalEvent.birthDetails?.motherNationality || 'Ethiopian'}
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>Occupation:</span>
                                                            {selectedVitalEvent.birthDetails?.motherOccupation || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hospital and Doctor Information */}
                                            <div style={{
                                                padding: '12px',
                                                background: '#f8fafc',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '15px'
                                            }}>
                                                <div>
                                                    <span style={{ color: '#718096', display: 'block', fontSize: '0.65rem', fontWeight: 'bold' }}>
                                                        HOSPITAL NAME
                                                    </span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                        {selectedVitalEvent.birthDetails?.hospitalName || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#718096', display: 'block', fontSize: '0.65rem', fontWeight: 'bold' }}>
                                                        DOCTOR NAME
                                                    </span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                        {selectedVitalEvent.birthDetails?.doctorName || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Marriage Specific Information */}
                                    {selectedVitalEvent.type === 'marriage' && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                                                <div style={{ borderLeft: '3px solid #3182ce', paddingLeft: '10px' }}>
                                                    <h6 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 'bold', color: '#2b6cb0' }}>
                                                        HUSBAND'S INFORMATION
                                                    </h6>
                                                    <div style={{ fontSize: '0.75rem', display: 'grid', gap: '4px' }}>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>Name:</span>
                                                            <span style={{ fontWeight: 'bold' }}> {selectedVitalEvent.marriageDetails?.husbandName || 'N/A'}</span>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>ID:</span>
                                                            {selectedVitalEvent.marriageDetails?.husbandNationalId || 'N/A'}
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>Age:</span>
                                                            {selectedVitalEvent.marriageDetails?.husbandAge || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ borderLeft: '3px solid #d53f8c', paddingLeft: '10px' }}>
                                                    <h6 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 'bold', color: '#b83280' }}>
                                                        WIFE'S INFORMATION
                                                    </h6>
                                                    <div style={{ fontSize: '0.75rem', display: 'grid', gap: '4px' }}>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>Name:</span>
                                                            <span style={{ fontWeight: 'bold' }}> {selectedVitalEvent.marriageDetails?.wifeName || 'N/A'}</span>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>ID:</span>
                                                            {selectedVitalEvent.marriageDetails?.wifeNationalId || 'N/A'}
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#718096' }}>Age:</span>
                                                            {selectedVitalEvent.marriageDetails?.wifeAge || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <span style={{ color: '#718096', display: 'block', fontSize: '0.65rem', fontWeight: 'bold' }}>WITNESSES</span>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                    {selectedVitalEvent.marriageDetails?.witness1} & {selectedVitalEvent.marriageDetails?.witness2}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Death Specific Information */}
                                    {selectedVitalEvent.type === 'death' && (
                                        <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <h6 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 'bold', color: '#2d3748' }}>
                                                DEATH DETAILS
                                            </h6>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
                                                <div>
                                                    <span style={{ color: '#718096', fontSize: '0.7rem' }}>CAUSE OF DEATH</span>
                                                    <span style={{ display: 'block', fontWeight: 'bold' }}>{selectedVitalEvent.deathDetails?.causeOfDeath || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#718096', fontSize: '0.7rem' }}>PLACE OF DEATH</span>
                                                    <span style={{ display: 'block', fontWeight: 'bold' }}>{selectedVitalEvent.deathDetails?.placeOfDeath || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#718096', fontSize: '0.7rem' }}>INFORMANT</span>
                                                    <span style={{ display: 'block', fontWeight: 'bold' }}>{selectedVitalEvent.deathDetails?.informantName || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#718096', fontSize: '0.7rem' }}>RELATIONSHIP</span>
                                                    <span style={{ display: 'block', fontWeight: 'bold' }}>{selectedVitalEvent.deathDetails?.informantRelationship || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Approval Section - Kebele and Woreda Officers */}
                                <div style={{
                                    borderTop: '2px solid #2d3748',
                                    marginTop: '25px',
                                    paddingTop: '15px'
                                }}>
                                    <p style={{ 
                                        margin: '0 0 12px 0', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 'bold', 
                                        color: '#1a365d', 
                                        textAlign: 'center',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Official Approval
                                    </p>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '20px'
                                    }}>
                                        {/* Kebele Verification Column */}
                                        <div style={{ textAlign: 'center', borderRight: '1.5px dashed #cbd5e0', paddingRight: '10px' }}>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: 'bold', color: '#2d3748' }}>
                                                KEBELE OFFICER
                                            </p>
                                            {(() => {
                                                const kebeleVer = (selectedVitalEvent.verification || [])
                                                    .filter(v => v.level === 'kebele' && v.status === 'approved')
                                                    .pop();

                                                // Fallback to kebele record from currentUser if missing in event (for child accounts)
                                                const fallbackName = currentUser?.location?.kebele === selectedVitalEvent.location?.kebele 
                                                    ? currentUser?.kebeleVerification?.officerName 
                                                    : '';

                                                return (
                                                    <>
                                                        {(kebeleVer?.seal?.url) ? (
                                                            <img
                                                                src={`${API_URL.replace('/api', '')}${kebeleVer.seal.url}`}
                                                                alt="Kebele Seal"
                                                                style={{ height: '50px', display: 'block', margin: '0 auto 5px', objectFit: 'contain' }}
                                                            />
                                                        ) : (
                                                            <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <div style={{ color: '#e53e3e', fontSize: '0.7rem', fontWeight: 'bold', border: '2px solid #e53e3e', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase', transform: 'rotate(-15deg)', padding: '2px', textAlign: 'center', lineHeight: '1' }}>APPROVED</div>
                                                            </div>
                                                        )}
                                                        {kebeleVer?.signature?.url ? (
                                                            <img
                                                                src={`${API_URL.replace('/api', '')}${kebeleVer.signature.url}`}
                                                                alt="Kebele Signature"
                                                                style={{ width: '100%', maxWidth: '130px', height: '40px', display: 'block', margin: '0 auto', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                                            />
                                                        ) : (
                                                            <div style={{ height: '40px', borderBottom: '1px dashed #cbd5e0', margin: '5px auto', width: '80%' }}></div>
                                                        )}
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#1a365d', display: 'block', marginTop: '6px' }}>
                                                            {typeof (kebeleVer?.officerName || fallbackName) === 'string' ? (kebeleVer?.officerName || fallbackName || 'Kebele Registrar') : 'Kebele Registrar'}
                                                        </span>
                                                        <span style={{ fontSize: '0.6rem', color: '#718096', display: 'block' }}>
                                                            {kebeleVer?.verifiedAt ? new Date(kebeleVer.verifiedAt).toLocaleDateString() : new Date().toLocaleDateString()}
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Woreda Verification Column */}
                                        <div style={{ textAlign: 'center', paddingLeft: '10px' }}>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: 'bold', color: '#2d3748' }}>
                                                WOREDA OFFICER
                                            </p>
                                            {(() => {
                                                const woredaVer = (selectedVitalEvent.verification || [])
                                                    .filter(v => v.level === 'woreda' && v.status === 'approved')
                                                    .pop();
                                                
                                                // Fallback to woreda record from currentUser if missing in event
                                                const fallbackName = currentUser?.location?.woreda === selectedVitalEvent.location?.woreda 
                                                    ? currentUser?.woredaVerification?.officerName 
                                                    : '';

                                                return (
                                                    <>
                                                        {(woredaVer?.seal?.url) ? (
                                                            <img
                                                                src={`${API_URL.replace('/api', '')}${woredaVer.seal.url}`}
                                                                alt="Woreda Seal"
                                                                style={{ height: '50px', display: 'block', margin: '0 auto 5px', objectFit: 'contain' }}
                                                            />
                                                        ) : (
                                                            <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <div style={{ color: '#c05621', fontSize: '0.8rem', fontWeight: 'bold', border: '2px solid #c05621', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase', transform: 'rotate(-5deg)', padding: '2px' }}>PAID</div>
                                                            </div>
                                                        )}
                                                        {woredaVer?.signature?.url ? (
                                                            <img
                                                                src={`${API_URL.replace('/api', '')}${woredaVer.signature.url}`}
                                                                alt="Woreda Signature"
                                                                style={{ width: '100%', maxWidth: '130px', height: '40px', display: 'block', margin: '0 auto', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                                            />
                                                        ) : (
                                                            <div style={{ height: '40px', borderBottom: '1px dashed #cbd5e0', margin: '5px auto', width: '80%' }}></div>
                                                        )}
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#1a365d', display: 'block', marginTop: '6px' }}>
                                                            {typeof (woredaVer?.officerName || fallbackName) === 'string' ? (woredaVer?.officerName || fallbackName || 'Woreda Administrator') : 'Woreda Administrator'}
                                                        </span>
                                                        <span style={{ fontSize: '0.6rem', color: '#718096', display: 'block' }}>
                                                            {woredaVer?.verifiedAt ? new Date(woredaVer.verifiedAt).toLocaleDateString() : new Date().toLocaleDateString()}
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            padding: '15px 20px',
                            backgroundColor: '#f7fafc',
                            textAlign: 'center',
                            borderTop: '1px solid #eee',
                            position: 'sticky',
                            bottom: 0
                        }}>
                            {selectedVitalEvent.certificate?.paymentStatus !== 'paid' && (
                                <p style={{ fontSize: '0.8rem', color: '#e53e3e', margin: '0 0 10px 0' }}>
                                    Preview only. Official document requires payment.
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setShowVitalModal(false)}
                                    style={{
                                        padding: '8px 20px',
                                        backgroundColor: '#4a5568',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Close
                                </button>
                                {selectedVitalEvent.certificate?.paymentStatus === 'paid' && (
                                    <button
                                        onClick={() => window.print()}
                                        style={{
                                            padding: '8px 20px',
                                            backgroundColor: '#38a169',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Print Official Copy
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Selection Modal */}
            {paymentModalData && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100,
                    padding: '20px'
                }} onClick={() => setPaymentModalData(null)}>
                    <div className="payment-modal" style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '450px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        position: 'relative',
                        overflow: 'hidden',
                        animation: 'modalSlideUp 0.3s ease-out'
                    }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{
                            padding: '24px',
                            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>
                                {t('select_payment_method')}
                            </h3>
                            <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                                {t('payment_method_desc')}
                            </p>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Chapa Option */}
                                <div 
                                    onClick={() => setSelectedPaymentMethod('chapa')}
                                    style={{
                                        border: `2px solid ${selectedPaymentMethod === 'chapa' ? '#3182ce' : '#e2e8f0'}`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: selectedPaymentMethod === 'chapa' ? '#ebf8ff' : 'transparent'
                                    }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '10px',
                                        backgroundColor: '#000',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem'
                                    }}>
                                        💳
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', color: '#2d3748' }}>{t('chapa_payment')}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>Global cards & local mobile money</div>
                                    </div>
                                    {selectedPaymentMethod === 'chapa' && (
                                        <div style={{ color: '#3182ce', fontSize: '1.25rem' }}>✓</div>
                                    )}
                                </div>

                                {/* Telebirr Option */}
                                <div 
                                    onClick={() => setSelectedPaymentMethod('telebirr')}
                                    style={{
                                        border: `2px solid ${selectedPaymentMethod === 'telebirr' ? '#3182ce' : '#e2e8f0'}`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: selectedPaymentMethod === 'telebirr' ? '#ebf8ff' : 'transparent',
                                        opacity: 0.8
                                    }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '10px',
                                        backgroundColor: '#005bb7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem'
                                    }}>
                                        📱
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', color: '#2d3748' }}>{t('telebirr_payment')}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>Pay via Telebirr app or USSD</div>
                                    </div>
                                    <div style={{
                                        fontSize: '0.65rem',
                                        backgroundColor: '#edf2f7',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        color: '#4a5568',
                                        fontWeight: 'bold'
                                    }}>COMING SOON</div>
                                </div>

                                {/* CBE Birr Option */}
                                <div 
                                    onClick={() => setSelectedPaymentMethod('cbe_birr')}
                                    style={{
                                        border: `2px solid ${selectedPaymentMethod === 'cbe_birr' ? '#3182ce' : '#e2e8f0'}`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: selectedPaymentMethod === 'cbe_birr' ? '#ebf8ff' : 'transparent',
                                        opacity: 0.8
                                    }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '10px',
                                        backgroundColor: '#6a1b9a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem'
                                    }}>
                                        🏦
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', color: '#2d3748' }}>{t('cbe_birr_payment')}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>Commercial Bank of Ethiopia</div>
                                    </div>
                                    <div style={{
                                        fontSize: '0.65rem',
                                        backgroundColor: '#edf2f7',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        color: '#4a5568',
                                        fontWeight: 'bold'
                                    }}>COMING SOON</div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setPaymentModalData(null)}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: 'white',
                                        color: '#4a5568',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executePayment}
                                    disabled={loading}
                                    style={{
                                        flex: 2,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        backgroundColor: '#3182ce',
                                        color: 'white',
                                        fontWeight: '600',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: '0 10px 15px -3px rgba(49, 130, 206, 0.3)'
                                    }}
                                >
                                    {loading ? (
                                        <div className="spinner-small"></div>
                                    ) : (
                                        <>{t('pay_now')}</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '16px',
                            textAlign: 'center',
                            backgroundColor: '#f7fafc',
                            borderTop: '1px solid #edf2f7',
                            fontSize: '0.75rem',
                            color: '#718096'
                        }}>
                            🔒 All transactions are secured and encrypted.
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
            .spinner-small {
                width: 18px;
                height: 18px;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 1s ease-in-out infinite;
                display: inline-block;
            }
            @keyframes modalSlideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .id-card-modal, .certificate-modal, .payment-modal {
                user-select: none;
            }
            @media print {
                html, body {
                    height: auto !important;
                    overflow: visible !important;
                }
                .modal-overlay {
                    position: absolute;
                    background: white !important;
                    padding: 0 !important;
                    display: none !important;
                }
                .payment-modal {
                    display: none !important;
                }
                .certificate-modal, .id-card-modal {
                    display: block !important;
                    width: 100% !important;
                    max-width: none !important;
                    max-height: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                }
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                button {
                    display: none !important;
                }
            }
            `
            }} />
        </div>
    );
};

export default MyCertificates;