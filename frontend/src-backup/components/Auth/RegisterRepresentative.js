import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LocationSelector from '../Common/LocationSelector';
import './Auth.css';

const RegisterRepresentative = () => {
  // Initialize form data with SAFE defaults
  const [formData, setFormData] = useState(() => ({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'kebele',
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
    }
  }));
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Debug: Log initial state
  console.log('Initial formData:', JSON.stringify(formData, null, 2));
  console.log('personalInfo exists?', !!formData.personalInfo);
  console.log('personalInfo.firstName:', formData.personalInfo?.firstName);

  // SAFE handleChange function with null checks
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Changing ${name} to:`, value);
    
    setFormData(prev => {
      const safePrev = {
        ...prev,
        personalInfo: prev.personalInfo
      };
      
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        
        // Ensure the parent exists
        if (!safePrev[parent]) {
          safePrev[parent] = {};
        }
        
        const updated = {
          ...safePrev,
          [parent]: {
            ...safePrev[parent],
            [child]: value
          }
        };
        
        console.log(`Updated ${parent}.${child}:`, updated);
        return updated;
      } else {
        const updated = {
          ...safePrev,
          [name]: value
        };
        
        console.log(`Updated ${name}:`, updated);
        return updated;
      }
    });
  };

  const handleLocationChange = (locationData) => {
    console.log('Location changed:', locationData);
    setFormData(prev => ({
      ...prev,
      location: locationData || {
        region: '',
        zone: '',
        woreda: '',
        kebele: ''
      }
    }));
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      kebele: 'Local level representative - reviews citizen submissions',
      woreda: 'District level representative - reviews kebele submissions',
      zone: 'Zone level representative - reviews woreda submissions',
      region: 'Regional level representative - reviews zone submissions',
      national: 'National level representative - self-registers and manages regional representatives'
    };
    return descriptions[role] || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Debug current state
    console.log('=== FORM SUBMISSION START ===');
    console.log('Current formData:', JSON.stringify(formData, null, 2));
    
    // SAFE validation with null checks
    if (!formData.username || !formData.password) {
      toast.error('Username and password are required');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.role !== 'national' && !formData.location?.region) {
      toast.error('Please select a region for your location');
      return;
    }

    setLoading(true);

    try {
      // Create a SAFE data object with defaults
      const userData = {
        username: formData.username || '',
        password: formData.password || '',
        role: formData.role || 'kebele',
        personalInfo: {
          firstName: (formData.role || 'REPRESENTATIVE').toString().toUpperCase(),
          lastName: 'OFFICE'
        }
      };

      // Add location if not national
      if (formData.role !== 'national') {
        userData.location = {
          region: formData.location?.region || '',
          zone: formData.location?.zone || '',
          woreda: formData.location?.woreda || '',
          kebele: formData.location?.kebele || ''
        };
      }

      // Add office info with safe access
      userData.officeInfo = {
        officeName: formData.officeInfo?.officeName || '',
        officePhone: formData.officeInfo?.officePhone || '',
        officeAddress: formData.officeInfo?.officeAddress || ''
      };

      console.log('=== FINAL USER DATA TO SEND ===');
      console.log(JSON.stringify(userData, null, 2));

      // For testing - simulate API call
      toast.info(`Would register as ${formData.role} representative`);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Registration successful! (Simulated)');
      navigate('/login');
      
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const safeOfficeInfo = formData.officeInfo || {
    officeName: '',
    officePhone: '',
    officeAddress: ''
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Representative Registration</h2>
          <p className="auth-subtitle">Create account for government representatives</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h4>Account Type</h4>
            <div className="form-group">
              <label>Representative Role: *</label>
              <select
                name="role"
                value={formData.role || 'kebele'}
                onChange={handleChange}
                required
              >
                <option value="kebele">Kebele Representative</option>
                <option value="woreda">Woreda Representative</option>
                <option value="zone">Zone Representative</option>
                <option value="region">Regional Representative</option>
                <option value="national">National Representative</option>
              </select>
              <div className="role-description">
                {getRoleDescription(formData.role)}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Account Information</h4>
            <div className="form-group">
              <label>Username: *</label>
              <input
                type="text"
                name="username"
                value={formData.username || ''}
                onChange={handleChange}
                required
                placeholder="Choose a username"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Password: *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password || ''}
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
                  value={formData.confirmPassword || ''}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter your password"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Office Information</h4>
            <div className="form-group">
              <label>Office Name:</label>
              <input
                type="text"
                name="officeInfo.officeName"
                value={safeOfficeInfo.officeName}
                onChange={handleChange}
                placeholder="Name of your office"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Office Phone:</label>
                <input
                  type="tel"
                  name="officeInfo.officePhone"
                  value={safeOfficeInfo.officePhone}
                  onChange={handleChange}
                  placeholder="Office phone number"
                />
              </div>

              <div className="form-group">
                <label>Office Address:</label>
                <input
                  type="text"
                  name="officeInfo.officeAddress"
                  value={safeOfficeInfo.officeAddress}
                  onChange={handleChange}
                  placeholder="Office physical address"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Location Information</h4>
            <p className="location-help">
              Select the administrative area you will be representing.
              {formData.role === 'kebele' && ' (Select Region → Zone → Woreda → Kebele)'}
              {formData.role === 'woreda' && ' (Select Region → Zone → Woreda)'}
              {formData.role === 'zone' && ' (Select Region → Zone)'}
              {formData.role === 'region' && ' (Select Region)'}
              {formData.role === 'national' && ' (No location selection needed for national level)'}
            </p>
            
            {formData.role !== 'national' && (
              <LocationSelector 
                onLocationChange={handleLocationChange}
                hideLevels={formData.role === 'region' ? ['zone', 'woreda', 'kebele'] :
                           formData.role === 'zone' ? ['woreda', 'kebele'] :
                           formData.role === 'woreda' ? ['kebele'] : []}
              />
            )}
            
            {formData.role === 'national' && (
              <div className="no-location-message">
                <p>National representatives do not need specific location assignment.</p>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="auth-btn representative-btn"
            onClick={(e) => {
              console.log('Button clicked - current state:', formData);
            }}
          >
            {loading ? 'Creating Account...' : `Register as ${formData.role} Representative`}
          </button>
        </form>
        
        <div className="auth-links">
          <p>
            Already have an account? <Link to="/login">Login here</Link>
          </p>
          <p>
            Are you a citizen? <Link to="/register-citizen">Register as Citizen</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterRepresentative;