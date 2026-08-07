import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, CheckCircle2, XCircle, Circle } from "lucide-react";
import { getArchive } from "@/lib/api";
import { getProgress } from "@/lib/storage";

export default function ArchivePage() {
  const [data, setData] = React.useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    getArchive().then(setData).catch(() => setData({ cases: [] }));
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center pt-40 text-sd-muted">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="data-label text-[11px] text-sd-muted">The Archive</div>
      <h1 className="font-display font-bold uppercase text-3xl tracking-tight mt-1 text-sd-text">Case File</h1>
      <p className="text-sd-muted text-sm mt-2 mb-6">Every case, sealed and stored. Reopen an old one to test your ear.</p>

      <div className="space-y-2">
        {data.cases.map((c) => {
          const p = getProgress(c.number);
          let status = "open";
          if (p.finished) status = p.solved ? "solved" : "cold";
          return (
            <button
              key={c.number}
              onClick={() => navigate(c.is_today ? "/" : `/case/${c.number}`)}
              data-testid="archive-case"
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-md bg-sd-surface border border-sd-hairline hover:bg-sd-elevated transition-colors text-left"
            >
              <div className="shrink-0">
                {status === "solved" && <CheckCircle2 className="w-5 h-5" style={{ color: "var(--sd-teal)" }} />}
                {status === "cold" && <XCircle className="w-5 h-5" style={{ color: "var(--sd-copper)" }} />}
                {status === "open" && <Circle className="w-5 h-5 text-sd-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="data-label text-[11px] text-sd-text">
                  Case #{String(c.number).padStart(3, "0")}
                  {c.is_today && <span className="ml-2 text-sd-gold">· Today</span>}
                </div>
                <div className="text-xs text-sd-muted mt-0.5">
                  {status === "solved" && `Cracked in ${p.solvedOnAttempt} · ${p.score} pts`}
                  {status === "cold" && "Unsolved"}
                  {status === "open" && (c.is_today ? "Awaiting your verdict" : "Not yet opened")}
                </div>
              </div>
              <div className="data-label text-[10px] text-sd-muted mr-1">{c.date}</div>
              <ChevronRight className="w-4 h-4 text-sd-muted shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
