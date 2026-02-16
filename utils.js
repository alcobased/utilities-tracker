/**
 * Helper to calculate the difference between two metrics if they exist.
 */
const getDelta = (current, previous) => {
    if (current && previous && typeof current.value === 'number' && typeof previous.value === 'number') {
        const consumption = current.value - previous.value;
        return consumption >= 0 ? consumption : 0;
    }
    return null;
};

/**
 * Calculates a derived meter reading value (e.g., Total - HH2 = HH1).
 * Note: This returns a reading-like object { value, updatedAt }.
 */
function deriveReading(totalReading, subReading) {
    if (
        totalReading && subReading &&
        typeof totalReading.value === 'number' &&
        typeof subReading.value === 'number'
    ) {
        return {
            value: Math.max(0, totalReading.value - subReading.value),
            updatedAt: totalReading.updatedAt
        };
    }
    return null;
}

/**
 * Calculates all consumption values for a given period by comparing it to the previous one.
 */
function calculateConsumption(current, previous) {
    if (!current) {
        return {
            electricity_total: null,
            electricity_hh1: null,
            electricity_hh2: null,
            electricity_common: null,
            gas_total: null,
            gas_hh1: null,
            gas_hh2: null,
            water_total: null,
            water_hh1: null,
            water_hh2: null
        };
    }

    // Direct consumption (deltas) for measured readings
    const consumption = {
        electricity_total: getDelta(current.electricity_total, previous?.electricity_total),
        electricity_hh1: getDelta(current.electricity_hh1, previous?.electricity_hh1),
        electricity_hh2: getDelta(current.electricity_hh2, previous?.electricity_hh2),
        gas_total: getDelta(current.gas_total, previous?.gas_total),
        gas_hh2: getDelta(current.gas_hh2, previous?.gas_hh2),
        water_total: getDelta(current.water_total, previous?.water_total),
        water_hh2: getDelta(current.water_hh2, previous?.water_hh2),
    };

    // Derived consumption for sub-meters that aren't directly measured
    // Electricity Common = Total - HH1 - HH2
    if (consumption.electricity_total !== null && consumption.electricity_hh1 !== null && consumption.electricity_hh2 !== null) {
        consumption.electricity_common = Math.max(0, consumption.electricity_total - consumption.electricity_hh1 - consumption.electricity_hh2);
    } else {
        consumption.electricity_common = null;
    }

    // Gas HH1 = Gas Total Consumption - Gas HH2 Consumption
    if (consumption.gas_total !== null && consumption.gas_hh2 !== null) {
        consumption.gas_hh1 = Math.max(0, consumption.gas_total - consumption.gas_hh2);
    } else {
        consumption.gas_hh1 = null;
    }

    // Water HH1 = Water Total Consumption - Water HH2 Consumption
    if (consumption.water_total !== null && consumption.water_hh2 !== null) {
        consumption.water_hh1 = Math.max(0, consumption.water_total - consumption.water_hh2);
    } else {
        consumption.water_hh1 = null;
    }

    return consumption;
}

/**
 * Legacy support for tests or specific UI needs.
 * Calculates Gas HH1 reading (not consumption).
 */
function calculateHousehold1(reading) {
    const derived = deriveReading(reading?.gas_total, reading?.gas_household2 || reading?.gas_hh2);
    return derived ? derived.value : 0;
}

export { calculateConsumption, calculateHousehold1, deriveReading };
