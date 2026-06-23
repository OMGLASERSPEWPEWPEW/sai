export function VersionStamp() {
  const buildDate = new Date(__BUILD_TIME__).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <span className="text-xs text-zinc-500">
      v{__APP_VERSION__} · {buildDate}
    </span>
  );
}
