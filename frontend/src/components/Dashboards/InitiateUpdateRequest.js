import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './Dashboard.css';

const InitiateUpdateRequest = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const API_URL_FIXED = 'http://localhost:5000/api';

    const [formData, setFormData] = useState({
        personalInfo: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dateOfBirth: '',
            gender: '',
            maritalStatus: '',
            occupation: '',
            educationLevel: '',
            idNumber: '',
        },
        location: {
            region: '',
            zone: '',
            woreda: '',
            kebele: '',
            regionName: '',
            zoneName: '',
            woredaName: '',
            kebeleName: ''
        }
    });

    const [justification, setJustification] = useState('');
    const [loading, setLoading] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [idCardPhoto, setIdCardPhoto] = useState(null);
    const [otherDocs, setOtherDocs] = useState([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (currentUser) {
            const pInfo = currentUser.personalInfo || {};
            const loc = currentUser.location || {};

            setFormData({
                personalInfo: {
                    firstName: pInfo.firstName || '',
                    lastName: pInfo.lastName || '',
                    email: pInfo.email || '',
                    phone: pInfo.phone || '',
                    dateOfBirth: pInfo.dateOfBirth ? pInfo.dateOfBirth.split('T')[0] : '',
                    gender: pInfo.gender || '',
                    maritalStatus: pInfo.maritalStatus || '',
                    occupation: pInfo.occupation || '',
                    educationLevel: pInfo.educationLevel || '',
                    idNumber: pInfo.idNumber || '',
                },
                location: {
                    region: loc.region || '',
                    zone: loc.zone || '',
                    woreda: loc.woreda || '',
                    kebele: loc.kebele || '',
                    regionName: loc.regionName || '',
                    zoneName: loc.zoneName || '',
                    woredaName: loc.woredaName || '',
                    kebeleName: loc.kebeleName || ''
                }
            });

            if (pInfo.photo?.url) {
                setPhotoPreview(`http://localhost:5000${pInfo.photo.url}`);
            }
        }
    }, [currentUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let filteredValue = value;

        // Strict validation logic
        if (name.includes('firstName') || name.includes('lastName') || name.includes('occupation')) {
            // Allow only letters and spaces for personal info
            filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
        } else if (name.includes('Name')) {
            // Allow letters, numbers and spaces (e.g., location names)
            filteredValue = value.replace(/[^a-zA-Z0-9\s]/g, '');
        } else if (name.includes('phone') || name.includes('idNumber')) {
            // Allow only digits
            filteredValue = value.replace(/\D/g, '');
        }

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: filteredValue }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: filteredValue }));
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { aspectRatio: 3/4, facingMode: 'user' } 
            });
            setIsCameraOpen(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                }
            }, 100);
        } catch (err) {
            toast.error("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        const aspectRatio = 3/4;
        
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = videoWidth;
        let sourceHeight = videoHeight;
        
        if (videoWidth / videoHeight > aspectRatio) {
            sourceWidth = videoHeight * aspectRatio;
            sourceX = (videoWidth - sourceWidth) / 2;
        } else {
            sourceHeight = videoWidth / aspectRatio;
            sourceY = (videoHeight - sourceHeight) / 2;
        }
        
        ctx.drawImage(videoRef.current, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        canvas.toBlob((blob) => {
            const file = new File([blob], 'profile-update.jpg', { type: 'image/jpeg' });
            setProfilePhoto(file);
            setPhotoPreview(dataUrl);
            stopCamera();
        }, 'image/jpeg', 0.9);
    };

    const handleFileChange = (e, setter) => {
        const file = e.target.files[0];
        if (!file) return;
        setter(file);
        if (setter === setProfilePhoto) {
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!justification) {
            toast.error('Justification is mandatory');
            return;
        }

        setLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('personalInfo', JSON.stringify(formData.personalInfo));
            formDataToSend.append('location', JSON.stringify(formData.location));
            formDataToSend.append('justification', justification);

            if (profilePhoto) formDataToSend.append('profilePhoto', profilePhoto);
            if (idCardPhoto) formDataToSend.append('idCard', idCardPhoto);
            otherDocs.forEach(doc => formDataToSend.append('documents', doc));

            const token = localStorage.getItem('token');
            await axios.post(`${API_URL_FIXED}/auth/initiate-update`, formDataToSend, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success('Update request submitted successfully!');
            navigate('/dashboard/profile');
        } catch (error) {
            console.error('Update request error:', error);
            toast.error(error.response?.data?.message || 'Failed to submit update');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="citizen-profile" style={{ maxWidth: '800px' }}>
            <div className="profile-header">
                <h3>🔄 Request Profile Update</h3>
                <p>Modify your registration details and submit for approval.</p>
            </div>

            {currentUser?.identityLinkage?.is_temporary_id && (
                <div className="maturity-notice-banner" style={{
                    backgroundColor: '#fff5f5',
                    border: '1px solid #feb2b2',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    <h4 style={{ color: '#c53030', marginTop: 0, fontSize: '1.1rem' }}>🆔 Identity Maturity Update</h4>
                    <p style={{ color: '#742a2a', marginBottom: 0, fontSize: '0.95rem' }}>
                        You are resolving your <strong>Parental Reference ID</strong>. Please enter your new unique <strong>16-digit National ID</strong> in the "ID Number" field below and upload your official ID card for verification.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="profile-content">
                <div className="profile-section">
                    <h4>📝 Reason for Update</h4>
                    <textarea
                        className="justification-box"
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        placeholder="Please explain why you need to update your profile..."
                        required
                        style={{ width: '100%', minHeight: '100px', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    />
                </div>

                <div className="profile-section">
                    <h4>👤 Personal Information</h4>
                    <div className="info-grid">
                        <div className="info-item">
                            <label>First Name</label>
                            <input name="personalInfo.firstName" value={formData.personalInfo.firstName} onChange={handleChange} />
                        </div>
                        <div className="info-item">
                            <label>Last Name</label>
                            <input name="personalInfo.lastName" value={formData.personalInfo.lastName} onChange={handleChange} />
                        </div>
                        <div className="info-item">
                            <label>Email</label>
                            <input name="personalInfo.email" value={formData.personalInfo.email} onChange={handleChange} />
                        </div>
                        <div className="info-item">
                            <label>Phone</label>
                            <input name="personalInfo.phone" value={formData.personalInfo.phone} onChange={handleChange} />
                        </div>
                        <div className="info-item">
                            <label>Date of Birth</label>
                            <input type="date" name="personalInfo.dateOfBirth" value={formData.personalInfo.dateOfBirth} onChange={handleChange} />
                        </div>
                        <div className="info-item">
                            <label>Gender</label>
                            <select name="personalInfo.gender" value={formData.personalInfo.gender} onChange={handleChange}>
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="info-item">
                            <label>Marital Status</label>
                            <select name="personalInfo.maritalStatus" value={formData.personalInfo.maritalStatus} onChange={handleChange}>
                                <option value="">Select Status</option>
                                <option value="single">Single</option>
                                <option value="married">Married</option>
                                <option value="divorced">Divorced</option>
                                <option value="widowed">Widowed</option>
                            </select>
                        </div>
                        <div className="info-item">
                            <label>Occupation</label>
                            <input name="personalInfo.occupation" value={formData.personalInfo.occupation} onChange={handleChange} />
                        </div>
                        <div className="info-item">
                            <label>Education Level</label>
                            <select name="personalInfo.educationLevel" value={formData.personalInfo.educationLevel} onChange={handleChange}>
                                <option value="">Select Level</option>
                                <option value="none">None</option>
                                <option value="primary">Primary</option>
                                <option value="secondary">Secondary</option>
                                <option value="diploma">Diploma</option>
                                <option value="bachelor">Bachelor</option>
                                <option value="masters">Masters</option>
                                <option value="phd">PhD</option>
                            </select>
                        </div>
                        <div className="info-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label>
                                    ID Number 
                                    {!currentUser?.identityLinkage?.is_temporary_id && (
                                        <span 
                                            title="National ID cannot be changed. Please contact the National office for corrections." 
                                            style={{ cursor: 'help', marginLeft: '5px', color: '#3b82f6' }}
                                        >
                                            ℹ️
                                        </span>
                                    )}
                                </label>
                                <span style={{ fontSize: '0.75rem', color: formData.personalInfo.idNumber.length === 16 ? '#ef4444' : '#6b7280' }}>
                                    {formData.personalInfo.idNumber.length}/16
                                </span>
                            </div>
                            <input 
                                name="personalInfo.idNumber" 
                                value={formData.personalInfo.idNumber} 
                                onChange={handleChange} 
                                maxLength="16"
                                readOnly={!currentUser?.identityLinkage?.is_temporary_id}
                                style={!currentUser?.identityLinkage?.is_temporary_id ? { 
                                    backgroundColor: '#f3f4f6', 
                                    cursor: 'not-allowed', 
                                    color: '#6b7280',
                                    border: '1px solid #d1d5db'
                                } : {}}
                                title={!currentUser?.identityLinkage?.is_temporary_id ? "National ID cannot be changed. Please contact the National office for corrections." : "Please enter your new 16-digit National ID"}
                            />
                        </div>
                    </div>
                </div>

                <div className="profile-section">
                    <h4>📍 Location Information</h4>
                    <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '15px' }}>
                        ⚠️ Your registration will be sent to the Kebele you select below
                    </p>
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Region</label>
                            <input name="location.regionName" value={formData.location.regionName} onChange={handleChange} />
                        </div>
                        <div className="info-item">
                            <label>Zone</label>
                            <input name="location.zoneName" value={formData.location.zoneName} onChange={handleChange} />
                        </div>
                        <div className="info-item">
                            <label>Woreda</label>
                            <input name="location.woredaName" value={formData.location.woredaName} onChange={handleChange} />
                        </div>
                        <div className="info-item">
                            <label>Kebele</label>
                            <input name="location.kebeleName" value={formData.location.kebeleName} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="profile-section">
                    <h4>📄 Documents Update</h4>
                    <div className="info-grid">
                        <div className="info-item" style={{ minWidth: '200px' }}>
                            <label>Profile Photo Update</label>
                            <div className="profile-photo-upload" style={{ margin: '0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className="photo-preview-container" style={{ width: '180px', height: '240px', position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '2px solid #ddd' }}>
                                    {isCameraOpen ? (
                                        <div className="webcam-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000' }}>
                                            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button type="button" onClick={capturePhoto} style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '5px solid rgba(0,0,0,0.2)', cursor: 'pointer' }} />
                                            <button type="button" onClick={stopCamera} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '25px', height: '25px', cursor: 'pointer' }}>&times;</button>
                                        </div>
                                    ) : photoPreview ? (
                                        <img src={photoPreview} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f8fafc', color: '#94a3b8' }}>
                                            <span style={{ fontSize: '3rem' }}>👤</span>
                                            <p style={{ fontSize: '0.8rem' }}>3x4 format required</p>
                                        </div>
                                    )}
                                    
                                    {!isCameraOpen && (
                                        <div className="photo-controls-overlay">
                                            <div className="overlay-btn-upload" onClick={() => fileInputRef.current.click()}>
                                                📷 {t('upload_photo') || 'Upload Photo'}
                                            </div>
                                            <div className="overlay-btn-camera" onClick={startCamera}>
                                                📹 {t('use_camera') || 'Use Camera'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Redundant camera buttons removed */}
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={(e) => handleFileChange(e, setProfilePhoto)} 
                                accept="image/*" 
                                style={{ display: 'none' }}
                            />
                        </div>
                        <div className="info-item">
                            <label>New ID Card (PDF/Image)</label>
                            <input type="file" onChange={(e) => handleFileChange(e, setIdCardPhoto)} accept="image/*,application/pdf" />
                        </div>
                    </div>
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="update-request-btn" disabled={loading}>
                        {loading ? 'Submitting...' : '🚀 Submit Update Request'}
                    </button>
                    <button type="button" className="cancel-btn" onClick={() => navigate('/dashboard/profile')}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InitiateUpdateRequest;
