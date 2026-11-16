# Parlino — Devpost draft

> **Submission accuracy note:** This draft describes the current Android MVP honestly. The current app uses Firebase AI Logic for cloud-based Live voice sessions and recap generation. Firebase AI Logic Hybrid Inference with on-device Gemini Nano 4 and cloud fallback is still a planned feature, not something the current build demonstrates. The challenge requires that hybrid flow, so implement and device-test it before submitting.

## Inspiration

Studying a language and speaking it in the moment are different skills. Many learners can recognize words in a lesson but still hesitate when they need to order a meal, ask for directions, or start a conversation.

Apps such as Duolingo are excellent for structured lessons and building a study habit. Parlino focuses on a complementary step: helping learners rehearse speaking before the real-world moment arrives. You shouldn’t have to travel to a café, find a conversation partner, or feel like you’re being evaluated just to get your first speaking reps in.

We wanted to create a private, encouraging space where a learner can try, pause, make mistakes, and try again—then take that confidence into conversations with real people.

## What it does

Parlino is an AI speaking partner for short, practical conversations using Firebase AI. Learners choose their target language, native language, proficiency level, and a scenario such as ordering at a café, asking for directions, meeting someone new, or talking at work.

The learner speaks aloud while a concise tutor keeps the conversation moving at their level. Real-time corrections are optional and off by default; after a session, Parlino offers a gentle recap with useful phrases, supported corrections, and one positive observation. Learners can save phrases and revisit them later.

The goal isn’t to replace a class, tutor, or real conversation. It’s to make the first few speaking attempts feel accessible—wherever the learner is and before they feel ready to speak in public.

## How we built it

Parlino is an Android Expo development build written in TypeScript and React Native. Expo Router connects onboarding, practice, conversation, recap, and review.

Firebase is part of the runtime architecture:

- **Firebase AI Logic** powers the current cloud Live voice tutor through React Native Firebase’s Live session API. Expo Audio captures microphone PCM, the app streams it to the session, and React Native Audio API plays the tutor’s streamed audio. A separate Firebase AI Logic text-model call creates the session recap.
- **Firebase Authentication** signs learners in anonymously, so they can begin without creating a full account.
- **Cloud Firestore** stores learner settings, session summaries, and saved phrases under each authenticated user’s UID. Firestore rules enforce per-user access.
- **Firebase App Check** protects AI Logic requests. Development uses the debug provider; production is configured for Play Integrity.

The current cloud model calls are made through `@react-native-firebase/ai`; no provider API key is bundled in the app. Raw audio isn’t stored by Parlino, and transcript persistence is opt-in. AsyncStorage provides local progress persistence when Firebase isn’t configured, but that is data storage—not on-device AI inference.

**Hybrid-inference status:** The current implementation does not yet run Gemini Nano 4 on-device or demonstrate Firebase AI Logic’s local-to-cloud fallback. That is the main technical step remaining for this challenge.

## Challenges we ran into

- **Native build setup:** React Native Firebase and the audio modules require a development build rather than Expo Go. We configured Expo prebuild and EAS for Android.
- **Android/Kotlin compatibility:** The Firebase Auth artifact was compiled with Kotlin 2.4 metadata while the generated project expected Kotlin 2.2. We aligned the Android Kotlin Gradle plugin through Expo Build Properties and generated a debug APK.
- **Real-time audio:** Voice needs explicit microphone permission, PCM sample-rate conversion, ordered audio chunks, streamed playback, and interruption/error handling. A chat-text response is not a substitute for a real voice session.
- **Privacy and reliability:** We kept transcripts off by default, scoped Firestore records to the authenticated UID, and made the Firebase setup state explicit instead of pretending an unconfigured session is live.
- **Hybrid inference:** The hackathon asks for on-device Gemini Nano 4 with cloud fallback. Our current Live voice and recap calls are cloud-based, so adding and demonstrating the required Hybrid Inference path remains a priority.

## Accomplishments that we're proud of

- Built a complete learner flow from onboarding through scenario selection, voice practice, recap, phrase saving, and review.
- Implemented a real Firebase AI Logic Live-session provider with explicit connection, permission, and error states—no simulated tutor replies.
- Made guest-first Firebase Authentication and per-user Firestore persistence part of the app architecture.
- Added Firestore ownership rules, App Check configuration, transcript opt-in, and pure-logic tests for recap parsing, review scheduling, and validation.
- Generated a signed Android development APK and kept Firebase client configuration and generated build artifacts out of the Git source tree.

## What we learned

Speaking confidence is its own product problem: learners need room to practice, not only more vocabulary or grammar content. A small, relevant scenario can make practice feel more approachable than an open-ended chatbot.

We also learned to be precise about “local” versus “hybrid.” Saving preferences on-device does not mean AI is running on-device. A true hybrid experience must invoke an on-device model when available and use a deliberate cloud fallback when it isn’t. App Check, native builds, and streaming audio each add real setup and testing requirements beyond calling a model API.

## What's next for Parlino

1. Implement Firebase AI Logic Hybrid Inference for Android: use Gemini Nano 4 for a useful speaking-preparation or phrase-practice feature when available, with cloud fallback when the device or model can’t handle the request.
2. Make the inference route visible and testable so learners and judges can understand when work stays on-device and when it uses the cloud.
3. Test the Live audio session and hybrid path on supported physical Android devices, including offline and unsupported-device cases.
4. Add the project’s open-source license, publish the repository for judging, and record a short Android demo showing the finished hybrid flow.
