import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { useTranslation } from 'react-i18next';


const EditCitizenRegistration = ({ onCancel, onSuccess }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { currentUser, API_URL } = useAuth();

    // Temporary fix: Define API_URL directly
    const API_URL_FIXED = 'http://localhost:5000/api';

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        personalInfo: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dateOfBirth: '',
            gender: '',
            maritalStatus: '',
            religion: '',
            occupation: '',
            educationLevel: '',
            idNumber: '',
        },
        location: {
            region: '',
            regionName: '',
            zone: '',
            zoneName: '',
            woreda: '',
            woredaName: '',
            kebele: '',
            kebeleName: ''
        }
    });

    const [familyMembers, setFamilyMembers] = useState([]);
    const [familyMember, setFamilyMember] = useState({
        name: '',
        relationship: '',
        idNumber: '',
        idType: ''
    });

    const [loading, setLoading] = useState(false);

    const [profilePhoto, setProfilePhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [idCardPhoto, setIdCardPhoto] = useState(null);
    const [otherDocs, setOtherDocs] = useState([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const fileInputRef = useRef(null);

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
            const file = new File([blob], 'captured-profile.jpg', { type: 'image/jpeg' });
            setProfilePhoto(file);
            setPhotoPreview(dataUrl);
            stopCamera();
        }, 'image/jpeg', 0.9);
    };

    useEffect(() => {
        if (currentUser) {
            // Pre-fill form data
            const pInfo = currentUser.personalInfo || {};
            const loc = currentUser.location || {};

            setFormData({
                username: currentUser.username || '',
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
                    regionName: loc.regionName || '',
                    zone: loc.zone || '',
                    zoneName: loc.zoneName || '',
                    woreda: loc.woreda || '',
                    woredaName: loc.woredaName || '',
                    kebele: loc.kebele || '',
                    kebeleName: loc.kebeleName || ''
                }
            });

            if (currentUser.familyMembers) {
                setFamilyMembers(currentUser.familyMembers);
            }

            if (pInfo.photo?.url) {
                setPhotoPreview(`http://localhost:5000${pInfo.photo.url}`);
            }
        }
    }, [currentUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleFamilyMemberChange = (e) => {
        const { name, value } = e.target;
        setFamilyMember(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProfilePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        setProfilePhoto(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleIdCardUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIdCardPhoto(file);
        toast.success(t('new_id_card_selected'));
    };

    const handleOtherDocsUpload = (e) => {
        const files = Array.from(e.target.files);
        setOtherDocs(prev => [...prev, ...files]);
        toast.success(`${files.length} ${t('documents_added')}`);
    };

    const addFamilyMember = () => {
        if (!familyMember.name || !familyMember.relationship) {
            toast.error('Name and relationship are required');
            return;
        }
        setFamilyMembers(prev => [...prev, { ...familyMember }]);
        setFamilyMember({
            name: '',
            relationship: '',
            idNumber: '',
            idType: ''
        });
    };

    const removeFamilyMember = (index) => {
        setFamilyMembers(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formDataToSend = new FormData();

            // Personal Info
            Object.keys(formData.personalInfo).forEach(key => {
                if (formData.personalInfo[key]) {
                    formDataToSend.append(`personalInfo.${key}`, formData.personalInfo[key]);
                }
            });

            // Location
            formDataToSend.append('location', JSON.stringify(formData.location));

            // Family Members
            formDataToSend.append('familyMembers', JSON.stringify(familyMembers));

            if (profilePhoto) {
                formDataToSend.append('profilePhoto', profilePhoto);
            }

            if (idCardPhoto) {
                formDataToSend.append('idCard', idCardPhoto);
            }

            otherDocs.forEach((doc) => {
                formDataToSend.append('documents', doc);
            });

            const token = localStorage.getItem('token');

            const response = await axios.put(
                `${API_URL_FIXED}/auth/resubmit-registration`,
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.data.status === 'success') {
                toast.success(t('registration_resubmitted_success'));
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            console.error('Resubmission error:', error);
            toast.error(error.response?.data?.message || 'Failed to resubmit');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card wide-registration-card">
                <div className="auth-header">
                    <h2>📝 {t('correct_registration')}</h2>
                    <p className="auth-subtitle">
                        <span style={{ color: '#e74c3c' }}>
                            {t('review_comments')}: {currentUser.verificationNotes || currentUser.reviewComments || t('please_update_info')}
                        </span>
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Personal Information */}
                    <div className="form-section">
                        <h4>👤 {t('personal_information')}</h4>

                        {/* Photo Upload */}
                        <div className="photo-upload-section">
                            <div className="photo-preview-container" style={{ width: '180px', height: '240px', margin: '0 auto 20px auto', position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '3px solid #e2e8f0' }}>
                                {isCameraOpen ? (
                                    <div className="webcam-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000' }}>
                                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button type="button" onClick={capturePhoto} style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '5px solid rgba(0,0,0,0.2)', cursor: 'pointer' }} />
                                        <button type="button" onClick={stopCamera} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '25px', height: '25px', cursor: 'pointer' }}>&times;</button>
                                    </div>
                                ) : photoPreview ? (
                                    <img src={photoPreview} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div className="photo-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f8fafc', color: '#94a3b8' }}>
                                        <span>{t('profile_photo')}</span>
                                    </div>
                                )}
                                
                                {!isCameraOpen && (
                                    <div className="photo-controls-overlay">
                                        <div className="overlay-btn-upload" onClick={() => fileInputRef.current?.click()}>
                                            📷 {t('upload_photo') || 'Upload Photo'}
                                        </div>
                                        <div className="overlay-btn-camera" onClick={startCamera}>
                                            📹 {t('use_camera') || 'Use Camera'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Redundant camera buttons removed */}

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleProfilePhotoUpload}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('first_name')}:</label>
                                <input
                                    type="text"
                                    name="personalInfo.firstName"
                                    value={formData.personalInfo.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('last_name')}:</label>
                                <input
                                    type="text"
                                    name="personalInfo.lastName"
                                    value={formData.personalInfo.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('date_of_birth')}:</label>
                                <input
                                    type="date"
                                    name="personalInfo.dateOfBirth"
                                    value={formData.personalInfo.dateOfBirth}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('gender')}:</label>
                                <select
                                    name="personalInfo.gender"
                                    value={formData.personalInfo.gender}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">{t('select_gender')}</option>
                                    <option value="male">{t('male')}</option>
                                    <option value="female">{t('female')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('religion') || 'Religion'}:</label>
                                <select
                                    name="personalInfo.religion"
                                    value={formData.personalInfo.religion}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">{t('select_religion') || 'Select Religion'}</option>
                                    <option value="orthodox">{t('orthodox') || 'Ethiopian Orthodox'}</option>
                                    <option value="muslim">{t('muslim') || 'Muslim'}</option>
                                    <option value="protestant">{t('protestant') || 'Protestant'}</option>
                                    <option value="catholic">{t('catholic') || 'Catholic'}</option>
                                    <option value="traditional">{t('traditional_religion') || 'Traditional'}</option>
                                    <option value="other">{t('other') || 'Other'}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t('marital_status')}:</label>
                                <select
                                    name="personalInfo.maritalStatus"
                                    value={formData.personalInfo.maritalStatus}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">{t('select_status')}</option>
                                    <option value="single">{t('single')}</option>
                                    <option value="married">{t('married')}</option>
                                    <option value="divorced">{t('divorced')}</option>
                                    <option value="widowed">{t('widowed')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('national_id_number')}:</label>
                                <input
                                    type="text"
                                    name="personalInfo.idNumber"
                                    value={formData.personalInfo.idNumber}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('phone')}:</label>
                                <input
                                    type="text"
                                    name="personalInfo.phone"
                                    value={formData.personalInfo.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('id_card_scan')}:</label>
                            <input type="file" onChange={handleIdCardUpload} />
                        </div>

                        <div className="form-group">
                            <label>{t('supporting_documents_replace')}:</label>
                            <input type="file" multiple onChange={handleOtherDocsUpload} />
                        </div>

                    </div>

                    <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? t('submitting_dots') : t('resubmit_registration')}
                        </button>
                        <button type="button" className="cancel-btn" onClick={onCancel} style={{ padding: '12px', background: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            {t('cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCitizenRegistration;
