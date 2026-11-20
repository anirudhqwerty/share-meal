import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <BrandLogo size={64} variant="plain" />
          <Text style={styles.name}>Share Meal</Text>
          <Text style={styles.title}>Good food.{ '\n' }Another meal.</Text>
          <Text style={styles.description}>Connect surplus food with organizations that can share it.</Text>
        </View>
        <View style={styles.choices}>
          <Text style={styles.heading}>How will you help?</Text>
          {([
            { role: 'donor', title: 'Share food', description: 'Post surplus food for nearby NGOs to collect.', icon: 'restaurant-outline', color: Colors.primary },
            { role: 'ngo', title: 'Collect food', description: 'Find food nearby and arrange a pickup for your NGO.', icon: 'people-outline', color: Colors.secondary },
          ] as const).map((item) => (
            <Pressable key={item.role} accessibilityRole="button" accessibilityLabel={item.title}
              onPress={() => router.push({ pathname: '/(auth)/login', params: { role: item.role } })}
              style={({ pressed }) => [styles.choice, pressed && { backgroundColor: Colors.surface, borderColor: item.color }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
              <View style={styles.choiceText}>
                <Text style={styles.choiceTitle}>{item.title}</Text>
                <Text style={styles.choiceDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center', gap: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  intro: { alignItems: 'flex-start', gap: 14 },
  name: { ...Typography.h4, color: Colors.primary },
  title: { fontSize: 36, lineHeight: 42, fontWeight: '700', letterSpacing: -0.8, color: Colors.text },
  description: { ...Typography.bodyLg, color: Colors.textSecondary, maxWidth: 360 },
  choices: { gap: 12 }, heading: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  choiceText: { flex: 1, minWidth: 0, gap: 4 }, choiceTitle: { ...Typography.h4, color: Colors.text },
  choiceDescription: { ...Typography.body, color: Colors.textSecondary },
});
