import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

import { postActivityToBackend } from '../activity-backend';
import { apiFetch } from '@/lib/api-client';

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
});

describe('postActivityToBackend', () => {
  it('POSTs to /api/v1/activity with the canonical { activityType, sourceFeature } body', async () => {
    vi.mocked(apiFetch).mockResolvedValue(undefined);

    await postActivityToBackend('listen', 'music');

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'listen', sourceFeature: 'music' }),
    });
  });

  it('serializes every ActivityType through the same body shape', async () => {
    vi.mocked(apiFetch).mockResolvedValue(undefined);

    await postActivityToBackend('mood', 'mood-checkin');
    await postActivityToBackend('journal', 'daily-hub');

    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/v1/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'mood', sourceFeature: 'mood-checkin' }),
    });
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/v1/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'journal', sourceFeature: 'daily-hub' }),
    });
  });

  it('propagates apiFetch rejection so callers can .catch() and log', async () => {
    const error = new Error('network down');
    vi.mocked(apiFetch).mockRejectedValue(error);

    await expect(postActivityToBackend('pray', 'daily-hub')).rejects.toBe(error);
  });
});
