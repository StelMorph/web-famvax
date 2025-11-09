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

export const formatDateForDisplay = (dateString) => {
  if (!dateString) return null;
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
  } catch {
    return 'Invalid Date';
  }
};

export { MONTHS, getYears, getDaysInMonth };
