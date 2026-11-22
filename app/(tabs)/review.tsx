import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, Screen } from '@/components/ui';
import { isDue } from '@/domain/reviewSchedule';
import type { SavedPhrase, SessionRecord } from '@/domain/types';
import { loadSavedPhrases, loadSessions, markPhraseReviewed } from '@/services/progress';
import { colors, radius } from '@/theme';

export default function ReviewScreen() {
  const [phrases, setPhrases] = useState<SavedPhrase[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [now, setNow] = useState(0);

  const refresh = useCallback(() => {
    let active = true;
    setLoading(true);
    void Promise.all([loadSavedPhrases(), loadSessions()]).then(([saved, history]) => {
      if (!active) return;
      setNow(Date.now()); setPhrases(saved.sort((a, b) => a.dueAt - b.dueAt)); setSessions(history); setLoading(false);
    }).catch(() => setLoading(false));
    return () => { active = false; };
  }, []);
  useFocusEffect(refresh);

  const due = phrases.filter((phrase) => isDue(phrase.dueAt, now) && !reviewed.includes(phrase.id));
  const later = phrases.filter((phrase) => !isDue(phrase.dueAt, now));
  async function markDone(phrase: SavedPhrase) {
    try {
      const updated = await markPhraseReviewed(phrase);
      setPhrases((current) => current.map((item) => item.id === phrase.id ? updated : item));
      setReviewed((current) => [...current, phrase.id]);
    } catch { Alert.alert('Could not save review', 'Try again when you have a connection.'); }
  }

  return (
    <Screen>
      <View style={styles.top}><View style={{ gap: 9 }}><Eyebrow>A gentle nudge, not a test</Eyebrow><Text style={styles.title}>Your phrase{ '\n' }garden.</Text></View><View style={styles.topMark}><Text style={{ fontSize: 26 }}>✳</Text></View></View>
      <Text style={styles.subtitle}>Come back to the words that felt useful. A little recall helps them stick.</Text>
      <View style={styles.reviewSummary}><Text style={styles.summaryCount}>{loading ? '—' : due.length}</Text><View style={{ gap: 3, flex: 1 }}><Text style={styles.summaryTitle}>{due.length === 1 ? 'phrase ready to revisit' : 'phrases ready to revisit'}</Text><Text style={styles.summarySubtitle}>No score, no streak—just a little practice.</Text></View><Text style={{ fontSize: 19, color: colors.deepGreen }}>↻</Text></View>

      {loading ? <Text style={styles.emptyText}>Loading your saved phrases…</Text> : null}
      {!loading && phrases.length === 0 ? <Card style={styles.emptyCard}><Text style={styles.emptyIcon}>✳</Text><Text style={styles.emptyTitle}>Your saved phrases will live here.</Text><Text style={styles.emptyText}>After a conversation, save anything you want to remember. We’ll bring it back for a quick review.</Text><Pressable onPress={() => router.push('/(tabs)')}><Text style={styles.homeLink}>Explore a conversation →</Text></Pressable></Card> : null}

      {due.length ? <View style={{ gap: 12 }}><Text style={styles.sectionTitle}>Ready when you are</Text>{due.map((phrase) => <PhraseCard key={phrase.id} phrase={phrase} now={now} onDone={() => void markDone(phrase)} />)}</View> : null}
      {later.length ? <View style={{ gap: 12 }}><Text style={styles.sectionTitle}>Coming up</Text>{later.slice(0, 8).map((phrase) => <PhraseCard key={phrase.id} phrase={phrase} now={now} compact />)}</View> : null}
      {sessions.length ? <View style={{ gap: 11 }}><Text style={styles.sectionTitle}>Recent reflections</Text>{sessions.slice(0, 4).map((session) => <Card key={session.id} style={styles.reflection}><View style={styles.reflectionHead}><Text style={styles.reflectionTitle}>{session.scenarioTitle}</Text><Text style={styles.reflectionDate}>{new Date(session.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text></View>{session.summary ? <>{session.summary.corrections.slice(0, 1).map((correction, index) => <Text key={index} style={styles.reflectionText}>{correction.improved} · {correction.explanation}</Text>)}{session.summary.corrections.length === 0 ? <Text style={styles.reflectionText}>{session.summary.positiveNote}</Text> : null}</> : <Text style={styles.reflectionText}>{session.learnerTurnCount ?? 0} learner turns · Recap unavailable</Text>}</Card>)}</View> : null}
      <Text style={styles.scheduleNote}>Review reminders use a simple 1, 3, 7, 14 and 30 day rhythm after each review. It’s a practical prompt, not a precise learning-science claim.</Text>
    </Screen>
  );
}

function PhraseCard({ phrase, onDone, compact = false, now }: { phrase: SavedPhrase; onDone?: () => void; compact?: boolean; now: number }) {
  return <Card style={[styles.phraseCard, compact && styles.phraseCompact]}>
    <View style={styles.phraseTop}><Text style={styles.phraseLabel}>SAY IT AGAIN</Text>{compact ? <Text style={styles.dueDate}>In {Math.max(1, Math.ceil((phrase.dueAt - now) / 86_400_000))} days</Text> : <Text style={styles.reviewIndex}>REVIEW {phrase.reviewCount + 1}</Text>}</View>
    <Text style={styles.phrase}>{phrase.phrase}</Text><Text style={styles.translation}>{phrase.translation}</Text>
    {phrase.note ? <Text style={styles.phraseNote}>{phrase.note}</Text> : null}
    {onDone ? <Pressable onPress={onDone} style={({ pressed }) => [styles.doneButton, pressed && { opacity: 0.75 }]}><Text style={styles.doneText}>I remembered it <Text style={{ fontSize: 16 }}>→</Text></Text></Pressable> : null}
  </Card>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.ink, fontFamily: 'Georgia', fontSize: 37, lineHeight: 40, letterSpacing: -1 },
  topMark: { height: 58, width: 58, borderRadius: 29, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, maxWidth: 320, marginTop: -11 },
  reviewSummary: { backgroundColor: colors.mint, borderRadius: radius.lg, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryCount: { color: colors.deepGreen, fontSize: 35, fontFamily: 'Georgia', fontWeight: '700' },
  summaryTitle: { color: colors.deepGreen, fontSize: 13, fontWeight: '700' },
  summarySubtitle: { color: '#648174', fontSize: 11 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: 29, paddingHorizontal: 25, gap: 10 },
  emptyIcon: { fontSize: 28, color: colors.green },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  homeLink: { color: colors.green, fontSize: 13, fontWeight: '700', marginTop: 4 },
  phraseCard: { padding: 18, gap: 8 },
  phraseCompact: { paddingVertical: 14 },
  phraseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  phraseLabel: { color: colors.green, letterSpacing: 1.2, fontSize: 9, fontWeight: '800' },
  reviewIndex: { color: '#A0AAA3', letterSpacing: 0.8, fontSize: 8, fontWeight: '700' },
  dueDate: { color: colors.muted, fontSize: 10 },
  phrase: { color: colors.ink, fontFamily: 'Georgia', fontSize: 21, fontWeight: '700', marginTop: 1 },
  translation: { color: colors.muted, fontSize: 13 },
  phraseNote: { color: '#6D7B73', fontSize: 11, fontStyle: 'italic' },
  doneButton: { alignSelf: 'flex-start', backgroundColor: colors.deepGreen, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 15, marginTop: 5 },
  doneText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  reflection: { padding: 15, gap: 7 },
  reflectionHead: { flexDirection: 'row', justifyContent: 'space-between' },
  reflectionTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  reflectionDate: { color: colors.muted, fontSize: 10 },
  reflectionText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  scheduleNote: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: -2 },
});
