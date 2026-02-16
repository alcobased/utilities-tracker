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
function calculateConsumption(current, previous, previousConsumption) {
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

    // Direct consumption (deltas) for measured readings (current period)
    const consumption = {
        electricity_total: getDelta(current.electricity_total, previous?.electricity_total),
        electricity_hh1: getDelta(current.electricity_hh1, previous?.electricity_hh1),
        electricity_hh2: getDelta(current.electricity_hh2, previous?.electricity_hh2),
        gas_total: getDelta(current.gas_total, previous?.gas_total),
        gas_hh2: getDelta(current.gas_hh2, previous?.gas_hh2),
        water_total: getDelta(current.water_total, previous?.water_total),
        water_hh2: getDelta(current.water_hh2, previous?.water_hh2),
    };

    // Derived consumption for sub-meters (current period)
    if (consumption.electricity_total !== null && consumption.electricity_hh1 !== null && consumption.electricity_hh2 !== null) {
        consumption.electricity_common = Math.max(0, consumption.electricity_total - consumption.electricity_hh1 - consumption.electricity_hh2);
    } else {
        consumption.electricity_common = null;
    }

    if (consumption.gas_total !== null && consumption.gas_hh2 !== null) {
        consumption.gas_hh1 = Math.max(0, consumption.gas_total - consumption.gas_hh2);
    } else {
        consumption.gas_hh1 = null;
    }

    if (consumption.water_total !== null && consumption.water_hh2 !== null) {
        consumption.water_hh1 = Math.max(0, consumption.water_total - consumption.water_hh2);
    } else {
        consumption.water_hh1 = null;
    }

    // --- Cost Calculations ---

    const calculateSplit = (totalBill, refConsumption) => {
        if (!totalBill || !refConsumption || !refConsumption.total || refConsumption.total <= 0) {
            return { hh1: null, hh2: null };
        }
        const rate = totalBill / refConsumption.total;
        const common = refConsumption.common || 0;
        return {
            hh1: (refConsumption.hh1 + common / 2) * rate,
            hh2: (refConsumption.hh2 + common / 2) * rate
        };
    };

    // Electricity Costs: Split bill using PREVIOUS month's consumption
    const eCosts = calculateSplit(
        current.electricity_bill?.value,
        previousConsumption ? {
            total: previousConsumption.electricity_total,
            hh1: previousConsumption.electricity_hh1,
            hh2: previousConsumption.electricity_hh2,
            common: previousConsumption.electricity_common
        } : null
    );
    consumption.electricity_cost_hh1 = eCosts.hh1;
    consumption.electricity_cost_hh2 = eCosts.hh2;

    // Gas Costs: Split bill using CURRENT month's consumption
    const gCosts = calculateSplit(
        current.gas_bill?.value,
        {
            total: consumption.gas_total,
            hh1: consumption.gas_hh1,
            hh2: consumption.gas_hh2
        }
    );
    consumption.gas_cost_hh1 = gCosts.hh1;
    consumption.gas_cost_hh2 = gCosts.hh2;

    // Water Costs: Split bill using PREVIOUS month's consumption
    const wCosts = calculateSplit(
        current.water_bill?.value,
        previousConsumption ? {
            total: previousConsumption.water_total,
            hh1: previousConsumption.water_hh1,
            hh2: previousConsumption.water_hh2
        } : null
    );
    consumption.water_cost_hh1 = wCosts.hh1;
    consumption.water_cost_hh2 = wCosts.hh2;

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
