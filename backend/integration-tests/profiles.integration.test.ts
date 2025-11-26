import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

// Load environment variables from .env.test
import 'dotenv/config';

const API_BASE_URL = process.env.VITE_API_BASE_URL;
const TEST_USER_AUTH_TOKEN = process.env.VITE_TEST_USER_AUTH_TOKEN;
const TEST_DEVICE_ID = process.env.VITE_TEST_DEVICE_ID;

// Ensure environment variables are set
if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set in .env.test or environment variables.');
}
if (!TEST_USER_AUTH_TOKEN) {
  throw new Error('VITE_TEST_USER_AUTH_TOKEN is not set in .env.test or environment variables.');
}
if (!TEST_DEVICE_ID) {
  throw new Error('VITE_TEST_DEVICE_ID is not set in .env.test or environment variables.');
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

describe('Profiles API Integration Tests', () => {
  let createdProfileId: string;

  it('should successfully create a new profile (happy path)', async () => {
    const profileData = {
      name: 'Integration Test Profile',
      dob: '2020-01-01',
      relationship: 'Child',
      gender: 'Female',
      bloodType: 'A+',
      allergies: 'None',
      medicalConditions: 'None',
      avatarColor: 'avatar-green',
    };

    const response = await api.post('/profiles', profileData);

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('profileId');
    expect(response.data.name).toBe(profileData.name);
    expect(response.data.dob).toBe(profileData.dob);

    createdProfileId = response.data.profileId; // Store for later tests/cleanup
  });

  it('should return 400 when creating a profile with invalid data (error path)', async () => {
    const invalidProfileData = {
      name: '', // Invalid: name cannot be empty
      dob: '2020-01-01',
      relationship: 'Child',
      gender: 'Female',
    };

    const response = await api.post('/profiles', invalidProfileData);
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('message');
  });

  it('should successfully list profiles (happy path)', async () => {
    const response = await api.get('/profiles');

    expect(response.status).toBe(200);
    expect(response.data).toBeInstanceOf(Array);
    expect(response.data).toContainEqual(expect.objectContaining({ profileId: createdProfileId }));
  });

  it('should successfully delete the created profile (cleanup)', async () => {
    if (!createdProfileId) {
      console.warn('createdProfileId not set, skipping delete cleanup.');
      return;
    }
    const response = await api.delete(`/profiles/${createdProfileId}`);
    expect(response.status).toBe(204); // No content for successful delete
  });
});
