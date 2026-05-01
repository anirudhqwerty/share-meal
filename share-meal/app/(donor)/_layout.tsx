import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { View, Text, StyleSheet } from 'react-native';

function TabIcon({ name, label, focused }: { name: any; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons name={focused ? name : `${name}-outline`} size={22} color={focused ? Colors.primary : Colors.textMuted} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function DonorLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" label="Home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="new-donation"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="add-circle" label="Post" focused={focused} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="stats-chart" label="History" focused={focused} /> }}
      />
      <Tabs.Screen name="donation/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabItem: { alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11, color: Colors.textMuted },
  tabLabelActive: { color: Colors.primary, fontWeight: '600' },
});
