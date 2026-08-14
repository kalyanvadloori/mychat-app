import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { auth } from './firebase';

export const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID ?? '';
export const isAgoraConfigured = Boolean(AGORA_APP_ID);

/**
 * A fresh uid for every join, rather than one derived from the account.
 *
 * Agora allows a uid in a channel exactly once: a second client joining with the
 * same uid *evicts the first*. Deriving the uid from the user id meant the same
 * account on two devices — or any hash collision — silently kicked the other
 * participant a second or two after connecting.
 */
function sessionUid() {
  // 0 is reserved by Agora for "assign one for me", so stay strictly positive.
  return Math.floor(Math.random() * 1_000_000_000) + 1;
}

/**
 * Asks the Netlify function for a token.
 *
 * Returns null when there is no endpoint to ask — `vite dev` serves no
 * functions. A project with no App Certificate accepts a null token, so local
 * development still works; a secured project will fail loudly at join time,
 * which is the correct outcome rather than a silent misconfiguration.
 */
async function fetchToken(channel: string, uid: number) {
  const user = auth().currentUser;
  if (!user) return null;

  try {
    const response = await fetch('/.netlify/functions/agora-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({ channel, uid }),
    });
    if (!response.ok) {
      console.warn('[call] token endpoint returned', response.status, '— joining without a token');
      return null;
    }
    return ((await response.json()) as { token?: string }).token ?? null;
  } catch {
    console.warn('[call] token endpoint unreachable — joining without a token');
    return null;
  }
}

export interface CallSession {
  client: IAgoraRTCClient;
  micTrack: IMicrophoneAudioTrack | null;
  cameraTrack: ICameraVideoTrack | null;
  leave: () => Promise<void>;
}

interface JoinOptions {
  channel: string;
  video: boolean;
  /** Fires whenever the set of remote participants changes. */
  onRemoteUsers: (users: IAgoraRTCRemoteUser[]) => void;
  /** Fires when the other side hangs up or drops. */
  onPeerLeft: () => void;
}

/**
 * Joins a channel and publishes this device's microphone (and camera for video
 * calls). Every failure path leaves the channel behind it, so a half-joined
 * session can never linger and keep burning free-tier minutes.
 */
export async function joinCall({
  channel,
  video,
  onRemoteUsers,
  onPeerLeft,
}: JoinOptions): Promise<CallSession> {
  const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  const remotes = new Map<string | number, IAgoraRTCRemoteUser>();
  let leaveGrace: ReturnType<typeof setTimeout> | null = null;

  const publish = () => onRemoteUsers([...remotes.values()]);

  const cancelGrace = () => {
    if (leaveGrace) clearTimeout(leaveGrace);
    leaveGrace = null;
  };

  client.on('user-joined', (user) => {
    // Present but not yet publishing — enough to cancel a pending hang-up.
    cancelGrace();
    if (!remotes.has(user.uid)) remotes.set(user.uid, user);
    publish();
  });

  client.on('user-published', async (user, mediaType) => {
    cancelGrace();
    await client.subscribe(user, mediaType);
    if (mediaType === 'audio') user.audioTrack?.play();
    remotes.set(user.uid, user);
    publish();
  });

  client.on('user-unpublished', (user) => {
    remotes.set(user.uid, user);
    publish();
  });

  client.on('user-left', (user) => {
    remotes.delete(user.uid);
    publish();
    if (remotes.size > 0) return;

    // A brief reconnect looks identical to a hang-up at this instant, so wait
    // before tearing the call down; user-joined above cancels the timer.
    cancelGrace();
    leaveGrace = setTimeout(onPeerLeft, 3000);
  });

  client.on('exception', (event) => console.warn('[call] agora exception', event));

  const numeric = sessionUid();
  const token = await fetchToken(channel, numeric);

  let micTrack: IMicrophoneAudioTrack | null = null;
  let cameraTrack: ICameraVideoTrack | null = null;

  try {
    await client.join(AGORA_APP_ID, channel, token, numeric);

    // Requested together so the browser shows a single permission prompt.
    if (video) {
      [micTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    } else {
      micTrack = await AgoraRTC.createMicrophoneAudioTrack();
    }

    await client.publish([micTrack, cameraTrack].filter(Boolean) as never[]);
  } catch (error) {
    micTrack?.close();
    cameraTrack?.close();
    await client.leave().catch(() => {});
    throw error;
  }

  return {
    client,
    micTrack,
    cameraTrack,
    leave: async () => {
      cancelGrace();
      micTrack?.stop();
      micTrack?.close();
      cameraTrack?.stop();
      cameraTrack?.close();
      client.removeAllListeners();
      await client.leave().catch(() => {});
    },
  };
}

/** Turns Agora's error codes into something worth showing a person. */
export function callErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'PERMISSION_DENIED':
    case 'NOT_ALLOWED':
      return 'Camera or microphone permission was blocked. Allow access and try again.';
    case 'DEVICE_NOT_FOUND':
      return 'No camera or microphone was found on this device.';
    case 'INVALID_TOKEN':
    case 'CAN_NOT_GET_GATEWAY_SERVER':
      return 'Could not authenticate the call. The Agora token service may not be set up yet.';
    case 'NETWORK_ERROR':
      return 'Network problem — the call could not connect.';
    default:
      return 'The call could not be connected. Please try again.';
  }
}
