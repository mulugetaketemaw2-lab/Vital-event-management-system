import React, { useState } from 'react';

const AdoptionForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    eventDate: '',
    childName: '',
    childAge: '',
    adoptiveParents: [''],
    biologicalParents: [''],
    courtOrderNumber: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAdoptiveParentChange = (index, value) => {
    const newAdoptiveParents = [...formData.adoptiveParents];
    newAdoptiveParents[index] = value;
    setFormData({
      ...formData,
      adoptiveParents: newAdoptiveParents
    });
  };

  const handleBiologicalParentChange = (index, value) => {
    const newBiologicalParents = [...formData.biologicalParents];
    newBiologicalParents[index] = value;
    setFormData({
      ...formData,
      biologicalParents: newBiologicalParents
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="event-details-form">
      <h3>Adoption Registration</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>Adoption Date:</label>
          <input
            type="date"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Child's Age:</label>
          <input
            type="number"
            name="childAge"
            value={formData.childAge}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Child's Full Name:</label>
        <input
          type="text"
          name="childName"
          value={formData.childName}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Adoptive Parent(s):</label>
        {formData.adoptiveParents.map((parent, index) => (
          <input
            key={index}
            type="text"
            value={parent}
            onChange={(e) => handleAdoptiveParentChange(index, e.target.value)}
            placeholder={`Adoptive parent ${index + 1} full name`}
            required
            style={{ marginBottom: '0.5rem' }}
          />
        ))}
      </div>

      <div className="form-group">
        <label>Biological Parent(s):</label>
        {formData.biologicalParents.map((parent, index) => (
          <input
            key={index}
            type="text"
            value={parent}
            onChange={(e) => handleBiologicalParentChange(index, e.target.value)}
            placeholder={`Biological parent ${index + 1} full name`}
            style={{ marginBottom: '0.5rem' }}
          />
        ))}
      </div>

      <div className="form-group">
        <label>Court Order Number:</label>
        <input
          type="text"
          name="courtOrderNumber"
          value={formData.courtOrderNumber}
          onChange={handleChange}
          required
        />
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Registering...' : 'Register Adoption'}
      </button>
    </form>
  );
};

export default AdoptionForm;