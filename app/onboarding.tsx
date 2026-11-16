import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Eyebrow, PrimaryButton, Screen, Tag } from '@/components/ui';
import { DEFAULT_SETTINGS, type LearnerSettings, type Proficiency } from '@/domain/types';
import { saveSettings } from '@/services/progress';
import { colors, radius } from '@/theme';

const levels: { key: Proficiency; title: string; description: string }[] = [
  { key: 'beginner', title: 'Beginner', description: 'I am just getting started' },
  { key: 'intermediate', title: 'Intermediate', description: 'I can keep a conversation going' },
  { key: 'advanced', title: 'Advanced', description: 'I want to sound more natural' },
];
const goals = ['Travel', 'Everyday life', 'Work', 'Culture'];

export default function OnboardingScreen() {
  const [settings, setSettings] = useState<LearnerSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  async function continueToPractice() {
    if (!settings.targetLanguage.trim() || !settings.nativeLanguage.trim()) {
      Alert.alert('Add your languages', 'Tell us which language you are learning and which one you speak most comfortably.');
      return;
    }
    setSaving(true);
    try {
      await saveSettings({ ...settings, onboardingComplete: true });
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Saved on this device', 'Firebase is not connected yet, but your preferences are ready to use here.');
      router.replace('/(tabs)');
    } finally { setSaving(false); }
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ gap: 22 }}>
        <View style={styles.brandRow}><View style={styles.brandMark}><Text style={styles.brandMarkText}>p</Text></View><Text style={styles.brand}>PARLINO</Text><Text style={styles.step}>01 / 01</Text></View>
        <View style={{ gap: 10 }}>
          <Eyebrow>Your AI partner for speaking a new language</Eyebrow>
          <Text style={styles.title}>Let’s make this{ '\n' }feel like <Text style={styles.titleAccent}>your language.</Text></Text>
          <Text style={styles.subtitle}>A few details help us keep every conversation comfortable and useful.</Text>
        </View>

        <Card style={{ gap: 16 }}>
          <View style={styles.fieldsRow}>
            <View style={styles.field}><Text style={styles.label}>I want to learn</Text><TextInput accessibilityLabel="Target language" value={settings.targetLanguage} onChangeText={(targetLanguage) => setSettings({ ...settings, targetLanguage })} placeholder="Spanish" placeholderTextColor={colors.muted} style={styles.input} /></View>
            <View style={styles.field}><Text style={styles.label}>I speak</Text><TextInput accessibilityLabel="Native language" value={settings.nativeLanguage} onChangeText={(nativeLanguage) => setSettings({ ...settings, nativeLanguage })} placeholder="English" placeholderTextColor={colors.muted} style={styles.input} /></View>
          </View>
          <Text style={styles.helper}>You can change these whenever you like.</Text>
        </Card>

        <View style={{ gap: 11 }}>
          <Text style={styles.sectionTitle}>Where are you starting from?</Text>
          <View style={{ gap: 8 }}>
            {levels.map((level) => {
              const selected = settings.proficiency === level.key;
              return <Text key={level.key} onPress={() => setSettings({ ...settings, proficiency: level.key })} style={[styles.level, selected && styles.levelSelected]}>
                <Text style={[styles.radio, selected && styles.radioSelected]}>{selected ? '●' : '○'}</Text>
                <Text style={[styles.levelTitle, selected && styles.levelTitleSelected]}>{level.title}</Text>
                <Text style={styles.levelDescription}>{'  '}{level.description}</Text>
              </Text>;
            })}
          </View>
        </View>

        <View style={{ gap: 11 }}>
          <Text style={styles.sectionTitle}>What brings you here?</Text>
          <View style={styles.tagRow}>{goals.map((goal) => <Tag key={goal} label={goal} selected={settings.goal === goal} onPress={() => setSettings({ ...settings, goal })} />)}</View>
        </View>

        <PrimaryButton title={saving ? 'Getting things ready…' : 'Build my practice space'} onPress={() => void continueToPractice()} disabled={saving} trailing={<Text style={{ color: '#fff', fontSize: 18 }}>→</Text>} />
        <Text style={styles.privacy}>No account needed to get started. Your conversation transcript is not saved unless you choose to.</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 7 },
  brandMark: { height: 30, width: 30, borderRadius: 10, backgroundColor: colors.deepGreen, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: colors.lime, fontFamily: 'Georgia', fontSize: 23, fontStyle: 'italic', fontWeight: '700', marginTop: -2 },
  brand: { color: colors.ink, fontWeight: '800', fontSize: 10, letterSpacing: 1.6, flex: 1 },
  step: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 38, lineHeight: 44, letterSpacing: -1.8, fontWeight: '700' },
  titleAccent: { color: colors.green, fontFamily: 'Georgia', fontStyle: 'italic', fontWeight: '400' },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23, maxWidth: 330 },
  fieldsRow: { flexDirection: 'row', gap: 14 },
  field: { flex: 1, gap: 8 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  input: { borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 8, color: colors.ink, fontSize: 17, fontWeight: '700' },
  helper: { color: colors.muted, fontSize: 11 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  level: { paddingVertical: 13, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, borderRadius: radius.md, overflow: 'hidden', color: colors.muted, fontSize: 12 },
  levelSelected: { borderColor: '#B8D8C3', backgroundColor: colors.mint },
  radio: { color: '#B8C2BC', fontSize: 14, marginRight: 8 },
  radioSelected: { color: colors.green },
  levelTitle: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  levelTitleSelected: { color: colors.deepGreen },
  levelDescription: { color: colors.muted, fontSize: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  privacy: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', paddingHorizontal: 12 },
});
