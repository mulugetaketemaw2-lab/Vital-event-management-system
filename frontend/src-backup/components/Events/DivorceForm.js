import React, { useState } from 'react';

const DivorceForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    eventDate: '',
    husbandName: '',
    wifeName: '',
    marriageDate: '',
    divorceReason: '',
    childCustody: ''
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
      <h3>Divorce Registration</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>Divorce Date:</label>
          <input
            type="date"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Marriage Date:</label>
          <input
            type="date"
            name="marriageDate"
            value={formData.marriageDate}
            onChange={handleChange}
            required
          />
        </div>
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
          <label>Wife's Full Name:</label>
          <input
            type="text"
            name="wifeName"
            value={formData.wifeName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Reason for Divorce:</label>
        <textarea
          name="divorceReason"
          value={formData.divorceReason}
          onChange={handleChange}
          rows="3"
          required
        />
      </div>

      <div className="form-group">
        <label>Child Custody Arrangement:</label>
        <textarea
          name="childCustody"
          value={formData.childCustody}
          onChange={handleChange}
          rows="3"
          placeholder="Describe child custody arrangements if applicable"
        />
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Registering...' : 'Register Divorce'}
      </button>
    </form>
  );
};

export default DivorceForm;