import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock the db.js module BEFORE importing routes.js
const mockDb = {
    readings: {},
    initDatabase: async () => { },
    upsertReading: async (periodId, metrics) => {
        mockDb.readings[periodId] = mockDb.readings[periodId] || {};
        const now = new Date().toISOString();
        for (const key in metrics) {
            const newValue = metrics[key];
            const existing = mockDb.readings[periodId][key];
            if (!existing || existing.value !== newValue) {
                mockDb.readings[periodId][key] = { value: newValue, updatedAt: now };
            }
        }
        return mockDb.readings[periodId];
    },
    getAllReadings: async () => {
        return Object.keys(mockDb.readings).map(id => ({ id, ...mockDb.readings[id] }));
    },
    getReading: async (periodId) => mockDb.readings[periodId],
    deleteReading: async (periodId) => { delete mockDb.readings[periodId]; },
};

jest.unstable_mockModule('./db.js', () => mockDb);

// Use dynamic imports to ensure the mock is picked up
const { default: apiRoutes } = await import('./routes.js');
const { calculateConsumption } = await import('./utils.js');

// Create a test Express app
const app = express();
app.use(express.json());
app.use('/api', apiRoutes);


describe('API Routes with Full Metrics', () => {
    beforeEach(async () => {
        mockDb.readings = {};
    });

    test('POST /api/readings/:periodId should create a reading with all 7 metric types', async () => {
        const periodId = '2024-05';
        const metrics = {
            electricity_total: 1000,
            electricity_hh1: 600,
            electricity_hh2: 400,
            gas_total: 2500,
            gas_hh2: 800,
            water_total: 50,
            water_hh2: 10
        };

        const response = await request(app)
            .post(`/api/readings/${periodId}`)
            .send(metrics);

        expect(response.status).toBe(200);
        expect(response.body.electricity_total.value).toBe(1000);
        expect(response.body.electricity_hh1.value).toBe(600);
        expect(response.body.electricity_hh2.value).toBe(400);
        expect(response.body.gas_total.value).toBe(2500);
        expect(response.body.gas_hh2.value).toBe(800);
        expect(response.body.water_total.value).toBe(50);
        expect(response.body.water_hh2.value).toBe(10);
        expect(response.body.gas_total).toHaveProperty('updatedAt');
    });

    test('POST /api/readings/:periodId should NOT update the timestamp if the value is unchanged', async () => {
        const periodId = '2024-05';

        // 1. Initial creation
        const res1 = await request(app).post(`/api/readings/${periodId}`).send({ gas_total: 2500 });
        const firstTimestamp = res1.body.gas_total.updatedAt;

        // Wait a tiny bit to ensure a new timestamp would be different
        await new Promise(resolve => setTimeout(resolve, 10));

        // 2. Update with same value
        const res2 = await request(app).post(`/api/readings/${periodId}`).send({ gas_total: 2500 });

        expect(res2.body.gas_total.updatedAt).toBe(firstTimestamp);
    });

    test('GET /api/readings should return calculated consumption deltas for all utilities', async () => {
        // Period 1 (Reading at end of May)
        // HH1 reading: Gas=1700, Water=40
        await mockDb.upsertReading('2024-05', {
            gas_total: 2500, gas_hh2: 800,
            electricity_total: 1000, electricity_hh1: 600, electricity_hh2: 400,
            water_total: 50, water_hh2: 10
        });

        // Period 2 (Reading at end of June)
        // HH1 reading: Gas=1750, Water=53
        await mockDb.upsertReading('2024-06', {
            gas_total: 2600, gas_hh2: 850,
            electricity_total: 1150, electricity_hh1: 680, electricity_hh2: 450,
            water_total: 65, water_hh2: 12
        });

        const response = await request(app).get('/api/readings');
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);

        const consumption = response.body[0];
        expect(consumption.period).toBe('2024-06');

        // Gas (Deltas)
        expect(consumption.gas_total).toBe(100); // 2600 - 2500
        expect(consumption.gas_hh2).toBe(50); // 850 - 800
        expect(consumption.gas_hh1).toBe(50); // (2600-850) - (2500-800) = 1750 - 1700 = 50

        // Electricity (Deltas)
        expect(consumption.electricity_total).toBe(150); // 1150 - 1000
        expect(consumption.electricity_hh1).toBe(80); // 680 - 600
        expect(consumption.electricity_hh2).toBe(50); // 450 - 400
        expect(consumption.electricity_common).toBe(20); // 150 - 80 - 50 = 20

        // Water (Deltas)
        expect(consumption.water_total).toBe(15); // 65 - 50
        expect(consumption.water_hh2).toBe(2); // 12 - 10
        expect(consumption.water_hh1).toBe(13); // (65-12) - (50-10) = 53 - 40 = 13
    });

    test('GET /api/readings/:periodId should return raw reading data', async () => {
        const periodId = '2024-05';
        await mockDb.upsertReading(periodId, { gas_total: 2500 });

        const response = await request(app).get(`/api/readings/${periodId}`);
        expect(response.status).toBe(200);
        expect(response.body.gas_total.value).toBe(2500);
    });

    test('GET /api/readings/:periodId should return 404 for non-existent period', async () => {
        const response = await request(app).get('/api/readings/non-existent');
        expect(response.status).toBe(404);
    });
});

describe('Utils', () => {
    test('calculateConsumption should return null deltas when no previous reading', () => {
        const current = {
            gas_total: { value: 100 },
            gas_hh2: { value: 30 }
        };
        const result = calculateConsumption(current, null, null);
        expect(result.gas_total).toBeNull();
        expect(result.gas_hh1).toBeNull();
    });

    test('calculateConsumption should return null metrics when no current reading', () => {
        const result = calculateConsumption(null, null, null);
        expect(result.gas_total).toBeNull();
        expect(result.electricity_total).toBeNull();
    });

    test('calculateConsumption should calculate correct deltas', () => {
        const current = {
            gas_total: { value: 110 }, gas_hh2: { value: 35 },
            electricity_total: { value: 150 }, electricity_hh1: { value: 80 }, electricity_hh2: { value: 50 },
            water_total: { value: 40 }, water_hh2: { value: 10 }
        };
        const previous = {
            gas_total: { value: 100 }, gas_hh2: { value: 30 },
            electricity_total: { value: 100 }, electricity_hh1: { value: 60 }, electricity_hh2: { value: 40 },
            water_total: { value: 30 }, water_hh2: { value: 8 }
        };
        const result = calculateConsumption(current, previous, null);
        expect(result.gas_total).toBe(10);
        expect(result.gas_hh2).toBe(5);
        expect(result.gas_hh1).toBe(5);
        expect(result.electricity_common).toBe(20); // 150-100 - (80-60) - (50-40) = 50 - 20 - 10 = 20
    });
});
