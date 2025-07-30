import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext'; // CORRECTED
import PhoneInput from '../common/PhoneInput.jsx'; // CORRECTED
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrashAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import DatePicker from '../common/DatePicker.jsx'; // CORRECTED
import api from '../../api/apiService'; // CORRECTED

// ... (Rest of the component is unchanged as its logic was mostly fine)
const createDefaultPhone = () => ({ code: '+1', number: '' });

function EditProfileModal({ profile, onUpdate, onClose }) {
  const [formData, setFormData] = useState(null);
  const { showNotification } = useContext(AppContext);
  
  const allergiesRef = useRef(null);
  const medicalConditionsRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '', dob: profile.dob || '',
        relationship: profile.relationship || 'Self', gender: profile.gender || 'Other',
        bloodType: profile.bloodType || 'A+', allergies: profile.allergies || '',
        medicalConditions: profile.medicalConditions || '',
      });
    }
  }, [profile]);
  
  const handleSimpleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDateChange = (name, date) => setFormData(prev => ({ ...prev, [name]: date }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const updatedProfile = await api.updateProfile(profile.profileId, formData);
        onUpdate(updatedProfile);
    } catch (error) {
        showNotification({ type: 'error', title: 'Error', message: error.message });
    }
  };

  if (!formData) return null;

  return (
    <div className="modal-content modal-flex-col">
      <div className="modal-header">
        <h2>Edit {profile.name}</h2>
        <button className="btn-icon modal-close" onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>
      </div>
      <div className="modal-body-scrollable">
        <form onSubmit={handleSubmit} id="edit-profile-form">
            <div className="form-grid-2-col">
                <div className="form-group"><label>Full Name *</label><input type="text" name="name" value={formData.name} onChange={handleSimpleChange} required /></div>
                <div className="form-group"><label>Date of Birth *</label><DatePicker value={formData.dob} onChange={(d) => handleDateChange('dob', d)} /></div>
                <div className="form-group"><label>Relationship *</label><select name="relationship" value={formData.relationship} onChange={handleSimpleChange}><option>Self</option><option>Child</option><option>Partner</option><option>Parent</option><option>Other</option></select></div>
                <div className="form-group"><label>Gender</label><select name="gender" value={formData.gender} onChange={handleSimpleChange}><option>Male</option><option>Female</option><option>Other</option></select></div>
            </div>
            <div className="form-group"><label>Blood Type</label><select name="bloodType" value={formData.bloodType} onChange={handleSimpleChange}><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></div>
            <div className="form-group"><label>Allergies</label><textarea ref={allergiesRef} name="allergies" value={formData.allergies} onChange={handleSimpleChange} rows="2"></textarea></div>
            <div className="form-group"><label>Medical Conditions</label><textarea ref={medicalConditionsRef} name="medicalConditions" value={formData.medicalConditions} onChange={handleSimpleChange} rows="3"></textarea></div>
        </form>
      </div>
      <div className="modal-footer">
        <button type="submit" form="edit-profile-form" className="btn btn-primary">Update Member</button>
      </div>
    </div>
  );
}

export default EditProfileModal;