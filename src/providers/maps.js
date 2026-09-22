import { ValidationError } from '../domain/trip.js';

export function mapSearchUrl(query) {
  const value = String(query || '').trim();
  if (!value) throw new ValidationError('需要地點名稱或地址。');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}
