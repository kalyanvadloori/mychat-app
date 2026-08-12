import type { CallLog } from '../types';
import { spokenDuration } from './format';

/** Neutral one-liner stored on the message and shown in the conversation list. */
export function callSummary(call: CallLog) {
  const noun = call.kind === 'video' ? 'Video call' : 'Voice call';
  return call.outcome === 'completed' ? noun : `${noun} · ${call.outcome}`;
}

/**
 * Viewer-aware label for the bubble. The same record reads differently to each
 * side: what the caller sees as "Outgoing" is "Incoming" to the person called.
 */
export function callHeadline(call: CallLog, mine: boolean) {
  const noun = call.kind === 'video' ? 'video call' : 'voice call';
  switch (call.outcome) {
    case 'completed':
      return mine ? `Outgoing ${noun}` : `Incoming ${noun}`;
    case 'missed':
      return mine ? `No answer` : `Missed ${noun}`;
    case 'declined':
      return mine ? `Call declined` : `You declined the ${noun}`;
    default:
      return mine ? `Call cancelled` : `Missed ${noun}`;
  }
}

export function callDetail(call: CallLog) {
  return call.outcome === 'completed' ? spokenDuration(call.durationSec) : 'Not connected';
}

/** Missed and declined calls read as a problem, so they get the error colour. */
export function callIsNegative(call: CallLog) {
  return call.outcome !== 'completed';
}
