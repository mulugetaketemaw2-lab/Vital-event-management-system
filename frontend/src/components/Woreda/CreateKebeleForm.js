import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import './CreateKebeleForm.css';

const CreateKebeleForm = ({ onKebeleCreated }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    location: {
      region: '',
      zone: '',
      woreda: '',
      kebele: ''
    },
    officeInfo: {
      officeName: '',
      officePhone: '',
      officeAddress: ''
    },
    personalInfo: {
      fullName: '',
      idNumber: '',
      phone: '',
      email: '',
      specialInformation: '',
      religion: ''
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    let filteredValue = value;

    // Strict validation logic
    if (name.includes('officeName') || name.includes('officeAddress')) {
      // Allow letters (Eng/Amh) and spaces
      filteredValue = value.replace(/[^a-zA-Z\s\u1200-\u137F]/g, '');
    } else if (name === 'location.kebele') {
      // Allow letters (Eng/Amh), numbers and spaces
      filteredValue = value.replace(/[^a-zA-Z0-9\s\u1200-\u137F]/g, '');
    }
    else if (name.includes('phone')) {
      // Allow only digits
      filteredValue = value.replace(/\D/g, '');
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

  // Auto-set region, zone, and woreda from current user
  React.useEffect(() => {
    if (currentUser?.location) {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          region: currentUser.location.region,
          zone: currentUser.location.zone,
          woreda: currentUser.location.woreda
        }
      }));
    }
  }, [currentUser]);

  const generateUsername = () => {
    const woredaPart = (formData.location.woreda || 'woreda').toString().toLowerCase().replace(/\s+/g, '.');
    const kebelePart = (formData.location.kebele || 'kebele').toString().toLowerCase().replace(/\s+/g, '.');
    return `kebele.${woredaPart}.${kebelePart}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.location.kebele) {
      toast.error(t('enter_kebele_name_error'));
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('username', formData.username || generateUsername());
      submitData.append('password', formData.password);
      submitData.append('role', 'kebele');
      submitData.append('location', JSON.stringify(formData.location));
      submitData.append('officeInfo', JSON.stringify(formData.officeInfo));

      const nameParts = formData.personalInfo.fullName.trim().split(' ');
      const firstName = nameParts[0] || formData.location.kebele || 'Kebele';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Rep';

      const personalInfoPayload = {
        firstName: firstName,
        lastName: lastName,
        idNumber: formData.personalInfo.idNumber,
        phone: formData.personalInfo.phone,
        email: formData.personalInfo.email,
        specialInformation: formData.personalInfo.specialInformation,
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

      toast.success(t('kebele_account_created_success'));

      // Reset form
      setFormData({
        username: '',
        password: 'Kebele123!',
        location: {
          region: currentUser?.location?.region || '',
          zone: currentUser?.location?.zone || '',
          woreda: currentUser?.location?.woreda || '',
          kebele: ''
        },
        officeInfo: {
          officeName: '',
          officePhone: '',
          officeAddress: ''
        },
        personalInfo: {
          fullName: '',
          idNumber: '',
          phone: '',
          email: '',
          specialInformation: '',
          religion: ''
        }
      });

      setPhotoFile(null);
      setPhotoPreview(null);

      onKebeleCreated();
    } catch (error) {
      toast.error(error.response?.data?.message || t('error_creating_kebele_rep'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-kebele-form">
      <h3>{t('create_kebele_rep_account')}</h3>
      <p className="form-description">
        {t('create_kebele_rep_desc')}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h4><span role="img" aria-label="person">👤</span> {t('personal_information', 'Personal Information')}</h4>
          
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
                  <p>{t('required_3x4_format', 'Required (3x4 format)')}</p>
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
              <label>{t('full_name', 'Full Name')} *</label>
              <input
                type="text"
                name="personalInfo.fullName"
                value={formData.personalInfo.fullName}
                onChange={handleChange}
                required
                placeholder={t('enter_full_name', 'Enter Full Name')}
              />
            </div>
            <div className="form-group">
              <label>{t('national_id', 'National ID Number')} *</label>
              <input
                type="text"
                name="personalInfo.idNumber"
                value={formData.personalInfo.idNumber}
                onChange={handleChange}
                required
                placeholder={t('enter_national_id', 'Enter National ID')}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('phone_number', 'Phone Number')} *</label>
              <input
                type="text"
                name="personalInfo.phone"
                value={formData.personalInfo.phone}
                onChange={handleChange}
                required
                placeholder={t('enter_phone', 'Enter Phone Number')}
              />
            </div>
            <div className="form-group">
              <label>{t('religion', 'Religion')} *</label>
              <select
                name="personalInfo.religion"
                value={formData.personalInfo.religion}
                onChange={handleChange}
                required
              >
                <option value="">{t('select_religion', 'Select Religion')}</option>
                <option value="orthodox">{t('orthodox', 'Ethiopian Orthodox')}</option>
                <option value="muslim">{t('muslim', 'Muslim')}</option>
                <option value="protestant">{t('protestant', 'Protestant')}</option>
                <option value="catholic">{t('catholic', 'Catholic')}</option>
                <option value="traditional">{t('traditional_religion', 'Traditional')}</option>
                <option value="other">{t('other', 'Other')}</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('email_address', 'Email Address')}</label>
              <input
                type="email"
                name="personalInfo.email"
                value={formData.personalInfo.email}
                onChange={handleChange}
                placeholder={t('enter_email', 'Enter Email Address')}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>{t('special_information', 'Special / Additional Information')}</label>
            <textarea
              name="personalInfo.specialInformation"
              value={formData.personalInfo.specialInformation}
              onChange={handleChange}
              placeholder={t('enter_special_info', 'Enter any special needed information')}
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
          <h4>{t('kebele_assignment')}</h4>
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
          </div>

          <div className="form-group">
            <label>{t('zone_label')} *</label>
            <input
              type="text"
              name="location.zone"
              value={formData.location.zone ? t(formData.location.zone) : ''}
              onChange={handleChange}
              required
              readOnly
              className="readonly-field"
            />
          </div>

          <div className="form-group">
            <label>{t('woreda_label')} *</label>
            <input
              type="text"
              name="location.woreda"
              value={formData.location.woreda ? t(formData.location.woreda) : ''}
              onChange={handleChange}
              required
              readOnly
              className="readonly-field"
            />
          </div>

          <div className="form-group">
            <label>{t('kebele_name_prompt', 'For which kebele office do you want to create an officer? *')}</label>
            <input
              type="text"
              name="location.kebele"
              list="kebele-options"
              value={formData.location.kebele}
              onChange={handleChange}
              required
              placeholder={t('select_or_enter_kebele', 'Select or type kebele name')}
            />
            <datalist id="kebele-options">
              {(currentUser?.location?.woreda === 'Ammanuel Area' || currentUser?.location?.woreda === '1_1_1') ? (
                <>
                  <option value="Amanuel kebele01" />
                  <option value="Amanuel kebele02" />
                  <option value="Amanuel kebele03" />
                  <option value="Amanuel kebele04" />
                </>
              ) : (currentUser?.location?.woreda === 'Saris' || currentUser?.location?.woreda === '1_2_1') ? (
                <>
                  <option value="Saris kebele01" />
                  <option value="Saris kebele02" />
                  <option value="Saris kebele03" />
                  <option value="Saris kebele04" />
                </>
              ) : (currentUser?.location?.woreda === 'Kombolcha' || currentUser?.location?.woreda === '3_4_1') ? (
                <>
                  <option value="Kombolcha01" />
                  <option value="Kombolcha02" />
                  <option value="Kombolcha03" />
                  <option value="Kombolcha04" />
                </>
              ) : (currentUser?.location?.woreda === 'Gondar Zuria' || currentUser?.location?.woreda === '3_1_1') ? (
                <>
                  <option value="Azezo Tekle Haimanot" />
                  <option value="Maraki" />
                  <option value="Sof Omar" />
                  <option value="Woleka" />
                </>
              ) : (
                Array.from({ length: 15 }, (_, i) => {
                  const num = (i + 1).toString().padStart(2, '0');
                  const woredaPrefix = formData.location.woreda || currentUser?.location?.woreda || 'Kebele';
                  return <option key={num} value={`${woredaPrefix} ${num}`} />;
                })
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
              placeholder={t('eg_kebele_statistics_office')}
            />
          </div>

          <div className="form-group">
            <label>{t('office_address')}</label>
            <input
              type="text"
              name="officeInfo.officeAddress"
              value={formData.officeInfo.officeAddress}
              onChange={handleChange}
              placeholder={t('kebele_office_address_placeholder')}
            />
          </div>
        </div>

        <div className="form-notice">
          <h5>{t('important_information')}</h5>
          <ul>
            <li>{t('kebele_account_created_inactive')}</li>
            <li>{t('activate_account_kebele_management')}</li>
            <li>{t('login_after_activation')}</li>
            <li>{t('kebele_reps_handle_registrations')}</li>
          </ul>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? t('creating_kebele_account_btn') : t('create_kebele_rep_btn')}
        </button>
      </form>
    </div>
  );
};

export default CreateKebeleForm;