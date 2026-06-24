import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let interval: ReturnType<typeof setInterval>;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready.then((reg) => reg.update());
      }
    };

    navigator.serviceWorker.ready.then((registration) => {
      interval = setInterval(() => registration.update(), 60_000);
      document.addEventListener('visibilitychange', onVisible);
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
