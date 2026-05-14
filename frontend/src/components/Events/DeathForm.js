import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import LocationSelector from '../Common/LocationSelector';
import { useTranslation } from 'react-i18next';
import { transliterate } from '../../utils/geezUtil';
import './BirthForm.css'; // Reusing BirthForm CSS for consistency

const DeathForm = ({ onSubmit, loading }) => {
  const { t } = useTranslation();
  const { API_URL, currentUser } = useAuth();
  const [formData, setFormData] = useState({
    location: {
      region: currentUser?.location?.region || '',
      zone: currentUser?.location?.zone || '',
      woreda: currentUser?.location?.woreda || '',
      kebele: currentUser?.location?.kebele || ''
    },
    nationalId: '',
    eventDate: '',
    deceasedName: '',
    gender: '',
    age: '',
    causeOfDeath: '',
    placeOfDeath: '',
    informantName: '',
    informantRelationship: '',
    religion: ''
  });

  const [files, setFiles] = useState({
    idCard: null,
    deceasedPhoto: null
  });

  const [otherDocs, setOtherDocs] = useState([]);
  const [phoneticMode, setPhoneticMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deceasedPhotoPreview, setDeceasedPhotoPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Refs for file inputs
  const idCardInputRef = useRef(null);
  const deceasedPhotoInputRef = useRef(null);
  const otherDocsInputRef = useRef(null);

  // (useAuth was moved to the very top)

  const handleChange = (e) => {
    const { name, value } = e.target;
    let filteredValue = value;

    // Strict validation logic
    if (name.includes('Name') || name.includes('Relationship')) {
      // Allow letters (Eng/Amh) and spaces for personal names/relationships
      filteredValue = value.replace(/[^a-zA-Z\s\u1200-\u137F]/g, '');
    } else if (name.includes('cause') || name.includes('place')) {
      // Allow letters (Eng/Amh), numbers and spaces for causes and places
      filteredValue = value.replace(/[^a-zA-Z0-9\s\u1200-\u137F]/g, '');
    }

    // Phonetic Transliteration
    if (phoneticMode && (name.includes('Name') || name.includes('Relationship') || name.includes('cause') || name.includes('place'))) {
      filteredValue = transliterate(filteredValue);
    }

    if (name === 'age') {
      // Allow only digits
      filteredValue = value.replace(/\D/g, '');
    } else if (name === 'nationalId') {
      // Allow only digits and limit to 16
      filteredValue = value.replace(/\D/g, '').slice(0, 16);
    }

    setFormData({
      ...formData,
      [name]: filteredValue
    });
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
      toast.error(t('camera_access_denied') || "Could not access camera. Please check permissions.");
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
      const file = new File([blob], 'captured-deceased.jpg', { type: 'image/jpeg' });
      setFiles(prev => ({ ...prev, deceasedPhoto: file }));
      setDeceasedPhotoPreview(dataUrl);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleLocationChange = (locationData) => {
    setFormData(prev => ({
      ...prev,
      location: locationData
    }));
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;

    if (fileList && fileList[0]) {
      const file = fileList[0];

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
        e.target.value = '';
        return;
      }

      if (name === 'idCard') {
        if (file.type !== 'application/pdf') {
          toast.error(`File ${file.name} must be a PDF.`);
          e.target.value = '';
          return;
        }
      } else if (name === 'deceasedPhoto') {
        if (!file.type.startsWith('image/')) {
          toast.error(`File ${file.name} must be an image.`);
          e.target.value = '';
          return;
        }
      }

      if (name === 'deceasedPhoto') {
        setDeceasedPhotoPreview(URL.createObjectURL(file));
      }

      setFiles(prev => ({
        ...prev,
        [name]: file
      }));
    }
  };

  const handleOtherDocsUpload = (e) => {
    const newFiles = Array.from(e.target.files);

    const validFiles = newFiles.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return false;
      }
      if (file.type !== 'application/pdf') {
        toast.error(`${file.name} must be a PDF`);
        return false;
      }
      return true;
    });

    setOtherDocs(prev => [...prev, ...validFiles]);
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} document(s) uploaded`);
    }
    if (otherDocsInputRef.current) otherDocsInputRef.current.value = '';
  };

  const removeDocument = (index) => {
    setOtherDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required location
    if (!formData.location.region || !formData.location.kebele) {
      toast.error(t('select_complete_location') || 'Please select your complete location (Region to Kebele)');
      return;
    }

    // Validate required files
    if (!files.idCard) {
      toast.error('Please upload your ID Card (PDF)');
      return;
    }

    if (!files.deceasedPhoto) {
      toast.error('Please upload the Deceased Profile Picture');
      return;
    }

    setIsSubmitting(true);
    const formDataObj = new FormData();

    Object.keys(formData).forEach(key => {
      if (key === 'location') {
        formDataObj.append('location', JSON.stringify(formData.location));
      } else {
        formDataObj.append(key, formData[key]);
      }
    });

    formDataObj.append('idCard', files.idCard);
    formDataObj.append('deceasedPhoto', files.deceasedPhoto);

    otherDocs.forEach((doc) => {
      formDataObj.append('documents', doc);
    });

    formDataObj.append('type', 'death');

    try {
      const response = await axios.post(`${API_URL}/events`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        timeout: 60000
      });

      toast.success('Death registration submitted successfully!');
      if (onSubmit) onSubmit(response.data.data.vitalEvent);
    } catch (error) {
      console.error('❌ Registration error:', error);
      toast.error(error.response?.data?.message || 'Error submitting registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="event-details-form birth-form">
      <h3>{t('death_registration')}</h3>

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

      {/* 1. Location Information */}
      <div className="form-section location-section">
        <h4>📍 {t('location_info')}</h4>
        <p className="section-help">⚠️ {t('death_location_help')}</p>
        <LocationSelector 
          key={currentUser?.location ? 'loaded-' + (currentUser.location.region || '') : 'unloaded'}
          onLocationChange={handleLocationChange} 
          initialLocation={currentUser?.location}
        />
      </div>

      {/* 2. Document Uploads */}
      <div className="form-section documents-section">
        <h4>📄 {t('document_uploads')}</h4>

        <div className="form-group">
          <label>{t('id_card_required')} *</label>
          <div className="file-upload-wrapper">
            <input
              type="file"
              name="idCard"
              ref={idCardInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              required
              style={{ display: 'none' }}
              id="id-card-upload"
            />
            <button
              type="button"
              className="upload-btn"
              onClick={() => idCardInputRef.current.click()}
            >
              📋 {t('upload_id_card')} (PDF Only)
            </button>
            <small className="help-text">* ID Card PDF is required for registration</small>
            {files.idCard && <div className="file-selected">✅ {files.idCard.name}</div>}
          </div>
        </div>


        <div className="form-group">
          <label>{t('other_documents')}</label>
          <div className="file-upload-wrapper">
            <input
              type="file"
              multiple
              ref={otherDocsInputRef}
              onChange={handleOtherDocsUpload}
              accept="application/pdf"
              style={{ display: 'none' }}
              id="other-docs-upload"
            />
            <button
              type="button"
              className="upload-btn"
              onClick={() => otherDocsInputRef.current.click()}
            >
              📁 {t('upload_documents')} (PDF Only)
            </button>
            <small className="help-text">Upload any supporting documents (PDF only)</small>
          </div>
          {otherDocs.length > 0 && (
            <div className="selected-files-list">
              {otherDocs.map((doc, index) => (
                <div key={index} className="selected-file-item">
                  <span>📄 {doc.name}</span>
                  <button type="button" onClick={() => removeDocument(index)} className="remove-file-btn">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="form-section">
        <h4>⚰️ {t('deceased_info')}</h4>

        <div className="form-group" style={{ marginBottom: '25px', textAlign: 'center' }}>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: '12px', fontWeight: 'bold', color: '#2d3748' }}>{t('deceased_photo')} *</label>

          {/* Profile Photo Preview Area */}
          <div className="photo-preview-container-3x4">
            {isCameraOpen ? (
              <div className="webcam-container">
                <video ref={videoRef} autoPlay playsInline className="webcam-video" />
                <button type="button" className="capture-trigger" onClick={capturePhoto} title="Capture" />
                <button type="button" className="close-camera" onClick={stopCamera}>&times;</button>
              </div>
            ) : deceasedPhotoPreview ? (
              <img src={deceasedPhotoPreview} alt="Deceased Preview" className="photo-preview-3x4" />
            ) : (
              <div className="photo-placeholder-3x4">
                <span role="img" aria-label="deceased">⚱️</span>
                <p>{t('required_3x4_format') || '3x4 Format'}</p>
              </div>
            )}
            
            {!isCameraOpen && (
              <div className="photo-controls-overlay">
                <div className="overlay-btn-upload" onClick={() => deceasedPhotoInputRef.current.click()}>
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
            name="deceasedPhoto"
            ref={deceasedPhotoInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          {files.deceasedPhoto && (
            <div className="file-info-badge">✅ {t('selected') || 'Selected'}</div>
          )}
        </div>
        <div className="form-group" style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <label>{t('deceased_national_id')} (16 Digits): *</label>
            <span style={{ fontSize: '0.75rem', color: formData.nationalId.length === 16 ? '#e53e3e' : '#666' }}>
              {formData.nationalId.length}/16
            </span>
          </div>
          <input
            type="text"
            name="nationalId"
            value={formData.nationalId}
            onChange={handleChange}
            required
            placeholder="Enter deceased 16-digit National ID"
            minLength="16"
            maxLength="16"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              letterSpacing: '2px',
              border: '2px solid #3182ce',
              borderRadius: '8px',
              backgroundColor: '#ebf8ff'
            }}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t('date_of_death')}: *</label>
            <input
              type="date"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleChange}
              required
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label>{t('gender')}: *</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="">{t('select_gender')}</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('religion') || 'Religion'}: *</label>
            <select
              name="religion"
              value={formData.religion}
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
        </div>

        <div className="form-group">
          <label>{t('deceased_name')}: *</label>
          <input
            type="text"
            name="deceasedName"
            value={formData.deceasedName}
            onChange={handleChange}
            required
            placeholder="Full Name of Deceased"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('age')}: *</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              required
              min="0"
            />
          </div>

          <div className="form-group">
            <label>{t('place_of_death')}: *</label>
            <input
              type="text"
              name="placeOfDeath"
              value={formData.placeOfDeath}
              onChange={handleChange}
              required
              placeholder="e.g., Hospital, Home"
            />
          </div>
        </div>

        <div className="form-group">
          <label>{t('cause_of_death')}: *</label>
          <input
            type="text"
            name="causeOfDeath"
            value={formData.causeOfDeath}
            onChange={handleChange}
            required
            placeholder="Official cause of death"
          />
        </div>
      </div>

      <div className="form-section">
        <h4>ℹ️ {t('informant_info')}</h4>
        <div className="form-row">
          <div className="form-group">
            <label>{t('informant_name')}: *</label>
            <input
              type="text"
              name="informantName"
              value={formData.informantName}
              onChange={handleChange}
              required
              placeholder="Full Name"
            />
          </div>

          <div className="form-group">
            <label>{t('informant_relationship')}: *</label>
            <input
              type="text"
              name="informantRelationship"
              value={formData.informantRelationship}
              onChange={handleChange}
              required
              placeholder="e.g., Son, Daughter, Spouse"
            />
          </div>
        </div>
      </div>

      <button type="submit" disabled={isSubmitting || loading} className="submit-btn" style={{ fontWeight: 'bold' }}>
        {isSubmitting || loading ? t('registering') : t('register_death')}
      </button>
    </form>
  );
};

export default DeathForm;