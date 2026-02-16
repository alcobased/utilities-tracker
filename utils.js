/**
 * Calculates all consumption values for a given period by comparing it to the previous one.
 *
 * @param {object} currentReading - The reading object for the current period.
 * @param {object | null} previousReading - The reading object for the preceding period.
 * @returns {object} An object containing all calculated consumption values.
 */
function calculateConsumption(currentReading, previousReading) {
    // If there's no current reading, there's nothing to calculate.
    if (!currentReading) {
        return {
            gas_total: 0,
            gas_household2: 0,
            gas_household1: 0,
            electricity_total: 0,
        };
    }

    // Helper to calculate consumption for a single metric.
    const getConsumption = (metricKey) => {
        const currentMetric = currentReading[metricKey];
        const previousMetric = previousReading ? previousReading[metricKey] : null;

        // Ensure both current and previous values exist and are numbers.
        if (currentMetric && previousMetric && typeof currentMetric.value === 'number' && typeof previousMetric.value === 'number') {
            const consumption = currentMetric.value - previousMetric.value;
            // Consumption should not be negative.
            return consumption >= 0 ? consumption : 0;
        }
        // If there's no previous reading, consumption is 0.
        return 0;
    };

    const gasTotalConsumption = getConsumption('gas_total');
    const gasHh2Consumption = getConsumption('gas_household2');
    const electricityTotalConsumption = getConsumption('electricity_total');

    const gasHh1Consumption = gasTotalConsumption - gasHh2Consumption;

    return {
        gas_total: gasTotalConsumption,
        gas_household2: gasHh2Consumption,
        // Ensure household 1 consumption is not negative.
        gas_household1: gasHh1Consumption >= 0 ? gasHh1Consumption : 0,
        electricity_total: electricityTotalConsumption,
    };
}

export { calculateConsumption };
