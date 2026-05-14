import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './CreateKebeleForm.css';

const CreateKebeleForm = ({ onKebeleCreated }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: 'Kebele123!',
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
      toast.error('Please enter a kebele name');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/representatives/create`, {
        username: formData.username || generateUsername(),
        password: formData.password,
        role: 'kebele',
        location: formData.location,
        officeInfo: formData.officeInfo
      });

      toast.success('Kebele Representative account created successfully! They can login after you activate their account.');
      
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
        }
      });
      
      onKebeleCreated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating kebele representative');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-kebele-form">
      <h3>Create Kebele Representative Account</h3>
      <p className="form-description">
        Create accounts for Kebele Representatives in your woreda. They will review citizen event submissions.
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
          <h4>Kebele Assignment</h4>
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
            <label>Woreda: *</label>
            <input
              type="text"
              name="location.woreda"
              value={formData.location.woreda}
              onChange={handleChange}
              required
              readOnly
              className="readonly-field"
            />
          </div>

          <div className="form-group">
            <label>Kebele Name: *</label>
            <input
              type="text"
              name="location.kebele"
              value={formData.location.kebele}
              onChange={handleChange}
              required
              placeholder="Enter kebele name"
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
              placeholder="e.g., Kebele Administration Office"
            />
          </div>

          <div className="form-group">
            <label>Office Address:</label>
            <input
              type="text"
              name="officeInfo.officeAddress"
              value={formData.officeInfo.officeAddress}
              onChange={handleChange}
              placeholder="Kebele office physical address"
            />
          </div>
        </div>

        <div className="form-notice">
          <h5>📋 Important Information:</h5>
          <ul>
            <li>The kebele representative account will be created but inactive</li>
            <li>You need to activate the account from the Kebele Management page</li>
            <li>After activation, they can login with the provided credentials</li>
            <li>Kebele representatives will review citizen event submissions</li>
            <li>They are the first level of approval in the system</li>
          </ul>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creating Kebele Account...' : 'Create Kebele Representative'}
        </button>
      </form>
    </div>
  );
};

export default CreateKebeleForm;