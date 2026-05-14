import React, { useState } from 'react';

const MarriageForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    eventDate: '',
    husbandName: '',
    wifeName: '',
    husbandAge: '',
    wifeAge: '',
    marriageType: 'civil',
    witness1: '',
    witness2: ''
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
      <h3>Marriage Registration</h3>
      
      <div className="form-group">
        <label>Marriage Date:</label>
        <input
          type="date"
          name="eventDate"
          value={formData.eventDate}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Husband's Full Name:</label>
          <input
            type="text"
            name="husbandName"
            value={formData.husbandName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Husband's Age:</label>
          <input
            type="number"
            name="husbandAge"
            value={formData.husbandAge}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Wife's Full Name:</label>
          <input
            type="text"
            name="wifeName"
            value={formData.wifeName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Wife's Age:</label>
          <input
            type="number"
            name="wifeAge"
            value={formData.wifeAge}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Marriage Type:</label>
        <select
          name="marriageType"
          value={formData.marriageType}
          onChange={handleChange}
          required
        >
          <option value="civil">Civil</option>
          <option value="religious">Religious</option>
          <option value="traditional">Traditional</option>
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Witness 1 Name:</label>
          <input
            type="text"
            name="witness1"
            value={formData.witness1}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Witness 2 Name:</label>
          <input
            type="text"
            name="witness2"
            value={formData.witness2}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Registering...' : 'Register Marriage'}
      </button>
    </form>
  );
};

export default MarriageForm;