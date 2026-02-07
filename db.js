import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

// Custom error for handling duplicate entries
export class DuplicateEntryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicateEntryError';
  }
}

// Custom error for handling not found entries
export class ReadingNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReadingNotFoundError';
  }
}

const defaultData = {
  readings: [],
  settings: {
    units: 'metric'
  }
};

const adapter = new JSONFile('db.json');
const db = new Low(adapter, defaultData);

export const initDatabase = async () => {
  await db.read();
};

/**
 * Adds a new reading to the database, preventing duplicates by id.
 */
export const addReading = async (id, type, value, date) => {
  const existingReading = db.data.readings.find(r => r.id === id);

  if (existingReading) {
    throw new DuplicateEntryError(`A reading for the period ${id} already exists.`);
  }

  const newReading = { id, type, value, date };
  db.data.readings.push(newReading);
  await db.write();
};

/**
 * Updates an existing reading in the database.
 * @throws {ReadingNotFoundError} If a reading with the given id is not found.
 */
export const updateReading = async (id, type, value, date) => {
  const readingIndex = db.data.readings.findIndex(r => r.id === id);

  if (readingIndex === -1) {
    throw new ReadingNotFoundError(`A reading for the period ${id} was not found.`);
  }

  // Replace the existing reading's data
  db.data.readings[readingIndex] = { id, type, value, date };

  await db.write();
};

/**
 * Deletes a reading from the database.
 * @throws {ReadingNotFoundError} If a reading with the given id is not found.
 */
export const deleteReading = async (id) => {
  const initialLength = db.data.readings.length;
  db.data.readings = db.data.readings.filter(r => r.id !== id);

  if (db.data.readings.length === initialLength) {
    throw new ReadingNotFoundError(`A reading for the period ${id} was not found.`);
  }

  await db.write();
};

/**
 * Gets a single reading by its ID.
 * @throws {ReadingNotFoundError} If a reading with the given id is not found.
 */
export const getReadingById = (id) => {
  const reading = db.data.readings.find(r => r.id === id);
  if (!reading) {
    throw new ReadingNotFoundError(`A reading for the period ${id} was not found.`);
  }
  return reading;
};


export const getAllReadings = () => {
  return db.data.readings;
};
