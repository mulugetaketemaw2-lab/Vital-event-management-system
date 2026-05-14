import React, { useState } from 'react';

const DeathForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    eventDate: '',
    deceasedName: '',
    gender: '',
    age: '',
    causeOfDeath: '',
    placeOfDeath: '',
    informantName: '',
    informantRelationship: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="event-details-form">
      <h3>Death Registration</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>Date of Death:</label>
          <input
            type="date"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Gender:</label>
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

      <div className="form-group">
        <label>Deceased Full Name:</label>
        <input
          type="text"
          name="deceasedName"
          value={formData.deceasedName}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Age:</label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Place of Death:</label>
          <input
            type="text"
            name="placeOfDeath"
            value={formData.placeOfDeath}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Cause of Death:</label>
        <input
          type="text"
          name="causeOfDeath"
          value={formData.causeOfDeath}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Informant Name:</label>
          <input
            type="text"
            name="informantName"
            value={formData.informantName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Relationship to Deceased:</label>
          <input
            type="text"
            name="informantRelationship"
            value={formData.informantRelationship}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Registering...' : 'Register Death'}
      </button>
    </form>
  );
};

export default DeathForm;