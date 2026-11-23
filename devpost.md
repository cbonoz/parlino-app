# Parlino — Devpost draft


## Inspiration

I had a trip coming up next month and wanted to improve my Spanish. Many apps out there are good for improving vocabulary, but without a conversational focus, learning can often fall flat.

Studying a language and speaking it in the moment are different skills. Many learners can recognize words in a lesson but still hesitate when they need to order a meal, ask for directions, or start a conversation.

We wanted to create a private, encouraging space where a learner can try, pause, make mistakes, and try again—then take that confidence into conversations with real people - and have Firebase AI power it.

## What it does

Parlino is an AI speaking partner for short, practical conversations using Firebase AI. Learners choose their target language, native language, proficiency level, and a scenario such as ordering at a café, asking for directions, meeting someone new, or talking at work—or create a custom situation and practice goal.

The learner speaks aloud while a concise tutor keeps the conversation moving at their level. Real-time corrections are optional and off by default; after a session, Parlino offers a gentle recap with useful phrases, supported corrections, and one positive observation. Learners can save phrases and revisit them later.

After a completed learner turn, the learner can optionally tap **Coach this sentence** for a focused correction and brief explanation. It prefers Firebase AI Logic on-device inference, reports whether the response actually came from the device or cloud, and warns when cloud inference is used. This separate request cannot interrupt or discard the voice session.

The goal isn’t to replace a class, tutor, or real conversation. It’s to make the first few speaking attempts feel accessible—wherever the learner is and before they feel ready to speak in public.

## How we built it

Parlino is an Android Expo development build written in TypeScript and React Native. Expo Router connects onboarding, practice, conversation, recap, and review.

Firebase is part of the runtime architecture:

- **Firebase AI Logic** powers the current cloud Live voice tutor through React Native Firebase’s Live session API. Expo Audio captures microphone PCM, the app streams it to the session, and React Native Audio API plays the tutor’s streamed audio. A separate Firebase AI Logic text-model call creates the session recap.
- **Firebase Authentication** signs learners in anonymously, so they can begin without creating a full account.
- **Cloud Firestore** stores learner settings, session summaries, and saved phrases under each authenticated user’s UID. Firestore rules enforce per-user access.
- **Firebase App Check** protects AI Logic requests. Development uses the debug provider; production is configured for Play Integrity.

The current cloud model calls are made through `@react-native-firebase/ai`; no provider API key is bundled in the app. Raw audio isn’t stored by Parlino, and transcript persistence is opt-in. AsyncStorage provides local progress persistence when Firebase isn’t configured, but that is data storage—not on-device AI inference.

**Hybrid-inference status:** Parlino now includes an optional **Coach this sentence** action after a learner turn. A small native Kotlin Expo module calls Firebase AI Logic Hybrid Inference with `PREFER_ON_DEVICE`, targeting Gemini Nano 4 Fast preview; the response shows whether inference actually ran on-device or in the cloud. If the hybrid request fails, Parlino tries its existing cloud model once, and displays a warning when a tip uses cloud inference. The live voice conversation and recap remain cloud-based.

The connected test phone is a Pixel 8, which is not on Google's current Gemini Nano 4 supported-device list. The build can test the cloud fallback and warning path, but the Nano 4 on-device path still needs validation on a supported device before we claim it has been demonstrated.

## Challenges we ran into

- **Native build setup:** React Native Firebase and the audio modules require a development build rather than Expo Go. We configured Expo prebuild and EAS for Android.
- **Android/Kotlin compatibility:** The Firebase Auth artifact was compiled with Kotlin 2.4 metadata while the generated project expected Kotlin 2.2. We aligned the Android Kotlin Gradle plugin through Expo Build Properties and generated a debug APK.
- **Real-time audio:** Voice needs explicit microphone permission, PCM sample-rate conversion, ordered audio chunks, streamed playback, and interruption/error handling. A chat-text response is not a substitute for a real voice session.
- **Privacy and reliability:** We kept transcripts off by default, scoped Firestore records to the authenticated UID, and made the Firebase setup state explicit instead of pretending an unconfigured session is live.
- **Hybrid inference:** React Native Firebase's AI package exposes cloud calls but not Android Hybrid Inference, so we added a small local Kotlin Expo module for the native Firebase AI Logic API. The sentence coach stays separate from Live voice and recap, and its failure cannot interrupt or discard a practice session.

## Accomplishments that we're proud of

- Built a complete learner flow from onboarding through scenario selection, voice practice, recap, phrase saving, and review.
- Implemented a real Firebase AI Logic Live-session provider with explicit connection, permission, and error states—no simulated tutor replies.
- Added an optional single-sentence coach using Firebase AI Logic Hybrid Inference, with on-device/cloud source reporting and a graceful cloud retry.
- Made guest-first Firebase Authentication and per-user Firestore persistence part of the app architecture.
- Added Firestore ownership rules, App Check configuration, transcript opt-in, and pure-logic tests for recap parsing, review scheduling, and validation.
- Generated a signed Android development APK and kept Firebase client configuration and generated build artifacts out of the Git source tree.

## What we learned

Speaking confidence is its own product problem: learners need room to practice, not only more vocabulary or grammar content. A small, relevant scenario can make practice feel more approachable than an open-ended chatbot.

We also learned to be precise about “local” versus “hybrid.” Saving preferences on-device does not mean AI is running on-device. A true hybrid experience must invoke an on-device model when available and use a deliberate cloud fallback when it isn’t. App Check, native builds, and streaming audio each add real setup and testing requirements beyond calling a model API.

## What's next for Parlino

1. Verify the sentence coach's Gemini Nano 4 on-device path on a supported physical Android device, including offline use and cloud fallback.
2. Finish testing the Live audio session and coach error handling on a physical device.
3. Add the project’s open-source license, publish the repository for judging, and record a short Android demo showing on-device and cloud inference.
