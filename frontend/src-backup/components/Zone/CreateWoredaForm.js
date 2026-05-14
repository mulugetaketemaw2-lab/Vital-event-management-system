import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './CreateWoredaForm.css';

const CreateWoredaForm = ({ onWoredaCreated }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: 'Woreda123!',
    location: {
      region: '',
      zone: '',
      woreda: ''
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

  // Auto-set region and zone from current user
  React.useEffect(() => {
    if (currentUser?.location) {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          region: currentUser.location.region,
          zone: currentUser.location.zone
        }
      }));
    }
  }, [currentUser]);

  const generateUsername = () => {
    const zonePart = (formData.location.zone || 'zone').toString().toLowerCase().replace(/\s+/g, '.');
    const woredaPart = (formData.location.woreda || 'woreda').toString().toLowerCase().replace(/\s+/g, '.');
    return `woreda.${zonePart}.${woredaPart}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.location.woreda) {
      toast.error('Please enter a woreda name');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/representatives/create`, {
        username: formData.username || generateUsername(),
        password: formData.password,
        role: 'woreda',
        location: formData.location,
        officeInfo: formData.officeInfo
      });

      toast.success('Woreda Representative account created successfully! They can login after you activate their account.');
      
      // Reset form
      setFormData({
        username: '',
        password: 'Woreda123!',
        location: {
          region: currentUser?.location?.region || '',
          zone: currentUser?.location?.zone || '',
          woreda: ''
        },
        officeInfo: {
          officeName: '',
          officePhone: '',
          officeAddress: ''
        }
      });
      
      onWoredaCreated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating woreda representative');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-woreda-form">
      <h3>Create Woreda Representative Account</h3>
      <p className="form-description">
        Create accounts for Woreda Representatives in your zone. They will manage kebele representatives.
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
          <h4>Woreda Assignment</h4>
          <div className="form-group">
            <label>Region: *</label>
            <input
              type="text"
              name="location.region"
              value={formData.location.region}
              onChange={handleChange}
              required
              readOnly
              className="readonly-field"
            />
          </div>

          <div className="form-group">
            <label>Zone: *</label>
            <input
              type="text"
              name="location.zone"
              value={formData.location.zone}
              onChange={handleChange}
              required
              readOnly
              className="readonly-field"
            />
          </div>

          <div className="form-group">
            <label>Woreda Name: *</label>
            <input
              type="text"
              name="location.woreda"
              value={formData.location.woreda}
              onChange={handleChange}
              required
              placeholder="Enter woreda name"
            />
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
              placeholder="e.g., Woreda Statistics Office"
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
                placeholder="Woreda office physical address"
              />
            </div>
          </div>
        </div>

        <div className="form-notice">
          <h5>📋 Important Information:</h5>
          <ul>
            <li>The woreda representative account will be created but inactive</li>
            <li>You need to activate the account from the Woreda Management page</li>
            <li>After activation, they can login with the provided credentials</li>
            <li>Woreda representatives can then create Kebele representatives</li>
          </ul>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creating Woreda Account...' : 'Create Woreda Representative'}
        </button>
      </form>
    </div>
  );
};

export default CreateWoredaForm;