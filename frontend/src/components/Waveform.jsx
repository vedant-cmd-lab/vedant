import React from "react";
import { waveformBars, WAVEFORM_TOTAL_SECONDS } from "@/lib/game";

// revealedSeconds = how much of the clip is currently unlocked
// playedSeconds = current playhead position while audio plays (0 when idle)
export const Waveform = ({ seed, revealedSeconds, playedSeconds = 0, isPlaying = false }) => {
  const bars = React.useMemo(() => waveformBars(seed), [seed]);
  const revealedFrac = Math.min(1, revealedSeconds / WAVEFORM_TOTAL_SECONDS);
  const playFrac = Math.min(revealedFrac, playedSeconds / WAVEFORM_TOTAL_SECONDS);

  return (
    <div className="relative w-full" data-testid="waveform">
      {/* desk-lamp radial glow */}
      <div
        className="absolute inset-0 -m-10 animate-glow pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 120% at 50% 45%, rgba(255,208,122,0.22), rgba(255,208,122,0) 70%)",
        }}
      />
      <div className="relative flex items-center justify-between gap-[2px] h-40 sm:h-48 px-1">
        {bars.map((h, i) => {
          const frac = (i + 0.5) / bars.length;
          const isRevealed = frac <= revealedFrac;
          return (
            <div
              key={i}
              className="flex-1 rounded-full transition-colors duration-300"
              style={{
                height: `${h * 100}%`,
                backgroundColor: isRevealed ? "var(--sd-gold)" : "var(--sd-text)",
                opacity: isRevealed ? 1 : 0.2,
              }}
            />
          );
        })}

        {/* revealed boundary marker */}
        <div
          className="absolute top-0 bottom-0 w-[2px] pointer-events-none transition-all duration-300"
          style={{
            left: `${revealedFrac * 100}%`,
            background: "linear-gradient(180deg, transparent, var(--sd-gold-glow), transparent)",
            boxShadow: "0 0 12px 2px rgba(255,208,122,0.55)",
          }}
        />

        {/* live playhead */}
        {isPlaying && (
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-sd-glow pointer-events-none"
            style={{
              left: `${playFrac * 100}%`,
              boxShadow: "0 0 16px 3px rgba(255,208,122,0.8)",
            }}
          />
        )}
      </div>
    </div>
  );
};
