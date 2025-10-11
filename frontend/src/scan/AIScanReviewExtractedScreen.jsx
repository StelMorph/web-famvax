// frontend/src/scan/AIScanReviewExtractedScreen.jsx

import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import DatePicker from '../components/common/DatePicker.jsx';
import api from '../api/apiService.js';

const AVATAR_COLORS = [
  'avatar-blue',
  'avatar-green',
  'avatar-purple',
  'avatar-orange',
  'avatar-pink',
  'avatar-cyan',
];

function AIScanReviewExtractedScreen() {
  const { goBack, appState, allProfiles, setAllProfiles, showNotification, navigateTo } =
    useContext(AppContext);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const notesRef = useRef(null);
  const sideEffectsRef = useRef(null);

  useEffect(() => {
    setFormData(appState.extractedData || {});
  }, [appState.extractedData]);

  useEffect(() => {
    autoGrow(notesRef);
    autoGrow(sideEffectsRef);
  }, [formData.notes, formData.sideEffects]);

  const autoGrow = (ref) => {
    if (ref?.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  };

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDateChange = (fieldName, newDate) =>
    setFormData((prev) => ({ ...prev, [fieldName]: newDate }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (appState.addType === 'member') {
        if (!formData.name || !formData.dob) {
          showNotification({
            type: 'error',
            message: 'Please confirm the Full Name and Date of Birth.',
          });
          setIsSaving(false);
          return;
        }
        const profileData = {
          ...formData,
          avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        };
        const newProfile = await api.createProfile(profileData);
        setAllProfiles((prev) => [...(prev || []), { ...newProfile, vaccines: [] }]);
        showNotification({ type: 'success', message: `New member "${newProfile.name}" added!` });
        navigateTo('my-family-screen');
      } else {
        if (!formData.vaccineName || (!formData.date && !formData.nextDueDate)) {
          showNotification({
            type: 'error',
            message: 'Please confirm the Vaccine Name and at least one date.',
          });
          setIsSaving(false);
          return;
        }
        const newRecord = await api.createVaccine(appState.currentProfileId, formData);
        setAllProfiles((currentProfiles) =>
          currentProfiles.map((profile) => {
            if (profile.profileId === appState.currentProfileId) {
              return { ...profile, vaccines: [...(profile.vaccines || []), newRecord] };
            }
            return profile;
          }),
        );
        const profileName =
          allProfiles.find((p) => p.profileId === appState.currentProfileId)?.name || 'the profile';
        showNotification({
          type: 'success',
          message: `New record "${newRecord.vaccineName}" added to ${profileName}!`,
        });
        navigateTo('profile-detail-screen', { currentProfileId: appState.currentProfileId });
      }
    } catch (error) {
      showNotification({ type: 'error', title: 'Save Failed', message: error.message });
      setIsSaving(false);
    }
  };

  const renderMemberForm = () => (
    <>
      <div className="form-group low-confidence">
        <label>
          Full Name<span className="required-indicator">*</span>{' '}
          <FontAwesomeIcon icon={faExclamationTriangle} title="Low confidence extraction" />
        </label>
        <input type="text" name="name" value={formData.name || ''} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>
          Date of Birth<span className="required-indicator">*</span>
        </label>
        <DatePicker value={formData.dob} onChange={(newDate) => handleDateChange('dob', newDate)} />
      </div>
      <div className="form-grid-2-col">
        <div className="form-group">
          <label>Relationship</label>
          <select
            name="relationship"
            value={formData.relationship || 'Child'}
            onChange={handleChange}
          >
            <option>Child</option>
            <option>Self</option>
            <option>Partner</option>
            <option>Parent</option>
            <option>Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Gender</label>
          <select name="gender" value={formData.gender || 'Female'} onChange={handleChange}>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Blood Type</label>
        <select name="bloodType" value={formData.bloodType || 'A+'} onChange={handleChange}>
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
        <label>Allergies</label>
        <textarea
          ref={sideEffectsRef}
          name="allergies"
          value={formData.allergies || ''}
          onChange={handleChange}
          rows="1"
          style={{ resize: 'none', overflow: 'hidden' }}
        ></textarea>
      </div>
      <div className="form-group">
        <label>Medical Conditions</label>
        <textarea
          ref={sideEffectsRef}
          name="medicalConditions"
          value={formData.medicalConditions || ''}
          onChange={handleChange}
          rows="1"
          style={{ resize: 'none', overflow: 'hidden' }}
        ></textarea>
      </div>
    </>
  );

  const renderRecordForm = () => (
    <>
      <div className="form-grid-2-col">
        <div className="form-group low-confidence">
          <label>
            Vaccine Name<span className="required-indicator">*</span>{' '}
            <FontAwesomeIcon icon={faExclamationTriangle} title="Low confidence extraction" />
          </label>
          <input
            type="text"
            name="vaccineName"
            value={formData.vaccineName || ''}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Vaccine Type</label>
          <select
            name="vaccineType"
            value={formData.vaccineType || 'Standard'}
            onChange={handleChange}
          >
            <option>Standard</option>
            <option>Travel</option>
            <option>Seasonal</option>
          </select>
        </div>
        <div className="form-group">
          <label>Dose Number</label>
          <input type="text" name="dose" value={formData.dose || ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Date Administered</label>
          <DatePicker
            value={formData.date}
            onChange={(newDate) => handleDateChange('date', newDate)}
          />
        </div>
        <div className="form-group">
          <label>Next Due Date</label>
          <DatePicker
            value={formData.nextDueDate}
            onChange={(newDate) => handleDateChange('nextDueDate', newDate)}
          />
        </div>
        <div className="form-group low-confidence">
          <label>
            Batch/Lot Number{' '}
            <FontAwesomeIcon icon={faExclamationTriangle} title="Low confidence extraction" />
          </label>
          <input type="text" name="lot" value={formData.lot || ''} onChange={handleChange} />
        </div>
      </div>
      <div className="form-group">
        <label>Administered By</label>
        <input type="text" name="clinic" value={formData.clinic || ''} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Notes</label>
        <textarea
          ref={notesRef}
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows="1"
          style={{ resize: 'none', overflow: 'hidden' }}
        ></textarea>
      </div>
      <div className="form-group">
        <label>Side Effects</label>
        <textarea
          ref={sideEffectsRef}
          name="sideEffects"
          value={formData.sideEffects || ''}
          onChange={handleChange}
          rows="1"
          style={{ resize: 'none', overflow: 'hidden' }}
        ></textarea>
      </div>
    </>
  );

  return (
    <div className="screen active" id="ai-scan-review-extracted">
      <nav className="simple-nav">
        <button className="btn-icon back-button" onClick={() => goBack(1)}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h2>Review Scanned Data</h2>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Save'}
          </button>
        </div>
      </nav>
      <div className="content-wrapper">
        <div className="form-card">
          <form id="scan-review-form" onSubmit={(e) => e.preventDefault()}>
            {appState.addType === 'member' ? renderMemberForm() : renderRecordForm()}
          </form>
        </div>
      </div>
    </div>
  );
}

export default AIScanReviewExtractedScreen;
