'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, Info, CheckCircle2, Truck } from 'lucide-react';
import { Notification, NotificationType } from '@/types/database';
import { useLanguage } from '@/lib/i18n/context';
import {
  fetchNotificationsFromSupabase,
  subscribeNotificationsChange,
  markNotificationAsRead,
} from '@/lib/notification-service';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'alert'>('all');

  useEffect(() => {
    fetchNotificationsFromSupabase().then((items) => setNotifications(items));

    const unsub = subscribeNotificationsChange((updated) => {
      setNotifications(updated);
    });

    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.read) markNotificationAsRead(n.id);
    });
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'alert') return n.type === 'alert' || n.type === 'warning';
    return true;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'task':
        return <Truck className="w-4 h-4 text-emerald-500" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('notifTitle')}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {unreadCount} {t('notifUnread')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Bar & Controls */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-white dark:bg-slate-900">
            <div className="flex items-center space-x-1">
              {(['all', 'unread', 'alert'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wide transition-all ${
                    filter === tab
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t('actionMarkRead')}</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markNotificationAsRead(item.id)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-start space-x-3 ${
                    item.read
                      ? 'bg-transparent opacity-75 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      : 'bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40'
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-60" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t('notifEmpty')}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
