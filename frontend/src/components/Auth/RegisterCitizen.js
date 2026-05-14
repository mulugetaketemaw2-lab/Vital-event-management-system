import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { transliterate } from '../../utils/geezUtil';
import './Auth.css';

import LocationSelector from '../Common/LocationSelector';

const RegisterCitizen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { API_URL } = useAuth();


  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
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
      age: '',
      nationality: 'Ethiopian',
      religion: '',
      familyInfo: {
        fatherName: '',
        fatherOccupation: '',
        fatherNationality: 'Ethiopian',
        fatherEducation: '',
        motherName: '',
        motherOccupation: '',
        motherNationality: 'Ethiopian',
        motherEducation: '',
      }
    },
    location: {
      region: '',
      zone: '',
      woreda: '',
      kebele: ''
    },
    calendarType: 'gregorian' // 'gregorian' or 'ethiopian'
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
      handleChange({ target: { name: 'personalInfo.dateOfBirth', value: gcDateStr } });
    }
  };

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const stepTitles = [
    t('personal_information') || 'Personal Information',
    t('family_information') || 'Family Information',
    t('location_information') || 'Location Information',
    t('documents_and_account') || 'Documents & Account'
  ];

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [idCardPhoto, setIdCardPhoto] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [phoneticMode, setPhoneticMode] = useState(false);
  const [otherDocs, setOtherDocs] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const fileInputRef = useRef(null);
  const idCardInputRef = useRef(null);
  const otherDocsInputRef = useRef(null);

  // Verification state (Phase Two)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(0);

  React.useEffect(() => {
    let timer;
    if (showOtpModal && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, countdown]);

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
      const file = new File([blob], 'captured-profile.jpg', { type: 'image/jpeg' });
      setProfilePhoto(file);
      setPhotoPreview(dataUrl);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let filteredValue = value;
    const currentLang = i18n.language;

    // Strict validation logic
    if (name.includes('firstName') || name.includes('lastName') || name.includes('Name') || name.includes('Occupation') || name.includes('occupation')) {
      // Language-based letter validation
      if (currentLang === 'am') {
        // Only Amharic characters and spaces
        filteredValue = value.replace(/[^\u1200-\u137F\s]/g, '');
      } else {
        // Only English letters and spaces
        filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
      }
    } else if (name.includes('phone') || name === 'personalInfo.idNumber' || name === 'personalInfo.age') {
      // Only digits (non-negative numbers)
      filteredValue = value.replace(/\D/g, '');
    }

    // Phonetic Transliteration (Proactive UX Feature)
    if (phoneticMode && (name.includes('Name') || name.includes('occupation'))) {
      filteredValue = transliterate(filteredValue);
    }

    if (name.includes('.')) {
      const keys = name.split('.');
      setFormData(prev => {
        const newData = { ...prev };
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = filteredValue;

        // Auto-calculate age if date of birth is changed and is valid
        if (name === 'personalInfo.dateOfBirth' && filteredValue) {
          const birthDate = new Date(filteredValue);
          const today = new Date();
          if (!isNaN(birthDate.getTime())) {
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
            
            // Validation Rules
            let finalAge = calculatedAge;
            if (newData.calendarType === 'ethiopian') {
               const currentEC = getEthFromGregorian();
               finalAge = currentEC.year - parseInt(ethDate.year || currentEC.year);
               if (finalAge < 0) finalAge = 0;
            }

            if (birthDate > today && newData.calendarType === 'gregorian') {
              toast.error(t('error_future_birth_date') || "Birth date cannot be in the future.");
              newData.personalInfo.age = '';
            } else if (finalAge !== undefined && finalAge < 5) {
              toast.error("Citizens under 5 years of age must be registered by their parents via the Birth Registration form.");
              newData.personalInfo.age = '';
            } else {
              newData.personalInfo.age = finalAge.toString();
            }
          }
        }

        return newData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: filteredValue
      }));
    }
  };


  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }

    setProfilePhoto(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);

    toast.success('Profile photo uploaded');
  };

  const handleIdCardUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // Validate file type - PDF only
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file for ID Card');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ID card must be less than 5MB');
      return;
    }

    setIdCardPhoto(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setIdCardPreview(reader.result);
    };
    reader.readAsDataURL(file);

    toast.success('ID card uploaded');
  };

  const handleOtherDocsUpload = (e) => {
    const files = Array.from(e.target.files);

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return false;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} must be JPG, PNG, or PDF`);
        return false;
      }

      return true;
    });

    setOtherDocs(prev => [...prev, ...validFiles]);
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} document(s) uploaded`);
    }
  };





  const handleLocationChange = (locationData) => {
    console.log('Location changed:', locationData);
    setFormData(prev => ({
      ...prev,
      location: locationData
    }));
  };

  // Phase Two: OTP Handshake Trigger
  const initiateNationalIdVerification = async () => {
    // Phase One: Modern System Validation (Logic already in basic form validation triggers)
    if (!formData.personalInfo.idNumber) {
      toast.error('National ID Number is required for verification');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/fayda/verify-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idNumber: formData.personalInfo.idNumber
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.info('Verification initiated. OTP sent to your registered mobile.');
        setShowOtpModal(true);
        setCountdown(300); // 5 minutes

        // Debug mode: log the OTP for easier testing if returned
        if (data.debug_otp) {
          console.log('%c [FAYDA DEBUG] OTP Received: ' + data.debug_otp, 'background: #222; color: #bada55');
          // For convenience in some dev environments
          // setOtpValue(data.debug_otp.split(''));
        }
      } else {
        toast.error(data.message || 'Identity verification failed to start');
      }
    } catch (error) {
      console.error('Verification Trigger Error:', error);
      toast.error('Could not connect to National ID System. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    const fullOtp = otpValue.join('');
    if (fullOtp.length < 6) {
      setOtpError('Please enter the full 6-digit OTP');
      return;
    }

    setVerifyingOtp(true);
    setOtpError('');

    try {
      const response = await fetch(`${API_URL}/fayda/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idNumber: formData.personalInfo.idNumber,
          otp: fullOtp
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Identity Verified Successfully!');
        setShowOtpModal(false);
        // Phase Three: After Success Verification, proceed to Kebele Submission
        // We'll call the actual submit function now
        submitToKebele();
      } else {
        setOtpError(data.message || 'Incorrect OTP. Please check and try again.');
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
      setOtpError('System error during verification. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleBypassVerification = () => {
    toast.warn('Bypassing National ID verification (Demo Mode)');
    setShowOtpModal(false);
    submitToKebele();
  };

  // Per-step validation before going Next
  const validateStep = (step) => {
    if (step === 1) {
      const fields = [
        { val: formData.personalInfo.firstName, label: t('first_name') || 'First Name' },
        { val: formData.personalInfo.lastName, label: t('last_name') || 'Last Name' },
        { val: formData.personalInfo.gender, label: t('gender') || 'Gender' },
        { val: formData.personalInfo.dateOfBirth, label: t('date_of_birth') || 'Date of Birth' },
        { val: formData.personalInfo.phone, label: t('phone') || 'Phone Number' },
        { val: formData.personalInfo.idNumber, label: t('national_id_number') || 'National ID Number' },
      ];
      const missing = fields.find(f => !f.val || f.val === '');
      if (missing) {
        toast.warn('⚠️ Please complete all fields in this section.', { position: 'top-right', autoClose: 4000, toastId: 'step1-warn' });
        setTimeout(() => toast.error(`📋 Please, you forgot your ${missing.label}. Enter it and try again.`, { position: 'top-right', autoClose: 6000, toastId: 'step1-field' }), 400);
        return false;
      }
    }
    if (step === 2) {
      if (!formData.personalInfo.familyInfo?.fatherName) {
        toast.warn('⚠️ Please complete all fields in this section.', { position: 'top-right', autoClose: 4000, toastId: 'step2-warn' });
        setTimeout(() => toast.error(`📋 Please, you forgot ${t('father_name') || "Father's Name"}. Enter it and try again.`, { position: 'top-right', autoClose: 6000, toastId: 'step2-field' }), 400);
        return false;
      }
      if (!formData.personalInfo.familyInfo?.motherName) {
        toast.warn('⚠️ Please complete all fields in this section.', { position: 'top-right', autoClose: 4000, toastId: 'step2-warn' });
        setTimeout(() => toast.error(`📋 Please, you forgot ${t('mother_name') || "Mother's Name"}. Enter it and try again.`, { position: 'top-right', autoClose: 6000, toastId: 'step2-field' }), 400);
        return false;
      }
    }
    if (step === 3) {
      if (!formData.location.region || !formData.location.kebele) {
        toast.warn('⚠️ Please select your complete location.', { position: 'top-right', autoClose: 4000, toastId: 'step3-warn' });
        setTimeout(() => toast.error('📋 Please select at least your Region and Kebele to continue.', { position: 'top-right', autoClose: 6000, toastId: 'step3-field' }), 400);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check for required fields sequentially
    const requiredFields = [
      { key: 'personalInfo.firstName', label: t('first_name') || 'First Name' },
      { key: 'personalInfo.lastName', label: t('last_name') || 'Last Name' },
      { key: 'personalInfo.gender', label: t('gender') || 'Gender' },
      { key: 'personalInfo.phone', label: t('phone') || 'Phone Number' },
      { key: 'personalInfo.dateOfBirth', label: t('date_of_birth') || 'Date of Birth' },
      { key: 'personalInfo.idNumber', label: t('id_number') || 'National ID Number' },
      { key: 'location.region', label: t('region') || 'Region' },
      { key: 'location.kebele', label: t('kebele') || 'Kebele' },
      { key: 'personalInfo.familyInfo.fatherName', label: t('father_name') || "Father's Name" },
      { key: 'personalInfo.familyInfo.motherName', label: t('mother_name') || "Mother's Name" },
      { key: 'password', label: t('password') || 'Password' },
      { key: 'confirmPassword', label: t('confirm_password') || 'Confirm Password' }
    ];

    let firstEmptyField = null;
    let allFilled = true;

    for (const field of requiredFields) {
      // Robust retrieval for deeply nested values
      const val = field.key.split('.').reduce((obj, key) => obj?.[key], formData);

      if (!val || val === '') {
        allFilled = false;
        if (!firstEmptyField) {
          firstEmptyField = field;
        }
      }
    }

    if (!allFilled) {
      toast.error("Please, you have not completed all the information. Fill out the entire form and try again.", {
        position: "top-right",
        autoClose: 6000,
        toastId: 'incomplete-form'
      });
      if (firstEmptyField) {
        setTimeout(() => {
          toast.error(`Please, you forgot your ${firstEmptyField.label}. Enter it and try again.`, {
            position: "top-right",
            autoClose: 7000,
            toastId: `missing-${firstEmptyField.key}`
          });
        }, 600);
      }
      return;
    }

    // Logic Soundness Checks
    if (!formData.personalInfo.age || parseInt(formData.personalInfo.age) < 5) {
      toast.error('Citizens under 5 years of age must be registered by their parents via the Birth Registration form.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!profilePhoto || !idCardPhoto) {
      toast.error('Profile photo and National ID are both required.');
      return;
    }

    // Step A: Verification Trigger
    initiateNationalIdVerification();
  };

  const submitToKebele = async () => {
    console.log('--- Phase Three: Routing to Kebele Approval ---');
    setLoading(true);

    try {
      const formDataToSend = new FormData();

      // Debug: Check if personalInfo exists
      if (!formData.personalInfo) {
        toast.error('Personal information is missing');
        setLoading(false);
        return;
      }

      // Add all form fields
      formDataToSend.append('personalInfo.firstName', formData.personalInfo.firstName);
      formDataToSend.append('personalInfo.lastName', formData.personalInfo.lastName);
      if (formData.personalInfo.email) formDataToSend.append('personalInfo.email', formData.personalInfo.email);
      formDataToSend.append('personalInfo.phone', formData.personalInfo.phone);
      formDataToSend.append('personalInfo.dateOfBirth', formData.personalInfo.dateOfBirth);
      formDataToSend.append('personalInfo.gender', formData.personalInfo.gender);
      if (formData.personalInfo.maritalStatus) formDataToSend.append('personalInfo.maritalStatus', formData.personalInfo.maritalStatus);
      if (formData.personalInfo.occupation) formDataToSend.append('personalInfo.occupation', formData.personalInfo.occupation);
      if (formData.personalInfo.educationLevel) formDataToSend.append('personalInfo.educationLevel', formData.personalInfo.educationLevel);
      formDataToSend.append('personalInfo.idNumber', formData.personalInfo.idNumber);
      formDataToSend.append('personalInfo.age', formData.personalInfo.age);
      formDataToSend.append('personalInfo.nationality', formData.personalInfo.nationality);

      // Family Information
      if (formData.personalInfo.familyInfo) {
        Object.entries(formData.personalInfo.familyInfo).forEach(([key, value]) => {
          formDataToSend.append(`personalInfo.familyInfo.${key}`, value);
        });
      }

      if (formData.username) {
        formDataToSend.append('username', formData.username);
      } else {
        const phoneUsername = formData.personalInfo.phone || '';
        const username = phoneUsername.length >= 3 ? phoneUsername : `user${Date.now()}`;
        formDataToSend.append('username', username);
      }

      // Location fields
      const locationObj = formData.location || {};
      const locationData = {
        region: locationObj.region || '',
        regionName: locationObj.regionName || '',
        zone: locationObj.zone || '',
        zoneName: locationObj.zoneName || '',
        woreda: locationObj.woreda || '',
        woredaName: locationObj.woredaName || '',
        kebele: locationObj.kebele || '',
        kebeleName: locationObj.kebeleName || ''
      };
      formDataToSend.append('location', JSON.stringify(locationData));

      if (formData.password) formDataToSend.append('password', formData.password);

      // Add profile photo
      if (profilePhoto) formDataToSend.append('profilePhoto', profilePhoto);

      // Add ID card
      if (idCardPhoto) formDataToSend.append('idCard', idCardPhoto);

      // Add other documents
      otherDocs.forEach((doc) => {
        formDataToSend.append('documents', doc);
      });

      const response = await fetch(`${API_URL}/auth/register-citizen`, {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Registration submitted successfully!');
        // Reset form
        setFormData({
          username: '',
          password: '',
          confirmPassword: '',
          personalInfo: {
            firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '',
            maritalStatus: '', occupation: '', educationLevel: '', idNumber: '', age: '',
            nationality: 'Ethiopian',
            familyInfo: {
              fatherName: '', fatherOccupation: '', fatherNationality: 'Ethiopian', fatherEducation: '',
              motherName: '', motherOccupation: '', motherNationality: 'Ethiopian', motherEducation: ''
            }
          },
          location: { region: '', zone: '', woreda: '', kebele: '' }
        });
        setProfilePhoto(null);
        setPhotoPreview(null);
        setIdCardPhoto(null);
        setIdCardPreview(null);
        setOtherDocs([]);
        navigate('/login', { state: { message: 'Registration submitted. Please wait for review.' } });
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" >
      <div className="auth-card wide-registration-card">
        <div className="auth-header" style={{ position: 'relative', marginBottom: '2.5rem' }}>
          <div style={{ position: 'absolute', top: '-15px', left: 0 }}>
            <Link to="/login" style={{
              textDecoration: 'none',
              color: '#667eea',
              fontSize: '0.9rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 0'
            }}>
              <span style={{ fontSize: '1.2rem' }}>←</span> {t('back_to_login')}
            </Link>
          </div>
          <h2>{t('citizen_registration')}</h2>
          <p className="auth-subtitle">
            <span style={{ color: '#e74c3c', fontWeight: 'bold', display: 'block' }}>
              📍 {t('registration_sent_to_kebele')}
            </span>
          </p>
        </div>

        {/* Step Progress Indicator */}
        <div className="wizard-steps">
          {stepTitles.map((title, i) => (
            <div key={i} className={`wizard-step ${currentStep === i + 1 ? 'active' : ''} ${currentStep > i + 1 ? 'completed' : ''}`}>
              <div className="wizard-step-circle">{currentStep > i + 1 ? '✓' : i + 1}</div>
              <div className="wizard-step-label">{title}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" noValidate>
          {/* Dummy hidden fields to catch browser autofill */}
          <input type="text" name="prevent_autofill" style={{ display: 'none' }} tabIndex="-1" />
          <input type="password" name="prevent_autofill_pwd" style={{ display: 'none' }} tabIndex="-1" />

          {/* ===== STEP 1: Personal Information ===== */}
          {currentStep === 1 && <div className="form-section">
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
                    <span style={{ fontSize: '3rem', display: 'block' }}>👤</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{t('profile_preview')}</span>
                    <small style={{ fontSize: '0.7rem' }}>{t('required_3x4')}</small>
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
            </div>
              

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePhotoUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />

            {/* Form Fields */}
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
                  transition: '.4s',
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
            <div className="form-row">
              <div className="form-group">
                <label>{t('username')}: *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder={t('choose_username')}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('first_name')}: *</label>
                <input
                  type="text"
                  name="personalInfo.firstName"
                  value={formData.personalInfo.firstName}
                  onChange={handleChange}
                  required
                  placeholder={t('your_first_name')}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label>{t('last_name')}: *</label>
                <input
                  type="text"
                  name="personalInfo.lastName"
                  value={formData.personalInfo.lastName}
                  onChange={handleChange}
                  required
                  placeholder={t('your_last_name')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ marginBottom: '20px' }}>
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
              <div className="form-group" style={{ position: 'relative' }}>
                <label>{t('date_of_birth')}: *</label>
                {formData.calendarType === 'gregorian' ? (
                  <input
                    type="date"
                    name="personalInfo.dateOfBirth"
                    value={formData.personalInfo.dateOfBirth}
                    onChange={handleChange}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    style={{
                      borderColor: formData.personalInfo.dateOfBirth && new Date(formData.personalInfo.dateOfBirth) > new Date() ? '#ef4444' : '#d1d5db',
                      width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc'
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      name="month" 
                      value={ethDate.month} 
                      onChange={handleEthDateChange}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: 'white' }}
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
                      style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
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
                      style={{ width: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                      required
                    />
                  </div>
                )}
                {formData.personalInfo.dateOfBirth && new Date(formData.personalInfo.dateOfBirth) > new Date() && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    ⚠️ {t('error_future_birth_date') || "Birth date cannot be in the future."}
                  </span>
                )}
                {formData.personalInfo.idNumber === '' && parseInt(formData.personalInfo.age) > 5 && (
                   <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    ⚠️ {t('error_age_limit_5') || "Registrant must be under 5 years of age for Parental Reference category."}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>{t('age')}: *</label>
                <input
                  type="text"
                  name="personalInfo.age"
                  value={formData.personalInfo.age}
                  required
                  readOnly
                  placeholder={t('auto_calculated_age') || "Auto-calculated"}
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('gender')}: *</label>
                <select
                  name="personalInfo.gender"
                  value={formData.personalInfo.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">{t('select_gender')}</option>
                  <option value="male">{t('male')}</option>
                  <option value="female">{t('female')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('nationality')}: *</label>
                <select
                  name="personalInfo.nationality"
                  value={formData.personalInfo.nationality}
                  onChange={handleChange}
                  required
                >
                  <option value="Ethiopian">{t('ethiopian')}</option>
                  <option value="Foreigner">{t('foreigner')}</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>{t('national_id_number')}: *</label>
                  <span style={{ fontSize: '0.75rem', color: formData.personalInfo.idNumber.length === 16 ? '#e74c3c' : '#666' }}>
                    {formData.personalInfo.idNumber.length}/16
                  </span>
                </div>
                <input
                  type="text"
                  name="personalInfo.idNumber"
                  value={formData.personalInfo.idNumber}
                  onChange={handleChange}
                  required
                  maxLength="16"
                  placeholder={t('national_id_number')}
                />
              </div>

              <div className="form-group">
                <label>{t('marital_status')}: *</label>
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
                <label>{t('religion') || 'Religion'}: *</label>
                <select
                  name="personalInfo.religion"
                  value={formData.personalInfo.religion}
                  onChange={handleChange}
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
                <label>{t('occupation')}: *</label>
                <input
                  type="text"
                  name="personalInfo.occupation"
                  value={formData.personalInfo.occupation}
                  onChange={handleChange}
                  required
                  placeholder={t('your_occupation')}
                />
              </div>

              <div className="form-group">
                <label>{t('education_level')}: *</label>
                <select
                  name="personalInfo.educationLevel"
                  value={formData.personalInfo.educationLevel}
                  onChange={handleChange}
                  required
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
                <label>{t('email')}:</label>
                <input
                  type="email"
                  name="personalInfo.email"
                  value={formData.personalInfo.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                />
              </div>

              <div className="form-group">
                <label>{t('phone')}: *</label>
                <input
                  type="tel"
                  name="personalInfo.phone"
                  value={formData.personalInfo.phone}
                  onChange={handleChange}
                  required
                  placeholder="0912345678"
                />
              </div>
            </div>
          </div>}

          {/* ===== STEP 2: Family Information ===== */}
          {currentStep === 2 && <div className="form-section">
            <h4>👨‍👩‍👧‍👦 {t('family_information')}</h4>

            <div className="form-row">
              <div className="form-group">
                <label>{t('father_name')}: *</label>
                <input
                  type="text"
                  name="personalInfo.familyInfo.fatherName"
                  value={formData.personalInfo.familyInfo.fatherName}
                  onChange={handleChange}
                  required
                  placeholder={t('enter_father_name')}
                />
              </div>
              <div className="form-group">
                <label>{t('father_occupation')}:</label>
                <input
                  type="text"
                  name="personalInfo.familyInfo.fatherOccupation"
                  value={formData.personalInfo.familyInfo.fatherOccupation}
                  onChange={handleChange}
                  placeholder={t('enter_father_occupation')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('father_nationality')}:</label>
                <select
                  name="personalInfo.familyInfo.fatherNationality"
                  value={formData.personalInfo.familyInfo.fatherNationality}
                  onChange={handleChange}
                >
                  <option value="Ethiopian">{t('ethiopian')}</option>
                  <option value="Foreigner">{t('foreigner')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('father_education')}:</label>
                <select
                  name="personalInfo.familyInfo.fatherEducation"
                  value={formData.personalInfo.familyInfo.fatherEducation}
                  onChange={handleChange}
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
                  name="personalInfo.familyInfo.motherName"
                  value={formData.personalInfo.familyInfo.motherName}
                  onChange={handleChange}
                  required
                  placeholder={t('enter_mother_name')}
                />
              </div>
              <div className="form-group">
                <label>{t('mother_occupation')}:</label>
                <input
                  type="text"
                  name="personalInfo.familyInfo.motherOccupation"
                  value={formData.personalInfo.familyInfo.motherOccupation}
                  onChange={handleChange}
                  placeholder={t('enter_mother_occupation')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('mother_nationality')}:</label>
                <select
                  name="personalInfo.familyInfo.motherNationality"
                  value={formData.personalInfo.familyInfo.motherNationality}
                  onChange={handleChange}
                >
                  <option value="Ethiopian">{t('ethiopian')}</option>
                  <option value="Foreigner">{t('foreigner')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('mother_education')}:</label>
                <select
                  name="personalInfo.familyInfo.motherEducation"
                  value={formData.personalInfo.familyInfo.motherEducation}
                  onChange={handleChange}
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
          </div>}

          {/* ===== STEP 3: Location Information ===== */}
          {currentStep === 3 && <div className="form-section">
            <h4>📍 {t('location_information')}</h4>
            <p className="location-help" style={{ color: '#e74c3c', fontWeight: 'bold' }}>
              ⚠️ {t('registration_sent_to_kebele')}
            </p>

            <LocationSelector
              onLocationChange={handleLocationChange}
              hideLevels={[]}
            />

            {formData.location && formData.location.kebele && (
              <div className="location-confirmation">
                <h5>📍 Selected Location:</h5>
                <div className="location-display">
                  {formData.location.regionName && <span>Region: {formData.location.regionName}</span>}
                  {formData.location.zoneName && <span>Zone: {formData.location.zoneName}</span>}
                  {formData.location.woredaName && <span>Woreda: {formData.location.woredaName}</span>}
                  {formData.location.kebeleName && <span>Kebele: {formData.location.kebeleName}</span>}
                  <p style={{ fontWeight: 'bold', color: '#27ae60' }}>
                    ✓ Registration will be sent to {formData.location.kebeleName || formData.location.kebele} Kebele
                  </p>
                </div>
              </div>
            )}
          </div>}

          {/* ===== STEP 4: Documents, Account & Submit ===== */}
          {currentStep === 4 && <div className="form-section">
            <h4>📄 {t('document_uploads')}</h4>

            <div className="upload-section">
              <div className="upload-item">
                <label>{t('national_id_number')} (PDF) *</label>
                <div className="upload-area">
                  <input
                    type="file"
                    ref={idCardInputRef}
                    onChange={handleIdCardUpload}
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => idCardInputRef.current?.click()}
                    className="upload-btn"
                  >
                    📋 {t('upload_national_id_pdf')}
                  </button>
                  {idCardPreview && (
                    <div className="preview">
                      <div className="pdf-preview">
                        📄 {idCardPhoto?.name || 'ID Card PDF'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIdCardPhoto(null);
                          setIdCardPreview(null);
                        }}
                        className="remove-btn"
                      >
                        {t('remove')}
                      </button>
                    </div>
                  )}
                  {!idCardPreview && (
                    <small className="required-note">* National ID PDF is required for registration</small>
                  )}
                </div>
              </div>

              <div className="upload-item">
                <label>{t('id_card')} (PDF) *</label>
                <div className="upload-area">
                  <input
                    type="file"
                    ref={otherDocsInputRef}
                    onChange={handleOtherDocsUpload}
                    accept="application/pdf"
                    multiple
                    style={{ display: 'none' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => otherDocsInputRef.current?.click()}
                    className="upload-btn"
                  >
                    📁 {t('upload_kebele_id_pdf')}
                  </button>
                  {otherDocs.length > 0 && (
                    <div className="documents-list">
                      {otherDocs.map((doc, index) => (
                        <div key={index} className="document-item">
                          <div className="pdf-document">
                            📄 {doc.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newDocs = otherDocs.filter((_, i) => i !== index);
                              setOtherDocs(newDocs);
                            }}
                            className="remove-btn"
                          >
                            {t('remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {otherDocs.length === 0 && (
                    <small className="required-note">* Kebele Resident ID PDF is required</small>
                  )}
                </div>
              </div>
            </div>
          </div>}

          {currentStep === 4 && <div className="form-section">
            <h4>🔐 {t('account_information')}</h4>

            <div className="form-row">
              <div className="form-group password-group">
                <label>{t('password')}: *</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder={t('minimum_6_chars')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group password-group">
                <label>{t('confirm_new_password')}: *</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder={t('reenter_password')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            </div>
          </div>}

          {currentStep === 4 && (
          <>
          <div className="terms-section">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>{t('confirm_info_accurate')}</span>
            </label>
          </div>

          <button type="submit" disabled={loading} className="auth-btn citizen-btn">
            {loading ? (
              <span>
                <span className="spinner"></span> {t('submitting')}
              </span>
            ) : (
              t('submit_registration_to_kebele')
            )}
          </button>

          <div className="auth-links" style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
            <p style={{ margin: '0 0 10px 0', color: '#4a5568' }}>
              {t('already_have_account')} <Link to="/login" style={{ color: '#667eea', fontWeight: 'bold', textDecoration: 'none', marginLeft: '5px' }}>{t('login_here')}</Link>
            </p>
            <p style={{ margin: 0 }}>
              <Link to="/" style={{ color: '#718096', textDecoration: 'none', fontSize: '0.9rem' }}>← {t('back_to_home')}</Link>
            </p>
          </div>
          </>
          )}

          {/* ===== Wizard Navigation Buttons ===== */}
          <div className="wizard-nav">
            {currentStep > 1 && (
              <button type="button" className="wizard-btn-prev" onClick={handlePrevious}>
                ← {t('previous') || 'Previous'}
              </button>
            )}
            {currentStep < totalSteps && (
              <button type="button" className="wizard-btn-next" onClick={handleNext}>
                {t('next') || 'Next'} →
              </button>
            )}
          </div>

        </form>

      </div>

      {showOtpModal && (
        <div className="otp-modal-overlay">
          <div className="otp-modal">
            <div className="otp-header">
              <h3>🔐 National ID Verification</h3>
              <div className="fayda-badge">National Fayda ID System</div>
              <p>Please enter the 6-digit OTP sent to your phone linked with your ID <strong>{formData.personalInfo.idNumber}</strong> to verify your identity.</p>
            </div>

            <div className="otp-input-row">
              {otpValue.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (!val && e.nativeEvent.inputType === 'deleteContentBackward') {
                      // Handle backspace
                    }
                    const newOtp = [...otpValue];
                    newOtp[index] = val.charAt(val.length - 1);
                    setOtpValue(newOtp);

                    // Auto-focus next input
                    if (val && index < 5) {
                      const nextInput = document.getElementById(`otp-${index + 1}`);
                      if (nextInput) nextInput.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
                      const prevInput = document.getElementById(`otp-${index - 1}`);
                      if (prevInput) prevInput.focus();
                    }
                  }}
                  id={`otp-${index}`}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {otpError && <p className="otp-error-msg">❌ {otpError}</p>}

            <div className="otp-countdown">
              {countdown > 0 ? (
                <span>OTP expires in: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
              ) : (
                <span className="expired">OTP Expired</span>
              )}
            </div>

            <div className="otp-footer">
              <button
                type="button"
                className="otp-submit-btn"
                onClick={handleOtpSubmit}
                disabled={verifyingOtp}
              >
                {verifyingOtp ? (
                  <span><span className="spinner"></span> Verifying...</span>
                ) : (
                  'Submit Verification'
                )}
              </button>
              <button
                type="button"
                className="otp-cancel-btn"
                onClick={handleBypassVerification}
                style={{ backgroundColor: '#ed8936', color: 'white' }}
              >
                Skip Verification (Demo)
              </button>
              <button
                type="button"
                className="otp-cancel-btn"
                onClick={() => {
                  setShowOtpModal(false);
                  setLoading(false);
                }}
              >
                Cancel
              </button>
            </div>

            <div className="verification-notice">
              ⚠️ Note: For demonstration purposes, you can use the "Skip Verification" button.
            </div>
            <div className="verification-notice">
              ⚠️ Your application is held securely until identity is verified.
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
};

export default RegisterCitizen;
