'use client';

import { supabase } from '@/lib/supabase';

export type AppNotification = {
  id: string;
  created_at: string;
  title: string;
  body: string | null;
  is_read: boolean;
  referral_id: string | null;
  type: string;
};

export async function notifyNewReferral(referralId: string) {
  const { error } = await supabase.rpc('notify_new_it_referral', {
    p_referral_id: referralId,
  });

  if (error) {
    console.error('Error creating new-ticket notifications:', error);
  }
}

export async function notifyReferralUpdate(referralId: string, ticketUpdateId: string) {
  const { error } = await supabase.rpc('notify_it_referral_update', {
    p_referral_id: referralId,
    p_ticket_update_id: ticketUpdateId,
  });

  if (error) {
    console.error('Error creating ticket-update notifications:', error);
  }
}

export async function fetchNotifications(limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, created_at, title, body, is_read, referral_id, type')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as AppNotification[];
}

export async function markAllNotificationsRead() {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: now,
    })
    .eq('is_read', false);

  if (error) throw error;
}
