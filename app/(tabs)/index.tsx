import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, Screen } from '@/components/ui';
import { SCENARIOS, type LearnerSettings, type SavedPhrase, type SessionRecord } from '@/domain/types';
import { loadSavedPhrases, loadSessions, loadSettings } from '@/services/progress';
import { getFirebaseSetup } from '@/services/firebase';
import { colors, radius } from '@/theme';

export default function HomeScreen() {
  const [settings, setSettings] = useState<LearnerSettings | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [phrases, setPhrases] = useState<SavedPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const setup = getFirebaseSetup();

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    void Promise.all([loadSettings(), loadSessions(), loadSavedPhrases()]).then(([profile, history, saved]) => {
      if (!active) return;
      setSettings(profile); setSessions(history); setPhrases(saved); setLoading(false);
    }).catch(() => setLoading(false));
    return () => { active = false; };
  }, []));

  const lastSession = sessions[0];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.brandRow}><View style={styles.brandMark}><Image source={require('../../images/parlino-app-icon.png')} style={styles.brandImage} /></View><Text style={styles.brand}>PARLINO</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/(tabs)/settings')} style={styles.avatar}><Text style={styles.avatarText}>↗</Text></Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Eyebrow>Your AI partner for speaking a new language</Eyebrow>
        <Text style={styles.title}>Good to see you.</Text>
        <Text style={styles.subtitle}>{settings ? `Ready to practice ${settings.targetLanguage}? Keep it light. Keep it yours.` : 'A few minutes of conversation can make a real difference.'}</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}><Text style={styles.heroBadgeDot}>●</Text><Text style={styles.heroBadgeText}>YOUR NEXT CONVERSATION</Text></View>
          <Text style={styles.heroMark}>“</Text>
        </View>
        <Text style={styles.heroTitle}>Find your words{ '\n' }in real moments.</Text>
        <Text style={styles.heroCaption}>Short, friendly practice that meets you where you are.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/conversation', params: { scenarioId: 'food' } })} style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.84 }]}>
          <Text style={styles.startIcon}>◖</Text><Text style={styles.startText}>Start a conversation</Text><Text style={styles.arrow}>→</Text>
        </Pressable>
        <Text style={styles.heroFoot}>ABOUT 5 MIN · VOICE PRACTICE</Text>
      </View>

      {!setup.ready ? <Pressable onPress={() => router.push('/(tabs)/settings')} style={styles.setupNote}>
        <View style={styles.setupIcon}><Text style={{ color: colors.gold, fontSize: 14 }}>i</Text></View>
        <View style={{ flex: 1, gap: 3 }}><Text style={styles.setupTitle}>Voice setup needed</Text><Text style={styles.setupCopy}>Connect a Firebase project to start real AI conversations.</Text></View>
        <Text style={styles.setupArrow}>›</Text>
      </Pressable> : null}

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Pick a moment</Text><Text style={styles.sectionHint}>Everyday situations, at your pace</Text></View>
      <View style={styles.scenarios}>
        {SCENARIOS.map((scenario, index) => <Pressable key={scenario.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/conversation', params: { scenarioId: scenario.id } })} style={({ pressed }) => [styles.scenarioCard, pressed && { opacity: 0.8 }, index === 0 && styles.scenarioFirst]}>
          <View style={[styles.scenarioIcon, index === 0 && { backgroundColor: colors.peach }, index === 1 && { backgroundColor: '#E7EDF6' }, index === 2 && { backgroundColor: '#F1EAF5' }, index === 3 && { backgroundColor: '#EBEEE4' }]}><Text style={styles.scenarioEmoji}>{scenario.icon}</Text></View>
          <View style={{ flex: 1, gap: 4 }}><Text style={styles.scenarioTitle}>{scenario.title}</Text><Text style={styles.scenarioSub}>{scenario.subtitle}</Text></View>
          <Text style={styles.scenarioArrow}>↗</Text>
        </Pressable>)}
      </View>

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Your progress</Text><Pressable onPress={() => router.push('/(tabs)/review')}><Text style={styles.textLink}>See review →</Text></Pressable></View>
      <View style={styles.progressRow}>
        <Card style={styles.progressCard}><Text style={styles.metric}>{loading ? '—' : sessions.length}</Text><Text style={styles.metricLabel}>conversations</Text></Card>
        <Card style={styles.progressCard}><Text style={styles.metric}>{loading ? '—' : phrases.length}</Text><Text style={styles.metricLabel}>saved phrases</Text></Card>
        <Card style={styles.progressCard}><Text style={styles.metric}>{loading ? '—' : `${Math.round(sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 60)}m`}</Text><Text style={styles.metricLabel}>speaking time</Text></Card>
      </View>
      {phrases[0] ? <View style={{ gap: 10 }}>
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>A phrase to keep close</Text><Pressable onPress={() => router.push('/(tabs)/review')}><Text style={styles.textLink}>Review all →</Text></Pressable></View>
        <Card style={styles.savedPhraseCard}><Text style={styles.savedPhraseEyebrow}>SAVED FROM A CONVERSATION</Text><Text style={styles.savedPhrase}>{phrases[0].phrase}</Text><Text style={styles.savedTranslation}>{phrases[0].translation}</Text></Card>
      </View> : null}
      {lastSession ? <View style={styles.lastPractice}><View style={styles.lastDot} /><Text numberOfLines={1} style={styles.lastText}>Last time: {lastSession.scenarioTitle}</Text><Text style={styles.lastDate}>{new Date(lastSession.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text></View> : null}
      {!loading && sessions.length === 0 ? <Text style={styles.emptyHint}>Your first conversation will show up here. No pressure—just start when you’re ready.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { height: 29, width: 29, borderRadius: 10, backgroundColor: colors.canvas, overflow: 'hidden' },
  brandImage: { height: 29, width: 29 },
  brand: { color: colors.ink, fontWeight: '800', fontSize: 10, letterSpacing: 1.5 },
  avatar: { height: 38, width: 38, borderRadius: 19, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.deepGreen, fontSize: 18 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, maxWidth: 340 },
  hero: { backgroundColor: colors.deepGreen, borderRadius: 28, padding: 22, paddingTop: 20, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroBadge: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: '#FFFFFF1A', borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 11 },
  heroBadgeDot: { color: colors.lime, fontSize: 8 },
  heroBadgeText: { color: '#E5F1E9', fontSize: 9, letterSpacing: 1.25, fontWeight: '800' },
  heroMark: { color: '#FFFFFF28', fontFamily: 'Georgia', fontSize: 76, height: 55, lineHeight: 82, fontWeight: '700' },
  heroTitle: { color: '#FFFFFF', fontFamily: 'Georgia', fontSize: 32, lineHeight: 35, letterSpacing: -0.5, marginTop: -4 },
  heroCaption: { color: '#D4E5DA', fontSize: 13, lineHeight: 20, maxWidth: 260, marginTop: 10, marginBottom: 18 },
  startButton: { minHeight: 55, borderRadius: radius.pill, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17 },
  startIcon: { color: colors.deepGreen, fontSize: 19, marginRight: 11 },
  startText: { color: colors.deepGreen, fontSize: 15, fontWeight: '800', flex: 1 },
  arrow: { color: colors.deepGreen, fontSize: 20, fontWeight: '600' },
  heroFoot: { color: '#BBD1C3', fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textAlign: 'center', marginTop: 13 },
  setupNote: { borderWidth: 1, borderColor: '#E8DCCB', backgroundColor: '#FBF6EE', borderRadius: radius.md, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  setupIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5E8D5', alignItems: 'center', justifyContent: 'center' },
  setupTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  setupCopy: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  setupArrow: { fontSize: 22, color: colors.gold, paddingLeft: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: -10 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  sectionHint: { color: colors.muted, fontSize: 11 },
  textLink: { color: colors.green, fontSize: 12, fontWeight: '700' },
  scenarios: { gap: 9 },
  scenarioCard: { backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: '#EEF0EB', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  scenarioFirst: { borderColor: '#D9E9DF' },
  scenarioIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#EBF1EA', alignItems: 'center', justifyContent: 'center' },
  scenarioEmoji: { color: colors.deepGreen, fontSize: 20 },
  scenarioTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  scenarioSub: { color: colors.muted, fontSize: 11 },
  scenarioArrow: { color: '#A2B0A7', fontSize: 18, paddingHorizontal: 3 },
  progressRow: { flexDirection: 'row', gap: 8 },
  progressCard: { flex: 1, padding: 12, paddingVertical: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center', minHeight: 77 },
  metric: { color: colors.deepGreen, fontSize: 22, fontWeight: '700' },
  metricLabel: { color: colors.muted, fontSize: 9, marginTop: 3, textAlign: 'center' },
  savedPhraseCard: { padding: 16, gap: 6, borderColor: '#D9E9DF' },
  savedPhraseEyebrow: { color: colors.green, fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  savedPhrase: { color: colors.ink, fontFamily: 'Georgia', fontSize: 19, fontWeight: '700' },
  savedTranslation: { color: colors.muted, fontSize: 12 },
  lastPractice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -7 },
  lastDot: { height: 7, width: 7, borderRadius: 4, backgroundColor: colors.green },
  lastText: { color: colors.muted, fontSize: 11, flex: 1 },
  lastDate: { color: colors.muted, fontSize: 10 },
  emptyHint: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: -10 },
});
