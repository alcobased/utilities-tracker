import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateReadingId } from './utils.js';
import { addReading, getAllReadings, getReadingById, updateReading, deleteReading, DuplicateEntryError, ReadingNotFoundError } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// --- Frontend Route ---
router.get('/', (req, res) => {
  const htmlPath = path.join(path.dirname(__dirname), 'public', 'index.html');
  res.sendFile(htmlPath);
});


// --- API Routes ---

// Welcome route
router.get('/api', (req, res) => {
  res.json({ msg: "Hello world" });
});

// Get all readings
router.get('/api/readings', (req, res) => {
  const readings = getAllReadings();
  res.json(readings);
});

// Get a single reading by ID
router.get('/api/readings/:id', (req, res) => {
  try {
    const { id } = req.params;
    const reading = getReadingById(id);
    res.json(reading);
  } catch (error) {
    if (error instanceof ReadingNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Failed to get reading:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Add a new reading
router.post('/api/readings', async (req, res) => {
  try {
    const { type, value, date } = req.body;
    if (!type || !value || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const generatedId = generateReadingId();
    await addReading(generatedId, type, value, date);

    res.status(201).json({ message: 'Reading added successfully' });

  } catch (error) {
    if (error instanceof DuplicateEntryError) {
      return res.status(409).json({ error: error.message });
    }
    console.error('Failed to add reading:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Update an existing reading
router.put('/api/readings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, value, date } = req.body;

    if (!type || !value || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await updateReading(id, type, value, date);

    res.status(200).json({ message: `Reading for period ${id} updated.` });

  } catch (error) {
    if (error instanceof ReadingNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Failed to update reading:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Delete a reading
router.delete('/api/readings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteReading(id);
    res.status(200).json({ message: `Reading for period ${id} deleted.` });
  } catch (error) {
    if (error instanceof ReadingNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Failed to delete reading:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});


export default router;
