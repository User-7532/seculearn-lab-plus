import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { findLab } from '@/lib/labs';
import { topicLabel } from '@/lib/topics';
import { questionPreview } from '@/lib/answer-guard';
import { todayISO } from '@/lib/srs';
import { recordKnowledgeAnswer } from '@/lib/knowledge';
import { refineCards, refineOldCardsInBackground } from '@/lib/refine-written';
import ClozeCard from '@/components/knowledge/ClozeCard';
import WrittenCard from '@/components/knowledge/WrittenCard';

const dayLabel = (iso) => {
  const [, m, d] = String(iso).split('-');
  return `${Number(m)}/${Number(d)}`;
};

export default function Review() {
  const [items, setItems] = useState(null);
  const [cardsById, setCardsById] = useState(new Map());
  const [session, setSession] = useState(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState({ correct: 0, wrong: 0 });

  useEffect(() => {
    base44.entities.ReviewItem.list({ sort: 'due_date', limit: 300 })
      .then(async (page) => {
        const list = page.items || [];
        setItems(list);
        const ids = list.filter((r) => r.item_type === 'card').map((r) => r.item_id);
        if (ids.length) {
          const cards = await base44.entities.KnowledgeCard.filter({ id: { $in: ids } }, { limit: 300 });
          const map = new Map((cards.items || []).map((c) => [c.id, c]));
          setCardsById(map);
          // 今日の復習に出る記述問題は、始める前に聞き方を見直す
          const dueIds = new Set(list.filter((r) => r.item_type === 'card' && r.due_date <= todayISO()).map((r) => r.item_id));
          const fixed = await refineCards([...map.values()].filter((c) => dueIds.has(c.id)));
          if (fixed.length) {
            setCardsById((prev) => {
              const next = new Map(prev);
              fixed.forEach((c) => next.set(c.id, c));
              return next;
            });
          }
        }
        refineOldCardsInBackground();
      })
      .catch(() => setItems([]));
  }, []);

  const today = todayISO();
  const due = useMemo(() => (items || []).filter((r) => r.due_date <= today), [items, today]);
  const upcoming = useMemo(() => (items || []).filter((r) => r.due_date > today).slice(0, 8), [items, today]);
  const dueLabs = due.filter((r) => r.item_type === 'lab');
  const dueCards = due.filter((r) => r.item_type === 'card' && cardsById.has(r.item_id));

  const start = () => {
    setSession(dueCards.map((r) => cardsById.get(r.item_id)));
    setIdx(0);
    setRevealed(false);
    setDone({ correct: 0, wrong: 0 });
  };

  const current = session && idx < session.length ? session[idx] : null;

  const answer = (correct) => {
    if (!current) return;
    recordKnowledgeAnswer(current, correct, 'review');
    setDone((d) => ({ correct: d.correct + (correct ? 1 : 0), wrong: d.wrong + (correct ? 0 : 1) }));
    // 済んだカードは今日の一覧から外す
    setItems((prev) => (prev || []).map((r) => (r.item_type === 'card' && r.item_id === current.id ? { ...r, due_date: '9999-12-31' } : r)));
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  if (items === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">spaced review</p>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">忘れかけたころに、もう一度</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        クリアしたラボと解いたカードを、1日・3日・7日…と間隔を空けて出し直します。間違えると翌日に戻ります。
      </p>

      {session ? (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>
              {Math.min(idx + 1, session.length)} / {session.length}
            </span>
            <span>
              正解 {done.correct} ・ わからなかった {done.wrong}
            </span>
          </div>
          {current ? (
            current.kind === 'written' ? (
              <WrittenCard key={current.id} card={current} onResult={answer} />
            ) : (
              <>
                <ClozeCard key={current.id} card={current} revealed={revealed} onToggle={() => setRevealed((v) => !v)} />
                <div className="mt-3 flex gap-2">
                  {!revealed ? (
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      className="h-10 flex-1 rounded-lg border border-border text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      答えを見る
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => answer(false)}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 text-xs text-destructive"
                      >
                        <X className="h-3.5 w-3.5" /> わからなかった
                      </button>
                      <button
                        type="button"
                        onClick={() => answer(true)}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 text-xs text-primary"
                      >
                        <Check className="h-3.5 w-3.5" /> 言えた
                      </button>
                    </>
                  )}
                </div>
              </>
            )
          ) : (
            <div className="rounded-2xl border border-primary/40 bg-primary/10 p-8 text-center">
              <p className="text-sm text-foreground/90">今日のカードの復習は終わりです。</p>
              <button
                type="button"
                onClick={() => setSession(null)}
                className="mt-4 rounded-full border border-border px-4 py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                一覧に戻る
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">今日のカード</p>
              <p className="mt-2 font-heading text-3xl font-semibold">{dueCards.length}</p>
              <button
                type="button"
                onClick={start}
                disabled={dueCards.length === 0}
                className="mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" /> まとめて復習する
              </button>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">今日のラボ</p>
              <p className="mt-2 font-heading text-3xl font-semibold">{dueLabs.length}</p>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                ヒントを見ずに、もう一度フラグを取れるか試します。
              </p>
            </div>
          </div>

          {dueLabs.length > 0 && (
            <div className="mt-6 space-y-2">
              {dueLabs.map((r) => {
                const lab = findLab(r.item_id);
                if (!lab) return null;
                return (
                  <Link
                    key={r.id}
                    to={`/lab/${lab.slug}?review=1`}
                    className="group flex items-center justify-between rounded-xl border border-border bg-card/60 px-5 py-4 transition-colors hover:border-primary/40"
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-muted-foreground">{lab.no}</span>
                      <span className="text-sm font-medium">{lab.title}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-primary">
                      もう一度解く <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {due.length === 0 && (
            <div className="mt-6 rounded-xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? 'ラボをクリアしたり、カードを解いたりすると、ここに復習の予定がたまります。'
                : '今日の復習はありません。'}
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="mt-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">upcoming</p>
              <div className="mt-3 divide-y divide-border/70 overflow-hidden rounded-xl border border-border">
                {upcoming.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[12px]">
                    <span className="min-w-0 truncate">
                      <span className="mr-2 font-mono text-[10px] text-muted-foreground">
                        {r.item_type === 'lab' ? 'LAB' : 'CARD'}
                      </span>
                      {/* カードは答えが題名になっていることがあるので、答えを伏せた問題文を出す */}
                      {r.item_type === 'lab'
                        ? findLab(r.item_id)?.title || r.title
                        : questionPreview(cardsById.get(r.item_id)) || topicLabel(r.topic)}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{dayLabel(r.due_date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
