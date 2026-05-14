import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './BirthForm.css';

const BirthForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    eventDate: '',
    childName: '',
    gender: '',
    weight: '',
    placeOfBirth: '',
    fatherName: '',
    motherName: '',
    fatherNationality: 'Ethiopian',
    motherNationality: 'Ethiopian',
    fatherOccupation: '',
    motherOccupation: '',
    fatherEducation: '',
    motherEducation: '',
    fatherAge: '',
    motherAge: '',
    birthType: 'normal',
    numberOfChildren: 1,
    birthOrder: 1,
    hospitalName: '',
     fatherEducation: 'secondary',
    motherEducation: 'secondary',
    eventDate: new Date().toISOString().split('T')[0],
    doctorName: ''
  });

  const [files, setFiles] = useState({
    childPhoto: null,
    fatherPhoto: null,
    motherPhoto: null
  });

  
  const [previews, setPreviews] = useState({
    childPhoto: null,
    fatherPhoto: null,
    motherPhoto: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { API_URL } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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

      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error(`File ${file.name} is not a valid image type. Please use JPEG, PNG, or GIF.`);
        e.target.value = '';
        return;
      }

      // Update files state
      setFiles(prev => ({
        ...prev,
        [name]: file
      }));

       // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({
          ...prev,
          [name]: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required files
    if (!formData.childName || !formData.eventDate || !formData.gender) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!files.childPhoto || !files.fatherPhoto || !files.motherPhoto) {
      toast.error('Please upload all required photos');
      return;
    }
    setIsSubmitting(true);
    // Create FormData for file upload
    const formDataObj = new FormData();
    
    // Append form data
   Object.keys(formData).forEach(key => {
      formDataObj.append(key, formData[key]);
    });
    
    // Append files
    formDataObj.append('childPhoto', files.childPhoto);
    formDataObj.append('fatherPhoto', files.fatherPhoto);
    formDataObj.append('motherPhoto', files.motherPhoto);
    formDataObj.append('type', 'birth');

     // Debug: Log what's being sent
    console.log('Form data keys:', Array.from(formDataObj.keys()));
    console.log('Files being uploaded:', {
      childPhoto: files.childPhoto?.name,
      fatherPhoto: files.fatherPhoto?.name,
      motherPhoto: files.motherPhoto?.name
    });

    try {
            const token = localStorage.getItem('token');
      // Upload files and create event
      const response = await axios.post(`${API_URL}/events`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
       timeout: 30000 // 30 second timeout

      });
      
      toast.success('Birth registration submitted successfully!');
        onSubmit(response.data.data.vitalEvent);
        } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Error submitting registration. Please try again.');
         }
      };

 return (
    <form onSubmit={handleSubmit} className="event-details-form birth-form">
      <h3>Birth Registration with Photo Identification</h3>
      
      {/* Photo Upload Section */}
      <div className="form-section photo-section">
        <h4>📷 Photo Identification (3×4 size required)</h4>
        <p className="section-help">Please upload clear 3×4 photos for identification</p>
        
        <div className="photo-upload-grid">
          <div className="photo-upload-item">
            <label>Child's Photo: *</label>
            <input
              type="file"
              name="childPhoto"
              onChange={handleFileChange}
              accept="image/*"
              required
              className="file-input"
            />
            {files.childPhoto && (
              <div className="file-info">
                📸 Selected: {files.childPhoto.name}
              </div>
            )}
          </div>

          <div className="photo-upload-item">
            <label>Father's Photo: *</label>
            <input
              type="file"
              name="fatherPhoto"
              onChange={handleFileChange}
              accept="image/*"
              required
              className="file-input"
            />
            {files.fatherPhoto && (
              <div className="file-info">
                👨 Selected: {files.fatherPhoto.name}
              </div>
            )}
          </div>

          <div className="photo-upload-item">
            <label>Mother's Photo: *</label>
            <input
              type="file"
              name="motherPhoto"
              onChange={handleFileChange}
              accept="image/*"
              required
              className="file-input"
            />
            {files.motherPhoto && (
              <div className="file-info">
                👩 Selected: {files.motherPhoto.name}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Basic Information */}
      <div className="form-section">
        <h4>👶 Child Information</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Child's Full Name: *</label>
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
            <label>Gender: *</label>
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
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date of Birth: *</label>
            <input
              type="date"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Weight at Birth (kg): *</label>
            <input
              type="number"
              step="0.1"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              required
              min="0.5"
              max="10"
              placeholder="e.g., 3.5"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Place of Birth: *</label>
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

      {/* Father Information */}
      <div className="form-section">
        <h4>👨‍👩‍👧 Parent Information</h4>
        
        <div className="form-row">
          <div className="form-group">
            <label>Father's Full Name: *</label>
            <input
              type="text"
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
              required
              placeholder="Father's full name"
            />
          </div>

          <div className="form-group">
            <label>Father's Occupation: *</label>
            <input
              type="text"
              name="fatherOccupation"
              value={formData.fatherOccupation}
              onChange={handleChange}
              required
              placeholder="e.g., Farmer, Teacher, Merchant"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Mother's Full Name: *</label>
            <input
              type="text"
              name="motherName"
              value={formData.motherName}
              onChange={handleChange}
              required
              placeholder="Mother's full name"
            />
          </div>

          <div className="form-group">
            <label>Mother's Occupation: *</label>
            <input
              type="text"
              name="motherOccupation"
              value={formData.motherOccupation}
              onChange={handleChange}
              required
              placeholder="e.g., Housewife, Teacher, Merchant"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Father's Education: *</label>
            <select
              name="fatherEducation"
              value={formData.fatherEducation}
              onChange={handleChange}
              required
            >
              <option value="none">No Formal Education</option>
              <option value="primary">Primary School</option>
              <option value="secondary">Secondary School</option>
              <option value="diploma">Diploma</option>
              <option value="bachelor">Bachelor's Degree</option>
              <option value="masters">Master's Degree</option>
              <option value="phd">PhD</option>
            </select>
          </div>

          <div className="form-group">
            <label>Mother's Education: *</label>
            <select
              name="motherEducation"
              value={formData.motherEducation}
              onChange={handleChange}
              required
            >
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

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Submitting Registration...' : 'Submit Birth Registration to Kebele'}
      </button>
    </form>
  );
};

export default BirthForm;