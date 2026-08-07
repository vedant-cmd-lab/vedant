import React from "react";
import { toast } from "sonner";
import { Play, Pause, SkipForward, Loader2, RotateCcw } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { practiceNew, practiceGuess, practiceReveal } from "@/lib/api";
import { CLIP_DURATIONS, MAX_ATTEMPTS } from "@/lib/game";

export default function PracticePage() {
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [guesses, setGuesses] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [playing, setPlaying] = React.useState(false);
  const [played, setPlayed] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const [solved, setSolved] = React.useState(false);
  const [answer, setAnswer] = React.useState(null);
  const audioRef = React.useRef(null);

  const attemptsUsed = guesses.length;
  const clipIndex = Math.min(attemptsUsed, MAX_ATTEMPTS - 1);
  const clipSeconds = finished ? CLIP_DURATIONS[MAX_ATTEMPTS - 1] : CLIP_DURATIONS[clipIndex];

  const stopAudio = React.useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    setPlaying(false);
    setPlayed(0);
  }, []);

  const loadNew = React.useCallback(() => {
    stopAudio();
    setLoading(true);
    setGuesses([]);
    setSelected(null);
    setFinished(false);
    setSolved(false);
    setAnswer(null);
    practiceNew()
      .then((s) => {
        setSession(s);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        toast.error("Could not open a practice case");
      });
  }, [stopAudio]);

  React.useEffect(() => {
    loadNew();
  }, [loadNew]);

  const play = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      stopAudio();
      return;
    }
    a.currentTime = 0;
    a.play().catch(() => toast.error("Playback failed"));
    setPlaying(true);
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setPlayed(a.currentTime);
    if (a.currentTime >= clipSeconds) {
      a.pause();
      setPlaying(false);
      setPlayed(0);
    }
  };

  const doGuess = async (optionId) => {
    if (submitting || finished) return;
    setSubmitting(true);
    stopAudio();
    try {
      let correct = false;
      if (optionId) {
        const res = await practiceGuess(session.session_id, optionId);
        correct = res.correct;
        if (correct) setAnswer(res.answer);
      }
      const newGuesses = [...guesses, { id: optionId, correct }];
      setGuesses(newGuesses);
      if (correct) {
        setSolved(true);
        setFinished(true);
        toast.success("Nailed it.");
      } else if (newGuesses.length >= MAX_ATTEMPTS) {
        const a = await practiceReveal(session.session_id);
        setAnswer(a);
        setSolved(false);
        setFinished(true);
      } else {
        setSelected(null);
        toast(optionId ? "Wrong lead — more tape unlocked" : "Skipped — more tape unlocked");
      }
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-5 pt-6 pb-8">
      {session && (
        <audio ref={audioRef} src={session.clip_url} onTimeUpdate={onTimeUpdate} onEnded={stopAudio} preload="auto" />
      )}

      <div className="flex items-baseline justify-between">
        <div>
          <div className="data-label text-[11px] text-sd-gold">Practice Room</div>
          <h1 className="font-display font-bold uppercase text-3xl tracking-tight leading-none mt-1 text-sd-text">
            No Pressure
          </h1>
        </div>
        <button
          onClick={loadNew}
          data-testid="practice-new-button"
          className="data-label text-[10px] text-sd-muted hover:text-sd-text flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {loading || !session ? (
        <div className="flex flex-col items-center justify-center pt-40 text-sd-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
          <div className="data-label text-[10px] mt-3">Cueing a random track…</div>
        </div>
      ) : finished ? (
        <div className="mt-8 animate-rise" data-testid="practice-result">
          <div className="flex justify-center mb-8">
            <div
              className="animate-stamp font-display font-extrabold uppercase text-5xl tracking-tighter border-4 px-6 py-2"
              style={{
                color: solved ? "var(--sd-teal)" : "var(--sd-copper)",
                borderColor: solved ? "var(--sd-teal)" : "var(--sd-copper)",
              }}
            >
              {solved ? "Solved" : "Missed"}
            </div>
          </div>
          <div className="bg-sd-surface border border-sd-hairline rounded-lg p-5 flex gap-4 items-center">
            {answer?.artwork_url ? (
              <img src={answer.artwork_url} alt="" className="w-20 h-20 rounded-md object-cover border border-sd-hairline" />
            ) : (
              <div className="w-20 h-20 rounded-md bg-sd-elevated border border-sd-hairline" />
            )}
            <div className="min-w-0 flex-1">
              <div className="data-label text-[10px] text-sd-muted mb-1">The Track Was</div>
              <div className="font-display font-bold text-2xl leading-none truncate text-sd-text" data-testid="practice-answer-title">
                {answer?.title}
              </div>
              <div className="text-sd-muted text-sm mt-1 truncate">{answer?.artist}</div>
              <div className="data-label text-[10px] text-sd-muted mt-1 truncate">
                {[answer?.album_or_film, answer?.year].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          <div className="data-label text-[11px] text-sd-muted text-center mt-4">
            {solved ? `Cracked in ${guesses.length}` : `Ran out after ${MAX_ATTEMPTS}`}
          </div>
          <button
            onClick={loadNew}
            data-testid="practice-again-button"
            className="mt-6 w-full py-3.5 rounded-md font-display font-bold uppercase tracking-wide text-lg bg-sd-gold text-[#1A1108] hover:brightness-105 transition-all"
          >
            Next Track
          </button>
        </div>
      ) : (
        <>
          <p className="text-sd-muted text-sm mt-3 mb-6">
            A random track from the archive. Guess freely — nothing counts toward your record.
          </p>

          <Waveform seed={session.session_id} revealedSeconds={clipSeconds} playedSeconds={played} isPlaying={playing} />

          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={play}
              data-testid="practice-play-button"
              className="h-20 w-20 rounded-full flex items-center justify-center text-[#1A1108] transition-all hover:brightness-105 active:scale-95"
              style={{ backgroundColor: "var(--sd-gold)", boxShadow: "0 10px 34px rgba(242,169,59,0.5)" }}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="w-8 h-8" fill="#1A1108" /> : <Play className="w-8 h-8 ml-1" fill="#1A1108" />}
            </button>
          </div>
          <div className="text-center data-label text-[11px] text-sd-muted mt-3">
            0:{String(clipSeconds).padStart(2, "0")} of tape unlocked
          </div>

          <div className="flex gap-1.5 justify-center mt-4">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
              const g = guesses[i];
              const isCurrent = i === attemptsUsed;
              return (
                <div
                  key={i}
                  className="h-1.5 flex-1 max-w-[46px] rounded-full"
                  style={{
                    backgroundColor: g ? "var(--sd-copper)" : isCurrent ? "var(--sd-text)" : "var(--sd-hairline)",
                    opacity: g || isCurrent ? 1 : 0.5,
                  }}
                />
              );
            })}
          </div>

          <div className="mt-8">
            <div className="data-label text-[10px] text-sd-muted mb-3">The Suspects — pick one</div>
            <div className="space-y-2.5">
              {session.options.map((opt) => {
                const wasWrong = guesses.some((g) => g.id === opt.id && !g.correct);
                const isSelected = selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    disabled={wasWrong || submitting}
                    onClick={() => setSelected(opt.id)}
                    data-testid="practice-mcq-option"
                    className="w-full text-left px-4 py-3 rounded-md border transition-colors disabled:opacity-40"
                    style={{
                      backgroundColor: isSelected ? "var(--sd-elevated)" : "var(--sd-surface)",
                      borderColor: wasWrong ? "var(--sd-copper)" : isSelected ? "var(--sd-text)" : "var(--sd-hairline)",
                    }}
                  >
                    <div className="font-body font-medium text-sd-text truncate">{opt.title}</div>
                    <div className="text-xs text-sd-muted truncate">{opt.artist}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => doGuess(selected)}
              disabled={!selected || submitting}
              data-testid="practice-submit-button"
              className="w-full py-3.5 rounded-md font-display font-bold uppercase tracking-wide text-lg bg-sd-gold text-[#1A1108] disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accuse This Track"}
            </button>
            <button
              onClick={() => doGuess(null)}
              disabled={submitting}
              data-testid="practice-skip-button"
              className="w-full py-3 rounded-md font-body text-sd-muted hover:text-sd-text transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <SkipForward className="w-4 h-4" /> Skip — unlock {CLIP_DURATIONS[Math.min(attemptsUsed + 1, MAX_ATTEMPTS - 1)]}s
            </button>
          </div>
        </>
      )}
    </div>
  );
}
