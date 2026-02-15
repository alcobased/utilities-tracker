/**
 * Calculates the consumption for household 1 based on the total and household 2 readings.
 * This function is now designed to work with the new data structure where each
 * metric is an object containing a 'value' property.
 *
 * @param {object} reading - A reading object for a specific period.
 * @returns {number} The calculated consumption for household 1, or 0 if data is incomplete.
 */
function calculateHousehold1(reading) {
    // Safely access the 'value' property using optional chaining (?.)
    const gasTotal = reading.gas_total?.value;
    const gasHousehold2 = reading.gas_household2?.value;

    // Only perform the calculation if both values are present and are numbers
    if (typeof gasTotal === 'number' && typeof gasHousehold2 === 'number') {
        return gasTotal - gasHousehold2;
    }

    // Return 0 or null if the necessary data isn't available for the calculation
    return 0;
}

export { calculateHousehold1 };
