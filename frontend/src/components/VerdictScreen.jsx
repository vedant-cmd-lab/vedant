import React from "react";
import { toast } from "sonner";
import { Share2, Play, Pause } from "lucide-react";
import { ShareGrid, buildShareText } from "@/components/ShareGrid";
import { NextCaseTimer } from "@/components/NextCaseTimer";
import { MAX_ATTEMPTS } from "@/lib/game";

export const VerdictScreen = ({ number, answer, solved, guessResults, score, streak, previewUrl, showNextTimer }) => {
  const audioRef = React.useRef(null);
  const [playing, setPlaying] = React.useState(false);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.currentTime = 0;
      a.play();
      setPlaying(true);
    }
  };

  const share = async () => {
    const text = buildShareText({
      number,
      solved,
      guesses: guessResults,
      maxAttempts: MAX_ATTEMPTS,
      score,
    });
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Verdict copied — paste it anywhere");
      }
    } catch (e) {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Verdict copied — paste it anywhere");
      } catch (_) {}
    }
  };

  return (
    <div className="animate-rise" data-testid="verdict-screen">
      <audio ref={audioRef} src={previewUrl} onEnded={() => setPlaying(false)} />

      {/* Stamp */}
      <div className="flex justify-center mb-8 mt-2">
        <div
          className="animate-stamp font-display font-extrabold uppercase text-5xl sm:text-6xl tracking-tighter border-4 px-6 py-2"
          style={{
            color: solved ? "var(--sd-teal)" : "var(--sd-copper)",
            borderColor: solved ? "var(--sd-teal)" : "var(--sd-copper)",
          }}
          data-testid="verdict-stamp"
        >
          {solved ? "Solved" : "Cold Case"}
        </div>
      </div>

      {showNextTimer && (
        <div className="text-center mb-6" data-testid="next-case-block">
          <div className="data-label text-[10px] text-sd-muted mb-1">Next Case Unlocks In</div>
          <NextCaseTimer />
        </div>
      )}

      {/* Evidence card */}
      <div className="bg-sd-surface border border-sd-hairline rounded-lg p-5 flex gap-4 items-center">
        {answer.artwork_url ? (
          <img
            src={answer.artwork_url}
            alt=""
            className="w-20 h-20 rounded-md object-cover border border-sd-hairline"
          />
        ) : (
          <div className="w-20 h-20 rounded-md bg-sd-elevated border border-sd-hairline" />
        )}
        <div className="min-w-0 flex-1">
          <div className="data-label text-[10px] text-sd-muted mb-1">The Track Was</div>
          <div className="font-display font-bold text-2xl leading-none truncate text-sd-text" data-testid="answer-title">
            {answer.title}
          </div>
          <div className="text-sd-muted text-sm mt-1 truncate">{answer.artist}</div>
          <div className="data-label text-[10px] text-sd-muted mt-1 truncate">
            {[answer.album_or_film, answer.year].filter(Boolean).join(" · ")}
          </div>
        </div>
        <button
          onClick={toggle}
          data-testid="verdict-play-button"
          className="shrink-0 h-11 w-11 rounded-full border border-sd-hairline flex items-center justify-center text-sd-text hover:bg-sd-elevated transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
      </div>

      {/* Score row */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-sd-surface border border-sd-hairline rounded-lg p-3 text-center">
          <div className="data-label text-[10px] text-sd-muted">Score</div>
          <div className="font-data text-xl text-sd-text mt-1" data-testid="verdict-score">{score}</div>
        </div>
        <div className="bg-sd-surface border border-sd-hairline rounded-lg p-3 text-center">
          <div className="data-label text-[10px] text-sd-muted">Guesses</div>
          <div className="font-data text-xl text-sd-text mt-1">
            {solved ? `${guessResults.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`}
          </div>
        </div>
        <div className="bg-sd-surface border border-sd-hairline rounded-lg p-3 text-center">
          <div className="data-label text-[10px] text-sd-muted">Streak</div>
          <div className="font-data text-xl text-sd-text mt-1" data-testid="verdict-streak">{streak}</div>
        </div>
      </div>

      {/* Share */}
      <div className="bg-sd-surface border border-sd-hairline rounded-lg p-5 mt-4">
        <div className="data-label text-[10px] text-sd-muted mb-3">Spoiler-Free Verdict</div>
        <ShareGrid guesses={guessResults} solved={solved} maxAttempts={MAX_ATTEMPTS} />
        <button
          onClick={share}
          data-testid="share-button"
          className="mt-4 w-full h-12 rounded-md font-display font-bold uppercase tracking-wide text-lg flex items-center justify-center gap-2 bg-sd-gold text-[#1A1108] hover:brightness-105 transition-all"
        >
          <Share2 className="w-4 h-4" /> Share the Case
        </button>
      </div>
    </div>
  );
};
