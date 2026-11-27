import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Card, Eyebrow, Screen } from '@/components/ui';
import { DEFAULT_SETTINGS, type LearnerSettings } from '@/domain/types';
import { describeFirebaseSyncError } from '@/domain/firebaseErrors';
import { getFirebaseSetup } from '@/services/firebase';
import { loadSettings, saveSettings } from '@/services/progress';
import { colors, radius } from '@/theme';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<LearnerSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const setup = getFirebaseSetup();
  useFocusEffect(useCallback(() => {
    let active = true;
    void loadSettings().then((value) => { if (active) setSettings(value); });
    return () => { active = false; };
  }, []));

  async function toggleTranscript(value: boolean) {
    const updated = { ...settings, saveTranscripts: value };
    setSettings(updated); setSaving(true);
    try {
      const result = await saveSettings(updated);
      if (!result.synced && getFirebaseSetup().ready) {
        Alert.alert('Saved on this device', `Firebase couldn't sync this setting. ${describeFirebaseSyncError(result.error)}`);
      }
    } catch (error) {
      console.warn('[Settings] Could not save the transcript setting.', error);
      Alert.alert('Could not save this setting', 'Parlino could not save this setting on this device.');
    } finally { setSaving(false); }
  }

  return (
    <Screen>
      <View style={{ gap: 9 }}><Eyebrow>Your practice, your choice</Eyebrow><Text style={styles.title}>A space that{ '\n' }works for you.</Text></View>
      <Card style={styles.profileCard}>
        <View style={styles.profileMark}><Text style={{ color: colors.deepGreen, fontSize: 22 }}>◌</Text></View>
        <View style={{ flex: 1, gap: 3 }}><Text style={styles.profileTitle}>{settings.targetLanguage} practice</Text><Text style={styles.profileSub}>{settings.proficiency} · native language: {settings.nativeLanguage}</Text></View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/onboarding')}><Text style={styles.edit}>Edit</Text></Pressable>
      </Card>

      <View style={{ gap: 11 }}><Text style={styles.sectionTitle}>Privacy</Text>
        <Card style={styles.settingCard}>
          <View style={{ flex: 1, gap: 5 }}><Text style={styles.settingTitle}>Save session transcripts</Text><Text style={styles.settingDescription}>Off by default. Turn on to keep what you and your tutor said with your session notes.</Text></View>
          <Switch value={settings.saveTranscripts} onValueChange={(value) => void toggleTranscript(value)} disabled={saving} trackColor={{ false: '#D9DFDA', true: '#9BC8AA' }} thumbColor={settings.saveTranscripts ? colors.deepGreen : '#FFFFFF'} />
        </Card>
        <Text style={styles.note}>Voice audio is streamed to Firebase AI Logic for the conversation. It is not stored by this app. Recaps and saved phrases are stored in your account when Firebase is connected.</Text>
      </View>

      <View style={{ gap: 11 }}><Text style={styles.sectionTitle}>Voice practice setup</Text>
        <Card style={styles.setupCard}>
          <View style={styles.setupStatus}><View style={[styles.statusDot, { backgroundColor: setup.ready ? colors.green : colors.gold }]} /><Text style={styles.setupStatusText}>{setup.ready ? 'Firebase configured' : 'Firebase not configured'}</Text></View>
          <Text style={styles.setupCopy}>{setup.ready ? 'Native config detected. Sync also needs Anonymous Auth, Firestore and AI Logic enabled in the Firebase console.' : 'To start a real Gemini Live voice session, add the Firebase native files and rebuild this app. No demo or simulated responses are used.'}</Text>
          <View style={styles.setupDivider} />
          <Text style={styles.setupStep}>1  Add google-services.json to the project root</Text>
          <Text style={styles.setupStep}>2  Enable Anonymous Auth, Firestore, AI Logic and App Check</Text>
          <Text style={styles.setupStep}>3  Rebuild with an Expo development build</Text>
          <Pressable onPress={() => Alert.alert('Setup guide', 'See the Firebase and development-build setup steps in the project README.')} style={styles.guideLink}><Text style={styles.guideText}>View setup checklist <Text style={{ fontSize: 15 }}>↗</Text></Text></Pressable>
        </Card>
      </View>

      <Text style={styles.footer}>Parlino · A small space to keep getting better.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontFamily: 'Georgia', fontSize: 36, lineHeight: 39, letterSpacing: -0.8 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  profileMark: { height: 43, width: 43, borderRadius: 15, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  profileTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  profileSub: { color: colors.muted, fontSize: 11, textTransform: 'capitalize' },
  edit: { color: colors.green, fontSize: 12, fontWeight: '700', padding: 6 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  settingCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  settingTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  settingDescription: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 16, paddingHorizontal: 3 },
  setupCard: { padding: 17, gap: 11 },
  setupStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  setupStatusText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  setupCopy: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  setupDivider: { height: 1, backgroundColor: colors.line },
  setupStep: { color: '#59685F', fontSize: 10, lineHeight: 16 },
  guideLink: { alignSelf: 'flex-start', backgroundColor: colors.mint, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 14, marginTop: 2 },
  guideText: { color: colors.deepGreen, fontSize: 11, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#9AA49C', fontSize: 10, marginTop: 4 },
});
