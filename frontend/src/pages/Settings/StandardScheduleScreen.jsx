import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Fixed typo here
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

function StandardScheduleScreen() {
  const { goBack } = useContext(AppContext);
  return (
    <div className="screen active" id="standard-schedule">
      <nav className="simple-nav">
        <button className="btn-icon back-button" onClick={goBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h2>Standard Schedule</h2>
      </nav>
      <div className="content-wrapper">
        <p>Standard schedule information will be displayed here.</p>
      </div>
    </div>
  );
}

export default StandardScheduleScreen;
