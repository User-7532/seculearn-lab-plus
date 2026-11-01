import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Clock, Flag } from 'lucide-react';
import { difficultyClass } from '@/lib/labs';
import { cn } from '@/lib/utils';

export default function LabCard({ lab, status, index = 0 }) {
  const cleared = status === 'cleared';

  return (
    <Link
      to={`/lab/${lab.slug}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/80"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/[0.06] blur-2xl transition-opacity duration-500 group-hover:opacity-100 sm:opacity-0" />

      <div>
        <div className="mb-5 flex items-start justify-between gap-3">
          <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">{lab.no}</span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide',
                difficultyClass[lab.difficulty]
              )}
            >
              {lab.difficulty}
            </span>
            {cleared && (
              <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                <Check className="h-2.5 w-2.5" /> CLEAR
              </span>
            )}
          </div>
        </div>

        <h3 className="font-heading text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
          {lab.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lab.hook}</p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4">
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> {lab.minutes}min
          </span>
          <span className="flex items-center gap-1.5">
            <Flag className="h-3 w-3" /> 1 flag
          </span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}