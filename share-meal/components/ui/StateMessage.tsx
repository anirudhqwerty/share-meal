import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { ScreenHeader } from './ScreenHeader';
import { Button } from './Button';
import { SafeAreaView } from 'react-native-safe-area-context';

export function StateMessage({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <ScreenHeader title={title} showBack />
    <View style={styles.content}>
      <Text accessibilityRole="alert" style={styles.message}>{message}</Text>
      <Button title="Try again" onPress={onRetry} />
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.lg },
  message: { ...Typography.bodyLg, color: Colors.textSecondary, textAlign: 'center' },
});
