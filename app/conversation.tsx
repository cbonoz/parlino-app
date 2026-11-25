import { router, useLocalSearchParams } from 'expo-router';
import { requestRecordingPermissionsAsync, useAudioStream } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SCENARIOS, type LearnerSettings, type TranscriptTurn } from '@/domain/types';
import { createCustomScenario } from '@/domain/scenarios';
import { shouldForwardMicrophoneAudio } from '@/domain/microphone';
import { countSessionTurns } from '@/domain/sessionStats';
import { LiveAudioPlayer, toMonoPcm16kBase64 } from '@/services/audio';
import { connectLiveConversation, type LiveConversation, type LiveState } from '@/services/aiSession';
import { coachSentence, type SentenceCoachResult } from '@/services/sentenceCoach';
import { loadSettings, saveSessionLocally } from '@/services/progress';
import { getFirebaseSetup } from '@/services/firebase';
import { setSessionDraft } from '@/services/sessionDraft';
import { colors, radius } from '@/theme';

type ScreenState = LiveState | 'idle' | 'permission-denied';

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ scenarioId?: string; customTitle?: string; customObjective?: string }>();
  const customScenario = params.scenarioId === 'custom'
    ? createCustomScenario(params.customTitle ?? '', params.customObjective ?? '')
    : null;
  const scenario = customScenario ?? SCENARIOS.find((item) => item.id === params.scenarioId) ?? SCENARIOS[0];
  const setup = getFirebaseSetup();
  const [settings, setSettings] = useState<LearnerSettings | null>(null);
  const [status, setStatus] = useState<ScreenState>('idle');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [realTimeCorrections, setRealTimeCorrections] = useState(false);
  const [coachResult, setCoachResult] = useState<{ sentence: string; result: SentenceCoachResult } | null>(null);
  const [coachError, setCoachError] = useState('');
  const [coaching, setCoaching] = useState(false);
  const [microphoneToggleBusy, setMicrophoneToggleBusy] = useState(false);
  const connectionRef = useRef<LiveConversation | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const stopCaptureRef = useRef<() => void>(() => undefined);
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const startedAtRef = useRef(0);
  const statusRef = useRef<ScreenState>('idle');
  const microphoneMutedRef = useRef(false);
  const microphoneToggleInProgressRef = useRef(false);
  const sessionGenerationRef = useRef(0);
  const coachRequestRef = useRef(false);
  const onDeviceWarningShownRef = useRef(false);
  const [microphoneMuted, setMicrophoneMuted] = useState(false);

  const handlePcm = useCallback((buffer: Parameters<typeof toMonoPcm16kBase64>[0]) => {
    const connection = connectionRef.current;
    if (!connection || !shouldForwardMicrophoneAudio({
      hasConnection: !!connection,
      isListening: statusRef.current === 'listening',
      isMuted: microphoneMutedRef.current,
      tutorAudioPlaying: playerRef.current?.isPlaying ?? false,
    })) return;
    try {
      void connection.sendAudio(toMonoPcm16kBase64(buffer)).catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : 'Audio could not be sent. Check your connection.';
        stopCaptureRef.current();
        setError(message); setStatus('error'); statusRef.current = 'error';
      });
    } catch (reason) {
      stopCaptureRef.current();
      setError(reason instanceof Error ? reason.message : 'Microphone audio could not be prepared.');
      setStatus('error'); statusRef.current = 'error';
    }
  }, []);
  const { stream } = useAudioStream({ channels: 1, sampleRate: 16_000, encoding: 'int16', onBuffer: handlePcm });

  useEffect(() => { void loadSettings().then(setSettings); }, []);
  useEffect(() => {
    if (status !== 'listening' && status !== 'speaking') return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    stopCaptureRef.current = () => stream.stop();
    return () => {
      stream.stop();
      if (connectionRef.current) void connectionRef.current.close();
      if (playerRef.current) void playerRef.current.stop();
    };
  }, [stream]);

  const updateStatus = useCallback((next: ScreenState) => { statusRef.current = next; setStatus(next); }, []);
  const toggleMicrophoneMute = useCallback(async () => {
    if (microphoneToggleInProgressRef.current) return;
    microphoneToggleInProgressRef.current = true;
    setMicrophoneToggleBusy(true);
    const nextMuted = !microphoneMutedRef.current;
    const sessionGeneration = sessionGenerationRef.current;
    try {
      if (nextMuted) {
        // Gate any in-flight callback before releasing the native microphone.
        microphoneMutedRef.current = true;
        setMicrophoneMuted(true);
        stream.stop();
      } else {
        // Re-acquire the native stream before allowing PCM to be forwarded.
        await stream.start();
        if (sessionGenerationRef.current !== sessionGeneration) {
          stream.stop();
          return;
        }
        microphoneMutedRef.current = false;
        setMicrophoneMuted(false);
      }
    } catch {
      if (sessionGenerationRef.current === sessionGeneration) {
        Alert.alert(
          'Microphone unavailable',
          'Parlino could not resume microphone capture. End and restart the conversation to try again.',
        );
      }
    } finally {
      microphoneToggleInProgressRef.current = false;
      setMicrophoneToggleBusy(false);
    }
  }, [stream]);
  const appendTranscript = useCallback((turn: TranscriptTurn) => {
    const previous = turnsRef.current;
    const last = previous[previous.length - 1];
    const next = last?.role === turn.role
      ? [...previous.slice(0, -1), { ...last, text: `${last.text}${turn.text}` }]
      : [...previous, turn];
    turnsRef.current = next;
    setTurns(next);
  }, []);

  async function requestSentenceCoach(sentence: string) {
    if (!settings || coachRequestRef.current) return;
    coachRequestRef.current = true;
    setCoaching(true);
    setCoachError('');
    setCoachResult(null);
    try {
      const result = await coachSentence(sentence, settings, (deviceStatus) => {
        if (deviceStatus === 'UNAVAILABLE' && !onDeviceWarningShownRef.current) {
          onDeviceWarningShownRef.current = true;
          Alert.alert(
            'On-device AI isn’t supported here',
            'This device can’t run the selected Gemini Nano 4 model. Parlino will use Firebase AI Logic in the cloud for this tip instead. Your voice conversation and saved session are unaffected.',
          );
        }
      });
      const latestLearnerSentence = [...turnsRef.current].reverse().find((turn) => turn.role === 'learner')?.text.trim();
      if (latestLearnerSentence === sentence.trim()) {
        setCoachResult({ sentence: sentence.trim(), result });
        if (result.inferenceSource !== 'ON_DEVICE' && !onDeviceWarningShownRef.current) {
          onDeviceWarningShownRef.current = true;
          Alert.alert(
            'Using cloud inference for this tip',
            result.deviceStatus === 'UNAVAILABLE'
              ? 'Gemini Nano 4 isn’t available on this device, so this sentence was sent to Firebase AI Logic in the cloud.'
              : 'On-device inference wasn’t available for this request, so this sentence was sent to Firebase AI Logic in the cloud.',
          );
        }
      }
    } catch (reason) {
      setCoachError(reason instanceof Error ? reason.message : 'The sentence tip is unavailable right now.');
    } finally {
      coachRequestRef.current = false;
      setCoaching(false);
    }
  }

  function startSession() {
    if (!setup.ready) {
      setError(setup.message);
      updateStatus('error');
      return;
    }
    if (!settings) { setError('Your learner settings are still loading. Try again in a moment.'); updateStatus('error'); return; }
    Alert.alert(
      'Use your microphone?',
      'Your voice will be streamed to the live tutor so you can practice speaking. This app does not save raw audio.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Continue', onPress: () => void requestPermissionAndConnect() },
      ],
    );
  }

  async function requestPermissionAndConnect() {
    if (!settings) return;
    sessionGenerationRef.current += 1;
    microphoneMutedRef.current = false;
    setMicrophoneMuted(false);
    setMicrophoneToggleBusy(false);
    setError(''); updateStatus('connecting');
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        updateStatus('permission-denied');
        setError('Microphone access is needed to send your voice to the live tutor. You can allow it in device settings.');
        return;
      }
      const player = new LiveAudioPlayer();
      playerRef.current = player;
      const live = await connectLiveConversation(settings, scenario, (event) => {
        if (event.type === 'state') updateStatus(event.state);
        if (event.type === 'transcript') appendTranscript(event.turn);
        if (event.type === 'audio') void playerRef.current?.play(event.base64, event.sampleRate).catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : 'Tutor audio could not be played.');
          updateStatus('error');
        });
        if (event.type === 'error') { stream.stop(); setError(event.message); updateStatus('error'); }
      }, realTimeCorrections);
      connectionRef.current = live;
      startedAtRef.current = Date.now();
      turnsRef.current = [];
      setTurns([]); setElapsed(0);
      await stream.start();
      updateStatus('listening');
      await live.startTutorTurn();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not connect. Check Firebase setup and your network.');
      updateStatus('error');
      stream.stop();
      if (connectionRef.current) { await connectionRef.current.close().catch(() => undefined); connectionRef.current = null; }
      if (playerRef.current) { await playerRef.current.stop().catch(() => undefined); playerRef.current = null; }
    }
  }

  async function endSession() {
    sessionGenerationRef.current += 1;
    stream.stop();
    await connectionRef.current?.close().catch(() => undefined);
    connectionRef.current = null;
    await playerRef.current?.stop().catch(() => undefined);
    playerRef.current = null;
    microphoneMutedRef.current = false;
    setMicrophoneMuted(false);
    setMicrophoneToggleBusy(false);
    const endedAt = Date.now();
    const startedAt = startedAtRef.current || endedAt;
    const durationSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
    const turnStats = countSessionTurns(turnsRef.current);
    const draft = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scenario,
      startedAt,
      durationSeconds,
      turns: turnsRef.current,
    };
    setSessionDraft(draft);
    try {
      await saveSessionLocally({
        id: draft.id,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        startedAt: draft.startedAt,
        durationSeconds: draft.durationSeconds,
        ...turnStats,
        summary: null,
        ...(settings?.saveTranscripts ? { transcript: draft.turns } : {}),
      });
    } catch {
      // Recap screen will retry local persistence and report if it also fails.
    }
    updateStatus('ended');
    router.replace({ pathname: '/recap', params: { sessionId: draft.id } });
  }

  const active = status === 'listening' || status === 'speaking' || status === 'connecting';
  const conversationConnected = status === 'listening' || status === 'speaking';
  const stateLabel = status === 'connecting' ? 'Connecting securely…' : status === 'speaking' ? 'Your tutor is speaking' : status === 'listening' ? 'Listening' : 'Ready when you are';
  const timeLabel = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const latestLearnerTurn = [...turns].reverse().find((turn) => turn.role === 'learner');
  const canCoachLatestTurn = status === 'listening' && turns[turns.length - 1]?.role === 'tutor' && !!latestLearnerTurn?.text.trim();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close conversation" onPress={() => active ? Alert.alert('End this practice?', 'Your current conversation will close.', [{ text: 'Keep talking', style: 'cancel' }, { text: 'End session', style: 'destructive', onPress: () => void endSession() }]) : router.back()} style={styles.backButton}><Text style={styles.backArrow}>‹</Text></Pressable>
        <View style={{ alignItems: 'center', gap: 3 }}><Text style={styles.headerTitle}>VOICE PRACTICE</Text><Text style={styles.headerScenario}>{scenario.title}</Text></View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sceneCard}><Text style={styles.sceneIcon}>{scenario.icon}</Text><Text style={styles.sceneEyebrow}>TODAY’S MOMENT</Text><Text style={styles.sceneTitle}>{scenario.title}</Text><Text style={styles.sceneSubtitle}>{scenario.objective}</Text></View>

        <View style={styles.voiceCenter}>
          <View style={[styles.orbit, active && styles.orbitActive]}><View style={[styles.orbitInner, status === 'speaking' && styles.orbitSpeaking]}><Text style={styles.voiceGlyph}>{status === 'speaking' ? '◖' : '●'}</Text></View></View>
          <View style={styles.connectionLine}><View style={[styles.connectionDot, active && { backgroundColor: colors.green }]} /><Text style={styles.connectionText}>{microphoneMuted && conversationConnected ? `${stateLabel} · Mic muted` : stateLabel}</Text></View>
        {active || status === 'ended' ? <Text style={styles.timer}>{timeLabel}</Text> : null}
          {status === 'speaking' ? <Text style={styles.levelNote}>Take your time. You can speak naturally.</Text> : null}
        </View>

        {!setup.ready && status !== 'error' ? <View style={styles.setupCard}><Text style={styles.setupTitle}>A quick setup before your first call</Text><Text style={styles.setupText}>Real voice practice needs a Firebase project with AI Logic and App Check enabled. This app won’t imitate a live conversation or play placeholder audio.</Text><Text style={styles.setupFoot}>Open the You tab for setup steps.</Text></View> : null}
        {status === 'permission-denied' ? <View style={styles.errorCard}><Text style={styles.errorTitle}>Microphone permission is off</Text><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void Linking.openSettings()}><Text style={styles.settingsLink}>Open device settings →</Text></Pressable></View> : null}
        {status === 'error' ? <View style={styles.errorCard}><Text style={styles.errorTitle}>We couldn’t connect</Text><Text style={styles.errorText}>{error}</Text>{setup.ready ? <Pressable onPress={() => void startSession()}><Text style={styles.settingsLink}>Try again →</Text></Pressable> : null}</View> : null}

        {settings && !active ? <View style={styles.optionalRow}><View style={{ flex: 1, gap: 3 }}><Text style={styles.optionalTitle}>Gentle corrections in the moment</Text><Text style={styles.optionalText}>{realTimeCorrections
          ? 'On for the next conversation. The tutor may offer occasional gentle corrections.'
          : 'Off for the next conversation. Useful corrections will be saved for your recap.'}</Text></View><Switch value={realTimeCorrections} onValueChange={setRealTimeCorrections} trackColor={{ false: '#D9DFDA', true: '#9BC8AA' }} thumbColor={realTimeCorrections ? colors.deepGreen : '#FFFFFF'} /></View> : null}

        {turns.length > 0 ? <View style={{ gap: 8, width: '100%' }}><Text style={styles.transcriptLabel}>LIVE TRANSCRIPT · NOT SAVED BY DEFAULT</Text>{turns.slice(-5).map((turn, index) => <View key={`${turn.role}-${index}`} style={styles.transcriptRow}><Text style={[styles.speaker, turn.role === 'tutor' && { color: colors.green }]}>{turn.role === 'learner' ? 'YOU' : 'TUTOR'}</Text><Text style={styles.transcriptText}>{turn.text}</Text></View>)}</View> : null}

        {canCoachLatestTurn && latestLearnerTurn ? <View style={styles.coachCard}>
          <View style={styles.coachHeader}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.coachTitle}>Want a gentle correction?</Text>
              <Text style={styles.coachPrivacy}>This sentence and your language settings are sent for feedback. It may use Firebase cloud inference if on-device AI isn’t available.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={coaching}
              onPress={() => void requestSentenceCoach(latestLearnerTurn.text)}
              style={({ pressed }) => [styles.coachButton, (pressed || coaching) && { opacity: 0.7 }]}
            >
              <Text style={styles.coachButtonText}>{coaching ? 'Getting tip…' : coachResult?.sentence === latestLearnerTurn.text.trim() ? 'Try again' : 'Coach this sentence'}</Text>
            </Pressable>
          </View>
          {coaching ? <Text style={styles.coachStatus}>Checking the on-device model, then choosing the best available route…</Text> : null}
          {coachResult?.sentence === latestLearnerTurn.text.trim() ? <>
            <Text style={styles.coachResponse}>{coachResult.result.text}</Text>
            <Text style={styles.coachSource}>{coachResult.result.inferenceSource === 'ON_DEVICE' ? 'ON-DEVICE · GEMINI NANO 4' : coachResult.result.inferenceSource === 'CLOUD_FALLBACK' ? 'CLOUD FALLBACK' : 'CLOUD'}</Text>
            {coachResult.result.inferenceSource !== 'ON_DEVICE' ? <Text style={styles.coachWarning}>
              {coachResult.result.deviceStatus === 'UNAVAILABLE'
                ? 'On-device Gemini Nano 4 isn’t supported on this device. This sentence was sent to Firebase AI Logic cloud.'
                : 'On-device inference wasn’t available for this request. This sentence was sent to Firebase AI Logic cloud.'}
            </Text> : null}
          </> : null}
          {coachError ? <Text accessibilityRole="alert" style={styles.coachError}>{coachError}</Text> : null}
        </View> : null}
      </ScrollView>

      <View style={styles.bottom}>
        {active ? <View style={styles.activeControls}>
          {conversationConnected ? <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Microphone mute"
            accessibilityHint={microphoneMuted ? 'Turn on microphone audio for the tutor.' : 'Stop sending microphone audio to the tutor.'}
            accessibilityState={{ checked: microphoneMuted }}
            disabled={microphoneToggleBusy}
            onPress={toggleMicrophoneMute}
            style={({ pressed }) => [styles.muteButton, microphoneMuted && styles.muteButtonActive, (pressed || microphoneToggleBusy) && { opacity: 0.8 }]}
          >
            <Text style={[styles.muteIcon, microphoneMuted && styles.muteIconActive]}>{microphoneMuted ? '⊘' : '◖'}</Text>
            <Text style={[styles.muteText, microphoneMuted && styles.muteTextActive]}>{microphoneToggleBusy ? 'Updating microphone…' : microphoneMuted ? 'Unmute mic' : 'Mute mic'}</Text>
          </Pressable> : null}
          <Pressable accessibilityRole="button" onPress={() => void endSession()} style={({ pressed }) => [styles.endButton, pressed && { opacity: 0.8 }]}><View style={styles.endIcon}><View style={styles.endSquare} /></View><Text style={styles.endText}>End conversation</Text></Pressable>
        </View> : status === 'ended' ? null : <Pressable accessibilityRole="button" onPress={() => void startSession()} style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.75 }]}><Text style={styles.micIcon}>◖</Text><Text style={styles.startText}>{setup.ready ? 'Allow mic & start' : 'Check voice setup'}</Text></Pressable>}
        <Text style={styles.privacy}>{microphoneMuted ? 'Microphone muted. No voice audio is being sent. ' : 'Your voice is sent only while the tutor is listening. '}Raw audio is not saved. {settings?.saveTranscripts ? 'Transcript saving is on.' : 'Transcript saving is off.'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { height: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#ECEFE9' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.ink, fontSize: 31, lineHeight: 33, marginTop: -3 },
  headerTitle: { color: colors.muted, fontSize: 9, letterSpacing: 1.7, fontWeight: '800' },
  headerScenario: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 19, paddingBottom: 12, alignItems: 'center', gap: 18 },
  sceneCard: { width: '100%', alignItems: 'center', backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: '#EEF0EB', paddingVertical: 17, paddingHorizontal: 20, gap: 6 },
  sceneIcon: { color: colors.deepGreen, backgroundColor: colors.mint, overflow: 'hidden', borderRadius: 14, width: 42, height: 42, textAlign: 'center', textAlignVertical: 'center', fontSize: 22, marginBottom: 2 },
  sceneEyebrow: { color: colors.green, fontSize: 9, letterSpacing: 1.4, fontWeight: '800' },
  sceneTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 22, fontWeight: '700' },
  sceneSubtitle: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  voiceCenter: { alignItems: 'center', gap: 10, paddingVertical: 2 },
  orbit: { width: 146, height: 146, borderRadius: 73, borderWidth: 1, borderColor: '#DDE8DF', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF5EF' },
  orbitActive: { backgroundColor: '#E7F1E8', borderColor: '#BBD7C2' },
  orbitSpeaking: { backgroundColor: '#DDF0E2', transform: [{ scale: 1.04 }] },
  orbitInner: { height: 91, width: 91, borderRadius: 46, backgroundColor: colors.deepGreen, alignItems: 'center', justifyContent: 'center', shadowColor: colors.deepGreen, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 5 },
  voiceGlyph: { color: colors.lime, fontSize: 30 },
  connectionLine: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  connectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ABB4AE' },
  connectionText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  timer: { color: colors.muted, fontVariant: ['tabular-nums'], fontSize: 12 },
  levelNote: { color: colors.muted, fontSize: 11, fontStyle: 'italic' },
  setupCard: { width: '100%', backgroundColor: '#FBF6EE', borderColor: '#E9DDCA', borderWidth: 1, borderRadius: radius.md, padding: 15, gap: 7 },
  setupTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  setupText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  setupFoot: { color: colors.gold, fontSize: 10, fontWeight: '700' },
  errorCard: { width: '100%', backgroundColor: '#F8ECE9', borderColor: '#EBD1CB', borderWidth: 1, borderRadius: radius.md, padding: 15, gap: 6 },
  errorTitle: { color: colors.red, fontSize: 13, fontWeight: '700' },
  errorText: { color: '#80615B', fontSize: 11, lineHeight: 16 },
  settingsLink: { color: colors.deepGreen, fontSize: 11, fontWeight: '700', marginTop: 4 },
  optionalRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, padding: 12, borderRadius: radius.md },
  optionalTitle: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  optionalText: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  transcriptLabel: { color: colors.muted, letterSpacing: 1, fontSize: 8, fontWeight: '800' },
  transcriptRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  speaker: { color: colors.muted, fontSize: 8, fontWeight: '800', width: 43, paddingTop: 2 },
  transcriptText: { color: colors.ink, fontSize: 11, lineHeight: 16, flex: 1 },
  coachCard: { width: '100%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE8DF', borderRadius: radius.md, padding: 13, gap: 9 },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coachTitle: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  coachPrivacy: { color: colors.muted, fontSize: 9, lineHeight: 13 },
  coachButton: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.deepGreen, justifyContent: 'center', alignItems: 'center' },
  coachButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  coachStatus: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  coachResponse: { color: colors.ink, backgroundColor: colors.mint, borderRadius: radius.sm, padding: 10, fontSize: 11, lineHeight: 17 },
  coachSource: { color: colors.green, fontSize: 8, letterSpacing: 1, fontWeight: '800' },
  coachWarning: { color: colors.gold, fontSize: 9, lineHeight: 13 },
  coachError: { color: colors.red, fontSize: 10, lineHeight: 14 },
  bottom: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderColor: '#ECEFE9', gap: 9 },
  startButton: { height: 56, borderRadius: radius.pill, backgroundColor: colors.deepGreen, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 11 },
  micIcon: { color: colors.lime, fontSize: 20 },
  startText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  activeControls: { width: '100%', flexDirection: 'column', gap: 9 },
  muteButton: { width: '100%', height: 50, borderRadius: radius.pill, backgroundColor: colors.mint, borderWidth: 1, borderColor: '#BBD7C2', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  muteButtonActive: { backgroundColor: colors.deepGreen, borderColor: colors.deepGreen },
  muteIcon: { color: colors.deepGreen, fontSize: 19, fontWeight: '700' },
  muteIconActive: { color: '#FFFFFF' },
  muteText: { color: colors.deepGreen, fontSize: 13, fontWeight: '700' },
  muteTextActive: { color: '#FFFFFF' },
  endButton: { width: '100%', height: 54, borderRadius: radius.pill, backgroundColor: '#F1E4E0', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  endIcon: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#C96C5C', alignItems: 'center', justifyContent: 'center' },
  endSquare: { width: 8, height: 8, backgroundColor: '#FFFFFF', borderRadius: 2 },
  endText: { color: '#873C32', fontSize: 14, fontWeight: '700' },
  privacy: { color: colors.muted, fontSize: 9, lineHeight: 14, textAlign: 'center' },
});
