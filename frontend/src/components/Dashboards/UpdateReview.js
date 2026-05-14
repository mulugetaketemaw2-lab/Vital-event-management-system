import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

const UpdateReview = () => {
    const { citizenId } = useParams();
    const navigate = useNavigate();
    const { currentUser, API_URL } = useAuth();
    const API_URL_FIXED = API_URL || 'http://localhost:5000/api';

    const [citizen, setCitizen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState('');

    useEffect(() => {
        const fetchCitizen = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL_FIXED}/auth/update-requests/${citizenId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.status === 'success') {
                    setCitizen(response.data.data.citizen);
                }
            } catch (error) {
                console.error('Error fetching citizen details:', error);
                toast.error('Failed to load citizen details');
            } finally {
                setLoading(false);
            }
        };
        fetchCitizen();
    }, [citizenId]);

    const handleReview = async (status) => {
        try {
            const token = localStorage.getItem('token');
            let endpoint;
            let payloadStatus;

            if (currentUser.role.includes('kebele')) {
                endpoint = `${API_URL_FIXED}/auth/update-requests/${citizenId}/kebele-review`;
                payloadStatus = status === 'approve' ? 'kebele_approved' : 'rejected';
            } else if (currentUser.role.includes('woreda')) {
                endpoint = `${API_URL_FIXED}/auth/update-requests/${citizenId}/woreda-review`;
                payloadStatus = status === 'approve' ? 'approved' : 'rejected';
            } else {
                endpoint = `${API_URL_FIXED}/auth/update-requests/${citizenId}/review-high-level`;
                payloadStatus = status === 'approve' ? 'approved' : 'rejected';
            }

            await axios.patch(endpoint, { status: payloadStatus, comments }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(status === 'approve' ? 'Update request approved!' : 'Update request rejected');
            navigate(-1);
        } catch (error) {
            console.error('Review error:', error);
            toast.error(error.response?.data?.message || 'Failed to submit review');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!citizen) return <div>Citizen not found or no pending update.</div>;

    const { personalInfo: oldInfo, location: oldLoc, updateRequest } = citizen;
    const { pendingDetails } = updateRequest;
    const newInfo = pendingDetails?.personalInfo || {};
    const newLoc = pendingDetails?.location || {};

    const DiffRow = ({ label, oldVal, newVal }) => (
        <tr className={oldVal !== newVal ? 'diff-row changed' : 'diff-row'}>
            <td><strong>{label}</strong></td>
            <td>{oldVal || 'N/A'}</td>
            <td>{newVal || oldVal || 'N/A'}</td>
            <td>{oldVal !== newVal ? '✅ Changed' : '—'}</td>
        </tr>
    );

    return (
        <div className="update-review-container">
            <div className="review-header">
                <h2>🔍 Review Profile Update Request</h2>
                <div className="citizen-brief">
                    <strong>Citizen:</strong> {oldInfo.firstName} {oldInfo.lastName} ({citizen.username})
                </div>
            </div>

            <div className="justification-section">
                <h4>📝 Justification / Reason</h4>
                <div className="justification-text">
                    "{updateRequest.justification}"
                </div>
            </div>

            <table className="comparison-table">
                <thead>
                    <tr>
                        <th>Field</th>
                        <th>Current Value</th>
                        <th>Requested Value</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <DiffRow label="First Name" oldVal={oldInfo.firstName} newVal={newInfo.firstName} />
                    <DiffRow label="Last Name" oldVal={oldInfo.lastName} newVal={newInfo.lastName} />
                    <DiffRow label="Email" oldVal={oldInfo.email} newVal={newInfo.email} />
                    <DiffRow label="Phone" oldVal={oldInfo.phone} newVal={newInfo.phone} />
                    <DiffRow label="Date of Birth" oldVal={oldInfo.dateOfBirth?.split('T')[0]} newVal={newInfo.dateOfBirth} />
                    <DiffRow label="Gender" oldVal={oldInfo.gender} newVal={newInfo.gender} />
                    <DiffRow label="Occupation" oldVal={oldInfo.occupation} newVal={newInfo.occupation} />
                    <DiffRow label="Marital Status" oldVal={oldInfo.maritalStatus} newVal={newInfo.maritalStatus} />
                    <DiffRow label="Education Level" oldVal={oldInfo.educationLevel} newVal={newInfo.educationLevel} />
                    <DiffRow label="ID Number" oldVal={oldInfo.idNumber} newVal={newInfo.idNumber} />
                    <tr className="diff-header" style={{ backgroundColor: '#f4f7f6', fontWeight: 'bold' }}>
                        <td colSpan="4">📍 Location Information</td>
                    </tr>
                    <DiffRow label="Region" oldVal={oldLoc?.regionName} newVal={newLoc?.regionName} />
                    <DiffRow label="Zone" oldVal={oldLoc?.zoneName} newVal={newLoc?.zoneName} />
                    <DiffRow label="Woreda" oldVal={oldLoc?.woredaName} newVal={newLoc?.woredaName} />
                    <DiffRow label="Kebele" oldVal={oldLoc?.kebeleName} newVal={newLoc?.kebeleName} />
                </tbody>
            </table>

            <div className="review-actions-form">
                <h4>Decision & Comments</h4>
                <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter review comments..."
                    style={{ width: '100%', minHeight: '80px', margin: '10px 0' }}
                />
                <div className="button-group">
                    <button onClick={() => handleReview('approve')} className="approve-btn">Approve & Forward</button>
                    <button onClick={() => handleReview('reject')} className="reject-btn">Reject Request</button>
                    <button onClick={() => navigate(-1)} className="back-btn">Back</button>
                </div>
            </div>
        </div>
    );
};

export default UpdateReview;
