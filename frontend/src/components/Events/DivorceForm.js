import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const DivorceForm = ({ onSubmit, loading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    eventDate: '',
    nationalId: '',
    husbandName: '',
    wifeName: '',
    marriageDate: '',
    divorceReason: '',
    childCustody: '',
    husbandReligion: '',
    wifeReligion: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let filteredValue = value;

    // Strict validation logic
    if (name.includes('Name')) {
      // Allow letters (Eng/Amh) and spaces
      filteredValue = value.replace(/[^a-zA-Z\s\u1200-\u137F]/g, '');
    } else if (name === 'nationalId') {
      // Allow only digits and limit to 16
      filteredValue = value.replace(/\D/g, '').slice(0, 16);
    }

    setFormData({
      ...formData,
      [name]: filteredValue
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="event-details-form">
      <h3>{t('divorce_registration')}</h3>

      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label>{t('divorce_national_id')} (16 Digits): *</label>
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
          <label>{t('divorce_date')}:</label>
          <input
            type="date"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label>{t('marriage_date')}:</label>
          <input
            type="date"
            name="marriageDate"
            value={formData.marriageDate}
            onChange={handleChange}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>{t('husband_name')}:</label>
          <input
            type="text"
            name="husbandName"
            value={formData.husbandName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>{t('wife_name')}:</label>
          <input
            type="text"
            name="wifeName"
            value={formData.wifeName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>{t('husband_religion') || 'Husband Religion'}: *</label>
          <select
            name="husbandReligion"
            value={formData.husbandReligion}
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

        <div className="form-group">
          <label>{t('wife_religion') || 'Wife Religion'}: *</label>
          <select
            name="wifeReligion"
            value={formData.wifeReligion}
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
        <label>{t('reason_for_divorce')}:</label>
        <textarea
          name="divorceReason"
          value={formData.divorceReason}
          onChange={handleChange}
          rows="3"
          required
        />
      </div>

      <div className="form-group">
        <label>{t('child_custody_arrangement')}:</label>
        <textarea
          name="childCustody"
          value={formData.childCustody}
          onChange={handleChange}
          rows="3"
          placeholder="Describe child custody arrangements if applicable"
        />
      </div>

      <button type="submit" disabled={loading} className="submit-btn" style={{ fontWeight: 'bold' }}>
        {loading ? t('registering') : t('register_divorce')}
      </button>
    </form>
  );
};

export default DivorceForm;