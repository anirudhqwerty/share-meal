const { supabase } = require('./supabase');
const PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const tokenPattern = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

async function deliverNotifications({ donationId, userId } = {}) {
  let recovery = supabase.from('notifications').update({ push_status: 'failed' })
    .eq('push_status', 'sending').lt('push_updated_at', new Date(Date.now() - 5 * 60_000).toISOString());
  if (donationId) recovery = recovery.eq('donation_id', donationId);
  if (userId) recovery = recovery.eq('user_id', userId);
  const { error: recoveryError } = await recovery;
  if (recoveryError) throw recoveryError;
  let query = supabase.from('notifications')
    .select('id, user_id, title, message, donation_id, push_attempts, app_users(expo_push_token)')
    .in('push_status', ['pending', 'failed']).lt('push_attempts', 3)
    .order('created_at', { ascending: true }).limit(100);
  if (donationId) query = query.eq('donation_id', donationId);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  const queue = [];
  for (const notification of data || []) {
    const token = notification.app_users?.expo_push_token;
    const { data: claimed, error: claimError } = await supabase.from('notifications')
      .update({ push_status: 'sending', push_token: token || null, push_attempts: notification.push_attempts + 1, push_updated_at: new Date().toISOString() })
      .eq('id', notification.id).in('push_status', ['pending', 'failed']).eq('push_attempts', notification.push_attempts)
      .select('id').maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;
    if (!tokenPattern.test(token || '')) {
      await updateDelivery(notification.id, { push_status: 'skipped', push_error: null });
      continue;
    }
    queue.push({ notification, token });
  }
  if (!queue.length) return;
  try {
    const response = await fetch(PUSH_URL, {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(queue.map(({ notification, token }) => ({
        to: token, sound: 'default', channelId: 'share-meal', title: notification.title, body: notification.message,
        data: { route: '/notifications', notificationId: notification.id, donationId: notification.donation_id },
      }))), signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Expo Push API HTTP ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.data) || result.data.length !== queue.length) throw new Error('Expo Push API returned an incomplete result');
    await Promise.all(result.data.map(async (ticket, index) => {
      const { notification, token } = queue[index];
      if (ticket.status === 'ok') {
        await updateDelivery(notification.id, { push_status: 'sent', push_ticket_id: ticket.id, push_error: null });
      } else {
        await updateDelivery(notification.id, { push_status: 'failed', push_error: ticket.details?.error || ticket.message || 'Push rejected' });
        if (ticket.details?.error === 'DeviceNotRegistered') await clearInvalidToken(notification.user_id, token);
      }
    }));
  } catch (error) {
    await Promise.all(queue.map(({ notification }) => updateDelivery(notification.id, { push_status: 'failed', push_error: error.message })));
    throw error;
  }
}

async function updateDelivery(id, fields) {
  const { error } = await supabase.from('notifications').update({ ...fields, push_updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
async function clearInvalidToken(userId, token) {
  const { error } = await supabase.from('app_users').update({ expo_push_token: null }).eq('id', userId).eq('expo_push_token', token);
  if (error) throw error;
}
async function deliverSafely(scope) {
  try { await deliverNotifications(scope); }
  catch (error) { console.error('Push delivery failed; inbox notification remains saved:', error.message); }
}
module.exports = { deliverNotifications, deliverSafely };
