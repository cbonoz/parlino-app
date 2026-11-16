import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll ? <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView> : children}
    </SafeAreaView>
  );
}

export function Eyebrow({ children }: PropsWithChildren) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function PrimaryButton({ title, onPress, disabled, trailing }: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primary, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.primaryText}>{title}</Text>
      {trailing ? <View style={{ marginLeft: 12 }}>{trailing}</View> : null}
    </Pressable>
  );
}

export function OutlineButton({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.outline, pressed && styles.pressed]}><Text style={styles.outlineText}>{title}</Text></Pressable>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Tag({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.tag, selected && styles.tagSelected]}>
      <Text style={[styles.tagText, selected && styles.tagSelectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 34, gap: 22 },
  eyebrow: { color: colors.green, fontSize: 11, letterSpacing: 1.7, fontWeight: '800', textTransform: 'uppercase' },
  primary: { minHeight: 58, borderRadius: radius.pill, backgroundColor: colors.deepGreen, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  outline: { minHeight: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  outlineText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: '#EEF0EB' },
  tag: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.paper },
  tagSelected: { backgroundColor: colors.mint, borderColor: '#B8D8C3' },
  tagText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  tagSelectedText: { color: colors.deepGreen },
});
