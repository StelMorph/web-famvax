import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear + 10; i >= currentYear - 120; i--) {
    years.push(i);
  }
  return years;
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

import { formatDateForDisplay } from '../../utils/dateUtils';

function DatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef(null);

  // Ensure date calculations are based on a valid date or a default
  const date = value && !isNaN(new Date(value)) ? new Date(value) : new Date();
  const selectedYear = date.getFullYear();
  const selectedMonth = date.getMonth();
  const selectedDay = date.getDate();

  const years = React.useMemo(() => getYears(), []);
  const days = React.useMemo(
    () => Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1),
    [selectedYear, selectedMonth],
  );

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  const handleDateChange = (part, newValue) => {
    let newDate = new Date(date.getTime());

    const numericValue = parseInt(newValue, 10);

    if (part === 'year') newDate.setFullYear(numericValue);
    if (part === 'month') newDate.setMonth(numericValue);
    if (part === 'day') newDate.setDate(numericValue);

    // Check if day is valid for new month/year, adjust if necessary
    const maxDays = getDaysInMonth(newDate.getFullYear(), newDate.getMonth());
    if (newDate.getDate() > maxDays) {
      newDate.setDate(maxDays);
    }

    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');

    onChange(`${year}-${month}-${day}`);
  };

  return (
    <div className="date-picker-wrapper" ref={wrapperRef}>
      <button type="button" className="date-picker-input" onClick={() => setIsOpen(!isOpen)}>
        <span>{formatDateForDisplay(value) || 'mm/dd/yyyy'}</span>
        <FontAwesomeIcon icon={faCalendarDays} />
      </button>
      {isOpen && (
        <div className="date-picker-dropdown">
          <select value={selectedMonth} onChange={(e) => handleDateChange('month', e.target.value)}>
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select value={selectedDay} onChange={(e) => handleDateChange('day', e.target.value)}>
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <select value={selectedYear} onChange={(e) => handleDateChange('year', e.target.value)}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default DatePicker;
