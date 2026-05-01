import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationItem({ item, onPress }: { item: Notification; onPress: () => void }) {
  const time = new Date(item.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.item, !item.is_read && styles.unread]}
    >
      <View style={[styles.iconBox, !item.is_read && styles.iconBoxActive]}>
        <Ionicons name="notifications" size={18} color={item.is_read ? Colors.textMuted : Colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, !item.is_read && styles.titleBold]}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      {!item.is_read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  unread: { borderColor: Colors.primaryLight, backgroundColor: '#FFFCFA' },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: Colors.primaryLight },
  content: { flex: 1 },
  title: { ...Typography.h4, color: Colors.text, fontSize: 14 },
  titleBold: { fontWeight: '700' },
  message: { ...Typography.caption, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  time: { ...Typography.caption, color: Colors.textMuted, marginTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
});
