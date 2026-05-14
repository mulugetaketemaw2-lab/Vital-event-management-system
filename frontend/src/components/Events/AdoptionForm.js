import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const AdoptionForm = ({ onSubmit, loading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    eventDate: '',
    nationalId: '',
    childName: '',
    childAge: '',
    adoptiveParents: [''],
    biologicalParents: [''],
    courtOrderNumber: '',
    religion: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let filteredValue = value;

    // Strict validation logic
    if (name.includes('Name')) {
      // Allow letters (Eng/Amh) and spaces
      filteredValue = value.replace(/[^a-zA-Z\s\u1200-\u137F]/g, '');
    } else if (name === 'childAge') {
      // Allow only digits
      filteredValue = value.replace(/\D/g, '');
    } else if (name === 'nationalId') {
      // Allow only digits and limit to 13
      filteredValue = value.replace(/\D/g, '').slice(0, 13);
    } else if (name === 'courtOrderNumber') {
      // Allow digits and special chars for order number
      filteredValue = value.replace(/[^a-zA-Z0-9-/]/g, '');
    }

    setFormData({
      ...formData,
      [name]: filteredValue
    });
  };

  const handleAdoptiveParentChange = (index, value) => {
    // Strict validation: letters only for names
    const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
    const newAdoptiveParents = [...formData.adoptiveParents];
    newAdoptiveParents[index] = filteredValue;
    setFormData({
      ...formData,
      adoptiveParents: newAdoptiveParents
    });
  };

  const handleBiologicalParentChange = (index, value) => {
    // Strict validation: letters only for names
    const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
    const newBiologicalParents = [...formData.biologicalParents];
    newBiologicalParents[index] = filteredValue;
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
      <h3>{t('adoption_registration')}</h3>

      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label>{t('adoption_national_id')} (16 Digits): *</label>
        <input
          type="text"
          name="nationalId"
          value={formData.nationalId}
          onChange={handleChange}
          required
          placeholder="Enter unique 16-digit National ID"
          minLength="16"
          maxLength="16"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            letterSpacing: '2px',
            border: '2px solid #3182ce',
            borderRadius: '8px',
            backgroundColor: '#ebf8ff'
          }}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>{t('adoption_date')}:</label>
          <input
            type="date"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>{t('child_age')}:</label>
          <input
            type="number"
            name="childAge"
            value={formData.childAge}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>{t('religion') || 'Religion'}: *</label>
          <select
            name="religion"
            value={formData.religion}
            onChange={handleChange}
            required
          >
            <option value="">{t('select_religion') || 'Select Religion'}</option>
            <option value="orthodox">{t('orthodox') || 'Ethiopian Orthodox'}</option>
            <option value="muslim">{t('muslim') || 'Muslim'}</option>
            <option value="protestant">{t('protestant') || 'Protestant'}</option>
            <option value="catholic">{t('catholic') || 'Catholic'}</option>
            <option value="traditional">{t('traditional_religion') || 'Traditional'}</option>
            <option value="other">{t('other') || 'Other'}</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>{t('child_name')}:</label>
        <input
          type="text"
          name="childName"
          value={formData.childName}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>{t('adoptive_parents')}:</label>
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
        <label>{t('biological_parents')}:</label>
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
        <label>{t('court_order_number')}:</label>
        <input
          type="text"
          name="courtOrderNumber"
          value={formData.courtOrderNumber}
          onChange={handleChange}
          required
        />
      </div>

      <button type="submit" disabled={loading} className="submit-btn" style={{ fontWeight: 'bold' }}>
        {loading ? t('registering') : t('register_adoption')}
      </button>
    </form>
  );
};

export default AdoptionForm;