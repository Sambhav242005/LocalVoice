import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../core/store';
export const palettes = {
  light: { background: '#F3F8F8', surface: '#FFFFFF', tinted: '#DDEFEA', primary: '#00695C', onPrimary: '#FFFFFF', text: '#142F2C', muted: '#48625F', outline: '#A7BFBB', error: '#B42332', header: '#00574D' },
  dark: { background: '#101D1C', surface: '#192B28', tinted: '#26473F', primary: '#8CDAC6', onPrimary: '#00382F', text: '#E4F1ED', muted: '#B3C9C2', outline: '#66877E', error: '#FFABB4', header: '#234D44' },
};
export function useTheme() {
  const { settings } = useStore();
  const system = useColorScheme();
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && system === 'dark');
  return { ...palettes[dark ? 'dark' : 'light'], dark };
}
export function Txt({ children, kind = 'body', color, selectable = false }: { children: React.ReactNode; kind?: 'body' | 'title' | 'heading' | 'small'; color?: string; selectable?: boolean }) {
  const theme = useTheme();
  return <Text selectable={selectable} style={[styles[kind], { color: color ?? theme.text }]}>{children}</Text>;
}
export function Button({ label, onPress, danger, secondary, disabled, selected, icon }: { label: string; onPress: () => void; danger?: boolean; secondary?: boolean; disabled?: boolean; selected?: boolean; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  const theme = useTheme();
  const foreground = secondary ? theme.primary : danger ? (theme.dark ? '#4A0710' : '#FFFFFF') : theme.onPrimary;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: secondary ? theme.tinted : danger ? theme.error : theme.primary, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }]}>
    {icon && <Ionicons name={icon} size={20} color={foreground} />}<Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
  </Pressable>;
}
export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.panel, { backgroundColor: theme.surface }, style]}>{children}</View>;
}
export function Row({ title, value, description }: { title: string; value?: string; description?: string }) {
  const theme = useTheme();
  return <View style={[styles.row, { borderBottomColor: theme.outline }]}><View style={{ flex: 1, gap: 4 }}><Txt>{title}</Txt>{description && <Txt kind="small" color={theme.muted}>{description}</Txt>}</View>{value && <Txt kind="small" color={theme.primary}>{value}</Txt>}</View>;
}
export function Screen({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const theme = useTheme();
  const { notice, noticeKind, setNotice, loadFailed, retryLoad } = useStore();
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
    <View style={{ gap: 8, marginBottom: 8 }}><Txt kind="heading">{title}</Txt><Txt color={theme.muted}>{subtitle}</Txt></View>
    {!!notice && <Panel><Txt color={noticeKind === 'error' ? theme.error : theme.primary}>{notice}</Txt><Button label="Dismiss message" secondary onPress={() => setNotice('')} /></Panel>}
    {loadFailed && <Panel><Txt>Saved data needs attention. Call controls stay disabled to protect your history.</Txt><Button label="Retry loading saved data" onPress={retryLoad} /></Panel>}
    {children}
  </ScrollView>;
}
export function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={{ gap: 12, marginTop: 8 }}><Txt kind="title">{title}</Txt>{children}</View>; }
export function formatDuration(milliseconds: number) { const seconds = Math.max(0, Math.floor(milliseconds / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
export const styles = StyleSheet.create({
  screen: { padding: 20, gap: 20, maxWidth: 960, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  panel: { padding: 20, borderRadius: 16, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  button: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  buttonText: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  heading: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 13, lineHeight: 20 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
});
