import React, { useState, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { nationalities } from '../../data/nationalities.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import api from '../../api/apiService.js';

const INITIAL_STATE = { name: '', dob: '', relationship: 'Child', gender: 'Female', bloodType: 'O+', nationality: '', allergies: '', medicalConditions: '' };
const AVATAR_COLORS = ['avatar-blue', 'avatar-green', 'avatar-purple', 'avatar-orange', 'avatar-pink', 'avatar-cyan'];

function AddProfileScreen() {
    const { goBack, setAllProfiles, showNotification } = useContext(AppContext);
    const [formData, setFormData] = useState(INITIAL_STATE);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleDateChange = (name, date) => setFormData(prev => ({ ...prev, [name]: date }));

    const handleSaveProfile = async () => {
        if (!formData.name || !formData.dob) {
            showNotification({ type: 'error', title: 'Missing Info', message: 'Please enter a Full Name and Date of Birth.' });
            return;
        }
        setIsSaving(true);
        try {
            const profileData = { ...formData, avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] };
            const newProfile = await api.createProfile(profileData);
            if (!newProfile || !newProfile.name) {
                throw new Error("Profile creation failed. Please try again.");
            }
            setAllProfiles(prev => [...prev, { ...newProfile, vaccines: [] }]);
            showNotification({ type: 'success', message: `Profile for ${newProfile.name} created!` });
            goBack();
        } catch (error) {
            showNotification({ type: 'error', title: 'Save Failed', message: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="screen active">
             <nav className="simple-nav">
                 <button className="btn-icon back-button" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} /></button>
                 <h2>Add Family Member</h2>
                 <div className="header-actions">
                     <button className="btn btn-primary" onClick={handleSaveProfile} disabled={isSaving}>
                         {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Save Profile'}
                     </button>
                 </div>
             </nav>
             <div className="content-wrapper">
                 <div className="form-card">
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className="form-group"><label>Full Name<span className="required-indicator">*</span></label><input type="text" name="name" value={formData.name} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Date of Birth<span className="required-indicator">*</span></label><DatePicker value={formData.dob} onChange={(d) => handleDateChange('dob', d)} /></div>
                        <div className="form-grid-2-col">
                            <div className="form-group"><label>Relationship</label><select name="relationship" value={formData.relationship} onChange={handleChange}><option>Child</option><option>Self</option><option>Partner</option><option>Parent</option><option>Other</option></select></div>
                            <div className="form-group"><label>Gender</label><select name="gender" value={formData.gender} onChange={handleChange}><option>Female</option><option>Male</option><option>Other</option></select></div>
                        </div>
                        <div className="form-grid-2-col">
                             <div className="form-group"><label>Blood Type</label><select name="bloodType" value={formData.bloodType} onChange={handleChange}><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></div>
                             <div className="form-group"><label>Nationality</label><select name="nationality" value={formData.nationality} onChange={handleChange}><option value="">Select...</option>{nationalities.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}</select></div>
                        </div>
                        <div className="form-group"><label>Allergies</label><textarea name="allergies" value={formData.allergies} onChange={handleChange} rows="2"></textarea></div>
                        <div className="form-group"><label>Medical Conditions</label><textarea name="medicalConditions" value={formData.medicalConditions} onChange={handleChange} rows="2"></textarea></div>
                    </form>
                 </div>
            </div>
        </div>
    );
}
export default AddProfileScreen;