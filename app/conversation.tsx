import { router, useLocalSearchParams } from 'expo-router';
import { requestRecordingPermissionsAsync, useAudioStream } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SCENARIOS, type LearnerSettings, type TranscriptTurn } from '@/domain/types';
import { LiveAudioPlayer, toMonoPcm16kBase64 } from '@/services/audio';
import { connectLiveConversation, type LiveConversation, type LiveState } from '@/services/aiSession';
import { loadSettings } from '@/services/progress';
import { getFirebaseSetup } from '@/services/firebase';
import { setSessionDraft } from '@/services/sessionDraft';
import { colors, radius } from '@/theme';

type ScreenState = LiveState | 'idle' | 'permission-denied';

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ scenarioId?: string }>();
  const scenario = SCENARIOS.find((item) => item.id === params.scenarioId) ?? SCENARIOS[0];
  const setup = getFirebaseSetup();
  const [settings, setSettings] = useState<LearnerSettings | null>(null);
  const [status, setStatus] = useState<ScreenState>('idle');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [realTimeCorrections, setRealTimeCorrections] = useState(false);
  const connectionRef = useRef<LiveConversation | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const stopCaptureRef = useRef<() => void>(() => undefined);
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const startedAtRef = useRef(0);
  const statusRef = useRef<ScreenState>('idle');

  const handlePcm = useCallback((buffer: Parameters<typeof toMonoPcm16kBase64>[0]) => {
    const connection = connectionRef.current;
    if (
      !connection ||
      statusRef.current !== 'listening' ||
      playerRef.current?.isPlaying
    ) return;
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
  const appendTranscript = useCallback((turn: TranscriptTurn) => {
    const previous = turnsRef.current;
    const last = previous[previous.length - 1];
    const next = last?.role === turn.role
      ? [...previous.slice(0, -1), { ...last, text: `${last.text}${turn.text}` }]
      : [...previous, turn];
    turnsRef.current = next;
    setTurns(next);
  }, []);

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
    stream.stop();
    await connectionRef.current?.close().catch(() => undefined);
    connectionRef.current = null;
    await playerRef.current?.stop().catch(() => undefined);
    playerRef.current = null;
    const draft = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scenario,
      startedAt: startedAtRef.current || Date.now(),
      durationSeconds: elapsed,
      turns: turnsRef.current,
    };
    setSessionDraft(draft);
    updateStatus('ended');
    router.replace({ pathname: '/recap', params: { sessionId: draft.id } });
  }

  const active = status === 'listening' || status === 'speaking' || status === 'connecting';
  const stateLabel = status === 'connecting' ? 'Connecting securely…' : status === 'speaking' ? 'Your tutor is speaking' : status === 'listening' ? 'Listening' : 'Ready when you are';
  const timeLabel = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

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
          <View style={styles.connectionLine}><View style={[styles.connectionDot, active && { backgroundColor: colors.green }]} /><Text style={styles.connectionText}>{stateLabel}</Text></View>
        {active || status === 'ended' ? <Text style={styles.timer}>{timeLabel}</Text> : null}
          {status === 'speaking' ? <Text style={styles.levelNote}>Take your time. You can speak naturally.</Text> : null}
        </View>

        {!setup.ready && status !== 'error' ? <View style={styles.setupCard}><Text style={styles.setupTitle}>A quick setup before your first call</Text><Text style={styles.setupText}>Real voice practice needs a Firebase project with AI Logic and App Check enabled. This app won’t imitate a live conversation or play placeholder audio.</Text><Text style={styles.setupFoot}>Open the You tab for setup steps.</Text></View> : null}
        {status === 'permission-denied' ? <View style={styles.errorCard}><Text style={styles.errorTitle}>Microphone permission is off</Text><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void Linking.openSettings()}><Text style={styles.settingsLink}>Open device settings →</Text></Pressable></View> : null}
        {status === 'error' ? <View style={styles.errorCard}><Text style={styles.errorTitle}>We couldn’t connect</Text><Text style={styles.errorText}>{error}</Text>{setup.ready ? <Pressable onPress={() => void startSession()}><Text style={styles.settingsLink}>Try again →</Text></Pressable> : null}</View> : null}

        {settings ? <View style={styles.optionalRow}><View style={{ flex: 1, gap: 3 }}><Text style={styles.optionalTitle}>Gentle corrections in the moment</Text><Text style={styles.optionalText}>{active
          ? `This session: ${realTimeCorrections ? 'on' : 'off'}. End it and start a new conversation to change.`
          : realTimeCorrections
            ? 'On for your next conversation. The tutor may offer occasional gentle corrections.'
            : 'Off for your next conversation. Useful corrections will be saved for your recap.'}</Text></View><Switch value={realTimeCorrections} onValueChange={setRealTimeCorrections} disabled={active} trackColor={{ false: '#D9DFDA', true: '#9BC8AA' }} thumbColor={realTimeCorrections ? colors.deepGreen : '#FFFFFF'} /></View> : null}

        {turns.length > 0 ? <View style={{ gap: 8, width: '100%' }}><Text style={styles.transcriptLabel}>LIVE TRANSCRIPT · NOT SAVED BY DEFAULT</Text>{turns.slice(-5).map((turn, index) => <View key={`${turn.role}-${index}`} style={styles.transcriptRow}><Text style={[styles.speaker, turn.role === 'tutor' && { color: colors.green }]}>{turn.role === 'learner' ? 'YOU' : 'TUTOR'}</Text><Text style={styles.transcriptText}>{turn.text}</Text></View>)}</View> : null}
      </ScrollView>

      <View style={styles.bottom}>
        {active ? <Pressable accessibilityRole="button" onPress={() => void endSession()} style={({ pressed }) => [styles.endButton, pressed && { opacity: 0.8 }]}><View style={styles.endIcon}><View style={styles.endSquare} /></View><Text style={styles.endText}>End conversation</Text></Pressable> : status === 'ended' ? null : <Pressable accessibilityRole="button" onPress={() => void startSession()} style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.75 }]}><Text style={styles.micIcon}>◖</Text><Text style={styles.startText}>{setup.ready ? 'Allow mic & start' : 'Check voice setup'}</Text></Pressable>}
        <Text style={styles.privacy}>Your voice is sent only while the tutor is listening. Raw audio is not saved. {settings?.saveTranscripts ? 'Transcript saving is on.' : 'Transcript saving is off.'}</Text>
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
  bottom: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderColor: '#ECEFE9', gap: 9 },
  startButton: { height: 56, borderRadius: radius.pill, backgroundColor: colors.deepGreen, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 11 },
  micIcon: { color: colors.lime, fontSize: 20 },
  startText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  endButton: { height: 54, borderRadius: radius.pill, backgroundColor: '#F1E4E0', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 11 },
  endIcon: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#C96C5C', alignItems: 'center', justifyContent: 'center' },
  endSquare: { width: 8, height: 8, backgroundColor: '#FFFFFF', borderRadius: 2 },
  endText: { color: '#873C32', fontSize: 14, fontWeight: '700' },
  privacy: { color: colors.muted, fontSize: 9, lineHeight: 14, textAlign: 'center' },
});
