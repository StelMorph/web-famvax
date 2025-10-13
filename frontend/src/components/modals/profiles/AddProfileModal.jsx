// src/components/modals/profiles/AddProfileModal.jsx
import React, { useState, useContext } from 'react';
import { AppContext } from '../../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons';
import { nationalities } from '../../../data/nationalities.js';
import DatePicker from '../../common/DatePicker.jsx';
import api from '../../../api/apiService.js';

// Initial state for a new profile
const INITIAL_STATE = {
  name: '',
  dob: '',
  relationship: 'Child',
  gender: 'Female',
  bloodType: 'O+',
  nationality: '',
  allergies: '',
  medicalConditions: '',
};
const AVATAR_COLORS = [
  'avatar-blue',
  'avatar-green',
  'avatar-purple',
  'avatar-orange',
  'avatar-pink',
  'avatar-cyan',
];

function AddProfileModal({ onClose, onProfileCreated }) {
  const { setAllProfiles, showNotification } = useContext(AppContext);
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [isSaving, setIsSaving] = useState(false);

  // Unified handler for all form inputs
  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDateChange = (name, date) => setFormData((prev) => ({ ...prev, [name]: date }));

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    if (!formData.name || !formData.dob) {
      showNotification({
        type: 'error',
        title: 'Missing Info',
        message: 'Please enter a Full Name and Date of Birth.',
      });
      return;
    }
    setIsSaving(true);
    try {
      const profileData = {
        ...formData,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      };
      const newProfile = await api.createProfile(profileData);
      const completeProfile = { ...newProfile, vaccines: [] };

      setAllProfiles((prev) => [...prev, completeProfile]);
      showNotification({ type: 'success', message: `Profile for ${newProfile.name} created!` });

      if (onProfileCreated) {
        onProfileCreated(completeProfile);
      }
      onClose(); // Close the modal on success
    } catch (error) {
      showNotification({ type: 'error', title: 'Save Failed', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // STRUCTURE 1: Root div matches EditProfileModal exactly
    <div className="modal-content modal-flex-col">
      {/* STRUCTURE 2: Header matches EditProfileModal */}
      <div className="modal-header">
        <h2>Create Profile</h2>
        <button className="btn-icon modal-close" onClick={onClose} disabled={isSaving}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      {/* STRUCTURE 3: Body with scrollable class matches EditProfileModal */}
      <div className="modal-body-scrollable">
        {/* STRUCTURE 4: Form with ID to be linked from footer button */}
        <form onSubmit={handleSubmit} id="add-profile-form">
          <div className="form-group">
            <label>
              Full Name<span className="required-indicator">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>
              Date of Birth<span className="required-indicator">*</span>
            </label>
            <DatePicker value={formData.dob} onChange={(d) => handleDateChange('dob', d)} />
          </div>
          <div className="form-grid-2-col">
            <div className="form-group">
              <label>Relationship</label>
              <select name="relationship" value={formData.relationship} onChange={handleChange}>
                <option>Child</option>
                <option>Self</option>
                <option>Partner</option>
                <option>Parent</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="form-grid-2-col">
            <div className="form-group">
              <label>Blood Type</label>
              <select name="bloodType" value={formData.bloodType} onChange={handleChange}>
                <option>O+</option>
                <option>O-</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>AB+</option>
                <option>AB-</option>
              </select>
            </div>
            <div className="form-group">
              <label>Nationality</label>
              <select name="nationality" value={formData.nationality} onChange={handleChange}>
                <option value="">Select...</option>
                {nationalities.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Allergies</label>
            <textarea
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              rows="2"
            ></textarea>
          </div>
          <div className="form-group">
            <label>Medical Conditions</label>
            <textarea
              name="medicalConditions"
              value={formData.medicalConditions}
              onChange={handleChange}
              rows="2"
            ></textarea>
          </div>
        </form>
      </div>
      {/* STRUCTURE 5: Footer matches EditProfileModal, with buttons linked to the form */}
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
          Cancel
        </button>
        <button
          type="submit"
          form="add-profile-form"
          className="btn btn-primary"
          disabled={isSaving}
        >
          {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

export default AddProfileModal;
