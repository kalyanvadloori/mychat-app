import type { User as FirebaseUser } from 'firebase/auth';
import type { ChatService } from './chatService';
import { createFirebaseChatService } from './firebaseChatService';
import { createMockChatService } from './mockChatService';

/**
 * The chat service is cached by signed-in uid rather than owned by a component.
 *
 * React StrictMode mounts, unmounts and remounts every effect in development.
 * If disposal were tied to an effect cleanup, that unmount would tear down the
 * Firestore listeners while the remount reused the same (now dead) instance —
 * the UI would sit on empty lists forever. Keying on uid means the service is
 * built once per session and only disposed when the identity actually changes.
 */
let current: { key: string; service: ChatService } | null = null;

export function getChatService(authUser: FirebaseUser | null | undefined): ChatService {
  const key = authUser?.uid ?? 'mock';
  if (current?.key !== key) {
    current?.service.dispose();
    current = {
      key,
      service: authUser ? createFirebaseChatService(authUser) : createMockChatService(),
    };
  }
  return current.service;
}

/** Called on explicit sign-out, before Firebase auth is torn down. */
export function disposeChatService() {
  current?.service.dispose();
  current = null;
}
