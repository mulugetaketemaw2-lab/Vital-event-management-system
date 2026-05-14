import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import LocationSelector from '../Common/LocationSelector';
import { useTranslation } from 'react-i18next';
import { transliterate } from '../../utils/geezUtil';
import './BirthForm.css';

// Constants
const ID_LENGTH = 16;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_DOCUMENT_TYPES = ['application/pdf'];

const MarriageForm = ({ onSubmit, loading }) => {
  const { API_URL, currentUser } = useAuth();
  const { t } = useTranslation();

  // Form data state
  const [formData, setFormData] = useState({
    location: {
      region: currentUser?.location?.region || '',
      zone: currentUser?.location?.zone || '',
      woreda: currentUser?.location?.woreda || '',
      kebele: currentUser?.location?.kebele || ''
    },
    eventDate: '',
    husbandName: '',
    husbandNationalId: '',
    wifeName: '',
    wifeNationalId: '',
    husbandAge: '',
    wifeAge: '',
    marriageType: 'civil',
    witness1: '',
    witness2: '',
    husbandReligion: '',
    wifeReligion: ''
  });

  // File state
  const [files, setFiles] = useState({
    husbandPhoto: null,
    wifePhoto: null,
    idCard: null
  });

  // UI state
  const [isHusbandVerified, setIsHusbandVerified] = useState(false);
  const [phoneticMode, setPhoneticMode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [husbandPhotoPreview, setHusbandPhotoPreview] = useState(null);
  const [wifePhotoPreview, setWifePhotoPreview] = useState(null);
  const [activeCamera, setActiveCamera] = useState(null); // 'husband', 'wife'
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // File input refs
  const husbandPhotoInputRef = useRef(null);
  const wifePhotoInputRef = useRef(null);
  const idCardInputRef = useRef(null);

  // Input validation helpers
  const validateInput = (name, value) => {
    if (name.includes('Name') || name.includes('Occupation') || name.includes('Nationality') || name.includes('place') || name.includes('witness')) {
      // Allow letters (Eng/Amh) and spaces
      let filtered = value.replace(/[^a-zA-Z\s\u1200-\u137F]/g, '');

      // Phonetic Transliteration
      if (phoneticMode) {
        filtered = transliterate(filtered);
      }
      return filtered;
    }
    if (name.includes('NationalId') || name === 'nationalId') {
      return value.replace(/\D/g, '').slice(0, ID_LENGTH);
    }
    return value;
  };

  // File validation helpers
  const validateFile = (file, fileType) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 5MB');
      return false;
    }

    if (fileType === 'idCard' && !ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
      toast.error('ID Card must be a PDF');
      return false;
    }

    if (fileType.includes('Photo') && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Profile photo must be an image');
      return false;
    }

    return true;
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    const filteredValue = validateInput(name, value);

    setFormData(prev => ({
      ...prev,
      [name]: filteredValue
    }));
  };

  const handleLocationChange = (locationData) => {
    setFormData(prev => ({
      ...prev,
      location: locationData
    }));
  };

  const startCamera = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { aspectRatio: 3/4, facingMode: 'user' } 
      });
      setActiveCamera(type);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      }, 100);
    } catch (err) {
      toast.error(t('camera_access_denied') || "Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setActiveCamera(null);
  };

  const capturePhoto = (type) => {
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
      const file = new File([blob], `captured-${type}.jpg`, { type: 'image/jpeg' });
      setFiles(prev => ({ ...prev, [`${type}Photo`]: file }));
      if (type === 'husband') setHusbandPhotoPreview(dataUrl);
      else if (type === 'wife') setWifePhotoPreview(dataUrl);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  // Handle file uploads with validation
  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    if (!fileList || !fileList[0]) return;

    const file = fileList[0];

    // Validate file
    if (!validateFile(file, name)) {
      return;
    }

    // Set preview for photos
    if (name === 'husbandPhoto') {
      setHusbandPhotoPreview(URL.createObjectURL(file));
    } else if (name === 'wifePhoto') {
      setWifePhotoPreview(URL.createObjectURL(file));
    }

    // Update file state
    setFiles(prev => ({ ...prev, [name]: file }));
  };

  // API call to verify National ID against birth registration
  const verifyId = async (idNumber) => {
    try {
      const response = await axios.get(`${API_URL}/events/verify-national-id/${idNumber}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`National ID ${idNumber} does not match any birth registration record. Marriage registration blocked.`);
      }
      throw new Error('Error verifying National ID against birth registration');
    }
  };

  // Form validation helpers with strict birth registration matching
  const validateForm = () => {
    // Location validation
    if (!formData.location.region || !formData.location.kebele) {
      toast.error('Please select registration location');
      return false;
    }

    // STRICT National ID validation - must be exactly 16 digits
    if (formData.husbandNationalId.length !== ID_LENGTH) {
      toast.error(`Husband's National ID must be exactly ${ID_LENGTH} digits`);
      return false;
    }

    if (formData.wifeNationalId.length !== ID_LENGTH) {
      toast.error(`Wife's National ID must be exactly ${ID_LENGTH} digits`);
      return false;
    }

    // Additional validation: National IDs must be different
    if (formData.husbandNationalId === formData.wifeNationalId) {
      toast.error('Husband and Wife National IDs must be different');
      return false;
    }

    // Required files validation
    if (!files.husbandPhoto || !files.wifePhoto) {
      toast.error('Both husband and wife profile photos are mandatory');
      return false;
    }

    if (!files.idCard) {
      toast.error('Proof of ID (PDF) is mandatory');
      return false;
    }

    return true;
  };

  // Prepare form data for submission
  const prepareFormData = () => {
    const formDataObj = new FormData();

    // Add form fields
    Object.keys(formData).forEach(key => {
      if (key === 'location') {
        formDataObj.append('location', JSON.stringify(formData.location));
      } else {
        formDataObj.append(key, formData[key]);
      }
    });

    // Add files
    formDataObj.append('husbandPhoto', files.husbandPhoto);
    formDataObj.append('wifePhoto', files.wifePhoto);
    formDataObj.append('idCard', files.idCard);
    formDataObj.append('type', 'marriage');

    return formDataObj;
  };

  // Handle form submission with strict birth registration validation
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      setVerifying(true);
      setIsSubmitting(true);

      // STRICT VALIDATION: Verify both spouse National IDs against birth registration
      toast.info('Verifying National IDs against birth registration records...');

      const [husbandVerification, wifeVerification] = await Promise.all([
        verifyId(formData.husbandNationalId),
        verifyId(formData.wifeNationalId)
      ]);

      // Show verification success
      toast.success('✅ Both National IDs verified against birth registration records');

      // Prepare and submit form data
      const formDataObj = prepareFormData();

      const response = await axios.post(`${API_URL}/events`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('🎉 Marriage registration submitted successfully! Awaiting administrative review.');
      onSubmit(response.data.data.vitalEvent);

    } catch (error) {
      console.error('Marriage registration submission error:', error);

      // Enhanced error messages for strict validation failures
      if (error.response?.status === 404) {
        toast.error(`❌ ${error.response.data.message || 'National ID verification failed. Marriage registration blocked.'}`);
      } else if (error.response?.status === 403) {
        toast.error(`🚫 ${error.response.data.message || 'Access denied. Only spouses can register their marriage.'}`);
      } else if (error.response?.status === 400) {
        toast.error(`⚠️ ${error.response.data.message || 'Invalid National ID format. Must be exactly 16 digits.'}`);
      } else {
        toast.error(`❌ ${error.message || 'Error submitting marriage registration'}`);
      }
    } finally {
      setVerifying(false);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="event-details-form marriage-form">
      <h3>{t('marriage_registration')}</h3>

      {/* Phonetic Mode Toggle */}
      <div className="phonetic-toggle-container" style={{
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#ebf8ff',
        borderRadius: '8px',
        border: '1px solid #90cdf4',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
          <input
            type="checkbox"
            checked={phoneticMode}
            onChange={(e) => setPhoneticMode(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span className="slider round" style={{
            position: 'absolute',
            cursor: 'pointer',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: phoneticMode ? '#3182ce' : '#cbd5e0',
            transition: '.44s',
            borderRadius: '20px'
          }}>
            <span style={{
              position: 'absolute',
              height: '16px', width: '16px',
              left: phoneticMode ? '22px' : '2px',
              bottom: '2px',
              backgroundColor: 'white',
              transition: '.44s',
              borderRadius: '50%'
            }}></span>
          </span>
        </label>
        <div>
          <strong style={{ display: 'block', fontSize: '14px', color: '#2c5282' }}>{t('phonetic_typing')}</strong>
          <small style={{ color: '#4a5568', fontSize: '12px' }}>{t('phonetic_typing_desc')}</small>
        </div>
      </div>

      {/* IMPORTANT VALIDATION NOTICE */}
      <div className="validation-notice" style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        color: '#856404'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>⚠️ {t('validation_requirement_title')}</h4>
        <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.4' }}>
          <strong>{t('validation_requirement_text')}</strong><br />
          Marriage registration will be <strong>blocked</strong> if the National IDs do not match birth registration records.
        </p>
      </div>

      <div className="form-section location-section" style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
        <h4 style={{ color: '#2c5282' }}>📍 {t('registration_location')}</h4>
        <LocationSelector 
          key={currentUser?.location ? 'loaded-' + (currentUser.location.region || '') : 'unloaded'}
          onLocationChange={handleLocationChange} 
          initialLocation={currentUser?.location}
        />
      </div>

      <div className="form-section documents-section" style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
        <h4 style={{ color: '#2c5282' }}>📄 {t('required_documents')}</h4>

        <div className="form-group">
          <label>{t('supporting_id_doc')} *</label>
          <input
            type="file"
            name="idCard"
            ref={idCardInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            required
            style={{ display: 'none' }}
          />
          <button type="button" className="upload-btn" onClick={() => idCardInputRef.current.click()} style={{ width: '100%', padding: '10px', backgroundColor: '#4a5568', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            📋 {t('upload_id_proof')} (PDF)
          </button>
          {files.idCard && <div className="file-selected" style={{ marginTop: '5px', color: '#2f855a' }}>✅ {files.idCard.name}</div>}
        </div>
      </div>

      <div className="form-section" style={{ marginBottom: '20px' }}>
        <div className="form-group">
          <label>Marriage Date: *</label>
          <input
            type="date"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            required
            max={new Date().toISOString().split('T')[0]}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
      </div>

      <div className="form-section" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', marginBottom: '20px', backgroundColor: '#f7fafc' }}>
        <div className="form-section-divider" style={{ margin: '0 0 15px 0', borderLeft: '4px solid #3182ce', paddingLeft: '10px', fontWeight: 'bold', color: '#2c5282' }}>🤵 {t('husband_info')}</div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div className="form-group">
            <label>{t('husband_name')}: *</label>
            <input type="text" name="husbandName" value={formData.husbandName} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>{t('husband_national_id')} (16 Digits): *</label>
              <span style={{ fontSize: '0.75rem', color: formData.husbandNationalId.length === 16 ? '#e53e3e' : '#666' }}>
                {formData.husbandNationalId.length}/16
              </span>
            </div>
            <small style={{ display: 'block', color: '#e53e3e', marginBottom: '5px', fontSize: '12px' }}>
              ⚠️ {t('match_birth_record') || 'Must exactly match birth registration record'}
            </small>
            <input
              type="text"
              name="husbandNationalId"
              value={formData.husbandNationalId}
              onChange={handleChange}
              required
              minLength="16"
              maxLength="16"
              placeholder="Enter 16-digit National ID from birth registration"
              style={{ width: '100%', padding: '8px', border: '1px solid #e53e3e' }}
            />
          </div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>{t('husband_age')}: *</label>
            <input type="number" name="husbandAge" value={formData.husbandAge} onChange={handleChange} required min="18" style={{ width: '100%', padding: '8px' }} />
          </div>
          <div className="form-group">
            <label>{t('husband_religion') || 'Husband Religion'}: *</label>
            <select
              name="husbandReligion"
              value={formData.husbandReligion}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px' }}
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
        </div>
        <div className="form-group" style={{ marginTop: '15px' }}>
          <div className="form-group">
            <label>{t('husband_photo')} (Mandatory) *</label>

            {/* Husband Photo Preview */}
            <div className="photo-preview-container-3x4">
              {activeCamera === 'husband' ? (
                <div className="webcam-container">
                  <video ref={videoRef} autoPlay playsInline className="webcam-video" />
                  <button type="button" className="capture-trigger" onClick={() => capturePhoto('husband')} title="Capture" />
                  <button type="button" className="close-camera" onClick={stopCamera}>&times;</button>
                </div>
              ) : husbandPhotoPreview ? (
                <img src={husbandPhotoPreview} alt="Husband Preview" className="photo-preview-3x4" />
              ) : (
                <div className="photo-placeholder-3x4">
                  <span role="img" aria-label="husband">🤵</span>
                  <p>{t('required_3x4_format') || '3x4 Format'}</p>
                </div>
              )}
              
              {activeCamera !== 'husband' && (
                <div className="photo-controls-overlay">
                  <div className="overlay-btn-upload" onClick={() => husbandPhotoInputRef.current.click()}>
                    📷 {t('upload_photo') || 'Upload Photo'}
                  </div>
                  <div className="overlay-btn-camera" onClick={() => startCamera('husband')}>
                    📹 {t('use_camera') || 'Use Camera'}
                  </div>
                </div>
              )}
            </div>

            {/* Redundant camera buttons removed */}

            <input type="file" name="husbandPhoto" ref={husbandPhotoInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            {files.husbandPhoto && <div className="file-info-badge">✅ {t('selected') || 'Selected'}</div>}
          </div>
        </div>
      </div>

      <div className="form-section" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', marginBottom: '20px', backgroundColor: '#fff5f5' }}>
        <div className="form-section-divider" style={{ margin: '0 0 15px 0', borderLeft: '4px solid #e53e3e', paddingLeft: '10px', fontWeight: 'bold', color: '#e53e3e' }}>👰 {t('wife_info')}</div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div className="form-group">
            <label>{t('wife_name')}: *</label>
            <input type="text" name="wifeName" value={formData.wifeName} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>{t('wife_national_id')} (16 Digits): *</label>
              <span style={{ fontSize: '0.75rem', color: formData.wifeNationalId.length === 16 ? '#e53e3e' : '#666' }}>
                {formData.wifeNationalId.length}/16
              </span>
            </div>
            <small style={{ display: 'block', color: '#e53e3e', marginBottom: '5px', fontSize: '12px' }}>
              ⚠️ Must exactly match birth registration record
            </small>
            <input
              type="text"
              name="wifeNationalId"
              value={formData.wifeNationalId}
              onChange={handleChange}
              required
              minLength="16"
              maxLength="16"
              placeholder="Enter 16-digit National ID from birth registration"
              style={{ width: '100%', padding: '8px', border: '1px solid #e53e3e' }}
            />
          </div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>{t('wife_age')}: *</label>
            <input type="number" name="wifeAge" value={formData.wifeAge} onChange={handleChange} required min="18" style={{ width: '100%', padding: '8px' }} />
          </div>
          <div className="form-group">
            <label>{t('wife_religion') || 'Wife Religion'}: *</label>
            <select
              name="wifeReligion"
              value={formData.wifeReligion}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px' }}
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
        </div>
        <div className="form-group" style={{ marginTop: '15px' }}>
          <div className="form-group">
            <label>{t('wife_photo')} (Mandatory) *</label>

            {/* Wife Photo Preview */}
            <div className="photo-preview-container-3x4">
              {activeCamera === 'wife' ? (
                <div className="webcam-container">
                  <video ref={videoRef} autoPlay playsInline className="webcam-video" />
                  <button type="button" className="capture-trigger" onClick={() => capturePhoto('wife')} title="Capture" />
                  <button type="button" className="close-camera" onClick={stopCamera}>&times;</button>
                </div>
              ) : wifePhotoPreview ? (
                <img src={wifePhotoPreview} alt="Wife Preview" className="photo-preview-3x4" />
              ) : (
                <div className="photo-placeholder-3x4">
                  <span role="img" aria-label="wife">👰</span>
                  <p>{t('required_3x4_format') || '3x4 Format'}</p>
                </div>
              )}
              
              {activeCamera !== 'wife' && (
                <div className="photo-controls-overlay">
                  <div className="overlay-btn-upload" onClick={() => wifePhotoInputRef.current.click()}>
                    📷 {t('upload_photo') || 'Upload Photo'}
                  </div>
                  <div className="overlay-btn-camera" onClick={() => startCamera('wife')}>
                    📹 {t('use_camera') || 'Use Camera'}
                  </div>
                </div>
              )}
            </div>

            {/* Redundant camera buttons removed */}

            <input type="file" name="wifePhoto" ref={wifePhotoInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            {files.wifePhoto && <div className="file-info-badge">✅ {t('selected') || 'Selected'}</div>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label>{t('marriage_type')}: *</label>
          <select name="marriageType" value={formData.marriageType} onChange={handleChange} required style={{ width: '100%', padding: '8px' }}>
            <option value="civil">{t('civil')}</option>
            <option value="religious">{t('religious')}</option>
            <option value="traditional">{t('traditional')}</option>
          </select>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>{t('witness1_name')}: *</label>
            <input type="text" name="witness1" value={formData.witness1} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div className="form-group">
            <label>{t('witness2_name')}: *</label>
            <input type="text" name="witness2" value={formData.witness2} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>
        </div>
      </div>

      <button type="submit" disabled={isSubmitting || loading || verifying} className="submit-btn" style={{
        width: '100%',
        height: '50px',
        fontSize: '1.2rem',
        marginTop: '30px',
        backgroundColor: (isSubmitting || loading || verifying) ? '#cbd5e0' : '#2d3748',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
      }}>
        {verifying ? t('verifying_ids') : isSubmitting || loading ? t('registering') : t('register_marriage')}
      </button>
    </form>
  );
};

export default MarriageForm;
