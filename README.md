# MyChat

A modern chat application built with **React 19 + TypeScript + MUI v9** (Vite).

**Steps 1 and 2 are complete.** The app runs on the mock backend with zero setup, and switches
automatically to real Firebase Auth + Firestore as soon as you fill in `.env`.

```bash
npm install
npm run dev     # http://localhost:5173
```

## Firebase setup (project `mychat-e72b7`)

Everything below is on the free **Spark** plan — no credit card.

**1. Enable sign-in methods**
Console → **Authentication** → Get started → Sign-in method tab → enable **Email/Password** and **Google**.

**2. Create the database**
Console → **Firestore Database** → Create database → Start in **production mode** → pick a location
(`asia-south1` for India).

**3. Publish the security rules**
Console → Firestore Database → **Rules** tab → paste the contents of [firestore.rules](firestore.rules) → Publish.
Do this before inviting anyone: it is what stops strangers reading your messages.

**4. Copy your keys**
Console → gear icon → **Project settings** → General → "Your apps" → Web app (add one if there is none,
skip Hosting for now) → **Config**. Then:

```bash
cp .env.example .env     # then paste the values in
npm run dev
```

Restart `npm run dev` after editing `.env` — Vite only reads it at startup.

**To test real chat:** register one account in your normal window and a second account in an incognito
window, then use the **＋ New chat** button to find the other user. Messages, typing indicators, presence
and read receipts all flow through Firestore live.

## What works right now

- **Email/password and Google sign-in**, with readable error messages
- Real-time 1:1 messaging through Firestore — no refresh, both sides update instantly
- Conversation list with search, mute, unread badges and relative timestamps
- Message thread with day separators, grouped bubbles and read receipts
- **＋ New chat** — pick anyone who has registered and start a thread
- Live typing indicator, and online / away / last-seen presence
- Composer: multi-line input (Enter sends, Shift+Enter newline), emoji picker
- Video / voice call screen with a **real local camera preview**, mute, camera toggle and call timer
  (the peer tile is still a placeholder until Agora lands in step 3)
- Light / dark mode, remembered across reloads; fully responsive down to mobile

Without `.env` keys the app runs on [mockChatService.ts](src/services/mockChatService.ts), where a fake
peer replies to you a couple of seconds after each message — useful for working on the UI offline.

## Project structure

```
src/
  theme.ts                    accent color, light/dark palettes, component defaults
  types.ts                    User, Message, Conversation, Call
  lib/
    firebase.ts               SDK init from env vars; detects whether keys exist
  auth/
    AuthProvider.tsx          Firebase auth state
    context.ts                useAuth() + human-readable error messages
  services/
    chatService.ts            the backend contract — the ONLY seam between UI and backend
    mockChatService.ts        in-memory implementation (used when .env is empty)
    firebaseChatService.ts    Firestore implementation
  components/
    LoginScreen.tsx           sign in / sign up
    NewChatDialog.tsx         pick a registered user to start a thread
    Sidebar.tsx               conversation list + search + theme toggle
    ChatHeader.tsx            peer name, presence, call buttons
    MessageList.tsx           scroll container, day dividers, grouping
    MessageBubble.tsx         one bubble + attachments + status ticks
    TypingIndicator.tsx       animated dots
    Composer.tsx              input, emoji, attachments
    CallOverlay.tsx           full-screen call UI
    ProfilePanel.tsx          contact info drawer
    UserAvatar.tsx            gradient initials avatar + presence dot
  App.tsx                     layout and state wiring
```

`ChatService` in [chatService.ts](src/services/chatService.ts) is the single interface between the UI
and any backend, and `App.tsx` picks the implementation at startup. No component knows which backend
is running.

## Firestore data model

```
users/{uid}                     name, avatar, about, presence, lastSeen
conversations/{a__b}            participantIds[2], lastMessage, updatedAt,
                                unread{uid:n}, lastReadAt{uid:ts},
                                typing{uid:bool}, muted{uid:bool}
conversations/{a__b}/messages/  senderId, text, createdAt
```

Conversation ids are the two uids sorted and joined (`uidA__uidB`), so both people always
land on the same document and duplicate threads are impossible.

Three deliberate choices keep the app inside the free daily quota:
read state is one `lastReadAt` timestamp per person instead of a write per message; typing writes
only on transitions, not per keystroke; and presence is a 60-second heartbeat rather than a live socket.

## Roadmap

| Step | What | Status |
|---|---|---|
| 1 | MUI chat UI on mock data | ✅ done |
| 2 | Firebase Auth + Firestore (real login, real messages) | ✅ done |
| 3 | Agora SDK video calling | next |
| 4 | Deploy to Vercel + Agora token function | pending |

For step 3 you need an **Agora** account (agora.io → new project → copy the **App ID** and
**App Certificate**), which goes into `.env` as `VITE_AGORA_APP_ID`.

## Free-tier limits and honest gaps

- **Firestore:** 50k reads / 20k writes per day. Hitting a limit pauses the app until midnight — it never bills you.
- **Agora:** 10,000 free minutes per month (~166 hours of calling).
- **File sharing is disabled on Firebase.** Cloud Storage now requires the paid Blaze plan on new
  projects, so the attach button shows a note instead of uploading. It still works on the mock backend.
  A free workaround (Cloudinary, 25 GB) can be added later.
- **No push notifications while the app is closed** — that needs Cloud Functions, which is Blaze-only.
- **Presence is heartbeat-based,** so "offline" can lag by up to two minutes after someone closes the tab.

## Customising the look

The whole palette derives from two values at the top of [theme.ts](src/theme.ts):

```ts
export const ACCENT = '#6366F1';
export const ACCENT_2 = '#8B5CF6';
```

Change those to re-brand the app — bubbles, buttons, glow and avatars all follow.
