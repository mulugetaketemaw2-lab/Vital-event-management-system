import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './CreateRegionalForm.css';

const CreateRegionalForm = ({ onRegionalCreated }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: 'Regional123!',
    location: {
      region: ''
    },
    officeInfo: {
      officeName: '',
      officePhone: '',
      officeAddress: ''
    }
  });
  const [loading, setLoading] = useState(false);

  const { currentUser, API_URL } = useAuth();

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

  const generateUsername = () => {
    const regionPart = (formData.location.region || 'region').toString().toLowerCase().replace(/\s+/g, '.');
    return `regional.${regionPart}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.location.region) {
      toast.error('Please select a region for the regional representative');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/representatives/create`, {
        username: formData.username || generateUsername(),
        password: formData.password,
        role: 'region',
        location: formData.location,
        officeInfo: formData.officeInfo
      });

      toast.success('Regional Representative account created successfully! They can login after you activate their account.');
      
      // Reset form
      setFormData({
        username: '',
        password: 'Regional123!',
        location: {
          region: ''
        },
        officeInfo: {
          officeName: '',
          officePhone: '',
          officeAddress: ''
        }
      });
      
      onRegionalCreated();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Error creating regional representative');
    } finally {
      setLoading(false);
    }
  };

  // Ethiopian Regions for selection
  const ethiopianRegions = [
    'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 
    'Dire Dawa', 'Gambela', 'Harari', 'Oromia', 
    'Sidama', 'Somali', 'Southern Nations, Nationalities, and Peoples\' Region',
    'South West Ethiopia Peoples\' Region', 'Tigray'
  ];

  return (
    <div className="create-regional-form">
      <h3>Create Regional Representative Account</h3>
      <p className="form-description">
        As the National Representative, you can create accounts for Regional Representatives.
        After creation, you need to activate their account before they can login.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h4>Account Information</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Auto-generate if empty"
              />
              <button 
                type="button" 
                onClick={() => setFormData(prev => ({ ...prev, username: generateUsername() }))}
                className="generate-btn"
              >
                Generate
              </button>
            </div>
            
            <div className="form-group">
              <label>Initial Password:</label>
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
          <h4>Regional Assignment</h4>
          <div className="form-group">
            <label>Assigned Region: *</label>
            <select
              name="location.region"
              value={formData.location.region}
              onChange={handleChange}
              required
            >
              <option value="">Select Region</option>
              {ethiopianRegions.map(region => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <small>This regional representative will manage this specific region</small>
          </div>
        </div>

        <div className="form-section">
          <h4>Office Information</h4>
          <div className="form-group">
            <label>Office Name: *</label>
            <input
              type="text"
              name="officeInfo.officeName"
              value={formData.officeInfo.officeName}
              onChange={handleChange}
              required
              placeholder="e.g., Regional Statistics Office"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Office Phone:</label>
              <input
                type="tel"
                name="officeInfo.officePhone"
                value={formData.officeInfo.officePhone}
                onChange={handleChange}
                placeholder="Office phone number"
              />
            </div>

            <div className="form-group">
              <label>Office Address:</label>
              <input
                type="text"
                name="officeInfo.officeAddress"
                value={formData.officeInfo.officeAddress}
                onChange={handleChange}
                placeholder="Regional office physical address"
              />
            </div>
          </div>
        </div>

        <div className="form-notice">
          <h5>📋 Important Information:</h5>
          <ul>
            <li>The regional representative account will be created but inactive</li>
            <li>You need to activate the account from the Regional Management page</li>
            <li>After activation, they can login with the provided credentials</li>
            <li>Regional representatives can then create Zone representatives</li>
          </ul>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creating Regional Account...' : 'Create Regional Representative'}
        </button>
      </form>
    </div>
  );
};

export default CreateRegionalForm;