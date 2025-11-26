import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';

const API_BASE_URL = process.env.VITE_API_BASE_URL;
const TEST_USER_AUTH_TOKEN = process.env.VITE_TEST_USER_AUTH_TOKEN;
const TEST_DEVICE_ID = process.env.VITE_TEST_DEVICE_ID;

if (!API_BASE_URL || !TEST_USER_AUTH_TOKEN || !TEST_DEVICE_ID) {
  throw new Error('Missing required environment variables for integration tests.');
}

const api = {
  async post(path: string, body: object) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_USER_AUTH_TOKEN}`,
        'x-device-id': TEST_DEVICE_ID,
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
    };
  },
  async get(path: string) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${TEST_USER_AUTH_TOKEN}`,
        'x-device-id': TEST_DEVICE_ID,
      },
    });
    return {
      status: response.status,
      data: await response.json(),
    };
  },
  async put(path: string, body: object) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TEST_USER_AUTH_TOKEN}`,
            'x-device-id': TEST_DEVICE_ID,
        },
        body: JSON.stringify(body),
        });
    return {
        status: response.status,
        data: await response.json(),
    };
  },
  async delete(path: string) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${TEST_USER_AUTH_TOKEN}`,
        'x-device-id': TEST_DEVICE_ID,
      },
    });
    return {
      status: response.status,
    };
  },
};

describe('Vaccines API Integration Tests', () => {
  let createdProfileId: string;
  let createdVaccineId: string;

  beforeAll(async () => {
    // Create a profile to associate vaccines with
    const profileData = { name: 'Vaccine Test Profile', dob: '2021-01-01', relationship: 'Other' };
    const response = await api.post('/profiles', profileData);
    createdProfileId = response.data.profileId;
  });

  afterAll(async () => {
    // Clean up the created profile
    if (createdProfileId) {
      await api.delete(`/profiles/${createdProfileId}`);
    }
  });

  it('should successfully create a new vaccine record', async () => {
    const vaccineData = {
      vaccineName: 'Integration Test Vaccine',
      date: '2023-01-10',
      dose: '1st',
      nextDueDate: '2024-01-10',
    };

    const response = await api.post(`/profiles/${createdProfileId}/vaccines`, vaccineData);

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('vaccineId');
    expect(response.data.vaccineName).toBe(vaccineData.vaccineName);
    createdVaccineId = response.data.vaccineId;
  });

  it('should successfully get vaccine records for a profile', async () => {
    const response = await api.get(`/profiles/${createdProfileId}/vaccines`);

    expect(response.status).toBe(200);
    expect(response.data).toBeInstanceOf(Array);
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data).toContainEqual(expect.objectContaining({ vaccineId: createdVaccineId }));
  });

  it('should successfully update a vaccine record', async () => {
    const updatedVaccineData = {
      vaccineName: 'Updated Test Vaccine',
      date: '2023-01-15',
    };

    const response = await api.put(`/profiles/${createdProfileId}/vaccines/${createdVaccineId}`, updatedVaccineData);

    expect(response.status).toBe(200);
    expect(response.data.vaccineName).toBe(updatedVaccineData.vaccineName);
    expect(response.data.date).toBe(updatedVaccineData.date);
  });

  it('should successfully delete a vaccine record', async () => {
    const response = await api.delete(`/profiles/${createdProfileId}/vaccines/${createdVaccineId}`);
    
    // The API might return 200 or 204 for a successful delete
    expect([200, 204]).toContain(response.status);

    // Verify it's gone
    const getResponse = await api.get(`/profiles/${createdProfileId}/vaccines`);
    expect(getResponse.data.some((v: any) => v.vaccineId === createdVaccineId)).toBe(false);
  });
});