import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

const API_BASE_URL = process.env.VITE_API_BASE_URL;
const TEST_USER_AUTH_TOKEN = process.env.VITE_TEST_USER_AUTH_TOKEN;
const TEST_DEVICE_ID = process.env.VITE_TEST_DEVICE_ID;

if (!API_BASE_URL || !TEST_USER_AUTH_TOKEN || !TEST_DEVICE_ID) {
  throw new Error('Missing required environment variables for integration tests.');
}

describe('Settings API Integration Tests', () => {
  const api = {
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

  it('should successfully list devices', async () => {
    const response = await api.get('/devices');

    expect(response.status).toBe(200);
    expect(response.data).toBeInstanceOf(Array);
    // The list should contain the current device
    expect(response.data.some((d: any) => d.deviceId === TEST_DEVICE_ID)).toBe(true);
  });
  
  // Note: Deleting the current device might invalidate the session.
  // This test is written with the assumption that the API allows self-revocation
  // and that subsequent tests might fail if they rely on the same session.
  // In a real-world scenario, you might use a different device to delete another.
  it.skip('should successfully remove a device', async () => {
    // This test is skipped because it would invalidate the current session.
    // To test this properly, you would need to:
    // 1. Log in on a "device A" to get a token.
    // 2. Log in on a "device B" to get another token and device ID.
    // 3. Use token A to delete device B.
    const response = await api.delete(`/devices/${TEST_DEVICE_ID}`);
    expect(response.status).toBe(204);
  });
});