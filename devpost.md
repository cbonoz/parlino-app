# Parlino — Devpost draft


## Inspiration

I had a trip coming up next month and wanted to improve my Spanish. Many apps out there are good for improving vocabulary, but without a conversational focus, learning can often fall flat.

Studying a language and speaking it in the moment are different skills. Many learners can recognize words in a lesson but still hesitate when they need to order a meal, ask for directions, or start a conversation.

We wanted to create a private, encouraging space where a learner can try, pause, make mistakes, and try again—then take that confidence into conversations with real people - and have Firebase AI power it.

## What it does

Parlino is an AI speaking partner for short, practical conversations using Firebase AI. Learners choose their target language, native language, proficiency level, and a scenario such as ordering at a café, asking for directions, meeting someone new, or talking at work—or create a custom situation and practice goal.

The learner speaks aloud while a concise tutor keeps the conversation moving at their level. Real-time corrections are optional and off by default; after a session, Parlino offers a gentle recap with useful phrases, supported corrections, and one positive observation. Learners can save phrases and revisit them later.

During an active voice conversation, a mute toggle lets the learner pause microphone audio without ending the session.

After a completed learner turn, the learner can optionally tap **Coach this sentence** for a focused correction and brief explanation. It prefers Firebase AI Logic on-device inference, reports whether the response actually came from the device or cloud, and warns when cloud inference is used. This separate request cannot interrupt or discard the voice session.

The goal isn’t to replace a class, tutor, or real conversation. It’s to make the first few speaking attempts feel accessible—wherever the learner is and before they feel ready to speak in public.

## How we built it

Parlino is an Android Expo development build written in TypeScript and React Native. Expo Router connects onboarding, practice, conversation, recap, and review.

During #BuildHybridAI, we added Android Firebase AI Logic Hybrid Inference for optional sentence coaching, custom scenario creation, and an in-call microphone mute control to Parlino's existing speaking-practice app.

The app can be built with your own Firebase project and configuration; setup and sideloading instructions are in the [GitHub README](https://github.com/cbonoz/parlino-app).

Firebase is part of the runtime architecture:

- **Firebase AI Logic** powers the current cloud Live voice tutor through React Native Firebase’s Live session API. Expo Audio captures microphone PCM, the app streams it to the session, and React Native Audio API plays the tutor’s streamed audio. A separate Firebase AI Logic text-model call creates the session recap.
- **Firebase Authentication** signs learners in anonymously, so they can begin without creating a full account.
- **Cloud Firestore** stores learner settings, session summaries, and saved phrases under each authenticated user’s UID. Firestore rules enforce per-user access.
- **Firebase App Check** protects AI Logic requests. Development uses the debug provider; production is configured for Play Integrity.

Live voice and recap use `@react-native-firebase/ai`, while the sentence coach uses Firebase AI Logic's native Android Hybrid Inference SDK through a Kotlin Expo module. No provider API key is bundled in the app. Raw audio isn’t stored by Parlino, transcript persistence is opt-in, and AsyncStorage holds learner progress.

**Hybrid inference:** Parlino’s optional **Coach this sentence** feature uses Firebase AI Logic Hybrid Inference with `PREFER_ON_DEVICE` and the Gemini Nano 4 Fast preview model. It runs prompts on-device when a local model is available and falls back to cloud inference when it isn’t. The app reports the actual inference source and warns when a tip uses cloud inference. If the hybrid request fails, Parlino tries its cloud model once. Live voice and recap remain cloud-based.

## Challenges we ran into

- **Native build setup:** React Native Firebase and the audio modules require a development build rather than Expo Go. We configured Expo prebuild and EAS for Android.
- **Android/Kotlin compatibility:** The Firebase Auth artifact was compiled with Kotlin 2.4 metadata while the generated project expected Kotlin 2.2. We aligned the Android Kotlin Gradle plugin through Expo Build Properties and generated a debug APK.
- **Real-time audio:** Voice needs explicit microphone permission, PCM sample-rate conversion, ordered audio chunks, streamed playback, and interruption/error handling. A chat-text response is not a substitute for a real voice session.
- **Privacy and reliability:** We kept transcripts off by default, scoped Firestore records to the authenticated UID, and made the Firebase setup state explicit instead of pretending an unconfigured session is live.
- **Hybrid inference:** We integrated Firebase AI Logic's native Android SDK into the Expo and React Native app through a small Kotlin Expo module. The sentence coach stays separate from Live voice and recap, and its failure cannot interrupt or discard a practice session.

## Accomplishments that we're proud of

- Built a complete learner flow from onboarding through scenario selection, voice practice, recap, phrase saving, and review.
- Implemented a real Firebase AI Logic Live-session provider with explicit connection, permission, and error states—no simulated tutor replies.
- Added an optional single-sentence coach using Firebase AI Logic Hybrid Inference, with on-device/cloud source reporting and a graceful cloud retry.
- Made guest-first Firebase Authentication and per-user Firestore persistence part of the app architecture.
- Added Firestore ownership rules, App Check configuration, transcript opt-in, and pure-logic tests for recap parsing, review scheduling, and validation.
- Generated a signed Android development APK and kept Firebase client configuration and generated build artifacts out of the Git source tree.

## What we learned

Speaking confidence is its own product problem: learners need room to practice, not only more vocabulary or grammar content. A small, relevant scenario can make practice feel more approachable than an open-ended chatbot.

We learned how Firebase AI Logic can combine private, responsive on-device inference with the reach of cloud models, and how to make the active inference route visible to learners. Integrating App Check, native Android code, and streaming audio made reliability and privacy part of the product experience, not just implementation details.

## What's next for Parlino

1. Expand the scenario library and language-practice options.
2. Deepen personalization across practice and phrase review.
3. Continue refining the learner experience based on feedback.
