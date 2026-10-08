import { describe, expect, it } from 'vitest';
import { qualityLevel } from './PeerManager';

describe('qualityLevel', () => {
  it('treats low latency and no loss as good', () => {
    expect(qualityLevel(40, 0, 'connected')).toBe('good');
    expect(qualityLevel(null, 0, 'connected')).toBe('good');
  });

  it('marks noticeable latency or loss as fair', () => {
    expect(qualityLevel(300, 0, 'connected')).toBe('fair');
    expect(qualityLevel(80, 4, 'connected')).toBe('fair');
  });

  it('marks heavy latency, heavy loss or a dropped connection as poor', () => {
    expect(qualityLevel(500, 0, 'connected')).toBe('poor');
    expect(qualityLevel(80, 12, 'connected')).toBe('poor');
    expect(qualityLevel(40, 0, 'disconnected')).toBe('poor');
    expect(qualityLevel(40, 0, 'failed')).toBe('poor');
  });
});
