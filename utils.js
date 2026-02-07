/**
 * Generates a reading ID in "YYYY-MM" format based on the current date.
 * If the current day is after the 10th, the ID will be for the next month.
 * @returns {string}
 */
export const generateReadingId = () => {
  const now = new Date();
  let targetDate = now;

  // If the current day is after the 10th, use the next month.
  if (now.getDate() > 10) {
    targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  
  return `${year}-${month}`;
};
