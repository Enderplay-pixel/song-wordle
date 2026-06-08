"use client";

import { GuessResult, SNIPPET_DURATIONS } from "@/lib/gameLogic";

interface GameBoardProps {
  guesses: GuessResult[];
  currentAttempt: number;
}

const LABELS = ["0.1s", "0.5s", "2s", "4s", "8s", "Full"];

export default function GameBoard({ guesses, currentAttempt }: GameBoardProps) {
  return (
    <div className="flex gap-1.5 w-full max-w-md">
      {Array.from({ length: 6 }).map((_, i) => {
        const result = guesses[i];
        const isCurrent = i === currentAttempt;

        let bg = "bg-zinc-800 border-zinc-700";
        let text = "text-zinc-500";

        if (result === "correct") {
          bg = "bg-green-600 border-green-500";
          text = "text-white";
        } else if (result === "wrong" || result === "skip") {
          bg = "bg-red-900 border-red-800";
          text = "text-red-300";
        } else if (isCurrent) {
          bg = "bg-zinc-800 border-zinc-500";
          text = "text-zinc-300";
        }

        return (
          <div
            key={i}
            className={`
              flex-1 h-10 rounded flex items-center justify-center
              border text-xs font-mono transition-all duration-300
              ${bg} ${text}
              ${isCurrent ? "ring-1 ring-red-600/50" : ""}
            `}
          >
            {LABELS[i]}
          </div>
        );
      })}
    </div>
  );
}
