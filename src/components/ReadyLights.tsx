import type { ReadyLight } from '../hooks/useReadyLights';

interface ReadyLightsProps {
  lights: ReadyLight[];
}

export function ReadyLights({ lights }: ReadyLightsProps) {
  return (
    <div className="flex items-center justify-center gap-6 py-3">
      {lights.map((light) => (
        <div key={light.userId} className="flex flex-col items-center gap-1.5">
          <div className="relative">
            <div
              className={`h-10 w-10 rounded-full border-2 transition-colors duration-300 ${
                light.hasSubmitted
                  ? 'border-green-400 bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                  : 'border-zinc-600 bg-zinc-700'
              }`}
            >
              {light.avatarUrl ? (
                <img
                  src={light.avatarUrl}
                  alt={light.displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-300">
                  {light.displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
            </div>

            {light.hasSubmitted && (
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-green-400 opacity-30" />
            )}

            {!light.hasSubmitted && (
              <span className="absolute inset-0 animate-pulse rounded-full border-2 border-zinc-500 opacity-20" />
            )}
          </div>

          <span className="max-w-[72px] truncate text-xs text-zinc-400">
            {light.displayName}
          </span>
        </div>
      ))}
    </div>
  );
}
