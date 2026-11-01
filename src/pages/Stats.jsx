import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { LABS } from '@/lib/labs';
import { TOPICS } from '@/lib/topics';
import { toISO } from '@/lib/srs';

const DAYS = 14;

export default function Stats() {
  const [attempts, setAttempts] = useState(null);
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    base44.entities.KnowledgeAttempt.list({ sort: '-created_date', limit: 1000 })
      .then((page) => setAttempts(page.items || []))
      .catch(() => setAttempts([]));
    base44.entities.LabProgress.list({ limit: 50 })
      .then((page) => setProgress(page.items || []))
      .catch(() => {});
  }, []);

  // 分野ごとの正答率と、ラボで使ったヒント・提出回数をまとめる
  const rows = useMemo(() => {
    if (!attempts) return [];
    return TOPICS.map((t) => {
      const list = attempts.filter((a) => a.topic === t.id);
      const ok = list.filter((a) => a.correct).length;
      const lab = progress.find((p) => p.lab_slug === t.id);
      return {
        ...t,
        total: list.length,
        rate: list.length ? Math.round((ok / list.length) * 100) : null,
        hints: lab?.hints_used ?? null,
        tries: lab?.attempts ?? null,
        cleared: lab?.status === 'cleared',
        isLab: LABS.some((l) => l.slug === t.id),
      };
    });
  }, [attempts, progress]);

  const weakest = useMemo(
    () => rows.filter((r) => r.total >= 3 && r.rate !== null).sort((a, b) => a.rate - b.rate)[0] || null,
    [rows]
  );

  // 直近14日の解答数と正答率
  const daily = useMemo(() => {
    if (!attempts) return [];
    const days = [];
    for (let i = DAYS - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ key: toISO(d), label: `${d.getMonth() + 1}/${d.getDate()}`, total: 0, ok: 0 });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    attempts.forEach((a) => {
      const day = byKey.get(toISO(new Date(a.created_date)));
      if (!day) return;
      day.total += 1;
      if (a.correct) day.ok += 1;
    });
    return days.map((d) => ({ label: d.label, 解答数: d.total, 正答率: d.total ? Math.round((d.ok / d.total) * 100) : null }));
  }, [attempts]);

  if (attempts === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const total = attempts.length;
  const ok = attempts.filter((a) => a.correct).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">weakness analysis</p>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">弱点分析</h1>
      <p className="mt-2 text-sm text-muted-foreground">知識カードの正答率と、ラボでのヒント・提出の回数を分野ごとに並べます。</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">カードの解答</p>
          <p className="mt-2 font-heading text-2xl font-semibold">{total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">全体の正答率</p>
          <p className="mt-2 font-heading text-2xl font-semibold">{total ? `${Math.round((ok / total) * 100)}%` : '—'}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">いちばん苦手な分野</p>
          <p className="mt-2 truncate font-heading text-lg font-semibold">
            {weakest ? `${weakest.label}（${weakest.rate}%）` : '3問以上解くと表示'}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <div className="hidden grid-cols-[1.4fr_1.6fr_0.6fr_0.6fr_auto] gap-4 border-b border-border bg-secondary/40 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:grid">
          <span>分野</span>
          <span>カードの正答率</span>
          <span>ヒント</span>
          <span>提出</span>
          <span />
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-2 items-center gap-x-4 gap-y-2 border-b border-border/70 px-5 py-4 text-sm last:border-0 sm:grid-cols-[1.4fr_1.6fr_0.6fr_0.6fr_auto]"
          >
            <span className="flex items-center gap-2 font-medium">
              <span className="font-mono text-[10px] text-muted-foreground">{r.no}</span>
              {r.label}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <span
                  className={`block h-full rounded-full ${r.rate !== null && r.rate < 60 ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${r.rate ?? 0}%` }}
                />
              </span>
              <span className="w-16 text-right font-mono text-[10px] text-muted-foreground">
                {r.rate === null ? '未解答' : `${r.rate}%・${r.total}問`}
              </span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">{r.isLab ? r.hints ?? 0 : '—'}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{r.isLab ? r.tries ?? 0 : '—'}</span>
            <Link
              to={`/cards?topic=${r.id}`}
              className="justify-self-end font-mono text-[10px] text-primary transition-opacity hover:opacity-80"
            >
              練習する
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">直近{DAYS}日</p>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Line yAxisId="left" type="monotone" dataKey="解答数" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="正答率" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls unit="%" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
