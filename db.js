import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

// Configure lowdb to use a JSON file for storage
const adapter = new JSONFile('db.json');
const db = new Low(adapter, { readings: {}, settings: {} });

/**
 * Reads the initial data from the database file.
 */
async function initDatabase() {
    await db.read();
}

/**
 * Upserts (updates or inserts) one or more readings for a specific period.
 * @param {string} periodId - The ID of the period (e.g., "2024/05-06").
 * @param {object} metrics - An object containing the metrics to update (e.g., { gas_total: 2500 }).
 */
async function upsertReading(periodId, metrics) {
    await db.read();
    db.data.readings = db.data.readings || {}; // Ensure the readings object exists

    // Ensure the specific period object exists
    if (!db.data.readings[periodId]) {
        db.data.readings[periodId] = {};
    }

    const now = new Date().toISOString();

    // Iterate over the metrics provided by the user and update them
    for (const key in metrics) {
        if (Object.prototype.hasOwnProperty.call(metrics, key)) {
            db.data.readings[periodId][key] = {
                value: metrics[key],
                updatedAt: now,
            };
        }
    }

    await db.write();
    return db.data.readings[periodId];
}

/**
 * Retrieves all readings, transforming them into an array.
 * @returns {Array<object>} An array of all readings.
 */
async function getAllReadings() {
    await db.read();
    const readingsObject = db.data.readings || {};
    // Transform the object into an array for easier use on the frontend
    return Object.keys(readingsObject).map(id => ({
        id,
        ...readingsObject[id],
    }));
}

/**
 * Retrieves a single reading by its period ID.
 * @param {string} periodId - The ID of the period.
 * @returns {object | undefined} The reading object or undefined if not found.
 */
async function getReading(periodId) {
    await db.read();
    return db.data.readings ? db.data.readings[periodId] : undefined;
}

/**
 * Deletes a reading for a specific period.
 * @param {string} periodId - The ID of the period to delete.
 */
async function deleteReading(periodId) {
    await db.read();
    if (db.data.readings && db.data.readings[periodId]) {
        delete db.data.readings[periodId];
        await db.write();
    }
}

export {
    initDatabase,
    upsertReading,
    getAllReadings,
    getReading,
    deleteReading,
};
