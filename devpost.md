# Parlino — Devpost draft

**Platform:** Android (Best Android App)
**Repository:** [github.com/cbonoz/parlino-app](https://github.com/cbonoz/parlino-app) — public, Apache 2.0


## Inspiration

I had a trip coming up next month and wanted to improve my Spanish. The apps I tried were good at teaching words. The trouble started when someone asked a follow-up question I hadn’t rehearsed.

Studying a language and speaking it in the moment are different skills. Many learners can recognize words in a lesson but still hesitate when they need to order a meal, ask for directions, or start a conversation.

I wanted to create a private, encouraging space where a learner can try, pause, make mistakes, and try again—then take that confidence into conversations with real people - and have Firebase AI power it.

## What it does

Parlino is an AI speaking partner for short, practical conversations using Firebase AI. Learners choose their target language, native language, proficiency level, and a scenario such as ordering at a café, asking for directions, meeting someone new, or talking at work—or create a custom situation and practice goal.

The learner speaks aloud while a concise tutor keeps the conversation moving at their level. Real-time corrections are optional and off by default; after a session, Parlino offers a gentle recap with useful phrases, supported corrections, and one positive observation. Learners can save phrases and revisit them later.

During an active voice conversation, a mute toggle lets the learner pause microphone audio without ending the session.

After a completed learner turn, the learner can optionally tap **Coach this sentence** for a focused correction and brief explanation. It prefers Firebase AI Logic on-device inference, reports whether the response actually came from the device or cloud, and warns when cloud inference is used. This separate request cannot interrupt or discard the voice session.

The goal isn’t to replace a class, tutor, or real conversation. It’s to make the first few speaking attempts feel accessible—wherever the learner is and before they feel ready to speak in public.

**Value proposition:** Parlino turns a few spare minutes into low-pressure speaking practice for learners who freeze in real conversations. It is guest-first, keeps transcripts off unless you opt in, adapts to the learner’s level, and makes correction optional. Unlike a lesson path, every session starts with the moment the learner is actually facing—and can be repeated until it feels ordinary.

## Why not just Duolingo or Babbel?

Duolingo and Babbel are the obvious comparisons. Both are good at getting learners to the starting line: Duolingo’s path and streaks make daily practice stick, and Duolingo Max’s Video Call with Lily lets you speak with an AI character. Babbel pairs structured lessons with speech recognition, guided AI conversation scenarios in Babbel Speak, and live classes with teachers. Voice-first apps such as Speak and Loora go further and put speaking at the center.

So the gap isn’t “no one does voice.” The gap is what the voice practice is organized around.

1. **The app chooses the conversation.** Curriculum apps optimize for the next lesson, and their conversation features follow that structure—a character, a unit, an expert-written scenario. That is valuable, but it does not let me rehearse the exact moment I am worried about: the café order with an unexpected follow-up, the work standup, the call to a landlord.
2. **Recognition is not retrieval.** Vocabulary drills ask me to recognize or recall a known item. A real conversation asks me to retrieve words while someone waits, listen to a reply I did not predict, and repair the sentence when it comes out wrong. Those are different skills, and they need a different loop.
3. **Guided scenarios can become scripts.** Expert-designed dialogues are safe and well sequenced, but if I already know the prompts, I am rehearsing the script rather than the improvisation. The unpredictable follow-up is the hard part.
4. **Feedback timing is a design choice.** Immediate correction is great for a drill and terrible for a beginner trying to finish a thought. Post-session review is gentler, but it is usually the only feedback path, and it is shaped by the app’s scenario. Parlino defers correction by default, then lets the learner ask for one targeted sentence tip while the conversation is still open—without interrupting it.
5. **Engagement is not confidence.** Streaks and XP measure whether I came back, not whether I can order dinner without switching to English. A learner can be “advanced” in an app and still freeze in public.
6. **The most advanced conversation features are premium and cloud-first.** Duolingo Max and Babbel’s conversation features sit behind paid tiers. The AI is remote, and it is rarely obvious which model or route handled a sentence. Parlino is guest-first, keeps transcripts off by default, and shows when a coaching tip came from the device or the cloud.

**What Parlino is not:** a curriculum, a replacement for Duolingo or Babbel, a human tutor, or a pronunciation scorer. It has far less content and a much smaller scenario library. It is the five-minute rehearsal space between a lesson and a real conversation: choose the moment, speak it through, get one useful note, and go.

### How the loops differ

- **Duolingo Max:** lesson path plus AI video calls with Lily; cloud AI; account and paid Max tier; broad curriculum.
- **Babbel:** structured lessons, Babbel Speak’s guided AI scenarios, and live classes; cloud AI; subscription; broad curriculum.
- **Parlino:** one short spoken scenario chosen by the learner, including custom situations; hybrid inference with on-device coaching preferred and the route shown; anonymous guest; narrow, Spanish-first speaking rehearsal.

That is the wedge: not a better course, a smaller, braver first step. For a learner with a trip next month, the win is not a 30-day streak—it is ordering without rehearsing in English first. The technical bet is equally specific: one Firebase AI Logic SDK can choose the right route for each request, and show the learner which route it chose.

*Feature comparisons based on Duolingo’s [Max help page](https://www.duolingo.com/help/what-is-duolingo-max) and [Video Call overview](https://blog.duolingo.com/video-call), [Babbel Speak](https://www.babbel.com/babbel-conversation-practice), and the public product pages for [Speak](https://speak.com) and [Loora](https://www.loora.com).*

## What we built during the submission period

Parlino is a net new app created entirely inside the #BuildHybridAI 2026 submission period (November 2026), with its first commit on November 15 and all feature work landing before the deadline. During the submission period I built:

- The full Android app: onboarding, scenario selection incl. custom scenarios, streaming voice practice, optional sentence coaching, recap, saved phrases, and spaced review.
- Firebase Authentication (anonymous), Cloud Firestore persistence with per-user rules, and Firebase App Check.
- A Firebase AI Logic Live voice session with real microphone capture and streamed playback.
- A Firebase AI Logic Hybrid Inference sentence coach through a small Kotlin Expo module, with inference-source reporting, cloud-use disclosure, and a cloud retry.
- Tests, typecheck and lint coverage, plus setup docs, screenshots, and a sideloadable standalone build.

No pre-existing Parlino code was used.

## How we built it

Parlino is an Android Expo development build written in TypeScript and React Native. Expo Router connects onboarding, practice, conversation, recap, and review.

I built Parlino during #BuildHybridAI. The app pairs Firebase AI Logic Hybrid Inference for optional sentence coaching with custom scenario creation, an in-call microphone mute control, Live voice practice, and cloud recap generation.

The app can be built with your own Firebase project and configuration. Setup, Firebase project steps, and sideloading instructions are in the [GitHub README](https://github.com/cbonoz/parlino-app#build-and-run-android-locally-sideloaded-no-play-store). The repository is public and Apache 2.0 licensed.

Firebase is part of the runtime architecture:

- **Firebase AI Logic** powers the current cloud Live voice tutor through React Native Firebase’s Live session API. Expo Audio captures microphone PCM, the app streams it to the session, and React Native Audio API plays the tutor’s streamed audio. A separate Firebase AI Logic text-model call creates the session recap.
- **Firebase Authentication** signs learners in anonymously, so they can begin without creating a full account.
- **Cloud Firestore** stores learner settings, session summaries, and saved phrases under each authenticated user’s UID. Firestore rules enforce per-user access.
- **Firebase App Check** protects AI Logic requests. Development uses the debug provider; production is configured for Play Integrity.

Live voice and recap use `@react-native-firebase/ai`, while the sentence coach uses Firebase AI Logic's native Android Hybrid Inference SDK through a Kotlin Expo module. No provider API key is bundled in the app. Raw audio isn’t stored by Parlino, transcript persistence is opt-in, and AsyncStorage holds learner progress.

**Hybrid inference:** Parlino’s optional **Coach this sentence** feature uses Firebase AI Logic Hybrid Inference with `PREFER_ON_DEVICE` and the Gemini Nano 4 Fast preview model. It runs prompts on-device when a local model is available and falls back to cloud inference when it isn’t. The app reports the actual inference source and warns when a tip uses cloud inference. If the hybrid request fails, Parlino tries its cloud model once. Live voice and recap remain cloud-based.

## Challenges we ran into

- **Native build setup:** React Native Firebase and the audio modules require a development build rather than Expo Go. I configured Expo prebuild and EAS for Android.
- **Android/Kotlin compatibility:** The Firebase Auth artifact was compiled with Kotlin 2.4 metadata while the generated project expected Kotlin 2.2. I aligned the Android Kotlin Gradle plugin through Expo Build Properties and generated a debug APK.
- **Real-time audio:** Voice needs explicit microphone permission, PCM sample-rate conversion, ordered audio chunks, streamed playback, and interruption/error handling. A chat-text response is not a substitute for a real voice session.
- **Privacy and reliability:** I kept transcripts off by default, scoped Firestore records to the authenticated UID, and made the Firebase setup state explicit instead of pretending an unconfigured session is live.
- **Hybrid inference:** I integrated Firebase AI Logic's native Android SDK into the Expo and React Native app through a small Kotlin Expo module. The sentence coach stays separate from Live voice and recap, and its failure cannot interrupt or discard a practice session.

## Accomplishments that we're proud of

- Built a complete learner flow from onboarding through scenario selection, voice practice, recap, phrase saving, and review.
- Implemented a real Firebase AI Logic Live-session provider with explicit connection, permission, and error states—no simulated tutor replies.
- Added an optional single-sentence coach using Firebase AI Logic Hybrid Inference, with on-device/cloud source reporting and a graceful cloud retry.
- Made guest-first Firebase Authentication and per-user Firestore persistence part of the app architecture.
- Added Firestore ownership rules, App Check configuration, transcript opt-in, and pure-logic tests for recap parsing, review scheduling, and validation.
- Generated a signed Android development APK and kept Firebase client configuration and generated build artifacts out of the Git source tree.
- Published the source as a public, Apache 2.0 licensed repository with end-to-end build and Firebase setup instructions, so judges can build and run it with their own Firebase project.

## What we learned

Speaking confidence is its own product problem: learners need room to practice, not only more vocabulary or grammar content. A small, relevant scenario can make practice feel more approachable than an open-ended chatbot.

The hardest product decision was when to stay quiet. A tutor that corrects every sentence looks impressive in a demo and feels awful when you are trying to finish a thought. Deferring correction—and making the single-sentence coach optional—made the conversation feel safer than a more “helpful” version would have.

I learned how Firebase AI Logic can combine private, responsive on-device inference with the reach of cloud models, and how to make the active inference route visible to learners. Integrating App Check, native Android code, and streaming audio made reliability and privacy part of the product experience, not just implementation details.

## What's next for Parlino

1. Expand the scenario library and language-practice options.
2. Deepen personalization across practice and phrase review.
3. Continue refining the learner experience based on feedback.
