import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, PrimaryButton, Screen } from '@/components/ui';
import { nextReviewAt } from '@/domain/reviewSchedule';
import type { LearnerSettings, RecapPhrase, SavedPhrase, SessionRecap } from '@/domain/types';
import { createSessionRecap } from '@/services/recapService';
import { loadSettings, savePhrase, saveSession } from '@/services/progress';
import { clearSessionDraft, getSessionDraft, type SessionDraft } from '@/services/sessionDraft';
import { colors, radius } from '@/theme';

type LoadState = 'loading' | 'ready' | 'error' | 'empty';

function makeSavedPhrase(phrase: RecapPhrase, sessionId: string, index: number): SavedPhrase {
  const createdAt = Date.now();
  return { ...phrase, id: `${sessionId}-${index}`, createdAt, dueAt: nextReviewAt(0, createdAt), reviewCount: 0, sourceSessionId: sessionId };
}

export default function RecapScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [draft] = useState<SessionDraft | null>(() => getSessionDraft());
  const [settings, setSettings] = useState<LearnerSettings | null>(null);
  const [recap, setRecap] = useState<SessionRecap | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [savedPhraseIds, setSavedPhraseIds] = useState<string[]>([]);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [syncWarning, setSyncWarning] = useState('');

  const generate = useCallback(async (source: SessionDraft, learnerSettings: LearnerSettings) => {
    setLoadState('loading'); setError('');
    try {
      const result = await createSessionRecap(source.turns, learnerSettings);
      setRecap(result);
      setLoadState('ready');
      const record = {
        id: source.id,
        scenarioId: source.scenario.id,
        scenarioTitle: source.scenario.title,
        startedAt: source.startedAt,
        durationSeconds: source.durationSeconds,
        summary: result,
        ...(learnerSettings.saveTranscripts ? { transcript: source.turns } : {}),
      };
      try {
        await saveSession(record);
        setSessionSaved(true);
      } catch {
        setSyncWarning('This recap is saved on this device, but could not sync to Firebase yet.');
      }
      clearSessionDraft();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We couldn’t create your recap.');
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void loadSettings().then((learnerSettings) => {
      setSettings(learnerSettings);
      if (!draft || (sessionId && draft.id !== sessionId)) { setLoadState('empty'); return; }
      void generate(draft, learnerSettings);
    }).catch(() => setLoadState('empty'));
  }, [draft, generate, sessionId]);

  async function saveOnePhrase(phrase: RecapPhrase, index: number) {
    if (!draft) return;
    const id = `${draft.id}-${index}`;
    const saved = makeSavedPhrase(phrase, draft.id, index);
    try {
      await savePhrase(saved);
      setSavedPhraseIds((current) => [...current, id]);
    } catch {
      Alert.alert('Phrase sync paused', 'If local storage was available, this phrase is on this device. It can sync when Firebase is reachable.');
    }
  }

  const title = loadState === 'ready' ? 'Look how far you got.' : 'A moment to reflect.';
  return (
    <Screen>
      <View style={styles.topLine}><Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable><Text style={styles.topLabel}>SESSION REFLECTION</Text><View style={{ width: 38 }} /></View>
      <View style={{ gap: 8 }}><Eyebrow>{draft?.scenario.title ?? 'A little practice'}</Eyebrow><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>A few things worth carrying into your next conversation.</Text></View>

      {loadState === 'loading' ? <Card style={styles.loadingCard}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Gathering a few helpful notes…</Text></Card> : null}
      {loadState === 'empty' ? <Card style={styles.emptyCard}><Text style={styles.emptyTitle}>This session recap isn’t available.</Text><Text style={styles.subtitle}>Recaps are made from the live conversation transcript. No practice session or transcript was found on this screen.</Text><Pressable onPress={() => router.replace('/(tabs)')}><Text style={styles.link}>Back to practice →</Text></Pressable></Card> : null}
      {loadState === 'error' ? <Card style={styles.errorCard}><Text style={styles.errorTitle}>Your session ended, but the recap is unavailable.</Text><Text style={styles.errorText}>{error}</Text>{draft && settings ? <Pressable onPress={() => void generate(draft, settings)}><Text style={styles.link}>Try recap again →</Text></Pressable> : null}<Text style={styles.errorFoot}>The conversation was not saved. Transcript saving is {settings?.saveTranscripts ? 'on' : 'off'}; the temporary session notes stay in memory only while this screen remains open.</Text></Card> : null}

      {loadState === 'ready' && recap ? <>
        {recap.positiveNote ? <View style={styles.positive}><View style={styles.positiveIcon}><Text style={{ color: colors.deepGreen, fontSize: 18 }}>✳</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.positiveLabel}>A GOOD THING TO KEEP</Text><Text style={styles.positiveText}>{recap.positiveNote}</Text></View></View> : null}

        {recap.corrections.length ? <View style={{ gap: 12 }}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>A gentler way to say it</Text><Text style={styles.sectionCount}>{recap.corrections.length} NOTES</Text></View>{recap.corrections.map((correction, index) => <Card key={`${correction.original}-${index}`} style={styles.correctionCard}><Text style={styles.original}>“{correction.original}”</Text><Text style={styles.improved}>“{correction.improved}”</Text><Text style={styles.explanation}>{correction.explanation}</Text></Card>)}</View> : null}

        {recap.phrases.length ? <View style={{ gap: 12 }}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Words to keep close</Text><Text style={styles.sectionCount}>{recap.phrases.length} PHRASES</Text></View>{recap.phrases.map((phrase, index) => {
          const phraseId = `${draft?.id}-${index}`;
          const saved = savedPhraseIds.includes(phraseId);
          return <Card key={`${phrase.phrase}-${index}`} style={styles.phraseCard}><View style={{ flex: 1, gap: 4 }}><Text style={styles.phrase}>{phrase.phrase}</Text><Text style={styles.translation}>{phrase.translation}</Text>{phrase.note ? <Text style={styles.explanation}>{phrase.note}</Text> : null}</View><Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Phrase saved' : 'Save phrase'} disabled={saved} onPress={() => void saveOnePhrase(phrase, index)} style={[styles.saveButton, saved && styles.savedButton]}><Text style={[styles.saveIcon, saved && { color: colors.deepGreen }]}>{saved ? '✓' : '+'}</Text></Pressable></Card>;
        })}</View> : null}
        <Text style={styles.storageNote}>{syncWarning || (sessionSaved ? 'Your recap is saved to your practice history. ' : '')}{settings?.saveTranscripts ? 'The transcript was saved because you opted in.' : 'Only this recap is saved; the transcript was not kept.'}</Text>
        <PrimaryButton title="Back to my practice" onPress={() => router.replace('/(tabs)')} trailing={<Text style={{ color: '#fff', fontSize: 18 }}>→</Text>} />
      </> : null}
      {loadState === 'error' ? <PrimaryButton title="Back to my practice" onPress={() => router.replace('/(tabs)')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.ink, fontSize: 26, lineHeight: 30, marginTop: -3 },
  topLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1.6, fontWeight: '800' },
  title: { color: colors.ink, fontFamily: 'Georgia', fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  loadingCard: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  loadingText: { color: colors.muted, fontSize: 12 },
  emptyCard: { gap: 12, padding: 20 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  link: { color: colors.green, fontSize: 12, fontWeight: '700', marginTop: 6 },
  errorCard: { backgroundColor: '#F9EFEC', borderColor: '#EBD1CB', gap: 9 },
  errorTitle: { color: colors.red, fontSize: 15, fontWeight: '700' },
  errorText: { color: '#80615B', fontSize: 12, lineHeight: 18 },
  errorFoot: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  positive: { backgroundColor: colors.mint, borderRadius: radius.lg, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  positiveIcon: { width: 36, height: 36, backgroundColor: '#D5E9DA', borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  positiveLabel: { color: colors.green, fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  positiveText: { color: colors.deepGreen, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  sectionCount: { color: '#98A39B', fontSize: 8, letterSpacing: 1, fontWeight: '800' },
  correctionCard: { padding: 16, gap: 7 },
  original: { color: '#909A93', fontFamily: 'Georgia', fontSize: 15, textDecorationLine: 'line-through' },
  improved: { color: colors.deepGreen, fontFamily: 'Georgia', fontSize: 19, fontWeight: '700' },
  explanation: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  phraseCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  phrase: { color: colors.ink, fontFamily: 'Georgia', fontSize: 17, fontWeight: '700' },
  translation: { color: colors.muted, fontSize: 11 },
  saveButton: { width: 35, height: 35, borderRadius: 18, borderWidth: 1, borderColor: '#D8E6DA', backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  savedButton: { backgroundColor: '#D5E9DA' },
  saveIcon: { color: colors.green, fontSize: 22, lineHeight: 25 },
  storageNote: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: -5 },
});
