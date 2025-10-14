// src/pages/MyFamily/AIScanReviewExtractedDataScreen.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoice,
  faFloppyDisk,
  faTrash,
  faPlusCircle,
  faTimesCircle,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { AppContext } from '../../contexts/AppContext.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import api from '../../api/apiService.js';
import { nationalities } from '../../data/nationalities.js';
import '../../styles/pages/AIScanReviewExtractedDataScreen.css';
// --- Field Configurations ---
const PROFILE_FIELDS = {
  required: ['name', 'dob', 'relationship'],
  optional: ['gender', 'bloodType', 'nationality', 'allergies', 'medicalConditions', 'notes'],
  all: [
    'name',
    'dob',
    'relationship',
    'gender',
    'bloodType',
    'nationality',
    'allergies',
    'medicalConditions',
    'notes',
  ],
};

const VACCINE_FIELDS = {
  required: ['vaccineName'],
  optional: ['date', 'nextDueDate', 'vaccineType', 'dose', 'lot', 'clinic', 'notes', 'sideEffects'],
  all: [
    'vaccineName',
    'date',
    'nextDueDate',
    'vaccineType',
    'dose',
    'lot',
    'clinic',
    'notes',
    'sideEffects',
  ],
};

const FIELD_CONFIGS = {
  profile: PROFILE_FIELDS,
  vaccine: VACCINE_FIELDS,
};

// --- Options for Pickers ---
const RELATIONSHIP_OPTIONS = ['Child', 'Self', 'Partner', 'Parent', 'Other'];
const GENDER_OPTIONS = ['Female', 'Male', 'Other'];
const BLOOD_TYPE_OPTIONS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const VACCINE_TYPE_OPTIONS = ['Standard', 'Travel', 'Seasonal'];

const formatLabel = (key) => {
  if (key === 'dob') return 'Date Of Birth';
  if (key === 'date') return 'Date Administered';
  if (key === 'lot') return 'Lot Number';
  if (key === 'clinic') return 'Administered By';
  const result = key.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

function AIScanReviewExtractedDataScreen({ scannedData, recordType, onSave, onDiscard }) {
  const { showNotification, appState, navigateTo, refreshUserData } = useContext(AppContext);

  const [formData, setFormData] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [initialState, setInitialState] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [otherValues, setOtherValues] = useState({});

  const config = FIELD_CONFIGS[recordType] || FIELD_CONFIGS.vaccine;
  const dateFieldKeys = ['dob', 'date', 'nextDueDate'];
  const textAreaKeys = ['notes', 'sideEffects', 'allergies', 'medicalConditions'];

  useEffect(() => {
    const initialFormState = {};
    config.all.forEach((fieldKey) => {
      initialFormState[fieldKey] = scannedData?.[fieldKey] || '';
    });
    setFormData(initialFormState);
    const initialCustomFields = (
      scannedData?.customFields ||
      scannedData?.customAttributes ||
      []
    ).map((cf) => ({ ...cf, id: Math.random() }));
    setCustomFields(initialCustomFields);
    setInitialState({ formData: initialFormState, customFields: initialCustomFields });
  }, [scannedData, recordType, config.all]);

  const isDirty = useMemo(() => {
    if (!initialState) return false;
    const currentFormString = JSON.stringify(formData);
    const initialFormString = JSON.stringify(initialState.formData);
    const currentCustomString = JSON.stringify(customFields.map(({ id, ...rest }) => rest));
    const initialCustomString = JSON.stringify(
      initialState.customFields.map(({ id, ...rest }) => rest),
    );
    return (
      currentFormString !== initialFormString ||
      currentCustomString !== initialCustomString ||
      Object.keys(otherValues).some((k) => otherValues[k])
    );
  }, [formData, customFields, initialState, otherValues]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  const handleTextareaInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleOtherInputChange = (fieldName, value) => {
    setOtherValues((prev) => ({ ...prev, [fieldName]: value }));
  };
  const handleDateChange = (fieldName, dateValue) => {
    setFormData((prev) => ({ ...prev, [fieldName]: dateValue }));
  };
  const handleAddCustomField = () => {
    setCustomFields((prev) => [...prev, { id: Math.random(), label: '', value: '' }]);
  };
  const handleCustomFieldChange = (index, fieldName, value) => {
    const updatedFields = [...customFields];
    updatedFields[index][fieldName] = value;
    setCustomFields(updatedFields);
  };
  const handleRemoveCustomField = (idToRemove) => {
    showNotification({
      type: 'confirm-destructive',
      title: 'Delete Field?',
      message: 'Are you sure?',
      confirmText: 'Delete',
      onConfirm: () => setCustomFields((prev) => prev.filter((field) => field.id !== idToRemove)),
    });
  };
  const handleDiscard = () => {
    if (!isDirty) {
      onDiscard();
      return;
    }
    showNotification({
      type: 'confirm',
      title: 'Unsaved Changes',
      message: 'Discard changes?',
      confirmText: 'Discard',
      onConfirm: onDiscard,
    });
  };

  const handleSave = async () => {
    if (recordType === 'profile' && (!formData.name || !formData.dob)) {
      showNotification({
        type: 'error',
        title: 'Missing Info',
        message: 'Please enter a Full Name and Date of Birth.',
      });
      return;
    }
    if (
      recordType === 'vaccine' &&
      (!formData.vaccineName || (!formData.date && !formData.nextDueDate))
    ) {
      showNotification({
        type: 'error',
        title: 'Missing Info',
        message: 'Please provide a Vaccine Name and at least one date.',
      });
      return;
    }

    setIsSaving(true);
    const finalPayload = { ...formData };
    for (const key in otherValues) {
      if (formData[key] === 'Other' && otherValues[key]) {
        finalPayload[key] = otherValues[key];
      }
    }
    const finalCustomFields = customFields
      .filter((f) => f.label && f.value)
      .map(({ id, ...rest }) => rest);
    if (recordType === 'profile') {
      finalPayload.customAttributes = finalCustomFields;
    } else {
      finalPayload.customFields = finalCustomFields;
    }

    try {
      if (recordType === 'profile') {
        await api.createProfile(finalPayload);
        showNotification({
          type: 'success',
          title: 'Profile Created',
          message: `${finalPayload.name} has been added.`,
        });
        await refreshUserData();
        navigateTo('my-family-screen');
      } else {
        const profileId = appState.currentProfileId;
        if (!profileId) throw new Error('No profile selected for this vaccine record.');

        const vaccinePayload = {
          vaccineName: finalPayload.vaccineName,
          vaccineType: finalPayload.vaccineType,
          dose: finalPayload.dose,
          date: finalPayload.date,
          nextDueDate: finalPayload.nextDueDate,
          lot: finalPayload.lot,
          clinic: finalPayload.clinic,
          notes: finalPayload.notes,
          sideEffects: finalPayload.sideEffects,
          customFields: finalPayload.customFields,
        };
        await api.createVaccine(profileId, vaccinePayload);
        showNotification({
          type: 'success',
          title: 'Vaccine Added',
          message: `Record for ${finalPayload.vaccineName} has been saved.`,
        });
        navigateTo('profile-detail-screen', { currentProfileId: profileId });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderFormField = (key) => {
    const className = `form-group ${['administeredBy', 'notes', 'sideEffects', 'allergies', 'medicalConditions', 'clinic'].includes(key) ? 'full-width' : ''}`;
    let field = (
      <input
        type="text"
        id={key}
        name={key}
        value={formData[key] || ''}
        onChange={handleInputChange}
        className="form-input"
        placeholder={`Enter ${formatLabel(key)}...`}
      />
    );

    if (dateFieldKeys.includes(key)) {
      field = (
        <DatePicker
          value={formData[key] || ''}
          onChange={(dateValue) => handleDateChange(key, dateValue)}
        />
      );
    } else if (textAreaKeys.includes(key)) {
      field = (
        <textarea
          id={key}
          name={key}
          value={formData[key] || ''}
          onChange={handleInputChange}
          onInput={handleTextareaInput}
          className="form-input"
          rows={2}
          placeholder={`Enter ${formatLabel(key)}...`}
        />
      );
    } else if (key === 'relationship') {
      field = (
        <>
          <select
            name="relationship"
            value={formData.relationship}
            onChange={handleInputChange}
            className="form-input"
          >
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {formData.relationship === 'Other' && (
            <input
              type="text"
              value={otherValues.relationship || ''}
              onChange={(e) => handleOtherInputChange('relationship', e.target.value)}
              className="form-input other-input-field"
              placeholder="Please specify relationship"
            />
          )}
        </>
      );
    } else if (key === 'gender') {
      field = (
        <>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            className="form-input"
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {formData.gender === 'Other' && (
            <input
              type="text"
              value={otherValues.gender || ''}
              onChange={(e) => handleOtherInputChange('gender', e.target.value)}
              className="form-input other-input-field"
              placeholder="Please specify gender"
            />
          )}
        </>
      );
    } else if (key === 'bloodType') {
      field = (
        <select
          name="bloodType"
          value={formData.bloodType}
          onChange={handleInputChange}
          className="form-input"
        >
          {BLOOD_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    } else if (key === 'vaccineType') {
      field = (
        <select
          name="vaccineType"
          value={formData.vaccineType}
          onChange={handleInputChange}
          className="form-input"
        >
          {VACCINE_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    } else if (key === 'nationality') {
      field = (
        <select
          name="nationality"
          value={formData.nationality}
          onChange={handleInputChange}
          className="form-input"
        >
          <option value="">Select...</option>
          {nationalities.map((n) => (
            <option key={n.name} value={n.name}>
              {n.name}
            </option>
          ))}
        </select>
      );
    }

    return (
      <div className={className} key={key}>
        <label htmlFor={key}>
          {formatLabel(key)}
          {config.required.includes(key) && <span className="required-asterisk">*</span>}
        </label>
        {field}
      </div>
    );
  };

  return (
    <div className="review-screen-container">
      <div className="review-content">
        <div className="review-header">
          <FontAwesomeIcon icon={faFileInvoice} className="header-icon" />
          <h2>Review Scanned {recordType === 'profile' ? 'Profile' : 'Vaccine'} Data</h2>
          <p>Review and correct the extracted information before saving.</p>
        </div>
        <div className="review-form">{config.all.map((fieldKey) => renderFormField(fieldKey))}</div>
        <hr className="form-divider" />
        <div className="custom-fields-section">
          <h4>Custom Fields</h4>
          {customFields.map((field, index) => (
            <div className="custom-field-row" key={field.id}>
              <input
                type="text"
                value={field.label}
                onChange={(e) => handleCustomFieldChange(index, 'label', e.target.value)}
                className="form-input custom-field-input"
                placeholder="Field Label (e.g., Clinic Phone)"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                className="form-input custom-field-input"
                placeholder="Value"
              />
              <button
                onClick={() => handleRemoveCustomField(field.id)}
                className="btn-icon remove-custom-field-btn"
                title="Remove Field"
              >
                <FontAwesomeIcon icon={faTimesCircle} />
              </button>
            </div>
          ))}
          <button className="btn btn-secondary btn-add-custom" onClick={handleAddCustomField}>
            <FontAwesomeIcon icon={faPlusCircle} />
            <span>Add Custom Field</span>
          </button>
        </div>
        <div className="review-actions">
          <button className="btn btn-secondary" onClick={handleDiscard} disabled={isSaving}>
            <FontAwesomeIcon icon={faTrash} />
            <span>Discard</span>
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faFloppyDisk} />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Record'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIScanReviewExtractedDataScreen;
