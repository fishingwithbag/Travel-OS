import { describe, expect, it } from 'vitest';
import { formatFlightSchedule } from '../src/domain/flight-schedule.js';

describe('flight schedule display', () => {
  it('shows departure and arrival dates with their own time zones', () => {
    expect(formatFlightSchedule({
      type:'flight', date:'2027-01-01', startTime:'23:00',
      flight:{ origin:'TPE', destination:'NRT', departureTimeZone:'Asia/Taipei', arrivalTimeZone:'Asia/Tokyo', arrivalDateTime:'2027-01-02T03:00' },
    })).toBe('出發 TPE · 2027-01-01 · 23:00 · Asia/Taipei\n抵達 NRT · 2027-01-02 03:00 · Asia/Tokyo');
  });

  it('labels missing optional flight data rather than inventing a date or time zone', () => {
    expect(formatFlightSchedule({ type:'flight', date:'2027-01-01', startTime:'', flight:{} })).toContain('抵達 機場未設定 · 日期時間未設定 · 時區未設定');
    expect(formatFlightSchedule({ type:'place', date:'2027-01-01' })).toBe('');
  });
});
