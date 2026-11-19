const { supabase } = require('../lib/supabase');
const { deliverNotifications, reconcileReceipts } = require('../lib/push-notifications');

(async () => {
  // Recover a worker interrupted after claiming a message.
  const { error } = await supabase.from('notifications').update({ push_status: 'failed' })
    .eq('push_status', 'sending').lt('push_updated_at', new Date(Date.now() - 5 * 60_000).toISOString());
  if (error) throw error;
  await reconcileReceipts();
  await deliverNotifications();
  console.log('Pending notifications and receipts processed.');
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
