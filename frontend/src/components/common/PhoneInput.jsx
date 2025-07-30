
import React, { useState, useEffect, useRef } from 'react';
import InputMask from 'react-input-mask';
import { countries } from '../../data/countries.js';

function PhoneInput({ label, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const selectedCountry = countries.find(c => c.code === value?.code) || countries.find(c => c.iso2 === 'us') || countries[0];

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.includes(searchTerm) ||
    country.iso2.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);


  const handleCountrySelect = (country) => {
    onChange({ code: country.code, number: '' }); // Clear number on country change
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleNumberChange = (e) => {
    onChange({ ...(value || { code: selectedCountry.code }), number: e.target.value });
  };

  return (
    <div className="form-group phone-input-wrapper" ref={wrapperRef}>
      {label && <label>{label}</label>}
      <div className="phone-input-group">
        <button type="button" className="country-code-button" onClick={() => setIsOpen(!isOpen)}>
          <img
            src={`https://flagcdn.com/w20/${selectedCountry.iso2.toLowerCase()}.png`}
            alt={selectedCountry.name}
            className="flag-icon"
          />
          <span>{selectedCountry.code}</span>
          <i className={`fa-solid fa-chevron-down ${isOpen ? 'open' : ''}`}></i>
        </button>

        <InputMask
          mask={selectedCountry.mask}
          value={value?.number || ''}
          onChange={handleNumberChange}
          maskChar="_"
        >
          {(inputProps) => (
            <input
              {...inputProps}
              type="tel"
              placeholder={selectedCountry.placeholder || placeholder}
            />
          )}
        </InputMask>
      </div>

      {isOpen && (
        <div className="country-dropdown">
          <div className="country-search">
            <i className="fa-solid fa-search"></i>
            <input
              type="text"
              placeholder="Search country"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="country-list">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <li key={country.iso2} onClick={() => handleCountrySelect(country)}>
                  <img
                    src={`https://flagcdn.com/w20/${country.iso2.toLowerCase()}.png`}
                    alt={country.name}
                    className="flag-icon"
                  />
                  <span className="country-name">{country.name}</span>
                  <span className="country-code">{country.code}</span>
                </li>
              ))
            ) : (
              <li className="no-results">No countries found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PhoneInput;