const DAY = 86_400_000;

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** Clock time, e.g. "14:32". */
export function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Compact stamp for the conversation list: time today, "Yesterday", else a date. */
export function shortStamp(ts: number) {
  const date = new Date(ts);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (ts >= startOfToday) return timeOf(ts);
  if (ts >= startOfToday - DAY) return 'Yesterday';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

/** Section heading between groups of messages. */
export function dayLabel(ts: number) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (ts >= startOfToday) return 'Today';
  if (ts >= startOfToday - DAY) return 'Yesterday';
  return new Date(ts).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}

export function lastSeenLabel(ts?: number) {
  if (!ts) return 'Offline';
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return 'Last seen just now';
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${shortStamp(ts)}`;
}

export function callDuration(startedAt?: number, nowMs = Date.now()) {
  if (!startedAt) return '00:00';
  const total = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** "5 sec" / "2 min 31 sec" — used in call history lines. */
export function spokenDuration(totalSec: number) {
  if (totalSec < 60) return `${totalSec} sec`;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return secs ? `${mins} min ${secs} sec` : `${mins} min`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
