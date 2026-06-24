import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, getValidAccessToken } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function usePushNotifications(enabled: boolean) {
  const { user } = useAuth();
  const lastEndpointRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !enabled || !VAPID_PUBLIC_KEY) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        if (Notification.permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (subscription?.expirationTime != null && subscription.expirationTime < Date.now()) {
          await subscription.unsubscribe();
          subscription = null;
        }

        if (subscription) {
          const currentKey = new Uint8Array(subscription.options.applicationServerKey ?? new ArrayBuffer(0));
          const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          const keysMatch = currentKey.length === expectedKey.length &&
            currentKey.every((b, i) => b === expectedKey[i]);
          if (!keysMatch) {
            await subscription.unsubscribe();
            subscription = null;
          }
        }

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
          });
        }

        if (subscription.endpoint === lastEndpointRef.current) return;

        const token = await getValidAccessToken();
        const { error } = await supabase.functions.invoke('push-subscribe', {
          body: { subscription: subscription.toJSON() },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (error) {
          console.warn('[push] Failed to register subscription:', error);
        } else {
          lastEndpointRef.current = subscription.endpoint;
        }
      } catch (err) {
        console.warn('[push] Registration failed:', err);
      }
    }

    subscribe();

    function handleVisibility() {
      if (document.visibilityState === 'visible') subscribe();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, enabled]);
}
