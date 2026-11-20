import { useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Alert } from '@/utils/alert';
import { Button } from '@/components/ui/Button';
import { Colors, Typography } from '@/constants/theme';
import { pickupsService } from '@/services/pickups.service';

export type Pickup = { id: string; status: 'scheduled' | 'completed' | 'cancelled' };

export function PickupActions({ pickup, onChange }: { pickup: Pickup; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const perform = async (action: 'complete' | 'cancel') => {
    if (active.current) return;
    active.current = true; setBusy(true);
    try { await pickupsService[action](pickup.id); await onChange(); }
    catch (error: any) { Alert.alert('Pickup not updated', error.message); }
    finally { active.current = false; setBusy(false); }
  };
  if (pickup.status !== 'scheduled') return <Text style={styles.status}>{pickup.status === 'completed' ? 'Food collected' : 'Pickup cancelled'}</Text>;
  return <View style={styles.container}>
    <Text style={styles.status}>Arrange collection before the food expires.</Text>
    <View style={styles.actions}>
      <Button title="Mark collected" variant="secondary" disabled={busy} loading={busy} style={styles.button}
        onPress={() => Alert.alert('Confirm collection?', 'Mark this pickup complete after the food has been handed over.', [
          { text: 'Back', style: 'cancel' }, { text: 'Mark collected', onPress: () => { void perform('complete'); } },
        ])} />
      <Button title="Cancel pickup" variant="outline" disabled={busy} style={styles.button}
        onPress={() => Alert.alert('Cancel pickup?', 'Unexpired food will become available for another NGO.', [
          { text: 'Keep pickup', style: 'cancel' }, { text: 'Cancel pickup', style: 'destructive', onPress: () => { void perform('cancel'); } },
        ])} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 12, marginTop: 12 }, status: { ...Typography.body, color: Colors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, button: { flexGrow: 1, flexBasis: 140 },
});
