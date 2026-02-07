import request from 'supertest';
import app from './index.js';
import { addReading, deleteReading, getAllReadings } from './db.js';

// Test data
const testReading = {
  type: 'electricity',
  value: 150.5,
  date: '2024-05-20'
};

describe('API Endpoints', () => {
  let createdReadingId;

  beforeAll(async () => {
    // Clean up database before tests
    getAllReadings().forEach(reading => deleteReading(reading.id));
  });

  // Test for creating a new reading
  test('POST /api/readings should add a new reading', async () => {
    const response = await request(app)
      .post('/api/readings')
      .send(testReading);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Reading added successfully');

    // Check that the reading was actually added
    const readings = getAllReadings();
    expect(readings.length).toBe(1);
    createdReadingId = readings[0].id; // Save for later tests
  });

  // Test for retrieving all readings
  test('GET /api/readings should return all readings', async () => {
    const response = await request(app).get('/api/readings');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
  });

  // Test for retrieving a single reading
  test('GET /api/readings/:id should return a specific reading', async () => {
    const response = await request(app).get(`/api/readings/${createdReadingId}`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(createdReadingId);
    expect(response.body.value).toBe(testReading.value);
  });

  // Test for a non-existent reading
  test('GET /api/readings/:id should return 404 for a non-existent reading', async () => {
    const response = await request(app).get('/api/readings/nonexistent-id');
    expect(response.status).toBe(404);
  });

  // Test for updating a reading
  test('PUT /api/readings/:id should update a reading', async () => {
    const updatedReading = { ...testReading, value: 200 };
    const response = await request(app)
      .put(`/api/readings/${createdReadingId}`)
      .send(updatedReading);
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('updated');

    // Verify the update
    const verifyResponse = await request(app).get(`/api/readings/${createdReadingId}`);
    expect(verifyResponse.body.value).toBe(200);
  });

  // Test for deleting a reading
  test('DELETE /api/readings/:id should delete a reading', async () => {
    const response = await request(app).delete(`/api/readings/${createdReadingId}`);
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('deleted');

    // Verify deletion
    const verifyResponse = await request(app).get(`/api/readings/${createdReadingId}`);
    expect(verifyResponse.status).toBe(404);
  });
});
