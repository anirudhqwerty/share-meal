import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({
  name,
  label,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}) {
  const iconName = focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap);
  return (
    <View style={styles.tabItem}>
      <Ionicons name={iconName} size={22} color={focused ? Colors.secondary : Colors.textMuted} />
      <Text
        style={[styles.tabLabel, focused && styles.active]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
}

export default function NgoLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { height: 64 + insets.bottom, paddingBottom: Math.max(8, insets.bottom) },
        ],
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.secondary,
        tabBarItemStyle: styles.tabItemWrap,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="map" label="Map" focused={focused} /> }}
      />
      <Tabs.Screen
        name="listings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="list" label="Browse" focused={focused} /> }}
      />
      <Tabs.Screen
        name="my-requests"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="receipt" label="Requests" focused={focused} /> }}
      />
      <Tabs.Screen name="listing/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  tabItemWrap: { paddingHorizontal: 4 },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 70,
    paddingHorizontal: 4,
  },
  tabLabel: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  active: { color: Colors.secondary, fontWeight: '700' },
});
