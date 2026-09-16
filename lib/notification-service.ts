import { Notification, NotificationType, RouteStop } from '@/types/database';
import { supabase } from '@/lib/supabase/client';

const NOTIFICATIONS_STORAGE_KEY = 'smartwaste_operational_notifications';
const EVENT_NOTIFICATIONS_CHANGE = 'smartwaste_notifications_change';

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-ov-1',
    title: 'Collection Overdue',
    message: 'Narasipuram Main Road collection has not been completed within the scheduled time.',
    type: 'OVERDUE_COLLECTION',
    read: false,
    stop_id: 'stop-market-1',
    route_id: 'route-901',
    collection_point_id: 'cp1',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'notif-2',
    title: 'Vellaimalaipattinam Attention Required',
    message: 'Vellaimalaipattinam Residential Area requires immediate attention due to elevated waste accumulation.',
    type: 'alert',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'notif-3',
    title: 'Collection Verified',
    message: 'Collection near Devarayapuram Main Road verified & completed by Ramesh Patel.',
    type: 'info',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
];

/**
 * Retrieves the current operational notifications from localStorage cache.
 */
export function getNotifications(): Notification[] {
  if (typeof window === 'undefined') {
    return INITIAL_NOTIFICATIONS;
  }
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return INITIAL_NOTIFICATIONS;
    return JSON.parse(raw) as Notification[];
  } catch (e) {
    console.warn('Error reading notifications from localStorage:', e);
    return INITIAL_NOTIFICATIONS;
  }
}

/**
 * Fetches notifications directly from Supabase DB, updates local state.
 */
export async function fetchNotificationsFromSupabase(): Promise<Notification[]> {
  const localItems = getNotifications();

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data) {
      const dbItems: Notification[] = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type as NotificationType,
        read: item.read ?? false,
        created_at: item.created_at,
        stop_id: item.stop_id,
        route_id: item.route_id,
        collection_point_id: item.collection_point_id,
      }));

      const seenIds = new Set<string>();
      const merged: Notification[] = [];

      for (const item of [...localItems, ...dbItems]) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          merged.push(item);
        }
      }

      saveAndNotify(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Supabase fetch notifications notice:', err);
  }

  return localItems;
}

let cachedFallbackProfileId: string | null = null;

/**
 * Resolves a valid user profile UUID required for Supabase notifications table (user_id NOT NULL).
 * Validates against profiles table to prevent foreign key constraint violations.
 */
async function resolveProfileId(userId?: string): Promise<string | null> {
  if (userId) {
    try {
      const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
      if (data?.id) return data.id;
    } catch (e) {}
  }
  try {
    // 1. Check logged-in user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
      if (data?.id) return data.id;
    }

    // 2. Return cached profile ID if previously resolved
    if (cachedFallbackProfileId) return cachedFallbackProfileId;

    // 3. Query profiles table for any valid profile UUID
    const { data } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
    if (data?.id) {
      cachedFallbackProfileId = data.id;
      return data.id;
    }
  } catch (err) {
    console.warn('Profile ID lookup notice:', err);
  }
  return null;
}

/**
 * Adds a new notification to both Supabase DB and local state.
 */
export async function addNotification(params: {
  title: string;
  message: string;
  type?: NotificationType | string;
  user_id?: string;
  report_id?: string;
  stop_id?: string;
  route_id?: string;
  collection_point_id?: string;
}): Promise<Notification[]> {
  const currentNotifs = getNotifications();

  const newNotif: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    title: params.title,
    message: params.message,
    type: (params.type as NotificationType) || 'info',
    read: false,
    stop_id: params.stop_id,
    route_id: params.route_id,
    collection_point_id: params.collection_point_id,
    created_at: new Date().toISOString(),
  };

  const updated = [newNotif, ...currentNotifs];
  saveAndNotify(updated);

  // Sync with Supabase DB async if valid user_id profile is resolved
  try {
    const dbType = ['info', 'warning', 'alert', 'task'].includes(params.type || '')
      ? params.type
      : 'info';

    const targetUserId = await resolveProfileId(params.user_id);

    if (targetUserId) {
      const payload: any = {
        user_id: targetUserId,
        title: params.title,
        message: params.message,
        type: dbType,
        read: false,
        created_at: newNotif.created_at,
      };

      const { error } = await supabase.from('notifications').insert([payload]);
      if (error) {
        console.warn('Supabase insert notification notice:', error.message);
      } else {
        console.log('[Notification Service] Inserted notification into DB for profile:', targetUserId);
      }
    }
  } catch (err) {
    console.warn('Supabase insert notification exception:', err);
  }

  return updated;
}

/**
 * Safely creates an overdue notification if one does not already exist for the specified stop.
 */
export function checkAndCreateOverdueNotification(params: {
  stop_id: string;
  location_name: string;
  route_id?: string;
  scheduled_at?: string;
  overdue_mins?: number;
}): Notification[] {
  const currentNotifs = getNotifications();

  // Deduplication Check
  const exists = currentNotifs.some(
    (n) => n.stop_id === params.stop_id && n.type === 'OVERDUE_COLLECTION'
  );

  if (exists) {
    return currentNotifs;
  }

  const newNotif: Notification = {
    id: `notif-overdue-${params.stop_id}-${Date.now()}`,
    title: 'Collection Overdue',
    message: `${params.location_name} collection has not been completed within the scheduled time${
      params.overdue_mins ? ` (${params.overdue_mins} mins overdue)` : ''
    }.`,
    type: 'OVERDUE_COLLECTION',
    read: false,
    stop_id: params.stop_id,
    route_id: params.route_id,
    created_at: new Date().toISOString(),
  };

  const updated = [newNotif, ...currentNotifs];
  saveAndNotify(updated);

  // Sync to Supabase DB
  resolveProfileId().then(async (targetUserId) => {
    try {
      const payload: any = {
        title: 'Collection Overdue',
        message: newNotif.message,
        type: 'alert',
        read: false,
      };
      if (targetUserId) payload.user_id = targetUserId;

      const { error } = await supabase.from('notifications').insert([payload]);
      if (error) console.warn('Supabase overdue alert insert notice:', error.message);
    } catch (e) {
      console.warn('Supabase overdue alert exception:', e);
    }
  });

  return updated;
}

/**
 * Creates a notification when an admin classifies an overdue stop as MISSED.
 */
export function createMissedNotification(params: {
  stop_id: string;
  location_name: string;
  reason?: string;
}): Notification[] {
  const currentNotifs = getNotifications();

  const newNotif: Notification = {
    id: `notif-missed-${params.stop_id}-${Date.now()}`,
    title: 'Collection Classified as Missed',
    message: `${params.location_name} collection has been classified as MISSED by Admin${
      params.reason ? `: "${params.reason}"` : '.'
    }`,
    type: 'MISSED_COLLECTION',
    read: false,
    stop_id: params.stop_id,
    created_at: new Date().toISOString(),
  };

  const updated = [newNotif, ...currentNotifs];
  saveAndNotify(updated);

  // Sync to Supabase DB
  resolveProfileId().then(async (targetUserId) => {
    try {
      const payload: any = {
        title: 'Collection Classified as Missed',
        message: newNotif.message,
        type: 'warning',
        read: false,
      };
      if (targetUserId) payload.user_id = targetUserId;

      const { error } = await supabase.from('notifications').insert([payload]);
      if (error) console.warn('Supabase missed alert insert notice:', error.message);
    } catch (e) {
      console.warn('Supabase missed alert exception:', e);
    }
  });

  return updated;
}

/**
 * Marks a notification as read.
 */
export function markNotificationAsRead(id: string): Notification[] {
  const current = getNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveAndNotify(updated);

  try {
    supabase.from('notifications').update({ read: true }).eq('id', id).then();
  } catch (err) {
    // Ignore
  }
  return updated;
}

/**
 * Clears/deletes a notification.
 */
export function clearNotification(id: string): Notification[] {
  const current = getNotifications();
  const updated = current.filter((n) => n.id !== id);
  saveAndNotify(updated);

  try {
    supabase.from('notifications').delete().eq('id', id).then();
  } catch (err) {
    // Ignore
  }
  return updated;
}

/**
 * Saves notifications list and triggers broadcast event.
 */
function saveAndNotify(list: Notification[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent(EVENT_NOTIFICATIONS_CHANGE, { detail: list }));
    } catch (e) {
      console.warn('Error saving notifications to localStorage:', e);
    }
  }
}

/**
 * Subscribes to notification state changes via local events AND Supabase Realtime channel.
 */
export function subscribeNotificationsChange(callback: (list: Notification[]) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<Notification[]>;
    callback(customEvent.detail || getNotifications());
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === NOTIFICATIONS_STORAGE_KEY) {
      callback(getNotifications());
    }
  };

  window.addEventListener(EVENT_NOTIFICATIONS_CHANGE, handler);
  window.addEventListener('storage', storageHandler);

  // Supabase Realtime subscription (unique channel topic per subscriber to avoid channel collision)
  const channelId = `notif_rt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      () => {
        fetchNotificationsFromSupabase().then((items) => callback(items));
      }
    )
    .subscribe();

  return () => {
    window.removeEventListener(EVENT_NOTIFICATIONS_CHANGE, handler);
    window.removeEventListener('storage', storageHandler);
    supabase.removeChannel(channel);
  };
}

