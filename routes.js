import express from 'express';
import { getAllReadings, upsertReading, deleteReading } from './db.js';
import { calculateConsumption } from './utils.js';

const router = express.Router();

// --- Get all calculated CONSUMPTION data ---
router.get('/readings', async (req, res) => {
    try {
        const rawReadings = await getAllReadings();

        if (rawReadings.length === 0) {
            return res.json([]);
        }

        // Sort readings by period ID to ensure correct chronological order for consumption calculation
        rawReadings.sort((a, b) => a.id.localeCompare(b.id));

        const consumptionData = [];
        for (let i = 0; i < rawReadings.length; i++) {
            const currentReading = rawReadings[i];
            // Previous reading is null for the very first entry
            const previousReading = i > 0 ? rawReadings[i - 1] : null;

            const consumption = calculateConsumption(currentReading, previousReading);

            consumptionData.push({
                period: currentReading.id, // The period for which consumption is calculated
                ...consumption,
            });
        }

        // The first period's consumption is always zero, so we can optionally remove it
        if (consumptionData.length > 0) {
            consumptionData.shift(); // Remove the first element
        }

        // Return the calculated consumption data, sorted with the most recent period first
        res.json(consumptionData.sort((a, b) => b.period.localeCompare(a.period)));

    } catch (error) {
        console.error('Error fetching and calculating consumption data:', error);
        res.status(500).json({ error: 'Failed to retrieve or process reading data' });
    }
});

// --- Upsert a reading for a specific period ---
router.post('/readings/:periodId', async (req, res) => {
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
router.delete('/readings/:periodId', async (req, res) => {
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
