import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.css';

const LanguageSelector = () => {
    const { i18n } = useTranslation();

    const handleChange = (e) => {
        i18n.changeLanguage(e.target.value);
    };

    return (
        <div className="language-selector">
            <select
                value={i18n.language?.split('-')[0]}
                onChange={handleChange}
                className="language-dropdown"
            >
                <option value="en">English</option>
                <option value="am">አማርኛ</option>
                <option value="om">Afan Oromo</option>
                <option value="ti">ትግርኛ</option>
            </select>
        </div>
    );
};

export default LanguageSelector;
