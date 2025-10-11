// src/components/modals/AddEditVaccineModal.jsx
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons';
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
  const { showNotification, allProfiles, showModal } = useContext(AppContext);

  const [isEditing, setIsEditing] = useState(mode === 'add');
  const [initialData, setInitialData] = useState(INITIAL_FORM_STATE);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const notesRef = useRef(null);
  const sideEffectsRef = useRef(null);

  useEffect(() => {
    const data = mode === 'add' ? INITIAL_FORM_STATE : { ...INITIAL_FORM_STATE, ...vaccine };
    setFormData(data);
    setInitialData(data);
  }, [vaccine, mode]);

  // -------- auto-expand textareas (on mount + on change)
  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => {
    autoGrow(notesRef.current);
    autoGrow(sideEffectsRef.current);
  }, [formData.notes, formData.sideEffects]);

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
        // FIX: Construct a clean payload with only the fields allowed by the backend schema.
        const payload = {
          vaccineName: formData.vaccineName,
          vaccineType: formData.vaccineType,
          dose: formData.dose,
          date: formData.date,
          nextDueDate: formData.nextDueDate,
          lot: formData.lot,
          clinic: formData.clinic,
          notes: formData.notes,
          sideEffects: formData.sideEffects,
        };
        savedRecord = await api.updateVaccine(profileId, vaccine.vaccineId, payload);
      }
      onSave(savedRecord);
    } catch (error) {
      showNotification({ type: 'error', title: 'Save Failed', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Soft-delete with Undo: calls onDelete({ vaccineId, undoToken, undoExpiresAt, record })
  const handleDelete = () => {
    if (mode === 'add') return; // nothing to delete yet

    showNotification({
      type: 'confirm-destructive',
      title: 'Delete Record?',
      message: 'This will delete the record now. You can undo for the next 10 seconds.',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const res = await api.deleteVaccine(profileId, vaccine.vaccineId); // { vaccineId, undoToken, undoExpiresAt }
          onDelete?.({
            vaccineId: vaccine.vaccineId,
            undoToken: res.undoToken,
            undoExpiresAt: res.undoExpiresAt,
            record: vaccine, // backup so UI can restore without refetch
          });
        } catch (error) {
          showNotification({ type: 'error', title: 'Delete Failed', message: error.message });
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
  const getTitle = () =>
    mode === 'add' ? 'Add Record' : isEditing ? 'Edit Record' : 'Record Details';
  const profile = allProfiles.find((p) => p.profileId === profileId);
  const canEdit = !profile?.isShared || profile?.role === 'Editor';

  return (
    <div className="modal-content modal-flex-col">
      {/* Header */}
      <div className="modal-header">
        <div />
        <h2>{getTitle()}</h2>
        <button
          className="btn-icon modal-close"
          onClick={onClose}
          disabled={isSaving || isDeleting}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <div className="modal-body-scrollable">
        {isEditing ? (
          <form onSubmit={(e) => e.preventDefault()}>
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
                className="textarea-auto"
                name="notes"
                value={formData.notes}
                onChange={(e) => {
                  handleChange(e);
                  autoGrow(e.target);
                }}
                rows="1"
              ></textarea>
            </div>
            <div className="form-group">
              <label>Side Effects</label>
              <textarea
                ref={sideEffectsRef}
                className="textarea-auto"
                name="sideEffects"
                value={formData.sideEffects}
                onChange={(e) => {
                  handleChange(e);
                  autoGrow(e.target);
                }}
                rows="1"
              ></textarea>
            </div>
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

      {/* Footer */}
      <div className="modal-footer">
        {isEditing ? (
          <>
            {mode !== 'add' && canEdit && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
              >
                {isDeleting ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faTrashAlt} />
                )}
                &nbsp;Delete Record
              </button>
            )}
            <div className="spacer" />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => (mode === 'view' ? setIsEditing(false) : onClose())}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!hasChanges || isSaving || isDeleting}
            >
              {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Save'}
            </button>
          </>
        ) : (
          <>
            {canEdit && (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() =>
                    showModal('vaccine-share', {
                      currentProfileId: profileId,
                      currentEditingVaccine: vaccine,
                    })
                  }
                  title="Share this record"
                  style={{ marginLeft: 8 }}
                >
                  Share
                </button>
              </>
            )}
            <div className="spacer" />
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AddEditVaccineModal;
