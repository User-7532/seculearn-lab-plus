import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock, RotateCcw, Target } from 'lucide-react';
import { recordReview } from '@/lib/srs';
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
  const [params] = useSearchParams();
  const lab = findLab(slug);
  const { record, loading, save } = useLabProgress(slug || '');
  const [reviewResult, setReviewResult] = useState(null);

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

  // 復習の日に開いたときは、クリア済みでももう一度フラグを取り直す
  const reviewing = params.get('review') === '1' && cleared;

  const scheduleReview = (correct) =>
    recordReview({ item_type: 'lab', item_id: lab.slug, title: lab.title, topic: lab.slug, correct }).catch(() => {});

  const handleAttempt = async (value) => {
    const attempts = (record?.attempts || 0) + 1;
    if (value === lab.flag) {
      await save({
        status: 'cleared',
        attempts,
        cleared_at: new Date().toISOString(),
        xp: cleared ? record?.xp || 0 : XP[lab.difficulty],
      });
      // はじめてクリアしたら、忘れかけたころにもう一度出す
      if (!cleared) scheduleReview(true);
      return true;
    }
    await save({ attempts });
    return false;
  };

  const handleReviewAttempt = async (value) => {
    const ok = value === lab.flag;
    // 「思い出せない」を選んだあとは、ヒントを見て取り直しても間隔は伸ばさない
    if (ok && reviewResult !== 'wrong') await scheduleReview(true);
    if (ok) setReviewResult('ok');
    return ok;
  };

  const giveUpReview = async () => {
    await scheduleReview(false);
    setReviewResult('wrong');
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

          {!loading && reviewing && (
            <div className="rounded-xl border border-accent/40 bg-accent/[0.07] p-4">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                <RotateCcw className="h-3.5 w-3.5" /> review
              </div>
              <p className="mt-2 text-xs leading-relaxed text-foreground/85">
                復習の日です。ヒントを見ずに、もう一度フラグを取れるか試しましょう。取れたら次の復習までの間隔が伸びます。
              </p>
              {reviewResult === 'wrong' && (
                <p className="mt-2 text-[11px] leading-relaxed text-destructive">明日もう一度出します。下のヒントで手順を確かめておきましょう。</p>
              )}
            </div>
          )}

          {!loading && (
            <>
              {(!reviewing || reviewResult === 'wrong') && (
                <HintPanel
                  hints={lab.hints}
                  used={record?.hints_used || 0}
                  onReveal={(n) => save({ hints_used: Math.max(n, record?.hints_used || 0) })}
                />
              )}
              {reviewing ? (
                reviewResult === 'ok' ? (
                  <FlagSubmit cleared onAttempt={handleReviewAttempt} />
                ) : (
                  <>
                    <FlagSubmit key="review" cleared={false} onAttempt={handleReviewAttempt} />
                    {reviewResult === null && (
                      <button
                        type="button"
                        onClick={giveUpReview}
                        className="w-full rounded-lg border border-border py-2 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        思い出せない（明日また出す）
                      </button>
                    )}
                  </>
                )
              ) : (
                <FlagSubmit cleared={cleared} onAttempt={handleAttempt} />
              )}
              <Link
                to={`/cards?topic=${lab.slug}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card/60 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <BookOpen className="h-3.5 w-3.5" /> この脆弱性を言葉で確かめる
              </Link>
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