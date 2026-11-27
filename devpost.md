# Parlino — Devpost draft

**Platform:** Android (Best Android App)
**Repository:** [github.com/cbonoz/parlino-app](https://github.com/cbonoz/parlino-app) — public, Apache 2.0

## Inspiration

I have a trip coming up next month and wanted to improve my Spanish. The apps I tried taught me words; the trouble started when someone asked a follow-up I hadn’t rehearsed.

Recognizing a word in a lesson and retrieving it while someone waits are different skills. I wanted a private place to try, pause, make mistakes, and try again—then take that confidence into a real conversation. Firebase AI powers it.

## What it does

Parlino is an AI speaking partner for short, practical conversations. Learners choose their languages, level, and a scenario—ordering at a café, asking directions, meeting someone new, talking at work—or create a custom situation. They speak aloud while a concise tutor keeps the conversation at their level; corrections are off by default, a mute toggle pauses the mic, and a gentle recap offers phrases to save and review. After any turn, **Coach this sentence** gives one focused correction, preferring Firebase AI Logic on-device inference and showing whether the answer came from the device or cloud. It cannot interrupt the session.

**Value proposition:** Parlino turns a few spare minutes into low-pressure speaking practice for learners who freeze in real conversations. It is guest-first, keeps transcripts off unless you opt in, and makes correction optional. Every session starts with the moment the learner is actually facing.

## Why not just Duolingo or Babbel?

Duolingo Max’s Video Call with Lily and Babbel’s guided AI scenarios already prove learners will talk to an app. The gap is what that practice is organized around:

- **The app chooses the conversation.** Curriculum and expert-written scenarios don’t let me rehearse my specific moment—the café follow-up, the work standup, the landlord call.
- **Recognition is not retrieval, and timing matters.** A real conversation requires retrieving words under pressure and repairing sentences. Immediate correction helps drills but breaks a beginner’s flow; Parlino defers it, then offers one optional tip while the conversation stays open.
- **Engagement is not confidence.** Streaks measure return visits, not whether I can order dinner without switching to English. The advanced conversation features are also premium and cloud-first; Parlino is guest-first and shows when a tip ran on-device or in the cloud.

Parlino is not a curriculum or a replacement for Duolingo, Babbel, or a human tutor. It is the five-minute rehearsal space between a lesson and a real conversation.

*Sources: [Duolingo Max](https://www.duolingo.com/help/what-is-duolingo-max), [Video Call](https://blog.duolingo.com/video-call), [Babbel Speak](https://www.babbel.com/babbel-conversation-practice), [Speak](https://speak.com), [Loora](https://www.loora.com).*

## What we built during the submission period

Parlino is a net new app built entirely during #BuildHybridAI 2026, with its first commit on November 15.

- The full Android flow: onboarding, preset and custom scenarios, streaming voice practice, optional coaching, recap, saved phrases, and review.
- The Firebase backend: anonymous Authentication, Firestore with per-user rules, App Check, and a Firebase AI Logic Live voice session with real microphone capture.
- A Firebase AI Logic Hybrid Inference sentence coach through a Kotlin Expo module, with source reporting, cloud fallback, tests, and a sideloadable build.

No pre-existing Parlino code was used.

## How we built it

Parlino is an Android Expo app in TypeScript and React Native. Firebase is the runtime, not a dependency list:

- **Firebase AI Logic** powers the cloud Live voice tutor (`src/services/aiSession.ts`) and the recap model call (`src/services/recapService.ts`). Expo Audio captures 16 kHz PCM; React Native Audio API plays the reply.
- **Authentication and Firestore** sign learners in anonymously and store settings, sessions, recaps, and phrases under `users/{uid}`. Rules enforce per-user access.
- **App Check** protects AI Logic requests; development uses the debug provider, production is configured for Play Integrity.

The optional **Coach this sentence** path calls Firebase AI Logic Hybrid Inference through `modules/parlino-hybrid-ai/` using the native Android SDKs. It sets `PREFER_ON_DEVICE` with Gemini Nano 4 Fast preview, reports `ON_DEVICE` vs `IN_CLOUD`, and falls back to cloud once if needed. Live voice and recap remain cloud-based. No provider API key is bundled; raw audio isn’t stored, and transcript saving is opt-in.

Setup and sideloading are in the [GitHub README](https://github.com/cbonoz/parlino-app#build-and-run-android-locally-sideloaded-no-play-store); the repo is public and Apache 2.0 licensed.

## Challenges we ran into

- **Native build setup and Kotlin compatibility.** Firebase and audio need a dev build; I configured prebuild/EAS and aligned the Kotlin Gradle plugin.
- **Real-time audio.** Microphone permission, PCM conversion, ordered chunks, streamed playback, and interruptions—text chat is not a voice session.
- **Hybrid inference and trust.** I integrated the native SDK through a Kotlin module, kept coaching independent of the session, and made setup and inference source explicit instead of faking a tutor.

## Accomplishments that we're proud of

- Built the complete learner flow with a real Firebase AI Logic Live session, not simulated replies.
- Added hybrid coaching with on-device/cloud reporting, cloud fallback, App Check, per-user rules, and transcript opt-in.
- Published a public Apache 2.0 repo with tests, screenshots, build instructions, and a compressed Android demo APK.

## What we learned

Confidence in speaking is a separate skill from vocabulary, and building a product that supports it is a separate skill from building the app itself. The hardest product decision was knowing when not to correct: a tutor that interrupts every sentence looks impressive in a demo but makes it harder to finish a thought. Deferring feedback—and making the one-sentence coach optional—made practice feel safer.

On the engineering side, the hardest part was treating audio as a live stream instead of a text prompt. The Live AI socket streams 16 kHz PCM from the microphone in ordered chunks while the tutor listens, then plays back streamed speech. That loop is what makes Parlino feel like a conversation; a chat-style request/response would have been easier and much less useful. Firebase AI Logic also made the on-device/cloud trade-off concrete: on-device inference is fast and keeps a sentence local, cloud inference adds reach, and the app shows which route answered.

## What's next for Parlino

1. Expand the scenario library and language options.
2. Deepen personalization across practice and review.
3. Keep refining the experience with learner feedback.

Demo video (public 11/29): https://www.youtube.com/watch?v=zjzzUnLpjOo

This was a fun project to build!
