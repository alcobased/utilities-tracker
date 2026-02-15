import request from 'supertest';
import express from 'express';
import { vol } from 'memfs';
import apiRoutes from '../routes.js';
import { calculateHousehold1 } from '../utils.js';

// Mock the db.js module
const mockDb = {
    readings: {},
    initDatabase: async () => {
        vol.fromJSON({ '/db.json': JSON.stringify({ readings: mockDb.readings, settings: {} }) });
    },
    upsertReading: async (periodId, metrics) => {
        mockDb.readings[periodId] = mockDb.readings[periodId] || {};
        const now = new Date().toISOString();
        for (const key in metrics) {
            mockDb.readings[periodId][key] = { value: metrics[key], updatedAt: now };
        }
        return mockDb.readings[periodId];
    },
    getAllReadings: async () => {
        return Object.keys(mockDb.readings).map(id => ({ id, ...mockDb.readings[id] }));
    },
    getReading: async (periodId) => mockDb.readings[periodId],
    deleteReading: async (periodId) => { delete mockDb.readings[periodId]; },
};

jest.mock('../db.js', () => mockDb);

// Create a test Express app
const app = express();
app.use(express.json());
app.use('/api', apiRoutes);


describe('API Routes with New Data Structure', () => {
    beforeEach(async () => {
        // Reset the mock database before each test
        mockDb.readings = {};
        await mockDb.initDatabase();
    });

    // Test for the upsert functionality
    test('POST /api/readings/:periodId should create a new reading', async () => {
        const periodId = '2024/05-06';
        const metrics = { gas_total: 2500, electricity_total: 10000 };

        const response = await request(app)
            .post(`/api/readings/${periodId}`)
            .send(metrics);

        expect(response.status).toBe(200);
        expect(response.body.gas_total.value).toBe(2500);
        expect(response.body.electricity_total.value).toBe(10000);
        expect(response.body.gas_total).toHaveProperty('updatedAt');
    });

    test('POST /api/readings/:periodId should update an existing reading (partial update)', async () => {
        const periodId = '2024/05-06';
        // First, create an entry
        await mockDb.upsertReading(periodId, { gas_total: 2500 });

        // Then, update it with a new metric
        const newMetrics = { electricity_total: 10500 };
        const response = await request(app)
            .post(`/api/readings/${periodId}`)
            .send(newMetrics);
        
        expect(response.status).toBe(200);
        // Check that the new value is there
        expect(response.body.electricity_total.value).toBe(10500);
        // Check that the old value is still there
        expect(response.body.gas_total.value).toBe(2500);
    });

    // Test for fetching all readings
    test('GET /api/readings should return all readings with calculated values', async () => {
        await mockDb.upsertReading('2024/05-06', { gas_total: 2500, gas_household2: 800 });
        await mockDb.upsertReading('2024/06-07', { gas_total: 2600, gas_household2: 850 });

        const response = await request(app).get('/api/readings');
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);

        // Check calculation for the first item
        const reading1 = response.body.find(r => r.id === '2024/05-06');
        expect(reading1.gas_household1).toBe(1700); // 2500 - 800
    });
    
    // Test for deleting a reading
    test('DELETE /api/readings/:periodId should delete a reading', async () => {
        const periodId = '2024/05-06';
        await mockDb.upsertReading(periodId, { gas_total: 2500 });

        const response = await request(app).delete(`/api/readings/${periodId}`);
        expect(response.status).toBe(204);

        const readings = await mockDb.getAllReadings();
        expect(readings).toHaveLength(0);
    });
});

describe('Utils with New Data Structure', () => {
    test('calculateHousehold1 should work with the new object structure', () => {
        const reading = {
            gas_total: { value: 2500, updatedAt: '...' },
            gas_household2: { value: 800, updatedAt: '...' },
        };
        expect(calculateHousehold1(reading)).toBe(1700);
    });

    test('calculateHousehold1 should return 0 if a value is missing', () => {
        const reading = {
            gas_total: { value: 2500, updatedAt: '...' },
        };
        expect(calculateHousehold1(reading)).toBe(0);
    });
});
