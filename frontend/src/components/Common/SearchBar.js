import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './SearchBar.css';

const SearchBar = () => {
    const { t } = useTranslation();
    const { API_URL } = useAuth();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim().length >= 2) {
                performSearch();
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const performSearch = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/representatives/search-citizens`, {
                params: { query },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'success') {
                setResults(response.data.data.citizens);
                setShowDropdown(true);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResultClick = (citizen) => {
        setShowDropdown(false);
        setQuery('');
        // Navigate to citizen profile/view (assuming such a route exists)
        navigate(`/citizen-profile/${citizen._id}`);
    };

    return (
        <div className="global-search-container" ref={dropdownRef}>
            <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    placeholder={t('search_placeholder') || "Search by Name or National ID..."}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="global-search-input"
                />
                {loading && <div className="search-spinner"></div>}
            </div>

            {showDropdown && (
                <div className="search-results-dropdown">
                    {results.length > 0 ? (
                        results.map((citizen) => (
                            <div
                                key={citizen._id}
                                className="search-result-item"
                                onClick={() => handleResultClick(citizen)}
                            >
                                <div className="result-avatar">
                                    {citizen.profilePhoto?.url ? (
                                        <img src={`${API_URL.replace('/api', '')}${citizen.profilePhoto.url}`} alt="" />
                                    ) : (
                                        <span>👤</span>
                                    )}
                                </div>
                                <div className="result-info">
                                    <div className="result-name">
                                        {citizen.personalInfo.firstName} {citizen.personalInfo.lastName}
                                    </div>
                                    <div className="result-meta">
                                        <span className="result-id">ID: {citizen.personalInfo.idNumber || 'N/A'}</span>
                                        <span className="result-loc">
                                            {citizen.location.kebeleName || citizen.location.kebele}, {citizen.location.woredaName || citizen.location.woreda}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="search-no-results">{t('no_matching_registrants') || "No matching registrants found"}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
