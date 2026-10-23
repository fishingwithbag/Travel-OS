export function formatFlightSchedule(item) {
  if (item.type !== 'flight' || !item.flight) return '';
  const departure = [
    item.flight.origin || '機場未設定',
    item.date,
    item.startTime || '時間未設定',
    item.flight.departureTimeZone || '時區未設定',
  ].join(' · ');
  const arrival = [
    item.flight.destination || '機場未設定',
    item.flight.arrivalDateTime?.replace('T', ' ') || '日期時間未設定',
    item.flight.arrivalTimeZone || '時區未設定',
  ].join(' · ');
  return `出發 ${departure}\n抵達 ${arrival}`;
}
