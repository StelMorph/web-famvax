import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';

const API_BASE_URL = process.env.VITE_API_BASE_URL;
const TEST_USER_AUTH_TOKEN = process.env.VITE_TEST_USER_AUTH_TOKEN;
const TEST_DEVICE_ID = process.env.VITE_TEST_DEVICE_ID;
const TEST_USER_EMAIL = 'stelmorph@gmail.com'; // Use a valid user for the test

if (!API_BASE_URL || !TEST_USER_AUTH_TOKEN || !TEST_DEVICE_ID) {
  throw new Error('Missing required environment variables for integration tests.');
}

describe('Sharing API Integration Tests', () => {
  let createdProfileId: string;
  let createdShareId: string;

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

  beforeAll(async () => {
    // Create a profile to be shared
    const profileData = { name: 'Sharing Test Profile', dob: '2022-01-01', relationship: 'Spouse' };
    const response = await api.post('/profiles', profileData);
    createdProfileId = response.data.profileId;
  });

  afterAll(async () => {
    // Clean up the created profile
    if (createdProfileId) {
      await api.delete(`/profiles/${createdProfileId}`);
    }
    // Note: In a real-world scenario, you might also need to clean up the created share
    // if the test fails after share creation but before deletion.
  });

  it('should successfully share a profile with another user', async () => {
    const shareData = {
      inviteeEmail: TEST_USER_EMAIL,
      role: 'Viewer',
    };

    const response = await api.post(`/profiles/${createdProfileId}/share`, shareData);
    console.log('Share response:', response.data);

    expect(response.status).toBe(201);
  });

  it('should see the pending share in the received shares list', async () => {
    // This test assumes the perspective of the owner checking their sent shares.
    const response = await api.get(`/profiles/${createdProfileId}/shares`);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeInstanceOf(Array);
    const share = response.data.find((s: any) => s.inviteeEmail === TEST_USER_EMAIL);
    expect(share).toBeDefined();
    createdShareId = (share as any).shareId;
    expect((share as any).status).toBe('PENDING');
  });

  // Accepting a share would require logging in as the recipient.
  // This is out of scope for a single-user integration test.
  it.skip('should successfully accept a received share', () => {
    // To implement this, you would need a token for TEST_USER_EMAIL
    // and call api.put(`/shares/${createdShareId}/accept`);
  });

  it('should successfully revoke (delete) a share', async () => {
    const response = await api.delete(`/shares/${createdShareId}`);
    expect(response.status).toBe(204);

    // Verify the share is gone
    const getResponse = await api.get(`/profiles/${createdProfileId}/shares`);
    const share = getResponse.data.find((s: any) => s.shareId === createdShareId);
    expect(share).toBeUndefined();
  });
});