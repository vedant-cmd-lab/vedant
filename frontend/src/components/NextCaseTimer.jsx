import React from "react";

function msToNextIstMidnight() {
  const now = new Date();
  // shift to IST (UTC+5:30) regardless of the viewer's local zone
  const istNow = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
  const next = new Date(istNow);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - istNow.getTime());
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export const NextCaseTimer = () => {
  const [ms, setMs] = React.useState(msToNextIstMidnight());
  React.useEffect(() => {
    const t = setInterval(() => setMs(msToNextIstMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="font-data text-2xl tracking-[0.12em] text-sd-text" data-testid="next-case-timer">
      {fmt(ms)}
    </div>
  );
};
