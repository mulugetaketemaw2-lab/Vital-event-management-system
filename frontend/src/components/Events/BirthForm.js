import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { transliterate } from '../../utils/geezUtil';
import LocationSelector from '../Common/LocationSelector';
import './BirthForm.css';

const BirthForm = ({ onSubmit, loading }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [formData, setFormData] = useState({
    location: {
      region: '',
      zone: '',
      woreda: '',
      kebele: ''
    },
    child_national_id: '',
    is_temporary_id: true,
    eventDate: '',
    childName: '',
    gender: '',
    placeOfBirth: '',
    fatherName: '',
    motherName: '',
    fatherNationality: 'Ethiopian',
    motherNationality: 'Ethiopian',
    fatherOccupation: '',
    motherOccupation: '',
    fatherEducation: 'secondary',
    motherEducation: 'secondary',
    fatherAge: '',
    motherAge: '',
    birthType: 'normal',
    numberOfChildren: 1,
    birthOrder: 1,
    hospitalName: '',
    doctorName: '',
    calendarType: 'gregorian',
    childAge: '',
    religion: ''
  });

  const getEthFromGregorian = (date = new Date()) => {
    const gy = date.getFullYear();
    const gm = date.getMonth(); 
    const gd = date.getDate();
    
    let ecYear = gy - 8;
    const isLeapBefore = (ecYear % 4) === 3;
    const newYearDay = isLeapBefore ? 12 : 11;
    
    if (gm > 8 || (gm === 8 && gd >= newYearDay)) {
        ecYear += 1;
    }
    
    const gcYearStart = (gm >= 8 && ecYear === gy - 7) ? gy : gy - 1;
    const ecStartDay = ((ecYear - 1) % 4 === 3) ? 12 : 11; 
    
    const msDiff = Date.UTC(gy, gm, gd) - Date.UTC(gcYearStart, 8, ecStartDay);
    const diffDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    
    const ecMonth = Math.floor(diffDays / 30) + 1;
    const ecDay = (diffDays % 30) + 1;
    
    return { year: ecYear, month: ecMonth, day: ecDay };
  };

  const [ethDate, setEthDate] = useState(getEthFromGregorian());

  const getGregorianFromEth = (y, m, d) => {
    if (!y || !m || !d) return '';
    const ethYear = parseInt(y, 10);
    const ethMonth = parseInt(m, 10);
    const ethDay = parseInt(d, 10);
    
    // Leap year offset
    const startsOnSep12 = (ethYear - 1) % 4 === 3;
    const gcDate = startsOnSep12 ? new Date(ethYear + 7, 8, 12) : new Date(ethYear + 7, 8, 11);
    
    const daysToAdd = (ethMonth - 1) * 30 + (ethDay - 1);
    gcDate.setDate(gcDate.getDate() + daysToAdd);
    
    const yyyy = gcDate.getFullYear();
    const mm = String(gcDate.getMonth() + 1).padStart(2, '0');
    const dd = String(gcDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleEthDateChange = (e) => {
    const { name, value } = e.target;
    // Disallow invalid characters simply
    if (!/^\d*$/.test(value)) return;
    
    const newEthDate = { ...ethDate, [name]: value };
    
    if (newEthDate.month === '13' && value) {
      const isLeap = (parseInt(newEthDate.year) % 4) === 3;
      const maxDays = isLeap ? 6 : 5;
      if (parseInt(newEthDate.day) > maxDays) {
        newEthDate.day = maxDays.toString();
      }
    }

    setEthDate(newEthDate);

    if (newEthDate.year && newEthDate.month && newEthDate.day) {
      const gcDateStr = getGregorianFromEth(newEthDate.year, newEthDate.month, newEthDate.day);
      handleChange({ target: { name: 'eventDate', value: gcDateStr } });
    }
  };

  const [files, setFiles] = useState({
    childPhoto: null,
    fatherPhoto: null,
    motherPhoto: null,
    idCard: null
  });

  const [otherDocs, setOtherDocs] = useState([]);
  const [phoneticMode, setPhoneticMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [childPhotoPreview, setChildPhotoPreview] = useState(null);
  const [fatherPhotoPreview, setFatherPhotoPreview] = useState(null);
  const [motherPhotoPreview, setMotherPhotoPreview] = useState(null);
  const [activeCamera, setActiveCamera] = useState(null); // 'child', 'father', 'mother'
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Refs for file inputs to allow clearing and triggering
  const idCardInputRef = useRef(null);
  const otherDocsInputRef = useRef(null);
  const childPhotoInputRef = useRef(null);
  const fatherPhotoInputRef = useRef(null);
  const motherPhotoInputRef = useRef(null);

  const { API_URL, currentUser } = useAuth();

  const [isMarried, setIsMarried] = useState(false);
  const [specialCase, setSpecialCase] = useState(false);
  const [marriageChecked, setMarriageChecked] = useState(false);

  React.useEffect(() => {
    const fetchMarriageStatus = async () => {
      if (currentUser?.personalInfo && API_URL) {
        try {
          const response = await axios.get(`${API_URL}/events/check-marriage`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          const isMale = currentUser.personalInfo?.gender?.toLowerCase() === 'male';
          const isFemale = currentUser.personalInfo?.gender?.toLowerCase() === 'female';
          const fullName = `${currentUser.personalInfo?.firstName || ''} ${currentUser.personalInfo?.lastName || ''}`.trim();
          const occupation = currentUser.personalInfo?.occupation || '';
          const nationality = currentUser.personalInfo?.nationality || 'Ethiopian';
          const education = currentUser.personalInfo?.educationLevel || 'secondary';

          let fatherName = isMale ? fullName : '';
          let motherName = isFemale ? fullName : '';
          let fatherOcc = isMale ? occupation : '';
          let motherOcc = isFemale ? occupation : '';
          let fatherNat = isMale ? nationality : 'Ethiopian';
          let motherNat = isFemale ? nationality : 'Ethiopian';
          let fatherEdu = isMale ? education : 'secondary';
          let motherEdu = isFemale ? education : 'secondary';
          let fAge = '';
          let mAge = '';

          let fatherPhotoUrl = null;
          let motherPhotoUrl = null;

          // Fallback to Registrar Parent's Profile Photo if not set by Marriage
          // Check all possible locations for user's photo
          const fallbackPhotoUrl = currentUser?.profilePhoto?.url || 
                                   currentUser?.personalInfo?.photo?.url || 
                                   currentUser?.photo?.url || 
                                   currentUser?.personalInfo?.profilePhoto?.url;
                                   
          const serverBaseUrl = API_URL.split('/api')[0];
          
          if (response.data?.data?.isMarried) {
            setIsMarried(true);
            toast.info("Marriage record found. Spouse details auto-populated.");
            const marriage = response.data.data.marriageDetails;
            
            fatherName = marriage.husbandName || fatherName;
            motherName = marriage.wifeName || motherName;
            fAge = marriage.husbandAge ? marriage.husbandAge.toString() : '';
            mAge = marriage.wifeAge ? marriage.wifeAge.toString() : '';
            
            if (marriage.husbandPhoto?.url) {
              fatherPhotoUrl = marriage.husbandPhoto.url.startsWith('http') 
                ? marriage.husbandPhoto.url 
                : `${serverBaseUrl}${marriage.husbandPhoto.url}`;
            }
            if (marriage.wifePhoto?.url) {
              motherPhotoUrl = marriage.wifePhoto.url.startsWith('http') 
                ? marriage.wifePhoto.url 
                : `${serverBaseUrl}${marriage.wifePhoto.url}`;
            }
          } else {
            toast.warning("No marriage record found. Check 'Special Case' to manually enter unverified parent details.");
          }

          if (!fatherPhotoUrl && isMale && fallbackPhotoUrl) {
            fatherPhotoUrl = fallbackPhotoUrl.startsWith('http') ? fallbackPhotoUrl : `${serverBaseUrl}${fallbackPhotoUrl}`;
          }
          if (!motherPhotoUrl && isFemale && fallbackPhotoUrl) {
            motherPhotoUrl = fallbackPhotoUrl.startsWith('http') ? fallbackPhotoUrl : `${serverBaseUrl}${fallbackPhotoUrl}`;
          }

          console.log('Resolving Father URL:', fatherPhotoUrl);
          console.log('Resolving Mother URL:', motherPhotoUrl);

          // Fetch external URLs into File objects for seamless form submission
          const fetchImageAsFile = async (url, filename) => {
            try {
              const res = await fetch(url);
              if (!res.ok) return null;
              const blob = await res.blob();
              return new File([blob], filename, { type: blob.type || 'image/jpeg' });
            } catch (e) {
              console.warn('Could not auto-fetch image as file:', e);
              return null;
            }
          };

          if (fatherPhotoUrl) {
            setFatherPhotoPreview(fatherPhotoUrl);
            const fFile = await fetchImageAsFile(fatherPhotoUrl, 'auto-father.jpg');
            if (fFile) setFiles(prev => ({ ...prev, fatherPhoto: fFile }));
          }

          if (motherPhotoUrl) {
            setMotherPhotoPreview(motherPhotoUrl);
            const mFile = await fetchImageAsFile(motherPhotoUrl, 'auto-mother.jpg');
            if (mFile) setFiles(prev => ({ ...prev, motherPhoto: mFile }));
          }

          setMarriageChecked(true);

          setFormData(prev => ({
            ...prev,
            fatherName: prev.fatherName || fatherName,
            fatherOccupation: prev.fatherOccupation || fatherOcc,
            fatherNationality: prev.fatherNationality === 'Ethiopian' ? fatherNat : prev.fatherNationality,
            fatherEducation: prev.fatherEducation === 'secondary' ? fatherEdu : prev.fatherEducation,
            motherName: prev.motherName || motherName,
            motherOccupation: prev.motherOccupation || motherOcc,
            motherNationality: prev.motherNationality === 'Ethiopian' ? motherNat : prev.motherNationality,
            motherEducation: prev.motherEducation === 'secondary' ? motherEdu : prev.motherEducation,
            fatherAge: prev.fatherAge || fAge,
            motherAge: prev.motherAge || mAge,
            location: currentUser.location || prev.location,
            child_national_id: !prev.child_national_id && currentUser.personalInfo?.idNumber ? currentUser.personalInfo.idNumber : prev.child_national_id,
            is_temporary_id: !prev.child_national_id || prev.child_national_id === currentUser.personalInfo?.idNumber
          }));
        } catch (err) {
          console.error('Failed to fetch marriage status', err);
          setMarriageChecked(true);
        }
      }
    };
    fetchMarriageStatus();
  }, [currentUser, API_URL]);

    // Replaced by above hook
    // ...

  const handleChange = (e) => {
    const { name, value } = e.target;
    let filteredValue = value;
    const currentLang = i18n.language;

    // 1. Numeric Fields restriction
    if (name === 'child_national_id' || name.includes('phone') || name.includes('Age') || name === 'numberOfChildren' || name === 'birthOrder') {
      // Only digits (non-negative numbers)
      filteredValue = value.replace(/\D/g, '');
    } 
    // 2. Name field restriction (Letters only)
    else if (name.includes('Name')) {
      if (currentLang === 'am') {
        // Only Amharic characters and spaces
        filteredValue = value.replace(/[^\u1200-\u137F\s]/g, '');
      } else {
        // Only English letters and spaces
        filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
      }
    }
    // 3. General Text fields (Language-based character restriction)
    else if (name.includes('Occupation') || name.includes('Nationality') || name.includes('place')) {
      if (currentLang === 'am') {
        // Only Amharic block characters
        filteredValue = value.replace(/[^\u1200-\u137F\s]/g, '');
      } else {
        // Only English letters and spaces (User requested "English letters" specifically)
        filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
      }
    }

    // Phonetic Transliteration
    if (phoneticMode && (name.includes('Name') || name.includes('Occupation'))) {
      filteredValue = transliterate(filteredValue);
    }

    // Auto-calculate child age if eventDate is changed
    let newAge = formData.childAge;
    if (name === 'eventDate' && filteredValue) {
      const birthDate = new Date(filteredValue);
      const today = new Date();
      if (!isNaN(birthDate.getTime())) {
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        
        let finalAge = calculatedAge;
        if (formData.calendarType === 'ethiopian') {
           const currentEC = getEthFromGregorian();
           finalAge = currentEC.year - parseInt(ethDate.year || currentEC.year);
           if (finalAge < 0) finalAge = 0;
        }

        // No Future Dates (intercepted for Ethiopian calendar to prevent slight offset errors)
        if (birthDate > today && formData.calendarType === 'gregorian') {
          toast.error(t('error_future_birth_date') || "Birth date cannot be in the future.");
          newAge = '';
        } else if (finalAge >= 5) {
          toast.error("Registrants 5 years and older must obtain a National ID and register via Citizen Registration.");
          newAge = ''; // Invalid age for this form
        } else {
          newAge = finalAge.toString();
        }
      }
    }

    setFormData({
      ...formData,
      [name]: filteredValue,
      childAge: newAge,
      is_temporary_id: name === 'child_national_id' 
        ? (!filteredValue || filteredValue === (currentUser?.personalInfo?.idNumber || ''))
        : formData.is_temporary_id
    });
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
      if (type === 'child') setChildPhotoPreview(dataUrl);
      else if (type === 'father') setFatherPhotoPreview(dataUrl);
      else if (type === 'mother') setMotherPhotoPreview(dataUrl);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;

    if (fileList && fileList[0]) {
      const file = fileList[0];

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
        e.target.value = ''; // Clear the file input
        return;
      }

      // Check file type based on input name
      if (['childPhoto', 'fatherPhoto', 'motherPhoto'].includes(name)) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
          toast.error(`File ${file.name} is not a valid image type. Please use JPEG, PNG, or GIF.`);
          e.target.value = '';
          return;
        }
      } else if (name === 'idCard') {
        if (file.type !== 'application/pdf') {
          toast.error(`File ${file.name} must be a PDF.`);
          e.target.value = '';
          return;
        }
      }

      // Update previews
      if (name === 'childPhoto') setChildPhotoPreview(URL.createObjectURL(file));
      else if (name === 'fatherPhoto') setFatherPhotoPreview(URL.createObjectURL(file));
      else if (name === 'motherPhoto') setMotherPhotoPreview(URL.createObjectURL(file));

      // Update files state
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
    // Clear input so same files can be selected again if needed (though unlikely for multi)
    if (otherDocsInputRef.current) otherDocsInputRef.current.value = '';
  };

  const removeDocument = (index) => {
    setOtherDocs(prev => prev.filter((_, i) => i !== index));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. COMPREHENSIVE EMPTY CHECK
    const requiredFields = [
      { name: 'childName', label: "Child's Full Name" },
      { name: 'gender', label: 'Gender' },
      { name: 'religion', label: 'Religion' },
      { name: 'eventDate', label: 'Date of Birth' },
      { name: 'placeOfBirth', label: 'Place of Birth' },
      { name: 'fatherName', label: "Father's Name" },
      { name: 'fatherOccupation', label: "Father's Occupation" },
      { name: 'fatherAge', label: "Father's Age" },
      { name: 'motherName', label: "Mother's Name" },
      { name: 'motherOccupation', label: "Mother's Occupation" },
      { name: 'motherAge', label: "Mother's Age" },
      { name: 'hospitalName', label: 'Hospital / Health Center Name' }
    ];

    // Check if ALL essential fields are empty at once (strings, not objects!)
    const essentialFieldNames = ['childName', 'gender', 'religion', 'eventDate', 'placeOfBirth', 'fatherName', 'motherName'];
    const allRequiredEmpty = essentialFieldNames.every(fieldName => !formData[fieldName]);
    
    if (allRequiredEmpty) {
      toast.error(
        "Please, you have not completed all the information. Fill out the entire form and try again.",
        { position: "top-right", autoClose: 6000 }
      );
      return;
    }

    // 2. SEQUENTIAL VALIDATION CHECK — prompt the FIRST empty field specifically
    for (const field of requiredFields) {
      const val = formData[field.name];
      if (!val || val === '') {
        toast.error(
          `Please, you forgot your ${field.label}. Enter it and try again.`,
          { position: "top-right", autoClose: 5000 }
        );
        return;
      }
    }

    // Validate required location
    if (!formData.location.region || !formData.location.kebele) {
      toast.error('Please select your complete location (Region to Kebele)');
      return;
    }

    // Validate required files
    if (!files.childPhoto || !files.fatherPhoto || !files.motherPhoto) {
      toast.error('Please upload all required photos (Child, Father, Mother)');
      return;
    }

    if (formData.child_national_id && !files.idCard) {
      toast.error('Please upload your ID Card (PDF) since National ID was provided.');
      return;
    }

    // 5-Year Rule for Parental Reference / Birth Form
    if (!formData.childAge || parseInt(formData.childAge) >= 5) {
      toast.error(t('error_age_limit_5') || "Registrants 5 years and older must register via Citizen Registration, not Birth Registration.");
      return;
    }

    // No Future Dates
    if (new Date(formData.eventDate) > new Date()) {
      toast.error(t('error_future_birth_date') || "Birth date cannot be in the future.");
      return;
    }

    if (otherDocs.length === 0) {
      toast.error('Please upload at least one supporting document');
      return;
    }


    setIsSubmitting(true);
    // Create FormData for file upload
    const formDataObj = new FormData();

    // Append form data
    Object.keys(formData).forEach(key => {
      if (key === 'location') {
        formDataObj.append('location', JSON.stringify(formData.location));
      } else {
        formDataObj.append(key, formData[key]);
      }
    });

    // Append files
    formDataObj.append('childPhoto', files.childPhoto);
    formDataObj.append('fatherPhoto', files.fatherPhoto);
    formDataObj.append('motherPhoto', files.motherPhoto);
    if (files.idCard) {
      formDataObj.append('idCard', files.idCard);
    }

    otherDocs.forEach((doc) => {
      formDataObj.append('documents', doc);
    });

    formDataObj.append('type', 'birth');

    try {
      // Upload files and create event
      const response = await axios.post(`${API_URL}/events`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        timeout: 60000 // 60 second timeout for uploads

      });

      toast.success('Birth registration submitted successfully!');
      if (onSubmit) onSubmit(response.data.data.vitalEvent);
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Error submitting registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="event-details-form birth-form" noValidate>
      <h3>{t('birth_registration')}</h3>

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
              transition: '.4s',
              borderRadius: '50%'
            }}></span>
          </span>
        </label>
        <div>
          <strong style={{ display: 'block', fontSize: '14px', color: '#2c5282' }}>{t('phonetic_typing')}</strong>
          <small style={{ color: '#4a5568', fontSize: '12px' }}>{t('phonetic_typing_desc')}</small>
        </div>
      </div>

      <div className="form-section">
        <h4>👶 {t('child_info')}</h4>
        <div className="form-group" style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <label>{t('national_id')} (Optional - 16 Digits):</label>
            <span style={{ fontSize: '0.75rem', color: formData.child_national_id.length === 16 ? '#e53e3e' : '#666' }}>
              {formData.child_national_id.length}/16
            </span>
          </div>
          <input
            type="text"
            name="child_national_id"
            className="national-id-input"
            value={formData.child_national_id}
            onChange={handleChange}
            placeholder="Enter unique 16-digit National ID (if available)"
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
          <small style={{ color: '#2b6cb0', display: 'block', marginTop: '5px' }}>
            {formData.is_temporary_id && formData.child_national_id === currentUser?.personalInfo?.idNumber
              ? `ℹ️ Using Registrar's National ID (${formData.child_national_id}) as Parental Reference until age 5 (Identity Maturity).`
              : formData.child_national_id 
                ? '✅ Unique National ID provided for independent identity.'
                : 'ℹ️ No ID provided. Child will be registered using Parental Reference until age 5 (Identity Maturity).'}
          </small>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label>{t('select_calendar_type') || "Select Calendar Type"}:</label>
            <div style={{ display: 'flex', gap: '20px', marginTop: '5px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal' }}>
                <input 
                  type="radio" 
                  name="calendarType" 
                  value="gregorian" 
                  checked={formData.calendarType === 'gregorian'}
                  onChange={handleChange}
                  style={{ marginRight: '8px' }}
                />
                Gregorian 📅
              </label>
              <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal' }}>
                <input 
                  type="radio" 
                  name="calendarType" 
                  value="ethiopian" 
                  checked={formData.calendarType === 'ethiopian'}
                  onChange={handleChange}
                  style={{ marginRight: '8px' }}
                />
                Ethiopian 📆
              </label>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('child_name')}: *</label>
            <input
              type="text"
              name="childName"
              value={formData.childName}
              onChange={handleChange}
              required
              placeholder="Child's legal name"
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
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
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

        <div className="form-row">
          <div className="form-group">
            <label>{t('date_of_birth')}: *</label>
            {formData.calendarType === 'gregorian' ? (
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
                style={{
                  borderColor: formData.eventDate && new Date(formData.eventDate) > new Date() ? '#ef4444' : '#d1d5db'
                }}
              />
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  name="month" 
                  value={ethDate.month} 
                  onChange={handleEthDateChange}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}
                  required
                >
                  <option value="1">Meskerem (መስከረም)</option>
                  <option value="2">Tikimt (ጥቅምት)</option>
                  <option value="3">Hidar (ኅዳር)</option>
                  <option value="4">Tahsas (ታኅሣሥ)</option>
                  <option value="5">Tir (ጥር)</option>
                  <option value="6">Yekatit (የካቲት)</option>
                  <option value="7">Megabit (መጋቢት)</option>
                  <option value="8">Miyazia (ሚያዝያ)</option>
                  <option value="9">Ginbot (ግንቦት)</option>
                  <option value="10">Sene (ሰኔ)</option>
                  <option value="11">Hamle (ሐምሌ)</option>
                  <option value="12">Nehase (ነሐሴ)</option>
                  <option value="13">Pagume (ጳጉሜን)</option>
                </select>
                <input 
                  type="number" 
                  name="day" 
                  value={ethDate.day} 
                  onChange={handleEthDateChange} 
                  min="1" 
                  max={ethDate.month === '13' ? ((parseInt(ethDate.year) % 4) === 3 ? "6" : "5") : "30"} 
                  placeholder="Day" 
                  style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  required
                />
                <input 
                  type="number" 
                  name="year" 
                  value={ethDate.year} 
                  onChange={handleEthDateChange} 
                  min="1900" 
                  max={new Date().getFullYear() - 7} 
                  placeholder="Year" 
                  style={{ width: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  required
                />
              </div>
            )}
            {formData.eventDate && new Date(formData.eventDate) > new Date() && formData.calendarType === 'gregorian' && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                ⚠️ {t('error_future_birth_date') || "Birth date cannot be in the future."}
              </span>
            )}
            {formData.is_temporary_id && parseInt(formData.childAge) > 5 && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                ⚠️ {t('error_age_limit_5') || "Registrant must be under 5 years of age for Parental Reference category."}
              </span>
            )}
          </div>

          <div className="form-group">
            <label>{t('age')}: *</label>
            <input
              type="text"
              name="childAge"
              value={formData.childAge}
              required
              readOnly
              placeholder={t('auto_calculated_age') || "Auto-calculated"}
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }}
            />
          </div>

          <div className="form-group">
            <label>{t('place_of_birth')}: *</label>
            <input
              type="text"
              name="placeOfBirth"
              value={formData.placeOfBirth}
              onChange={handleChange}
              required
              placeholder="Hospital/Health Center/Home"
            />
          </div>
        </div>
      </div>

      {/* 2. Photo Identification */}
      <div className="form-section photo-section">
        <h4>📷 {t('photo_id')}</h4>
        <p className="section-help">Please upload clear 3×4 photos for identification</p>

        <div className="photo-upload-grid">
          <div className="photo-upload-item">
            <label>{t('child_photo') || "Child's Photo"}: *</label>
            <div className="photo-preview-container-3x4">
              {activeCamera === 'child' ? (
                <div className="webcam-container">
                  <video ref={videoRef} autoPlay playsInline className="webcam-video" />
                  <button type="button" className="capture-trigger" onClick={() => capturePhoto('child')} title="Capture" />
                  <button type="button" className="close-camera" onClick={stopCamera}>&times;</button>
                </div>
              ) : childPhotoPreview ? (
                <img src={childPhotoPreview} alt="Child" className="photo-preview-3x4" />
              ) : (
                <div className="photo-placeholder-3x4">
                  <span role="img" aria-label="baby">👶</span>
                  <p>{t('required_3x4_format') || '3x4 Format'}</p>
                </div>
              )}
              
              {activeCamera !== 'child' && (
                <div className="photo-controls-overlay">
                  <div className="overlay-btn-upload" onClick={() => childPhotoInputRef.current.click()}>
                    📷 {t('upload_photo') || 'Upload Photo'}
                  </div>
                  <div className="overlay-btn-camera" onClick={() => startCamera('child')}>
                    📹 {t('use_camera') || 'Use Camera'}
                  </div>
                </div>
              )}
            </div>
            
            {/* Redundant camera buttons removed as they are now in the overlay */}
            
            <input
              type="file"
              name="childPhoto"
              ref={childPhotoInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            {files.childPhoto && (
              <div className="file-info-badge">📸 {t('selected') || 'Selected'}</div>
            )}
          </div>

          <div className="photo-upload-item">
            <label>{t('father_photo') || "Father's Photo"}: *</label>
            <div className="photo-preview-container-3x4">
              {activeCamera === 'father' ? (
                <div className="webcam-container">
                  <video ref={videoRef} autoPlay playsInline className="webcam-video" />
                  <button type="button" className="capture-trigger" onClick={() => capturePhoto('father')} title="Capture" />
                  <button type="button" className="close-camera" onClick={stopCamera}>&times;</button>
                </div>
              ) : fatherPhotoPreview ? (
                <img src={fatherPhotoPreview} alt="Father" className="photo-preview-3x4" />
              ) : (
                <div className="photo-placeholder-3x4">
                  <span role="img" aria-label="father">👨</span>
                  <p>{t('required_3x4_format') || '3x4 Format'}</p>
                </div>
              )}
              
              {activeCamera !== 'father' && (
                <div className="photo-controls-overlay">
                  <div className="overlay-btn-upload" onClick={() => fatherPhotoInputRef.current.click()}>
                    📷 {t('upload_photo') || 'Upload Photo'}
                  </div>
                  <div className="overlay-btn-camera" onClick={() => startCamera('father')}>
                    📹 {t('use_camera') || 'Use Camera'}
                  </div>
                </div>
              )}
            </div>
            
            {/* Redundant camera buttons removed */}
            
            <input
              type="file"
              name="fatherPhoto"
              ref={fatherPhotoInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            {files.fatherPhoto && (
              <div className="file-info-badge">👨 {t('selected') || 'Selected'}</div>
            )}
          </div>

          <div className="photo-upload-item">
            <label>{t('mother_photo') || "Mother's Photo"}: *</label>
            <div className="photo-preview-container-3x4">
              {activeCamera === 'mother' ? (
                <div className="webcam-container">
                  <video ref={videoRef} autoPlay playsInline className="webcam-video" />
                  <button type="button" className="capture-trigger" onClick={() => capturePhoto('mother')} title="Capture" />
                  <button type="button" className="close-camera" onClick={stopCamera}>&times;</button>
                </div>
              ) : motherPhotoPreview ? (
                <img src={motherPhotoPreview} alt="Mother" className="photo-preview-3x4" />
              ) : (
                <div className="photo-placeholder-3x4">
                  <span role="img" aria-label="mother">👩</span>
                  <p>{t('required_3x4_format') || '3x4 Format'}</p>
                </div>
              )}
              
              {activeCamera !== 'mother' && (
                <div className="photo-controls-overlay">
                  <div className="overlay-btn-upload" onClick={() => motherPhotoInputRef.current.click()}>
                    📷 {t('upload_photo') || 'Upload Photo'}
                  </div>
                  <div className="overlay-btn-camera" onClick={() => startCamera('mother')}>
                    📹 {t('use_camera') || 'Use Camera'}
                  </div>
                </div>
              )}
            </div>
            
            {/* Redundant camera buttons removed */}
            
            <input
              type="file"
              name="motherPhoto"
              ref={motherPhotoInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            {files.motherPhoto && (
              <div className="file-info-badge">👩 {t('selected') || 'Selected'}</div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Location Information */}
      <div className="form-section location-section">
        <h4>📍 {t('location_info') || 'Location Information'}</h4>
        <p className="section-help">⚠️ Your registration will be sent to the Kebele you select below</p>
        <p className="section-help" style={{ color: '#2b6cb0', marginTop: '-10px', fontSize: '0.9rem' }}>
          ℹ️ Your location has been automatically synchronized with your official residence profile.
        </p>
        <LocationSelector 
          key={currentUser?.location ? 'loaded-' + (currentUser.location.region || '') : 'unloaded'}
          onLocationChange={handleLocationChange} 
          initialLocation={currentUser?.location}
        />
      </div>

      {/* 4. Document Uploads */}
      <div className="form-section documents-section">
        <h4>📄 Document Uploads</h4>

        <div className="form-group">
          <label>ID Card {formData.child_national_id ? '(Required) *' : '(Optional)'}</label>
          <div className="file-upload-wrapper">
            <input
              type="file"
              name="idCard"
              ref={idCardInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              required={!!formData.child_national_id}
              style={{ display: 'none' }}
              id="id-card-upload"
            />
            <button
              type="button"
              className="upload-btn"
              onClick={() => idCardInputRef.current.click()}
            >
              📋 Upload ID Card (PDF Only)
            </button>
            <small className="help-text">
              {formData.child_national_id
                ? '* ID Card PDF is required when providing a National ID'
                : '* ID Card PDF is optional unless providing a National ID'}
            </small>
            {files.idCard && <div className="file-selected">✅ {files.idCard.name}</div>}
          </div>
        </div>

        <div className="form-group">
          <label>Other Documents (Required) *</label>
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
              📁 Upload Documents (PDF Only)
            </button>
            <small className="help-text">* At least one supporting document PDF is required</small>
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

      {/* 5. Parent Information */}
      <div className="form-section">
        <h4>👨‍👩‍👧 {t('parent_info') || 'Parent Information'}</h4>

        {marriageChecked && isMarried ? (
          <div className="alert-success" style={{ padding: '15px', background: '#e6fffa', border: '1px solid #319795', borderRadius: '8px', marginBottom: '15px', color: '#234e52' }}>
            ✅ {t('spouse_found_desc') || "Your authorized marriage record has been retrieved. Parent details (Mother & Father) have been automatically populated."}
          </div>
        ) : marriageChecked && !isMarried ? (
          <div className="alert-warning" style={{ padding: '15px', background: '#fffaf0', border: '1px solid #dd6b20', borderRadius: '8px', marginBottom: '15px', color: '#7b341e' }}>
            ⚠️ {t('no_marriage_desc') || "No authorized marriage registration found in the system. To manually enter parent details, please enable the Special Case option below."}
            <label style={{ display: 'flex', alignItems: 'center', marginTop: '10px', gap: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={specialCase}
                onChange={(e) => setSpecialCase(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Enable Special Case Manual Entry
            </label>
          </div>
        ) : (
          <p className="section-help" style={{ color: '#2c5282', marginBottom: '15px' }}>
            ℹ️ Checking Marriage Registry status for automated data fetching...
          </p>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>{t('father_name')}: *</label>
            <input
              type="text"
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
              required
              disabled={isMarried || (!isMarried && !specialCase)}
              placeholder="Father's full name"
            />
          </div>

          <div className="form-group">
            <label>{t('father_occupation')}: *</label>
            <input
              type="text"
              name="fatherOccupation"
              value={formData.fatherOccupation}
              onChange={handleChange}
              required
              disabled={isMarried || (!isMarried && !specialCase)}
              placeholder="e.g., Farmer, Teacher, Merchant"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('father_nationality')}: *</label>
            <select
              name="fatherNationality"
              value={formData.fatherNationality}
              onChange={handleChange}
              required
              disabled={isMarried || (!isMarried && !specialCase)}
            >
              <option value="Ethiopian">{t('ethiopian')}</option>
              <option value="Foreigner">{t('foreigner')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('father_education')}: *</label>
            <select
              name="fatherEducation"
              value={formData.fatherEducation}
              onChange={handleChange}
              required
              disabled={isMarried || (!isMarried && !specialCase)}
            >
              <option value="">{t('select_education_level')}</option>
              <option value="none">{t('no_formal_education')}</option>
              <option value="primary">{t('primary_school')}</option>
              <option value="secondary">{t('secondary_school')}</option>
              <option value="diploma">{t('diploma')}</option>
              <option value="bachelor">{t('bachelors_degree')}</option>
              <option value="masters">{t('masters_degree')}</option>
              <option value="phd">{t('phd')}</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('mother_name')}: *</label>
            <input
              type="text"
              name="motherName"
              value={formData.motherName}
              onChange={handleChange}
              required
              disabled={isMarried || (!isMarried && !specialCase)}
              placeholder="Mother's full name"
            />
          </div>

          <div className="form-group">
            <label>{t('mother_occupation')}: *</label>
            <input
              type="text"
              name="motherOccupation"
              value={formData.motherOccupation}
              onChange={handleChange}
              required
              disabled={isMarried || (!isMarried && !specialCase)}
              placeholder="housewife, Merchant, Civil Servant"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('mother_nationality')}: *</label>
            <select
              name="motherNationality"
              value={formData.motherNationality}
              onChange={handleChange}
              required
              disabled={isMarried || (!isMarried && !specialCase)}
            >
              <option value="Ethiopian">{t('ethiopian')}</option>
              <option value="Foreigner">{t('foreigner')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('mother_education')}: *</label>
            <select
              name="motherEducation"
              value={formData.motherEducation}
              onChange={handleChange}
              required
              disabled={isMarried || (!isMarried && !specialCase)}
            >
              <option value="">{t('select_education_level')}</option>
              <option value="none">{t('no_formal_education')}</option>
              <option value="primary">{t('primary_school')}</option>
              <option value="secondary">{t('secondary_school')}</option>
              <option value="diploma">{t('diploma')}</option>
              <option value="bachelor">{t('bachelors_degree')}</option>
              <option value="masters">{t('masters_degree')}</option>
              <option value="phd">{t('phd')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-notice">
        <h5>⚠️ Important Information:</h5>
        <ul>
          <li>All photos must be recent 3×4 size with clear face view</li>
          <li>Application will be sent directly to your Kebele Representative</li>
          <li>After Kebele approval, it will move through Woreda → Zone → Region → National levels</li>
          <li>Birth certificate will be issued after National Representative approval</li>
          <li>You will receive notification at each approval stage</li>
        </ul>
      </div>

      <button type="submit" disabled={isSubmitting || loading} className="submit-btn">
        {isSubmitting || loading ? t('submitting') : t('submit_to_kebele')}
      </button>
    </form>
  );
};

export default BirthForm;