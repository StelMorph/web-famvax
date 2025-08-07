import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons'; // Import faTimes
import DatePicker, { formatDateForDisplay } from '../common/DatePicker.jsx';
import api from '../../api/apiService.js';

const INITIAL_FORM_STATE = {
  vaccineName: '',
  vaccineType: 'Standard',
  dose: '',
  date: '',
  nextDueDate: '',
  lot: '',
  clinic: '',
  notes: '',
  sideEffects: '',
};

const InfoDisplayItem = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="record-info-item">
      <span className="info-label">{label}</span>
      <p className="info-value">{value}</p>
    </div>
  );
};

function AddEditVaccineModal({ vaccine, mode, profileId, onClose, onSave, onDelete }) {
  const { showNotification, allProfiles } = useContext(AppContext);

  const [isEditing, setIsEditing] = useState(mode === 'add');
  const [initialData, setInitialData] = useState(INITIAL_FORM_STATE);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);

  const notesRef = useRef(null);
  const sideEffectsRef = useRef(null);

  useEffect(() => {
    const data = mode === 'add' ? INITIAL_FORM_STATE : { ...INITIAL_FORM_STATE, ...vaccine };
    setFormData(data);
    setInitialData(data);
  }, [vaccine, mode]);

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDateChange = (name, date) => setFormData((prev) => ({ ...prev, [name]: date }));

  const handleSave = async () => {
    if (!formData.vaccineName || (!formData.date && !formData.nextDueDate)) {
      showNotification({
        type: 'error',
        title: 'Missing Info',
        message: 'Please provide a Vaccine Name and at least one date.',
      });
      return;
    }

    setIsSaving(true);
    try {
      let savedRecord;
      if (mode === 'add') {
        savedRecord = await api.createVaccine(profileId, formData);
      } else {
        savedRecord = await api.updateVaccine(vaccine.vaccineId, formData);
      }
      // Pass only the record back; the controller now handles the logic
      onSave(savedRecord);
    } catch (error) {
      showNotification({ type: 'error', title: 'Save Failed', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    showNotification({
      type: 'confirm-destructive',
      title: 'Delete Record?',
      message: 'This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.deleteVaccine(vaccine.vaccineId);
          onDelete(vaccine.vaccineId);
        } catch (error) {
          showNotification({ type: 'error', title: 'Delete Failed', message: error.message });
        }
      },
    });
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
  const getTitle = () =>
    mode === 'add' ? 'Add Record' : isEditing ? 'Edit Record' : 'Record Details';
  const profile = allProfiles.find((p) => p.profileId === profileId);
  const canEdit = !profile.isShared || profile.role === 'Editor';

  return (
    <div className="modal-content modal-flex-col">
      {/* --- UI REFINEMENT: MODAL HEADER --- */}
      <div className="modal-header">
        {/* A placeholder div to keep the title perfectly centered */}
        <div>
          {isEditing && mode !== 'add' && (
            <button
              className="btn-icon back-button"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            ></button>
          )}
        </div>
        <h2>{getTitle()}</h2>
        <button className="btn-icon modal-close" onClick={onClose} disabled={isSaving}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <div className="modal-body-scrollable">
        {isEditing ? (
          <form onSubmit={(e) => e.preventDefault()}>
            {/* Form content remains the same */}
            <div className="form-grid-2-col">
              <div className="form-group">
                <label>
                  Vaccine Name<span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  name="vaccineName"
                  value={formData.vaccineName}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Vaccine Type</label>
                <select name="vaccineType" value={formData.vaccineType} onChange={handleChange}>
                  <option>Standard</option>
                  <option>Travel</option>
                  <option>Seasonal</option>
                </select>
              </div>
              <div className="form-group">
                <label>Dose</label>
                <input type="text" name="dose" value={formData.dose} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Date Administered</label>
                <DatePicker value={formData.date} onChange={(d) => handleDateChange('date', d)} />
              </div>
              <div className="form-group">
                <label>Next Due Date</label>
                <DatePicker
                  value={formData.nextDueDate}
                  onChange={(d) => handleDateChange('nextDueDate', d)}
                />
              </div>
              <div className="form-group">
                <label>Lot Number</label>
                <input type="text" name="lot" value={formData.lot} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Administered By</label>
              <input type="text" name="clinic" value={formData.clinic} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                ref={notesRef}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                style={{ resize: 'vertical' }}
              ></textarea>
            </div>
            <div className="form-group">
              <label>Side Effects</label>
              <textarea
                ref={sideEffectsRef}
                name="sideEffects"
                value={formData.sideEffects}
                onChange={handleChange}
                rows="3"
                style={{ resize: 'vertical' }}
              ></textarea>
            </div>
            {mode === 'view' && (
              <button type="button" className="btn-delete" onClick={handleDelete}>
                <FontAwesomeIcon icon={faTrashAlt} /> Delete Record
              </button>
            )}
          </form>
        ) : (
          <div className="record-details-grid">
            <InfoDisplayItem label="Vaccine Name" value={formData.vaccineName} />
            <InfoDisplayItem label="Type" value={formData.vaccineType} />
            <InfoDisplayItem label="Dose" value={formData.dose} />
            <InfoDisplayItem
              label="Date Administered"
              value={formatDateForDisplay(formData.date)}
            />
            <InfoDisplayItem
              label="Next Due Date"
              value={formatDateForDisplay(formData.nextDueDate)}
            />
            <InfoDisplayItem label="Lot Number" value={formData.lot} />
            <InfoDisplayItem label="Administered By" value={formData.clinic} />
            <InfoDisplayItem label="Notes" value={formData.notes} />
            <InfoDisplayItem label="Side Effects" value={formData.sideEffects} />
          </div>
        )}
      </div>
      <div className="modal-footer">
        {isEditing ? (
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => (mode === 'view' ? setIsEditing(false) : onClose())}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Save'}
            </button>
          </>
        ) : (
          <>
            {canEdit && (
              <button type="button" className="btn btn-primary" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AddEditVaccineModal;
