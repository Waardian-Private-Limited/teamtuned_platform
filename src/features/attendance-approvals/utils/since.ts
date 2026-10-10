/** "Waiting 3 days" / "Waiting 5 hours": how long something has waited, rounded to what matters. */
export function since(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (minutes < 60) return `Waiting ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Waiting ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.round(hours / 24);
  return `Waiting ${days} days`;
}
