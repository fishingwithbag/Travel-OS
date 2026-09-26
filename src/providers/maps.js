import { ValidationError } from '../domain/trip.js';

export function mapSearchUrl(query) {
  const value = String(query || '').trim();
  if (!value) throw new ValidationError('需要地點名稱或地址。');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

export function itemMapUrl(item) {
  return item.mapsUrl || mapSearchUrl(item.location || item.title);
}

export function parkingMapUrl(spot) {
  if (!spot?.name) return '';
  return spot.mapsUrl || mapSearchUrl(spot.name);
}
