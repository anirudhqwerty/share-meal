import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <BrandLogo size={82} variant="contained" />
        <Text style={styles.title}>Share Meal</Text>
        <Text style={styles.body}>
          This route is reserved for branded content. Use donor and NGO tabs for the main app experience.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: 12,
  },
  title: { ...Typography.h2, color: Colors.text },
  body: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
});
