import React from "react";
import { getStats } from "@/lib/storage";
import { MAX_ATTEMPTS } from "@/lib/game";

const Stat = ({ label, value, testid }) => (
  <div className="bg-sd-surface border border-sd-hairline rounded-lg p-4 text-center">
    <div className="font-data text-3xl text-sd-text" data-testid={testid}>{value}</div>
    <div className="data-label text-[10px] text-sd-muted mt-1">{label}</div>
  </div>
);

export default function StatsPage() {
  const stats = getStats();
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const maxDist = Math.max(1, ...Object.values(stats.distribution));

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="data-label text-[11px] text-sd-muted">The Detective's</div>
      <h1 className="font-display font-bold uppercase text-3xl tracking-tight mt-1 text-sd-text">Record</h1>
      <p className="text-sd-muted text-sm mt-2 mb-6">Your standing across every case worked.</p>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Cases Worked" value={stats.played} testid="stat-played" />
        <Stat label="Win Rate" value={`${winPct}%`} testid="stat-winrate" />
        <Stat label="Current Streak" value={stats.currentStreak} testid="stat-streak" />
        <Stat label="Best Streak" value={stats.maxStreak} testid="stat-maxstreak" />
      </div>

      <div className="bg-sd-surface border border-sd-hairline rounded-lg p-4 mt-3 text-center">
        <div className="font-data text-3xl text-sd-text" data-testid="stat-score">{stats.totalScore}</div>
        <div className="data-label text-[10px] text-sd-muted mt-1">Total Score</div>
      </div>

      <div className="mt-8">
        <div className="data-label text-[10px] text-sd-muted mb-3">Solve Distribution</div>
        <div className="space-y-2">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
            const attempt = i + 1;
            const count = stats.distribution[attempt] || 0;
            return (
              <div key={attempt} className="flex items-center gap-3">
                <div className="data-label text-[11px] text-sd-muted w-4">{attempt}</div>
                <div className="flex-1 bg-sd-elevated rounded-sm h-6 overflow-hidden">
                  <div
                    className="h-full flex items-center justify-end px-2 rounded-sm transition-all"
                    style={{
                      width: `${Math.max(8, (count / maxDist) * 100)}%`,
                      backgroundColor: count ? "var(--sd-teal)" : "var(--sd-hairline)",
                    }}
                  >
                    <span className="font-data text-[11px]" style={{ color: count ? "#0E1615" : "var(--sd-muted)" }}>
                      {count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
