import React from "react";

// Build the spoiler-free emoji grid string.
// guessesCorrectness: array of booleans for each attempt made (true = correct)
// solved: whether solved; maxAttempts total slots
export function buildShareText({ number, solved, guesses, maxAttempts, score }) {
  const blocks = [];
  for (let i = 0; i < maxAttempts; i++) {
    if (i < guesses.length) {
      blocks.push(guesses[i] ? "🟩" : "🟥");
    } else {
      blocks.push("⬛");
    }
  }
  const line = blocks.join("");
  const result = solved ? `${guesses.length}/${maxAttempts}` : `X/${maxAttempts}`;
  return `🕵️ Sur Detective — Case #${number}\n${result}  ·  ${score} pts\n${line}\n`;
}

export const ShareGrid = ({ guesses, solved, maxAttempts }) => {
  const blocks = [];
  for (let i = 0; i < maxAttempts; i++) {
    if (i < guesses.length) blocks.push(guesses[i] ? "correct" : "wrong");
    else blocks.push("locked");
  }
  return (
    <div className="flex gap-1.5" data-testid="share-grid">
      {blocks.map((b, i) => (
        <div
          key={i}
          className="h-6 w-6 rounded-sm border"
          style={{
            backgroundColor:
              b === "correct" ? "var(--sd-teal)" : b === "wrong" ? "var(--sd-copper)" : "transparent",
            borderColor:
              b === "locked" ? "var(--sd-hairline)" : "transparent",
            opacity: b === "locked" ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
};
