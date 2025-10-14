// src/pages/MyFamily/AIScanReviewExtractedDataScreen.jsx
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
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
import '../../styles/pages/AIScanReviewExtractedDataScreen.css';

/* ---------------- Field configs ---------------- */
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
  optional: [
    'dateAdministered',
    'nextDueDate',
    'vaccineType',
    'dose',
    'lotNumber',
    'administeredBy',
    'notes',
    'sideEffects',
  ],
  all: [
    'vaccineName',
    'dateAdministered',
    'nextDueDate',
    'vaccineType',
    'dose',
    'lotNumber',
    'administeredBy',
    'notes',
    'sideEffects',
  ],
};
const FIELD_CONFIGS = { profile: PROFILE_FIELDS, vaccine: VACCINE_FIELDS };

const RELATIONSHIP_OPTIONS = ['Child', 'Self', 'Partner', 'Parent', 'Other'];
const GENDER_OPTIONS = ['Female', 'Male', 'Other'];
const BLOOD_TYPE_OPTIONS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const VACCINE_TYPE_OPTIONS = ['Standard', 'Travel', 'Seasonal'];

const formatLabel = (key) => {
  const result = key.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

/* ---------------- Component ---------------- */
function AIScanReviewExtractedDataScreen({
  scannedData,
  recordType = 'vaccine',
  onSave,
  onDiscard,
}) {
  const ctx = useContext(AppContext) || {};
  const {
    appState,
    navigateTo,
    showNotification,
    setNavigationGuard, // optional; still usable
    setReviewDirty, // 🔒 global dirty flag to block nav centrally
    fetchDetailedData,
  } = ctx;

  // one-time warning if provider didn’t expose the guard
  const warned = useRef(false);
  useEffect(() => {
    if (!setNavigationGuard && !warned.current) {
      console.warn(
        '[AIReview] setNavigationGuard is not available from context. Central guard will still work via setReviewDirty.',
      );
      warned.current = true;
    }
  }, [setNavigationGuard]);

  const [formData, setFormData] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [initialState, setInitialState] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [otherValues, setOtherValues] = useState({});

  const config = FIELD_CONFIGS[recordType] || FIELD_CONFIGS.vaccine;

  /* -------- init form from scannedData -------- */
  useEffect(() => {
    const initialFormState = {};
    (config.all || []).forEach((fieldKey) => {
      initialFormState[fieldKey] = scannedData?.[fieldKey] || '';
    });
    setFormData(initialFormState);

    const initialCustomFields = (
      scannedData?.customFields ||
      scannedData?.customAttributes ||
      []
    ).map((cf) => ({
      ...cf,
      id: Math.random(),
    }));
    setCustomFields(initialCustomFields);

    setInitialState({ formData: initialFormState, customFields: initialCustomFields });

    // when screen is loaded with fresh data, it's clean
    if (setReviewDirty) setReviewDirty(false);
  }, [scannedData, recordType, config.all, setReviewDirty]);

  /* -------- dirty detection -------- */
  const isDirty = useMemo(() => {
    if (!initialState) return false;
    const curForm = JSON.stringify(formData);
    const baseForm = JSON.stringify(initialState.formData);
    const curCustom = JSON.stringify(customFields.map(({ id, ...rest }) => rest));
    const baseCustom = JSON.stringify(initialState.customFields.map(({ id, ...rest }) => rest));
    return (
      curForm !== baseForm ||
      curCustom !== baseCustom ||
      Object.keys(otherValues).some((k) => otherValues[k])
    );
  }, [formData, customFields, initialState, otherValues]);

  // 🔒 keep global flag synced with isDirty
  useEffect(() => {
    if (setReviewDirty) setReviewDirty(!!isDirty);
  }, [isDirty, setReviewDirty]);

  /* -------- browser/tab guard -------- */
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  /* -------- optional per-screen guard (kept, but not required now) -------- */
  useEffect(() => {
    const guard = (proceed /* fn */) => {
      if (!isDirty) return;
      if (showNotification) {
        showNotification({
          type: 'confirm',
          title: 'Discard changes?',
          message: 'You have unsaved edits. If you leave now, your changes will be lost.',
          confirmText: 'Discard',
          cancelText: 'Stay',
          onConfirm: () => {
            if (setNavigationGuard) setNavigationGuard(null);
            if (setReviewDirty) setReviewDirty(false);
            proceed();
          },
        });
      }
      return false;
    };

    if (isDirty) {
      if (setNavigationGuard) setNavigationGuard(() => guard);
    } else if (setNavigationGuard) {
      setNavigationGuard(null);
    }

    return () => {
      if (setNavigationGuard) setNavigationGuard(null);
    };
  }, [isDirty, setNavigationGuard, setReviewDirty, showNotification]);

  /* -------- handlers -------- */
  const handleTextareaInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };
  const handleInputChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleOtherInputChange = (name, value) => setOtherValues((p) => ({ ...p, [name]: value }));
  const handleDateChange = (name, value) => setFormData((p) => ({ ...p, [name]: value }));

  const handleAddCustomField = () =>
    setCustomFields((p) => [...p, { id: Math.random(), label: '', value: '' }]);
  const handleCustomFieldChange = (index, fieldName, value) => {
    const updated = [...customFields];
    updated[index][fieldName] = value;
    setCustomFields(updated);
  };
  const handleRemoveCustomField = (idToRemove) => {
    if (showNotification) {
      showNotification({
        type: 'confirm',
        title: 'Delete Field?',
        message: 'Are you sure you want to delete this field?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: () => setCustomFields((prev) => prev.filter((f) => f.id !== idToRemove)),
      });
    }
  };

  const handleDiscard = () => {
    if (!isDirty) {
      if (setReviewDirty) setReviewDirty(false);
      if (onDiscard) onDiscard();
      else if (navigateTo) navigateTo('my-family-screen');
      return;
    }
    if (showNotification) {
      showNotification({
        type: 'confirm',
        title: 'Unsaved Changes',
        message: 'Discard changes?',
        confirmText: 'Discard',
        cancelText: 'Stay',
        onConfirm: () => {
          if (setNavigationGuard) setNavigationGuard(null);
          if (setReviewDirty) setReviewDirty(false);
          if (onDiscard) onDiscard();
          else if (navigateTo) navigateTo('my-family-screen');
        },
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const final = { ...formData };
    for (const k of Object.keys(otherValues)) {
      if (formData[k] === 'Other' && otherValues[k]) final[k] = otherValues[k];
    }
    const finalCustom = customFields
      .filter((f) => f.label && f.value)
      .map(({ id, ...rest }) => rest);

    try {
      if (recordType === 'profile') {
        final.customAttributes = finalCustom;
        await api.createProfile(final);
        if (showNotification) {
          showNotification({
            type: 'info',
            title: 'Profile Created',
            message: `${final.name} has been added.`,
          });
        }
        if (fetchDetailedData) await fetchDetailedData();
        if (setReviewDirty) setReviewDirty(false);
        if (setNavigationGuard) setNavigationGuard(null);
        if (onSave) onSave({ type: 'profile', data: final });
        // ⬇️ Bypass guard on post-save navigation
        if (navigateTo) navigateTo('my-family-screen', {}, { bypassGuard: true });
      } else {
        final.customFields = finalCustom;
        const profileId = appState?.currentProfileId;
        if (!profileId) throw new Error('No profile selected for this vaccine record.');
        await api.createVaccine(profileId, final);
        if (showNotification) {
          showNotification({
            type: 'info',
            title: 'Vaccine Added',
            message: `Record for ${final.vaccineName} has been saved.`,
          });
        }
        if (setReviewDirty) setReviewDirty(false);
        if (setNavigationGuard) setNavigationGuard(null);
        if (onSave) onSave({ type: 'vaccine', data: final, profileId });
        // ⬇️ Bypass guard on post-save navigation
        if (navigateTo)
          navigateTo(
            'profile-detail-screen',
            { currentProfileId: profileId },
            { bypassGuard: true },
          );
      }
    } catch (e) {
      if (showNotification) {
        showNotification({
          type: 'error',
          title: 'Save Failed',
          message: e?.message || 'An unknown error occurred.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  /* -------- render helpers -------- */
  const renderFormField = (key) => {
    const className = `form-group ${
      ['administeredBy', 'notes', 'sideEffects', 'allergies', 'medicalConditions'].includes(key)
        ? 'full-width'
        : ''
    }`;

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

    if (['dateOfBirth', 'dob', 'dateAdministered', 'nextDueDate'].includes(key)) {
      field = <DatePicker value={formData[key] || ''} onChange={(v) => handleDateChange(key, v)} />;
    } else if (['notes', 'sideEffects', 'allergies', 'medicalConditions'].includes(key)) {
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

  /* -------- UI -------- */
  return (
    <div className="review-screen-container">
      <div className="review-content">
        <div className="review-header">
          <FontAwesomeIcon icon={faFileInvoice} className="header-icon" />
          <h2>Review Scanned {recordType === 'profile' ? 'Profile' : 'Vaccine'} Data</h2>
          <p>Review and correct the extracted information before saving.</p>
        </div>

        <div className="review-form">{(config.all || []).map((k) => renderFormField(k))}</div>

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
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIScanReviewExtractedDataScreen;
