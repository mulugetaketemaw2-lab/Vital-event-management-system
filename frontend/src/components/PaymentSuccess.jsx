import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

/* ─── Helper: trigger a file download from a blob response ─── */
const triggerDownload = (blobData, filename) => {
  const url = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/* ─── Detect payment type from tx_ref ─── */
const isVitalEvent = (tx_ref) => tx_ref && tx_ref.includes('-VE-');

/* ─── Extract eventId (last segment of tx_ref) ─── */
const extractEventId = (tx_ref) => {
  if (!tx_ref) return null;
  const parts = tx_ref.split('-');
  return parts[parts.length - 1];
};

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, API_URL, refreshUser } = useAuth();

  const [phase, setPhase] = useState('verifying'); // verifying | success | error
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(10);
  const autoRedirectRef = useRef(null);
  const countdownRef = useRef(null);

  const queryParams = new URLSearchParams(location.search);
  const tx_ref = queryParams.get('tx_ref');
  const isVE = isVitalEvent(tx_ref);

  /* ─── Download certificate ─── */
  const downloadCertificate = useCallback(async (txRef) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setDownloading(true);
    try {
      if (isVitalEvent(txRef)) {
        const eventId = extractEventId(txRef);
        const resp = await axios.get(`${API_URL}/certificates/${eventId}/download`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        triggerDownload(resp.data, `certificate-${eventId}.pdf`);
      } else {
        // Resident ID — use the citizenId (current user ID)
        let targetId = currentUser?._id;
        if (!targetId) {
          const freshUser = await refreshUser();
          targetId = freshUser?._id;
          if (!targetId) throw new Error('User info not available');
        }

        const resp = await axios.get(`${API_URL}/certificates/resident-id/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        triggerDownload(resp.data, `resident-id-${targetId}.pdf`);
      }
      setDownloadDone(true);
    } catch (err) {
      console.error('Certificate download error:', err);
      // Don't set global error — payment succeeded, download can be retried manually
    } finally {
      setDownloading(false);
    }
  }, [API_URL, currentUser, refreshUser]);

  /* ─── Verify payment & fetch info ─── */
  useEffect(() => {
    const verify = async () => {
      if (!tx_ref) {
        setErrorMsg('No transaction reference found in URL.');
        setPhase('error');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMsg('You are not logged in. Please log in to view your certificate.');
        setPhase('error');
        return;
      }

      try {
        // Step 1: Verify with backend (marks as paid if not already)
        const verifyResp = await axios.get(
          `${API_URL}/payment/verify/${tx_ref}?redirect=false`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (verifyResp.data?.status === 'success') {
          setPaymentInfo(verifyResp.data?.data || {});
          setPhase('success');
          // Auto-download on success
          await downloadCertificate(tx_ref);
        } else {
          // Fallback check status
          throw new Error('Verification returned non-success');
        }
      } catch (err) {
        console.warn('Verification attempt failed, checking status instead...', err.message);

        try {
          const statusResp = await axios.get(
            `${API_URL}/payment/status/${tx_ref}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (statusResp.data?.status === 'success' &&
            (statusResp.data.data?.status === 'paid' || statusResp.data.data?.paymentStatus === 'paid')) {
            setPaymentInfo(statusResp.data.data);
            setPhase('success');
            await downloadCertificate(tx_ref);
          } else {
            setErrorMsg('Payment verification could not be confirmed. Please check your dashboard.');
            setPhase('error');
          }
        } catch (statusErr) {
          setErrorMsg('Error verifying payment. If you have been charged, please contact support.');
          setPhase('error');
        }
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx_ref]);

  /* ─── Countdown auto-redirect ─── */
  useEffect(() => {
    if (phase !== 'success') return;

    autoRedirectRef.current = setTimeout(() => {
      navigate('/citizen');
    }, 15000);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(autoRedirectRef.current);
      clearInterval(countdownRef.current);
    };
  }, [phase, navigate]);

  /* ══════════════════════════════════════════════════════ RENDER ══ */

  if (phase === 'verifying') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinnerWrapper}>
            <div style={styles.spinner} />
          </div>
          <h2 style={{ margin: '20px 0 8px', color: '#1a365d', fontSize: '1.4rem' }}>
            Verifying Your Payment...
          </h2>
          <p style={styles.subText}>
            Confirming your transaction with the payment gateway.<br />
            Your certificate will download automatically once verified.
          </p>
        </div>
        <style>{spinnerCss}</style>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.iconCircle, background: '#fff5f5', border: '2px solid #feb2b2' }}>
            <span style={{ fontSize: '2.5rem' }}>❌</span>
          </div>
          <h2 style={{ color: '#c53030', margin: '16px 0 8px' }}>Verification Unsuccessful</h2>
          <p style={styles.subText}>{errorMsg}</p>
          <div style={styles.btnRow}>
            <button style={{ ...styles.btn, background: '#2b6cb0' }} onClick={() => navigate('/citizen')}>
              Go to Dashboard
            </button>
            <button style={{ ...styles.btn, background: '#718096' }} onClick={() => window.location.reload()}>
              Retry Verification
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{spinnerCss}</style>
      <div style={styles.card}>
        <div style={styles.iconCircle}>
          <span style={{ fontSize: '3.5rem' }}>✅</span>
        </div>

        <h1 style={styles.heading}>Payment Confirmed!</h1>
        <p style={{ color: '#38a169', fontWeight: 700, fontSize: '1.05rem', margin: '0 0 6px' }}>
          Thank you! Processing your document...
        </p>

        <div style={{ margin: '15px 0' }}>
          {downloadDone ? (
            <div style={{ color: '#2f855a', background: '#f0fff4', padding: '10px', borderRadius: '8px', fontSize: '0.9rem' }}>
              ✅ Your certificate has been downloaded.
            </div>
          ) : downloading ? (
            <div style={{ color: '#2b6cb0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem' }}>
              <div className="spinner-mini" style={styles.spinnerMini}></div>
              Generating PDF certificate...
            </div>
          ) : (
            <p style={styles.subText}>Preparing your download...</p>
          )}
        </div>

        {paymentInfo && (
          <div style={styles.detailBox}>
            <h4 style={styles.detailTitle}>Transaction Summary</h4>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Reference</span>
              <span style={{ ...styles.detailValue, fontFamily: 'monospace', fontSize: '0.75rem' }}>{tx_ref}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Payment For</span>
              <span style={styles.detailValue}>{isVE ? 'Vital Event Certificate' : 'Resident ID Card'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Amount Paid</span>
              <span style={styles.detailValue}>{paymentInfo.amount || paymentInfo.paymentAmount || '100'} ETB</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Date</span>
              <span style={styles.detailValue}>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        )}

        <div style={styles.btnRow}>
          <button
            style={{
              ...styles.btn,
              background: downloading ? '#a0aec0' : '#2b6cb0',
              cursor: downloading ? 'not-allowed' : 'pointer'
            }}
            onClick={() => downloadCertificate(tx_ref)}
            disabled={downloading}
          >
            {downloading ? 'Please Wait...' : '📥 Download Certificate Again'}
          </button>

          <button
            style={{ ...styles.btn, background: '#38a169' }}
            onClick={() => navigate('/citizen')}
          >
            Go to My Dashboard
          </button>
        </div>

        <p style={{ color: '#a0aec0', fontSize: '0.75rem', marginTop: '20px' }}>
          Redirecting automatically in <strong>{countdown}s</strong>...
        </p>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════ STYLES ══ */

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f0f4f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif"
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
  },
  iconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#f0fff4',
    border: '2px solid #c6f6d5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 10px'
  },
  heading: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#2d3748',
    margin: '10px 0'
  },
  subText: {
    color: '#718096',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    margin: '0 0 15px'
  },
  detailBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '15px',
    textAlign: 'left',
    marginBottom: '20px'
  },
  detailTitle: {
    margin: '0 0 10px',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#a0aec0',
    fontWeight: 700
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: '1px solid #edf2f7'
  },
  detailLabel: {
    color: '#718096',
    fontSize: '0.8rem'
  },
  detailValue: {
    color: '#2d3748',
    fontSize: '0.8rem',
    fontWeight: 600
  },
  btnRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  btn: {
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  spinnerWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '15px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3182ce',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  spinnerMini: {
    width: '16px',
    height: '16px',
    border: '2px solid #e2e8f0',
    borderTop: '2px solid #2b6cb0',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

const spinnerCss = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;

export default PaymentSuccess;