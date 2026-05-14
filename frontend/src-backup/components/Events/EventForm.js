import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import BirthForm from './BirthForm';
import DeathForm from './DeathForm';
import MarriageForm from './MarriageForm';
import DivorceForm from './DivorceForm';
import AdoptionForm from './AdoptionForm';
import './EventForm.css';
import './BirthForm.css';
const EventForm = ({ onEventCreated }) => {
  const [eventType, setEventType] = useState('');
  const [loading, setLoading] = useState(false);

  const { API_URL } = useAuth();

  const renderForm = () => {
    const commonProps = {
      onSubmit: handleSubmit,
      loading: loading
    };

    switch (eventType) {
      case 'birth':
        return <BirthForm {...commonProps} />;
      case 'death':
        return <DeathForm {...commonProps} />;
      case 'marriage':
        return <MarriageForm {...commonProps} />;
      case 'divorce':
        return <DivorceForm {...commonProps} />;
      case 'adoption':
        return <AdoptionForm {...commonProps} />;
      default:
        return <div>Please select an event type</div>;
    }
  };

  const handleSubmit = async (eventData) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/events`, {
        type: eventType,
        ...eventData
      });
      
      toast.success('Event registered successfully!');
      onEventCreated();
      setEventType('');
    } catch (error) {
      toast.error('Error registering event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-form">
      <div className="form-group">
        <label>Select Event Type:</label>
        <select 
          value={eventType} 
          onChange={(e) => setEventType(e.target.value)}
          required
        >
          <option value="">Select Event Type</option>
          <option value="birth">Birth</option>
          <option value="death">Death</option>
          <option value="marriage">Marriage</option>
          <option value="divorce">Divorce</option>
          <option value="adoption">Adoption</option>
        </select>
      </div>

      {eventType && renderForm()}
    </div>
  );
};

export default EventForm;