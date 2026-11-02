import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { TOPICS } from '@/lib/topics';
import { recordKnowledgeAnswer } from '@/lib/knowledge';
import { cn } from '@/lib/utils';
import ClozeCard from '@/components/knowledge/ClozeCard';
import WrittenCard from '@/components/knowledge/WrittenCard';
import ExternalImport from '@/components/ExternalImport';
import { useToast } from '@/components/ui/use-toast';

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const Chip = ({ active, onClick, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      'rounded-full border px-3 py-1 font-mono text-[10px] transition-colors',
      active ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
    )}
  >
    {children}
  </button>
);

export default function Cards() {
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') || 'all';

  const [cards, setCards] = useState(null);
  const [wrongIds, setWrongIds] = useState(new Set());
  const [light, setLight] = useState(false);
  const [wrongOnly, setWrongOnly] = useState(false);
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const { toast } = useToast();
  const autoTried = useRef(new Set());

  useEffect(() => {
    base44.entities.KnowledgeCard.list({ sort: '-created_date', limit: 500 })
      .then((page) => setCards(page.items || []))
      .catch(() => setCards([]));
    base44.entities.KnowledgeAttempt.list({ sort: '-created_date', limit: 500 })
      .then((page) => {
        // カードごとに一番新しい解答だけを見て、間違えたままのカードを集める
        const latest = new Map();
        (page.items || []).forEach((a) => {
          if (!latest.has(a.card_id)) latest.set(a.card_id, a.correct === true);
        });
        setWrongIds(new Set([...latest].filter(([, ok]) => !ok).map(([id]) => id)));
      })
      .catch(() => {});
  }, []);

  const pool = useMemo(
    () =>
      (cards || []).filter(
        (c) =>
          (topic === 'all' || c.topic === topic) &&
          (!light || c.kind !== 'written') &&
          (!wrongOnly || wrongIds.has(c.id))
      ),
    [cards, topic, light, wrongOnly, wrongIds]
  );

  // 条件が変わったら山札を作り直す
  useEffect(() => {
    if (cards === null) return;
    setDeck(shuffle(pool).slice(0, 10));
    setIdx(0);
    setRevealed(false);
    setNote('');
  }, [cards === null, topic, light, wrongOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async (target = topic) => {
    if (busy || target === 'all') return;
    setBusy(true);
    setNote('');
    try {
      const res = await base44.functions.invoke('generateSecurityCards', { topic: target, count: 6 });
      if (res.data?.error) throw new Error(res.data.error);
      const created = (res.data?.cards || []).filter((c) => !light || c.kind !== 'written');
      if (created.length === 0) {
        setNote(res.data?.reason || '問題を用意できませんでした。少し待ってからもう一度お試しください。');
        return;
      }
      setCards((prev) => [...created, ...(prev || [])]);
      setDeck((prev) => [...prev, ...shuffle(created)]);
    } catch (e) {
      setNote(e.message || '問題を用意できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  // 分野を選んだときにカードが少なければ、一度だけ自動で用意する
  useEffect(() => {
    if (cards === null || topic === 'all' || wrongOnly) return;
    const count = cards.filter((c) => c.topic === topic).length;
    if (count < 3 && !autoTried.current.has(topic)) {
      autoTried.current.add(topic);
      generate(topic);
    }
  }, [cards === null, topic, wrongOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = deck[idx] || null;

  const advance = () => {
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  const answer = (correct) => {
    if (!current) return;
    setTally((t) => ({ correct: t.correct + (correct ? 1 : 0), wrong: t.wrong + (correct ? 0 : 1) }));
    if (!correct) setWrongIds((prev) => new Set(prev).add(current.id));
    recordKnowledgeAnswer(current, correct, 'practice');
    advance();
  };

  const chooseTopic = (id) => {
    const next = new URLSearchParams(params);
    if (id === 'all') next.delete('topic');
    else next.set('topic', id);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">knowledge cards</p>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">言葉で説明できるか確かめる</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        ラボで手を動かした脆弱性の仕組みと対策を、穴埋めと記述で確かめます。間違えたカードは復習に回ります。
      </p>

      <ExternalImport
        onDone={(result) => {
          // 取り込んだカードを、そのまま続けて解けるようにする
          setCards((prev) => [...result.cards, ...(prev || [])]);
          if (result.cards.length) {
            setDeck(shuffle(result.cards));
            setIdx(0);
            setRevealed(false);
            setNote('');
          }
          toast({
            title: result.cards.length ? `知識カードを${result.cards.length}枚作りました` : '会話の要点を覚えました',
            description: [
              result.scheduled ? `今日の復習に${result.scheduled}枚` : '',
              result.memoryUpdated ? 'アシスタントの記憶を更新' : '',
            ]
              .filter(Boolean)
              .join('・'),
          });
        }}
      />

      <div className="mt-8 flex flex-wrap gap-1.5">
        <Chip active={topic === 'all'} onClick={() => chooseTopic('all')}>
          すべて
        </Chip>
        {TOPICS.map((t) => (
          <Chip key={t.id} active={topic === t.id} onClick={() => chooseTopic(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip active={light} onClick={() => setLight((v) => !v)} title="急ぐときは記述を外して穴埋めだけにします">
          記述を外す
        </Chip>
        <Chip active={wrongOnly} onClick={() => setWrongOnly((v) => !v)} title="最後に間違えたままのカードだけで練習します">
          まちがえた問題だけ
        </Chip>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          正解 {tally.correct} ・ わからなかった {tally.wrong}
        </span>
      </div>

      <div className="mt-6">
        {cards === null ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : current ? (
          <>
            {current.kind === 'written' ? (
              <WrittenCard key={current.id} card={current} onResult={answer} onSkip={advance} />
            ) : (
              <>
                <ClozeCard key={current.id} card={current} revealed={revealed} onToggle={() => setRevealed((v) => !v)} />
                <div className="mt-3 flex gap-2">
                  {!revealed ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setRevealed(true)}
                        className="h-10 flex-1 rounded-lg border border-border text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        答えを見る
                      </button>
                      <button
                        type="button"
                        onClick={advance}
                        className="h-10 rounded-lg border border-border px-4 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        飛ばす
                      </button>
                    </>
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
            )}
            <p className="mt-3 text-right font-mono text-[10px] text-muted-foreground/70">
              {idx + 1} / {deck.length}
            </p>
          </>
        ) : busy ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="font-mono text-[11px] text-muted-foreground">AIが問題を用意しています</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {note ||
                (wrongOnly
                  ? '間違えたままのカードはありません。'
                  : deck.length > 0
                    ? 'この山はここまでです。'
                    : topic === 'all'
                      ? 'まだカードがありません。上で分野を選ぶと、AIが問題を用意します。'
                      : 'この分野のカードはまだありません。')}
            </p>
            {deck.length > 0 && !wrongOnly && (
              <button
                type="button"
                onClick={() => {
                  setDeck(shuffle(pool).slice(0, 10));
                  setIdx(0);
                }}
                className="mt-4 rounded-full border border-border px-4 py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                もう一周する
              </button>
            )}
          </div>
        )}
      </div>

      {topic !== 'all' && !wrongOnly && (
        <button
          type="button"
          onClick={() => generate()}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          この分野の問題をAIで追加する
        </button>
      )}
    </div>
  );
}
