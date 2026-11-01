import { useState } from 'react';
import { ChevronRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HintPanel({ hints, used, onReveal }) {
  const [open, setOpen] = useState(used || 0);

  const reveal = () => {
    if (open >= hints.length) return;
    const next = open + 1;
    setOpen(next);
    onReveal(next);
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
          <Lightbulb className="h-3.5 w-3.5" /> hints
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {open} / {hints.length}
        </span>
      </div>

      {open === 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          まずは自分で試してみましょう。詰まったときだけ、1段階ずつヒントを開けられます。
        </p>
      )}

      <ul className="space-y-2">
        {hints.slice(0, open).map((hint, i) => (
          <li key={i} className="flex gap-2 rounded-lg bg-secondary/50 p-2.5">
            <span className="font-mono text-[10px] text-accent">{i + 1}.</span>
            <p className="text-[11px] leading-relaxed text-foreground/85">{hint}</p>
          </li>
        ))}
      </ul>

      {open < hints.length && (
        <button
          onClick={reveal}
          className={cn(
            'mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-border py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent'
          )}
        >
          {open === 0 ? 'ヒントを見る' : '次のヒント'}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}