import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MaturityWarningModal.css';

const MaturityWarningModal = ({ user, onClose }) => {
    const navigate = useNavigate();

    if (!user || !user.identityLinkage?.is_temporary_id) return null;

    return (
        <div className="maturity-modal-overlay">
            <div className="maturity-modal-content">
                <div className="maturity-modal-header">
                    <div className="warning-icon">⚠️</div>
                    <h2>Action Required: Identity Maturity</h2>
                </div>
                <div className="maturity-modal-body">
                    <p>
                        You are currently registered under a <strong>Parental Reference ID</strong>.
                        Our records indicate that you have reached or are approaching identity maturity (5 years).
                    </p>
                    <div className="impact-box">
                        <h4>System Restrictions:</h4>
                        <ul>
                            <li>Independent Vital Event registrations (Marriage, etc.) are <strong>BLOCKED</strong>.</li>
                            <li>Official certificates cannot be issued for independent services.</li>
                            <li>Failure to update will result in account termination after 6 years of registration.</li>
                        </ul>
                    </div>
                    <p className="cta-text">
                        Please provide your unique 16-digit National ID to resolve this reference linkage and upgrade to an <strong>Independent Citizen Account</strong>.
                    </p>
                </div>
                <div className="maturity-modal-footer">
                    <button className="secondary-btn" onClick={onClose}>Remind Me Later</button>
                    <button className="primary-btn" onClick={() => {
                        onClose();
                        navigate('/initiate-update');
                    }}>Update National ID Now</button>
                </div>
            </div>
        </div>
    );
};

export default MaturityWarningModal;
