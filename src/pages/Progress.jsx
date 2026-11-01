import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { LABS } from '@/lib/labs';
import { ArrowRight, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProgressPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const records = await base44.entities.LabProgress.filter({ created_by_id: user.id });
        setRows(records);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const bySlug = (slug) => rows.find((r) => r.lab_slug === slug);
  const cleared = LABS.filter((lab) => bySlug(lab.slug)?.status === 'cleared').length;
  const xp = rows.reduce((sum, r) => sum + (r.xp || 0), 0);
  const hints = rows.reduce((sum, r) => sum + (r.hints_used || 0), 0);
  const attempts = rows.reduce((sum, r) => sum + (r.attempts || 0), 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">learning record</p>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">学習の記録</h1>
      <p className="mt-2 text-sm text-muted-foreground">フラグの提出と、開いたヒントの数がここに集計されます。</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {[
          ['クリア', `${cleared} / ${LABS.length}`],
          ['獲得XP', `${xp}`],
          ['ヒント使用', `${hints}`],
          ['提出回数', `${attempts}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 font-heading text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <div className="hidden grid-cols-[1.6fr_repeat(3,0.7fr)_auto] gap-4 border-b border-border bg-secondary/40 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:grid">
          <span>lab</span>
          <span>状態</span>
          <span>提出</span>
          <span>ヒント</span>
          <span>クリア日</span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center font-mono text-[11px] text-muted-foreground">読み込み中…</div>
        ) : (
          LABS.map((lab) => {
            const row = bySlug(lab.slug);
            const done = row?.status === 'cleared';
            return (
              <Link
                key={lab.slug}
                to={`/lab/${lab.slug}`}
                className="grid grid-cols-2 items-center gap-4 border-b border-border/70 px-5 py-4 text-sm transition-colors last:border-0 hover:bg-secondary/30 sm:grid-cols-[1.6fr_repeat(3,0.7fr)_auto]"
              >
                <span className="flex items-center gap-2 font-medium">
                  <span className="font-mono text-[10px] text-muted-foreground">{lab.no}</span>
                  {lab.title}
                </span>
                <span
                  className={cn(
                    'font-mono text-[10px]',
                    done ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {done ? 'CLEARED' : row ? 'IN PROGRESS' : 'NOT STARTED'}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">{row?.attempts ?? 0}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{row?.hints_used ?? 0}</span>
                <span className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                  {row?.cleared_at ? moment(row.cleared_at).format('YYYY/MM/DD') : '—'}
                  {done ? <Flag className="h-3 w-3 text-primary" /> : <ArrowRight className="h-3 w-3" />}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}