import express from 'express';
import {
    upsertReading,
    getAllReadings,
    getReading,
    deleteReading,
} from './db.js';
import { calculateHousehold1 } from './utils.js';

const router = express.Router();

// POST (Upsert) a reading for a specific period
router.post('/readings/:periodId', async (req, res) => {
    const { periodId } = req.params;
    const metrics = req.body; // e.g., { "gas_total": 2500, "electricity_total": 10100 }

    if (!periodId || Object.keys(metrics).length === 0) {
        return res.status(400).json({ error: 'Period ID and at least one metric are required.' });
    }

    try {
        const updatedReading = await upsertReading(periodId, metrics);
        res.status(200).json(updatedReading);
    } catch (error) {
        console.error('Error upserting reading:', error);
        res.status(500).json({ error: 'Failed to save reading.' });
    }
});

// GET all readings
router.get('/readings', async (req, res) => {
    try {
        const readings = await getAllReadings();
        // Augment each reading with the calculated value before sending
        const augmentedReadings = readings.map(reading => ({
            ...reading,
            gas_household1: calculateHousehold1(reading),
        }));
        res.json(augmentedReadings);
    } catch (error) {
        console.error('Error fetching readings:', error);
        res.status(500).json({ error: 'Failed to fetch readings.' });
    }
});

// GET a single reading by period ID
router.get('/readings/:periodId', async (req, res) => {
    try {
        const reading = await getReading(req.params.periodId);
        if (reading) {
            const augmentedReading = {
                ...reading,
                id: req.params.periodId, // Add the id to the response
                gas_household1: calculateHousehold1(reading),
            };
            res.json(augmentedReading);
        } else {
            res.status(404).json({ error: 'Reading not found' });
        }
    } catch (error) {
        console.error('Error fetching reading:', error);
        res.status(500).json({ error: 'Failed to fetch reading.' });
    }
});

// DELETE a reading by period ID
router.delete('/readings/:periodId', async (req, res) => {
    try {
        await deleteReading(req.params.periodId);
        res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting reading:', error);
        res.status(500).json({ error: 'Failed to delete reading.' });
    }
});

export default router;
