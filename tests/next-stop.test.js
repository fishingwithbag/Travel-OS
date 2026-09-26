import { describe, expect, it } from 'vitest';
import { nextStop } from '../src/domain/next-stop.js';

describe('next stop selection', () => {
  const items = [
    { title:'Morning', startTime:'08:00' },
    { title:'Lunch', startTime:'12:00' },
    { title:'Flexible', startTime:'' },
  ];

  it('uses the trip time zone when selecting the next timed stop', () => {
    const now = new Date('2027-01-01T02:30:00Z');
    expect(nextStop(items, '2027-01-01', 'Asia/Tokyo', now)?.title).toBe('Lunch');
    expect(nextStop(items, '2027-01-01', 'America/New_York', now)?.title).toBe('Morning');
  });

  it('uses the first stop for another selected day and falls back to flexible items', () => {
    const now = new Date('2027-01-01T14:30:00Z');
    expect(nextStop(items, '2027-01-02', 'Asia/Tokyo', now)?.title).toBe('Morning');
    expect(nextStop(items, '2027-01-01', 'Asia/Tokyo', now)?.title).toBe('Flexible');
    expect(nextStop([], '2027-01-01', 'Asia/Tokyo', now)).toBeNull();
  });
});
