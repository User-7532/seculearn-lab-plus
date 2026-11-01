import { Lock } from 'lucide-react';

export default function LabShell({ title, host, urlBar, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent/40" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2 border-b border-border bg-background/40 px-3 py-2 font-mono text-[11px]">
        <Lock className="h-3 w-3 shrink-0 text-primary/70" />
        {urlBar || <span className="truncate text-muted-foreground">http://{host}</span>}
      </div>
      <div className="bg-background/20 p-5">{children}</div>
    </div>
  );
}