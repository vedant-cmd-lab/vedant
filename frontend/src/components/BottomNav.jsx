import React from "react";
import { NavLink } from "react-router-dom";
import { Disc3, Archive, BarChart3, Shuffle } from "lucide-react";

const items = [
  { to: "/", label: "Case", icon: Disc3, testid: "nav-case", end: true },
  { to: "/archive", label: "Case File", icon: Archive, testid: "nav-archive" },
  { to: "/stats", label: "Record", icon: BarChart3, testid: "nav-stats" },
  { to: "/practice", label: "Practice", icon: Shuffle, testid: "nav-practice" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-[#0E0D0F]/90 backdrop-blur-xl border-t border-sd-hairline">
      <div className="flex items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, testid, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-testid={testid}
            className="flex-1 flex flex-col items-center gap-1 py-3 relative"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 bg-sd-gold rounded-full" />
                )}
                <Icon
                  className="w-5 h-5"
                  strokeWidth={1.75}
                  style={{ color: isActive ? "var(--sd-text)" : "var(--sd-muted)" }}
                />
                <span
                  className="data-label text-[10px]"
                  style={{ color: isActive ? "var(--sd-gold)" : "var(--sd-muted)" }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
