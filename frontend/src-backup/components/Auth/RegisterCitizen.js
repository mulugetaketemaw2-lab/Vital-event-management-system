import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import LocationSelector from '../Common/LocationSelector';

const RegisterCitizen = () => {
  const navigate = useNavigate();
  const { API_URL } = useAuth();
  
  // Temporary fix: Define API_URL directly
  const API_URL_FIXED = 'http://localhost:5000/api';
  
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
    },
    location: {
      region: '',
      zone: '',
      woreda: '',
      kebele: ''
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
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [otherDocs, setOtherDocs] = useState([]);

  const fileInputRef = useRef(null);
  const idCardInputRef = useRef(null);
  const otherDocsInputRef = useRef(null);

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
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPG or PNG image file');
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

  const removeDocument = (index) => {
    setOtherDocs(prev => prev.filter((_, i) => i !== index));
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
    
    toast.success('Family member added');
  };

  const removeFamilyMember = (index) => {
    setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationChange = (locationData) => {
    console.log('Location changed:', locationData);
    setFormData(prev => ({
      ...prev,
      location: locationData
    }));    
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
      console.log('=== DEBUG: Form Data Structure ===');
  console.log('Full formData:', formData);
  console.log('formData.personalInfo:', formData.personalInfo);
  console.log('formData.personalInfo?.firstName:', formData.personalInfo?.firstName);
  console.log('formData.personalInfo?.lastName:', formData.personalInfo?.lastName);
  console.log('Type of formData.personalInfo:', typeof formData.personalInfo);
  console.log('=== END DEBUG ===');
  // Validate passwords
  if (formData.password !== formData.confirmPassword) {
    toast.error('Passwords do not match');
    return;
  }
  
  // Validate required location fields
    if (!formData.location.region || !formData.location.kebele) {
      toast.error('Please select your complete location (Region and Kebele)');
      return;
    }

  if (formData.password.length < 6) {
    toast.error('Password must be at least 6 characters');
    return;
  }

  // Validate required personal fields
  const requiredPersonalFields = ['firstName', 'lastName', 'phone', 'gender', 'dateOfBirth', 'idNumber'];
  const missingFields = requiredPersonalFields.filter(field => !formData.personalInfo[field]);
  
  if (missingFields.length > 0) {
    toast.error(`Please fill all required personal information`);
    return;
  }

  // Validate profile photo
  if (!profilePhoto) {
    toast.error('Please upload a profile photo for identification');
    return;
  }

  setLoading(true);

  // Debug: Log form data before creating FormData
  console.log('=== FORM SUBMISSION DEBUG ===');
  console.log('formData:', formData);
  console.log('formData.personalInfo:', formData.personalInfo);
  console.log('profilePhoto:', profilePhoto);
  console.log('familyMembers:', familyMembers);
  console.log('=== END DEBUG ===');

    try {
      const formDataToSend = new FormData();
      
      // Debug: Check if personalInfo exists and has values
      if (!formData.personalInfo) {
        console.error('personalInfo is missing!');
        toast.error('Personal information is missing');
        setLoading(false);
        return;
      }
      
      // Add all form fields with validation
      if (formData.personalInfo.firstName) {
        formDataToSend.append('personalInfo.firstName', formData.personalInfo.firstName);
        console.log('Added personalInfo.firstName:', formData.personalInfo.firstName);
      } else {
        console.error('firstName is missing!');
      }
      
      if (formData.personalInfo.lastName) {
        formDataToSend.append('personalInfo.lastName', formData.personalInfo.lastName);
        console.log('Added personalInfo.lastName:', formData.personalInfo.lastName);
      } else {
        console.error('lastName is missing!');
      }
      
      if (formData.personalInfo.email) {
        formDataToSend.append('personalInfo.email', formData.personalInfo.email);
        console.log('Added personalInfo.email:', formData.personalInfo.email);
      }
      
      if (formData.personalInfo.phone) {
        formDataToSend.append('personalInfo.phone', formData.personalInfo.phone);
        console.log('Added personalInfo.phone:', formData.personalInfo.phone);
      } else {
        console.error('phone is missing!');
      }
      
      if (formData.personalInfo.dateOfBirth) {
        formDataToSend.append('personalInfo.dateOfBirth', formData.personalInfo.dateOfBirth);
        console.log('Added personalInfo.dateOfBirth:', formData.personalInfo.dateOfBirth);
      } else {
        console.error('dateOfBirth is missing!');
      }
      
      if (formData.personalInfo.gender) {
        formDataToSend.append('personalInfo.gender', formData.personalInfo.gender);
        console.log('Added personalInfo.gender:', formData.personalInfo.gender);
      } else {
        console.error('gender is missing!');
      }
      
      if (formData.personalInfo.maritalStatus) {
        formDataToSend.append('personalInfo.maritalStatus', formData.personalInfo.maritalStatus);
      }
      
      if (formData.personalInfo.occupation) {
        formDataToSend.append('personalInfo.occupation', formData.personalInfo.occupation);
      }
      
      if (formData.personalInfo.educationLevel) {
        formDataToSend.append('personalInfo.educationLevel', formData.personalInfo.educationLevel);
      }
      
      if (formData.personalInfo.idNumber) {
        formDataToSend.append('personalInfo.idNumber', formData.personalInfo.idNumber);
        console.log('Added personalInfo.idNumber:', formData.personalInfo.idNumber);
      } else {
        console.error('idNumber is missing!');
      }
      
      if (formData.username) {
        formDataToSend.append('username', formData.username);
        console.log('Added username:', formData.username);
      } else {
        // Create username from phone number, ensuring minimum 3 characters
        const phoneUsername = formData.personalInfo.phone || '';
        const username = phoneUsername.length >= 3 ? phoneUsername : `user${Date.now()}`;
        formDataToSend.append('username', username);
        console.log('Generated username:', username);
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
      console.log('Added location:', locationData);
      
      // Account
      if (formData.password) {
        formDataToSend.append('password', formData.password);
        console.log('Added password: [HIDDEN]');
      } else {
        console.error('password is missing!');
      }
      
      // Family members as JSON
      if (familyMembers.length > 0) {
        formDataToSend.append('familyMembers', JSON.stringify(familyMembers));
        console.log('Added familyMembers:', familyMembers);
      } else {
        formDataToSend.append('familyMembers', '[]');
        console.log('Added empty familyMembers array');
      }
      
      // Add profile photo
      if (profilePhoto) {
        formDataToSend.append('profilePhoto', profilePhoto);
        console.log('Added profilePhoto:', profilePhoto.name);
      } else {
        console.error('profilePhoto is missing!');
      }
      
      // Add ID card if provided
      if (idCardPhoto) {
        formDataToSend.append('idCard', idCardPhoto);
        console.log('Added idCard:', idCardPhoto.name);
      }
      
      // Add other documents
      otherDocs.forEach((doc, index) => {
        formDataToSend.append('documents', doc);
        console.log(`Added document ${index}:`, doc.name);
      });

      // Debug: Log FormData contents before sending
      console.log('=== FINAL FORMDATA CONTENTS ===');
      console.log('FormData entries:');
      for (let [key, value] of formDataToSend.entries()) {
        if (value instanceof File) {
          console.log(`${key}:`, {
            name: value.name,
            type: value.type,
            size: value.size + ' bytes'
          });
        } else {
          console.log(`${key}:`, value);
        }
      }
      
      // Calculate total size
      let totalSize = 0;
      for (let value of formDataToSend.values()) {
        if (value instanceof File) {
          totalSize += value.size;
        }
      }
      console.log(`Total upload size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log('=== END FORMDATA DEBUG ===');
  
    

      // CORRECT ENDPOINT FOR YOUR BACKEND
      const fullUrl = `${API_URL_FIXED}/auth/register-citizen`;
      console.log('=== API REQUEST DEBUG ===');
      console.log('API_URL:', API_URL);
      console.log('API_URL_FIXED:', API_URL_FIXED);
      console.log('Full URL:', fullUrl);
      console.log('=== END API DEBUG ===');
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        body: formDataToSend
      });
      
      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', data);

      if (response.ok) {
        toast.success('Registration submitted successfully! Your account is pending Kebele review.');
        
        // Reset form
        setFormData({
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
          },
          location: {
            region: '',
            zone: '',
            woreda: '',
            kebele: ''
          }
        });
        setFamilyMembers([]);
        setProfilePhoto(null);
        setPhotoPreview(null);
        setIdCardPhoto(null);
        setIdCardPreview(null);
        setOtherDocs([]);
        
        // Navigate to login
        navigate('/login', { 
          state: { 
            message: 'Registration submitted. Please wait for Kebele verification.' 
          } 
        });
      } else {
        // Enhanced error logging for 400 errors
        console.error('=== REGISTRATION ERROR DETAILS ===');
        console.error('Status:', response.status);
        console.error('Status Text:', response.statusText);
        console.error('Error Data:', data);
        console.error('Error Message:', data.message);
        console.error('Error Details:', data.errors || data.details);
        
        // Show specific validation errors
        if (data.errors && Array.isArray(data.errors)) {
          console.error('Validation Errors:');
          data.errors.forEach((error, index) => {
            console.error(`  Error ${index + 1}:`, error);
            console.error(`  Full object:`, JSON.stringify(error, null, 2));
            // Try different possible field names
            const fieldName = error.field || error.param || error.name || 'Unknown';
            const errorMessage = error.msg || error.message || error.error || 'Unknown error';
            console.error(`  ${index + 1}. ${fieldName}: ${errorMessage}`);
          });
        }
        console.error('=== END ERROR DETAILS ===');
        
        // Show specific error message
        let errorMessage = data.message || data.error || 'Registration failed';
        
        // If there are validation errors, show them
        if (data.errors && Array.isArray(data.errors)) {
          const validationErrors = data.errors.map(err => {
            const fieldName = err.field || err.param || err.name || 'Unknown';
            const errorMessage = err.msg || err.message || err.error || 'Unknown error';
            return `${fieldName}: ${errorMessage}`;
          }).join(', ');
          errorMessage = `Validation failed: ${validationErrors}`;
        }
        
        toast.error(`Registration failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
       if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.');
    } else if (error.message && error.message.includes('Network Error')) {
      toast.error('Network error. Please check your connection.');
    }
      // Detailed error handling
      if (error.response) {
        const { status, data } = error.response;
        
        // Handle 3x4 photo validation error
        if (status === 400 && data.message && data.message.includes('3:4')) {
          toast.error(
            <div>
              <strong>Photo Validation Failed:</strong><br/>
              {data.message}<br/>
              {data.details && `Dimensions: ${data.details.actualDimensions}`}
            </div>
          );
        } 
        else if (status === 400) {
          toast.error(data.message || 'Please check your information and try again.');
        } 
        else if (status === 409) {
          toast.error(data.message || 'Duplicate information. Please use different information.');
        } 
        else if (status === 413) {
          toast.error('File(s) too large. Please reduce file sizes.');
        } 
        else {
          toast.error(`Error ${status}: ${data.message || 'Registration failed'}`);
        }
      } else if (error.request) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    };
    
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Citizen Registration</h2>
          <p className="auth-subtitle">
            <span style={{color: '#e74c3c', fontWeight: 'bold', display: 'block'}}>
              📍 Registration will be sent to your Kebele for review
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className="form-section">
            <h4>👤 Personal Information</h4>
            
            {/* Photo Upload */}
            <div className="photo-upload-section">
              <div className="photo-preview-container">
                <div className="photo-preview">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile Preview" />
                  ) : (
                    <div className="photo-placeholder">
                      <span>Profile Photo</span>
                      <small>Required (3×4 recommended)</small>
                    </div>
                  )}
                </div>
                <div className="photo-upload-btn">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfilePhotoUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="upload-btn"
                  >
                    📷 Upload Photo
                  </button>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="form-row">
              <div className="form-group">
                <label>Username: *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Choose a username"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>First Name: *</label>
                <input
                  type="text"
                  name="personalInfo.firstName"
                  value={formData.personalInfo.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Your first name"
                />
              </div>

              <div className="form-group">
                <label>Last Name: *</label>
                <input
                  type="text"
                  name="personalInfo.lastName"
                  value={formData.personalInfo.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Your last name"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth: *</label>
                <input
                  type="date"
                  name="personalInfo.dateOfBirth"
                  value={formData.personalInfo.dateOfBirth}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Gender: *</label>
                <select
                  name="personalInfo.gender"
                  value={formData.personalInfo.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ID Number: *</label>
                <input
                  type="text"
                  name="personalInfo.idNumber"
                  value={formData.personalInfo.idNumber}
                  onChange={handleChange}
                  required
                  placeholder="National ID number"
                />
              </div>

              <div className="form-group">
                <label>Marital Status: *</label>
                <select
                  name="personalInfo.maritalStatus"
                  value={formData.personalInfo.maritalStatus}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Occupation: *</label>
                <input
                  type="text"
                  name="personalInfo.occupation"
                  value={formData.personalInfo.occupation}
                  onChange={handleChange}
                  required
                  placeholder="Your occupation"
                />
              </div>

              <div className="form-group">
                <label>Education Level: *</label>
                <select
                  name="personalInfo.educationLevel"
                  value={formData.personalInfo.educationLevel}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Education Level</option>
                  <option value="none">No Formal Education</option>
                  <option value="primary">Primary School</option>
                  <option value="secondary">Secondary School</option>
                  <option value="diploma">Diploma</option>
                  <option value="bachelor">Bachelor's Degree</option>
                  <option value="masters">Master's Degree</option>
                  <option value="phd">PhD</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="personalInfo.email"
                  value={formData.personalInfo.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                />
              </div>

              <div className="form-group">
                <label>Phone: *</label>
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
          </div>

          {/* Family Members */}
          <div className="form-section">
            <h4>👨‍👩‍👧‍👦 Family Members</h4>
            
            <div className="family-member-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={familyMember.name}
                    onChange={handleFamilyMemberChange}
                    placeholder="Family member name"
                  />
                </div>

                <div className="form-group">
                  <label>Relationship</label>
                  <select
                    name="relationship"
                    value={familyMember.relationship}
                    onChange={handleFamilyMemberChange}
                  >
                    <option value="">Select Relationship</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>ID Type</label>
                  <select
                    value={familyMember.idType}
                    onChange={(e) => setFamilyMember(prev => ({ ...prev, idType: e.target.value }))}
                  >
                    <option value="">Select ID Type</option>
                    <option value="national_id">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="birth_certificate">Birth Certificate</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ID Number</label>
                  <input
                    type="text"
                    value={familyMember.idNumber}
                    onChange={(e) => setFamilyMember(prev => ({ ...prev, idNumber: e.target.value }))}
                    placeholder="ID number"
                  />
                </div>
              </div>
              <button type="button" onClick={addFamilyMember} className="add-btn">
                ➕ Add Family Member
              </button>
            </div>
            
            {familyMembers.length > 0 && (
              <div className="family-members-list">
                <h5>Added Family Members ({familyMembers.length})</h5>
                {familyMembers.map((member, index) => (
                  <div key={index} className="family-member-item">
                    <span>
                      <strong>{member.name}</strong> - {member.relationship}
                      {member.idNumber && ` (ID: ${member.idNumber})`}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => removeFamilyMember(index)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location Information */}
          <div className="form-section">
            <h4>📍 Location Information</h4>
            <p className="location-help" style={{color: '#e74c3c', fontWeight: 'bold'}}>
              ⚠️ Your registration will be sent to the Kebele you select below
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
                  <p style={{fontWeight: 'bold', color: '#27ae60'}}>
                    ✓ Registration will be sent to {formData.location.kebeleName || formData.location.kebele} Kebele
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Document Uploads */}
          <div className="form-section">
            <h4>📄 Document Uploads</h4>
            
            <div className="upload-section">
              <div className="upload-item">
                <label>ID Card (Optional)</label>
                <div className="upload-area">
                  <input
                    type="file"
                    ref={idCardInputRef}
                    onChange={handleIdCardUpload}
                    accept="image/jpeg,image/jpg,image/png"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => idCardInputRef.current?.click()}
                    className="upload-btn"
                  >
                    📋 Upload ID Card
                  </button>
                  {idCardPreview && (
                    <div className="preview">
                      <img src={idCardPreview} alt="ID Card Preview" />
                      <button
                        type="button"
                        onClick={() => {
                          setIdCardPhoto(null);
                          setIdCardPreview(null);
                        }}
                        className="remove-btn"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="upload-item">
                <label>Other Documents (Optional)</label>
                <div className="upload-area">
                  <input
                    type="file"
                    ref={otherDocsInputRef}
                    onChange={handleOtherDocsUpload}
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    multiple
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => otherDocsInputRef.current?.click()}
                    className="upload-btn"
                  >
                    📁 Upload Documents
                  </button>
                  {otherDocs.length > 0 && (
                    <div className="documents-list">
                      {otherDocs.map((doc, index) => (
                        <div key={index} className="document-item">
                          <span>📄 {doc.name}</span>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="remove-btn"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="form-section">
            <h4>🔐 Account Information</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Password: *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Minimum 6 characters"
                />
              </div>
              
              <div className="form-group">
                <label>Confirm Password: *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter password"
                />
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="terms-section">
            <label className="checkbox-label">
              <input type="checkbox" required />
              <span>
                I confirm all information is accurate. False information may result in rejection.
              </span>
            </label>
          </div>

          <button type="submit" disabled={loading} className="auth-btn citizen-btn">
            {loading ? (
              <span>
                <span className="spinner"></span> Submitting...
              </span>
            ) : (
              'Submit Registration to Kebele'
            )}
          </button>
        </form>
        
        <div className="auth-links">
          <p>
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterCitizen;
