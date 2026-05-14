import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import './CreateZoneForm.css';

const CreateZoneForm = ({ onZoneCreated }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    personalInfo: {
      fullName: '',
      nationalId: '',
      phone: '',
      email: '',
      specialInfo: '',
      religion: ''
    },
    location: {
      region: '',
      zone: ''
    },
    officeInfo: {
      officeName: '',
      officePhone: '',
      officeAddress: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  const { currentUser, API_URL } = useAuth();

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
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
      setPhotoFile(file);
      setPhotoPreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let filteredValue = value;

    // Strict validation logic
    if (name.includes('officeName') || name.includes('officeAddress') || name === 'personalInfo.fullName') {
      // Allow letters (Eng/Amh) and spaces
      filteredValue = value.replace(/[^a-zA-Z\s\u1200-\u137F]/g, '');
    } else if (name === 'location.zone') {
      // Allow letters (Eng/Amh), numbers and spaces
      filteredValue = value.replace(/[^a-zA-Z0-9\s\u1200-\u137F]/g, '');
    } else if (name.includes('phone') || name === 'personalInfo.phone') {
      // Allow only digits
      filteredValue = value.replace(/\D/g, '');
    } else if (name === 'personalInfo.nationalId') {
      // Allow letters and numbers for National ID
      filteredValue = value.replace(/[^a-zA-Z0-9]/g, '');
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');

      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: filteredValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: filteredValue
      }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error(t('photo_size_error_2mb') || 'Photo size must be less than 2MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Auto-set region from current user's region
  React.useEffect(() => {
    if (currentUser?.location?.region) {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          region: currentUser.location.region
        }
      }));
    }
  }, [currentUser]);

  const generateUsername = () => {
    const regionPart = (formData.location.region || 'region').toString().toLowerCase().replace(/\s+/g, '.');
    const zonePart = (formData.location.zone || 'zone').toString().toLowerCase().replace(/\s+/g, '.');
    return `zone.${regionPart}.${zonePart}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.location.zone) {
      toast.error(t('enter_zone_name_error'));
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('username', formData.username || generateUsername());
      submitData.append('password', formData.password);
      submitData.append('role', 'zone');
      submitData.append('location', JSON.stringify(formData.location));
      submitData.append('officeInfo', JSON.stringify(formData.officeInfo));

      // Map personalInfo fields appropriately for the backend
      const personalInfoPayload = {
        firstName: formData.personalInfo.fullName.split(' ')[0] || '',
        lastName: formData.personalInfo.fullName.split(' ').slice(1).join(' ') || '',
        nationalId: formData.personalInfo.nationalId,
        phone: formData.personalInfo.phone,
        email: formData.personalInfo.email,
        specialInformation: formData.personalInfo.specialInfo,
        religion: formData.personalInfo.religion
      };
      submitData.append('personalInfo', JSON.stringify(personalInfoPayload));

      if (photoFile) {
        submitData.append('photo', photoFile);
      }

      await axios.post(`${API_URL}/representatives/create`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(t('zone_account_created_success'));

      // Reset form
      setFormData({
        username: '',
        password: 'Zone123!',
        personalInfo: {
          fullName: '',
          nationalId: '',
          phone: '',
          email: '',
          specialInfo: '',
          religion: ''
        },
        location: {
          region: currentUser?.location?.region || '',
          zone: ''
        },
        officeInfo: {
          officeName: '',
          officePhone: '',
          officeAddress: ''
        }
      });
      setPhotoFile(null);
      setPhotoPreview(null);

      onZoneCreated();
    } catch (error) {
      toast.error(error.response?.data?.message || t('error_creating_zone_rep'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-zone-form">
      <h3>{t('create_zone_rep_account')}</h3>
      <p className="form-description">
        {t('create_zone_rep_desc')}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h4><span role="img" aria-label="person">👤</span> {t('personal_information') || 'Personal Information'}</h4>
          
          <div className="profile-photo-upload">
            <div className="photo-preview-container">
              {isCameraOpen ? (
                <div className="webcam-container">
                  <video ref={videoRef} autoPlay playsInline className="webcam-video" />
                  <button type="button" className="capture-trigger" onClick={capturePhoto} title="Capture" />
                  <button type="button" className="close-camera" onClick={stopCamera}>&times;</button>
                </div>
              ) : photoPreview ? (
                <img src={photoPreview} alt="Profile Preview" className="photo-preview" />
              ) : (
                <div className="photo-placeholder">
                  <span role="img" aria-label="camera">👤</span>
                  <p>{t('required_3x4_format') || 'Required (3x4 format)'}</p>
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

            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('full_name') || 'Full Name'} *</label>
              <input
                type="text"
                name="personalInfo.fullName"
                value={formData.personalInfo.fullName}
                onChange={handleChange}
                placeholder={t('enter_full_name') || 'Enter Full Name'}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('national_id_number') || 'National ID Number'} *</label>
              <input
                type="text"
                name="personalInfo.nationalId"
                value={formData.personalInfo.nationalId}
                onChange={handleChange}
                placeholder={t('enter_national_id') || 'Enter National ID'}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('phone_number') || 'Phone Number'} *</label>
              <input
                type="tel"
                name="personalInfo.phone"
                value={formData.personalInfo.phone}
                onChange={handleChange}
                placeholder={t('enter_phone_number') || 'Enter Phone Number'}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('religion') || 'Religion'} *</label>
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('email_address') || 'Email Address'}</label>
              <input
                type="email"
                name="personalInfo.email"
                value={formData.personalInfo.email}
                onChange={handleChange}
                placeholder={t('enter_email_address') || 'Enter Email Address'}
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('special_additional_information') || 'Special / Additional Information'}</label>
            <textarea
              name="personalInfo.specialInfo"
              value={formData.personalInfo.specialInfo}
              onChange={handleChange}
              placeholder={t('enter_special_needed_information') || 'Enter any special needed information'}
              rows="3"
            />
          </div>
        </div>

        <div className="form-section">
          <h4>{t('account_information')}</h4>
          <div className="form-row">
            <div className="form-group">
              <label>{t('username_label')}</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder={t('auto_generate_if_empty')}
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, username: generateUsername() }))}
                className="generate-btn"
              >
                {t('generate_btn')}
              </button>
            </div>

            <div className="form-group">
              <label>{t('initial_password')}</label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>{t('zone_assignment')}</h4>
          <div className="form-group">
            <label>{t('region_label')} *</label>
            <input
              type="text"
              name="location.region"
              value={formData.location.region ? t(formData.location.region) : ''}
              onChange={handleChange}
              required
              readOnly
              className="readonly-field"
            />
            <small>{t('zone_created_in_your_region')} {t(currentUser?.location?.region)}</small>
          </div>

          <div className="form-group">
            <label>{t('for_which_zone_office') || 'For which zone office do you want to create an officer?'} *</label>
            <input
              list="zone-options"
              type="text"
              name="location.zone"
              value={formData.location.zone}
              onChange={handleChange}
              required
              placeholder={t('select_or_type_zone') || 'Select from combo box (south wollo,etc) or type zone name'}
            />
            <datalist id="zone-options">
              {(currentUser?.location?.region === 'Addis Ababa' || currentUser?.location?.region === '1') ? (
                <>
                  <option value="Addis Ketema" />
                  <option value="Akaki Kaliti" />
                  <option value="Arada" />
                  <option value="Bole" />
                  <option value="Gulele" />
                  <option value="Kirkos" />
                  <option value="Kolfe Keranio" />
                  <option value="Lideta" />
                  <option value="Nifas Silk-Lafto" />
                  <option value="Yeka" />
                </>
              ) : (currentUser?.location?.region === 'Amhara' || currentUser?.location?.region === '3') ? (
                <>
                  <option value="North Gondar" />
                  <option value="South Gondar" />
                  <option value="North Wollo" />
                  <option value="South Wollo" />
                  <option value="Oromia Special Zone" />
                  <option value="Bahir Dar Special Zone" />
                  <option value="Awi Zone" />
                  <option value="East Gojjam" />
                  <option value="West Gojjam" />
                  <option value="Wag Hemra Zone" />
                </>
              ) : (currentUser?.location?.region === 'Oromia' || currentUser?.location?.region === '8') ? (
                <>
                  <option value="East Shewa" />
                  <option value="West Shewa" />
                  <option value="North Shewa" />
                  <option value="Arsi" />
                  <option value="Bale" />
                  <option value="Borana" />
                  <option value="East Hararghe" />
                  <option value="West Hararghe" />
                  <option value="Illubabor" />
                  <option value="Jimma" />
                </>
              ) : (
                <>
                  <option value="South Wollo" />
                  <option value="North Wollo" />
                  <option value="North Gondar" />
                  <option value="South Gondar" />
                </>
              )}
            </datalist>
          </div>
        </div>

        <div className="form-section">
          <h4>{t('office_information')}</h4>
          <div className="form-group">
            <label>{t('office_name_asterisk')}</label>
            <input
              type="text"
              name="officeInfo.officeName"
              value={formData.officeInfo.officeName}
              onChange={handleChange}
              required
              placeholder={t('eg_zone_statistics_office')}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('office_phone')}</label>
              <input
                type="tel"
                name="officeInfo.officePhone"
                value={formData.officeInfo.officePhone}
                onChange={handleChange}
                placeholder={t('office_phone_number_placeholder')}
              />
            </div>

            <div className="form-group">
              <label>{t('office_address')}</label>
              <input
                type="text"
                name="officeInfo.officeAddress"
                value={formData.officeInfo.officeAddress}
                onChange={handleChange}
                placeholder={t('zone_office_address_placeholder')}
              />
            </div>
          </div>
        </div>

        <div className="form-notice">
          <h5>{t('important_information')}</h5>
          <ul>
            <li>{t('zone_account_created_inactive')}</li>
            <li>{t('activate_account_zone_management')}</li>
            <li>{t('login_after_activation')}</li>
            <li>{t('zone_reps_create_woreda_reps')}</li>
          </ul>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? t('creating_zone_account_btn') : t('create_zone_rep_btn')}
        </button>
      </form>
    </div>
  );
};

export default CreateZoneForm;