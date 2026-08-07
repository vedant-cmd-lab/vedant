import React from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Play, Pause, SkipForward, Loader2 } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { VerdictScreen } from "@/components/VerdictScreen";
import { getToday, getPuzzle, submitGuess, revealAnswer } from "@/lib/api";
import { CLIP_DURATIONS, MAX_ATTEMPTS } from "@/lib/game";
import { getProgress, saveProgress, recordFinish } from "@/lib/storage";
import { useNav } from "@/lib/navContext";

export default function PuzzlePage() {
  const { number: routeNumber } = useParams();
  const [puzzle, setPuzzle] = React.useState(null);
  const [progress, setProgress] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [playing, setPlaying] = React.useState(false);
  const [played, setPlayed] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const audioRef = React.useRef(null);
  const solvedAnswerRef = React.useRef(null);

  const attemptsUsed = progress ? progress.guesses.length : 0;
  const finished = progress ? progress.finished : false;
  const clipIndex = Math.min(attemptsUsed, MAX_ATTEMPTS - 1);
  const clipSeconds = finished ? CLIP_DURATIONS[MAX_ATTEMPTS - 1] : CLIP_DURATIONS[clipIndex];

  const { setHidden } = useNav();
  React.useEffect(() => {
    // hide the bottom nav while a round is actively being played
    setHidden(!!puzzle && !error && !finished);
    return () => setHidden(false);
  }, [puzzle, error, finished, setHidden]);

  React.useEffect(() => {
    let alive = true;
    setPuzzle(null);
    setError(null);
    const loader = routeNumber ? getPuzzle(routeNumber) : getToday();
    loader
      .then((data) => {
        if (!alive) return;
        setPuzzle(data);
        setProgress(getProgress(data.number));
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.response?.data?.detail || "Could not open this case");
      });
    return () => {
      alive = false;
    };
  }, [routeNumber]);

  const stopAudio = React.useCallback(() => {
    const a = audioRef.current;
    if (a) a.pause();
    setPlaying(false);
    setPlayed(0);
  }, []);

  React.useEffect(() => {
    stopAudio();
  }, [routeNumber, stopAudio]);

  const play = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      stopAudio();
      return;
    }
    a.currentTime = 0;
    a.play().catch(() => toast.error("Playback failed — the evidence tape is jammed"));
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

  const finalize = async (newGuesses, solved) => {
    let answer;
    if (solved) {
      answer = solvedAnswerRef.current;
    } else {
      answer = await revealAnswer(puzzle.number);
    }
    const solvedOnAttempt = solved ? newGuesses.length : null;
    const { score, currentStreak } = recordFinish(puzzle.number, solved, solvedOnAttempt);
    const updated = {
      guesses: newGuesses,
      solved,
      finished: true,
      solvedOnAttempt,
      score,
      streak: currentStreak,
      answer,
    };
    saveProgress(puzzle.number, updated);
    setProgress(updated);
    stopAudio();
  };

  const doGuess = async (optionId) => {
    if (submitting || finished) return;
    setSubmitting(true);
    stopAudio();
    try {
      let correct = false;
      if (optionId) {
        const res = await submitGuess(puzzle.number, optionId);
        correct = res.correct;
        if (correct) solvedAnswerRef.current = res.answer;
      }
      const newGuesses = [...progress.guesses, { id: optionId, correct }];
      if (correct) {
        await finalize(newGuesses, true);
        toast.success("Case cracked.");
      } else if (newGuesses.length >= MAX_ATTEMPTS) {
        await finalize(newGuesses, false);
      } else {
        const updated = { ...progress, guesses: newGuesses };
        saveProgress(puzzle.number, updated);
        setProgress(updated);
        setSelected(null);
        toast(optionId ? "Wrong lead — the tape rolls on" : "Skipped — more of the tape unlocked", {
          style: { background: "#241F22", color: "#F7F1E6", border: "1px solid #3A3238" },
        });
      }
    } catch (e) {
      toast.error("Something went wrong submitting your guess");
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="px-5 pt-24 text-center">
        <div className="font-display uppercase text-2xl text-sd-copper tracking-tight">Case Sealed</div>
        <p className="text-sd-muted mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!puzzle || !progress) {
    return (
      <div className="flex flex-col items-center justify-center pt-40 text-sd-muted">
        <Loader2 className="w-6 h-6 animate-spin" />
        <div className="data-label text-[10px] mt-3">Opening the case file…</div>
      </div>
    );
  }

  const guessResults = progress.guesses.map((g) => g.correct);

  return (
    <div className="px-5 pb-8 pt-6">
      <audio ref={audioRef} src={puzzle.clip_url} onTimeUpdate={onTimeUpdate} onEnded={stopAudio} preload="auto" />

      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <div className="data-label text-[11px] text-sd-gold" data-testid="case-number">
            Case #{String(puzzle.number).padStart(3, "0")}
          </div>
          <h1 className="font-display font-bold uppercase text-3xl tracking-tight leading-none mt-1 text-sd-text">
            The Daily Sur
          </h1>
        </div>
        <div className="data-label text-[10px] text-sd-muted text-right">{puzzle.date}</div>
      </div>

      {finished ? (
        <div className="mt-8">
          <VerdictScreen
            number={puzzle.number}
            answer={progress.answer}
            solved={progress.solved}
            guessResults={guessResults}
            score={progress.score}
            streak={progress.streak}
            previewUrl={puzzle.clip_url}
            showNextTimer={!routeNumber}
          />
        </div>
      ) : (
        <>
          <p className="text-sd-muted text-sm mt-3 mb-6">
            Listen to the evidence. Name the track from as little tape as possible — every wrong lead unlocks more.
          </p>

          {/* Waveform hero */}
          <Waveform
            seed={puzzle.number}
            revealedSeconds={clipSeconds}
            playedSeconds={played}
            isPlaying={playing}
          />

          {/* Play control */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={play}
              data-testid="play-button"
              className="h-20 w-20 rounded-full flex items-center justify-center text-[#1A1108] transition-all hover:brightness-105 active:scale-95"
              style={{ backgroundColor: "var(--sd-gold)", boxShadow: "0 10px 34px rgba(242,169,59,0.5)" }}
              aria-label={playing ? "Pause evidence" : "Play evidence"}
            >
              {playing ? <Pause className="w-8 h-8" fill="#1A1108" /> : <Play className="w-8 h-8 ml-1" fill="#1A1108" />}
            </button>
          </div>
          <div className="text-center data-label text-[11px] text-sd-muted mt-3" data-testid="clip-length">
            0:{String(clipSeconds).padStart(2, "0")} of tape unlocked
          </div>

          {/* Attempt tracker */}
          <div className="flex gap-1.5 justify-center mt-4">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
              const g = progress.guesses[i];
              const isCurrent = i === attemptsUsed;
              return (
                <div
                  key={i}
                  className="h-1.5 flex-1 max-w-[46px] rounded-full"
                  style={{
                    backgroundColor: g
                      ? "var(--sd-copper)"
                      : isCurrent
                      ? "var(--sd-text)"
                      : "var(--sd-hairline)",
                    opacity: g || isCurrent ? 1 : 0.5,
                  }}
                />
              );
            })}
          </div>

          {/* Suspects */}
          <div className="mt-8">
            <div className="data-label text-[10px] text-sd-muted mb-3">The Suspects — pick one</div>
            <div className="space-y-2.5">
              {puzzle.options.map((opt) => {
                const wasWrong = progress.guesses.some((g) => g.id === opt.id && !g.correct);
                const isSelected = selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    disabled={wasWrong || submitting}
                    onClick={() => setSelected(opt.id)}
                    data-testid="mcq-option"
                    className="w-full text-left px-4 py-3 rounded-md border transition-colors disabled:opacity-40"
                    style={{
                      backgroundColor: isSelected ? "var(--sd-elevated)" : "var(--sd-surface)",
                      borderColor: wasWrong
                        ? "var(--sd-copper)"
                        : isSelected
                        ? "var(--sd-text)"
                        : "var(--sd-hairline)",
                    }}
                  >
                    <div className="font-body font-medium text-sd-text truncate">{opt.title}</div>
                    <div className="text-xs text-sd-muted truncate">{opt.artist}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => doGuess(selected)}
              disabled={!selected || submitting}
              data-testid="submit-guess-button"
              className="w-full h-13 py-3.5 rounded-md font-display font-bold uppercase tracking-wide text-lg bg-sd-gold text-[#1A1108] disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accuse This Track"}
            </button>
            <button
              onClick={() => doGuess(null)}
              disabled={submitting}
              data-testid="skip-button"
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
