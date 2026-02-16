import express from 'express';
import { getAllReadings, upsertReading, deleteReading, getReading, getSettings, updateSettings } from './db.js';
import { calculateConsumption } from './utils.js';

const router = express.Router();

// --- Settings Routes ---
router.get('/settings', async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

router.post('/settings', async (req, res) => {
    try {
        const settings = await updateSettings(req.body);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// --- Get all RAW readings ---
router.get('/raw-readings', async (req, res) => {
    try {
        const rawReadings = await getAllReadings();
        // Sort with the most recent period first
        res.json(rawReadings.sort((a, b) => b.id.localeCompare(a.id)));
    } catch (error) {
        console.error('Error fetching raw readings:', error);
        res.status(500).json({ error: 'Failed to retrieve raw readings' });
    }
});

// --- Get all calculated CONSUMPTION data ---
router.get('/readings', async (req, res) => {
    try {
        const rawReadings = await getAllReadings();

        if (rawReadings.length === 0) {
            return res.json([]);
        }

        // Sort readings by period ID to ensure correct chronological order for consumption calculation
        const sortedReadings = rawReadings.sort((a, b) => a.id.localeCompare(b.id));

        const consumptionData = [];
        sortedReadings.forEach((reading, index) => {
            const previousReading = index > 0 ? sortedReadings[index - 1] : null;
            const previousCons = index > 0 ? consumptionData[index - 1] : null;
            consumptionData.push({
                period: reading.id,
                ...calculateConsumption(reading, previousReading, previousCons)
            });
        });

        // Return the calculated consumption data, sorted with the most recent period first
        res.json(consumptionData.sort((a, b) => b.period.localeCompare(a.period)));
    } catch (error) {
        console.error('Error fetching and calculating consumption data:', error);
        res.status(500).json({ error: 'Failed to retrieve or process reading data' });
    }
});

// --- Get raw readings for a specific period ---
router.get('/readings/:periodId(*)', async (req, res) => {
    try {
        const { periodId } = req.params;
        const reading = await getReading(periodId);
        if (!reading) {
            return res.status(404).json({ error: 'Reading not found' });
        }
        res.json(reading);
    } catch (error) {
        console.error(`Error fetching reading for period ${req.params.periodId}:`, error);
        res.status(500).json({ error: 'Failed to retrieve reading data' });
    }
});

// --- Upsert a reading for a specific period ---
router.post('/readings/:periodId(*)', async (req, res) => {
    try {
        const { periodId } = req.params;
        const metrics = req.body;

        if (!periodId || Object.keys(metrics).length === 0) {
            return res.status(400).json({ error: 'Period ID and at least one metric are required.' });
        }

        const updatedReading = await upsertReading(periodId, metrics);
        res.json(updatedReading);
    } catch (error) {
        console.error(`Error upserting reading for period ${req.params.periodId}:`, error);
        res.status(500).json({ error: 'Failed to save reading' });
    }
});

// --- Delete all readings for a specific period ---
router.delete('/readings/:periodId(*)', async (req, res) => {
    try {
        const { periodId } = req.params;
        if (!periodId) {
            return res.status(400).json({ error: 'Period ID is required.' });
        }

        await deleteReading(periodId);
        res.status(204).send(); // Success, no content
    } catch (error) {
        console.error(`Error deleting reading for period ${req.params.periodId}:`, error);
        res.status(500).json({ error: 'Failed to delete reading' });
    }
});

export default router;
