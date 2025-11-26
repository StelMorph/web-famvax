export const formatDateForDisplay = (dateString) => {
  if (!dateString) return null;
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return 'Invalid Date';
  }
};
