import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

function TabIcon({ name, label, focused }: { name: any; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons name={focused ? name : `${name}-outline`} size={22} color={focused ? Colors.secondary : Colors.textMuted} />
      <Text style={[styles.tabLabel, focused && styles.active]}>{label}</Text>
    </View>
  );
}

export default function NgoLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.secondary,
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon name="map" label="Map" focused={focused} /> }} />
      <Tabs.Screen name="listings" options={{ tabBarIcon: ({ focused }) => <TabIcon name="list" label="Browse" focused={focused} /> }} />
      <Tabs.Screen name="my-requests" options={{ tabBarIcon: ({ focused }) => <TabIcon name="receipt" label="My Requests" focused={focused} /> }} />
      <Tabs.Screen name="listing/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, height: 72, paddingBottom: 10, paddingTop: 8 },
  tabItem: { alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11, color: Colors.textMuted },
  active: { color: Colors.secondary, fontWeight: '600' },
});
