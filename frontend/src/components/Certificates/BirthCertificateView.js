import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './Certificates.css';

const BirthCertificateView = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  const { API_URL } = useAuth();

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      // This endpoint would need to be created in backend
      const response = await axios.get(`${API_URL}/citizen/certificates`);
      setCertificates(response.data.data.certificates);
    } catch (error) {
      toast.error('Error fetching certificates');
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async (certificateId) => {
    try {
      const response = await axios.get(`${API_URL}/certificates/${certificateId}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `birth-certificate-${certificateId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Certificate downloaded successfully');
    } catch (error) {
      toast.error('Error downloading certificate');
    }
  };

  const viewCertificateDetails = (certificate) => {
    setSelectedCertificate(certificate);
  };

  if (loading) {
    return <div className="loading">Loading certificates...</div>;
  }

  return (
    <div className="certificates-container">
      <div className="certificates-header">
        <h3>Birth Certificates</h3>
        <p>View and download your issued birth certificates</p>
      </div>

      {certificates.length === 0 ? (
        <div className="no-certificates">
          <p>No birth certificates issued yet.</p>
          <p>Birth certificates are issued after successful registration and approval of birth events.</p>
        </div>
      ) : (
        <div className="certificates-list">
          {certificates.map(cert => (
            <div key={cert._id} className="certificate-card">
              <div className="certificate-info">
                <h4>Birth Certificate #{cert.certificateNumber}</h4>
                <div className="certificate-details">
                  <p><strong>Child Name:</strong> {cert.childName}</p>
                  <p><strong>Date of Birth:</strong> {new Date(cert.dateOfBirth).toLocaleDateString()}</p>
                  <p><strong>Issued Date:</strong> {new Date(cert.issuedDate).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> <span className="status-issued">Issued</span></p>
                </div>
              </div>

              <div className="certificate-actions">
                <button
                  onClick={() => downloadCertificate(cert._id)}
                  className="download-btn"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => viewCertificateDetails(cert)}
                  className="view-btn"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCertificate && (
        <div className="certificate-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Certificate Details</h3>
              <button onClick={() => setSelectedCertificate(null)} className="close-btn">
                ×
              </button>
            </div>

            <div className="certificate-details-modal">
              <h4>Certificate #{selectedCertificate.certificateNumber}</h4>

              <div className="detail-section">
                <h5>Child Information</h5>
                <p><strong>Name:</strong> {selectedCertificate.childName}</p>
                <p><strong>Gender:</strong> {selectedCertificate.gender}</p>
                <p><strong>Date of Birth:</strong> {new Date(selectedCertificate.dateOfBirth).toLocaleDateString()}</p>
                <p><strong>Place of Birth:</strong> {selectedCertificate.placeOfBirth}</p>
                <p><strong>Weight at Birth:</strong> {selectedCertificate.weight} kg</p>
              </div>

              <div className="detail-section">
                <h5>Parent Information</h5>
                <p><strong>Father:</strong> {selectedCertificate.fatherName}</p>
                <p><strong>Mother:</strong> {selectedCertificate.motherName}</p>
              </div>

              <div className="detail-section">
                <h5>Issuance Details</h5>
                <p><strong>Certificate Number:</strong> {selectedCertificate.certificateNumber}</p>
                <p><strong>Issued Date:</strong> {new Date(selectedCertificate.issuedDate).toLocaleDateString()}</p>
                <p><strong>Issued By:</strong> Central Statistics Office</p>
                <p><strong>Registration Location:</strong> {selectedCertificate.registrationLocation}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BirthCertificateView;