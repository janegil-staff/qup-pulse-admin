// qup-pulse-admin/src/components/chat/TypingDots.js
"use client";

export default function TypingDots({ visible }) {
  if (!visible) return null;

  return (
    <div className="px-4 pb-1" aria-live="polite">
      <span className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-3 py-2">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce"
            style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
          />
        ))}
      </span>
    </div>
  );
}
