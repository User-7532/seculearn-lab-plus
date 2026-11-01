import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock, Target } from 'lucide-react';
import { findLab, LABS, difficultyClass } from '@/lib/labs';
import { cn } from '@/lib/utils';
import useLabProgress from '@/hooks/useLabProgress';
import SqlInjectionLab from '@/components/labs/SqlInjectionLab';
import XssLab from '@/components/labs/XssLab';
import IdorLab from '@/components/labs/IdorLab';
import TraversalLab from '@/components/labs/TraversalLab';
import HintPanel from '@/components/HintPanel';
import FlagSubmit from '@/components/FlagSubmit';

const LAB_VIEWS = {
  'sql-injection': SqlInjectionLab,
  'stored-xss': XssLab,
  idor: IdorLab,
  'path-traversal': TraversalLab,
};

const XP = { 初級: 100, 中級: 150 };

export default function LabDetail() {
  const { slug } = useParams();
  const lab = findLab(slug);
  const { record, loading, save } = useLabProgress(slug || '');

  if (!lab) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mt-3 font-heading text-2xl font-semibold">このラボは存在しません</h1>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          ラボ一覧へ戻る
        </Link>
      </div>
    );
  }

  const View = LAB_VIEWS[lab.slug];
  const cleared = record?.status === 'cleared';
  const index = LABS.findIndex((l) => l.slug === lab.slug);
  const next = LABS[index + 1];

  const handleAttempt = async (value) => {
    const attempts = (record?.attempts || 0) + 1;
    if (value === lab.flag) {
      await save({
        status: 'cleared',
        attempts,
        cleared_at: new Date().toISOString(),
        xp: cleared ? record?.xp || 0 : XP[lab.difficulty],
      });
      return true;
    }
    await save({ attempts });
    return false;
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> all labs
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">{lab.no}</span>
            <span className={cn('rounded-full border px-2 py-0.5 font-mono text-[10px]', difficultyClass[lab.difficulty])}>
              {lab.difficulty}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{lab.category}</span>
            {cleared && (
              <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                <Check className="h-2.5 w-2.5" /> CLEAR
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{lab.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <Clock className="h-3 w-3" /> {lab.minutes} min
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div>{View ? <View /> : null}</div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <p className="text-[13px] leading-loose text-muted-foreground">{lab.brief}</p>
            <div className="mt-4 flex gap-2 rounded-lg bg-primary/[0.07] p-3">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-[11px] leading-relaxed text-foreground/85">{lab.goal}</p>
            </div>
          </div>

          {!loading && (
            <>
              <HintPanel
                hints={lab.hints}
                used={record?.hints_used || 0}
                onReveal={(n) => save({ hints_used: n })}
              />
              <FlagSubmit cleared={cleared} onAttempt={handleAttempt} />
            </>
          )}
        </div>
      </div>

      {next && (
        <Link
          to={`/lab/${next.slug}`}
          className="group mt-10 flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">next lab</p>
            <p className="mt-1 font-heading text-base font-semibold transition-colors group-hover:text-primary">
              {next.no} {next.title}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      )}
    </div>
  );
}