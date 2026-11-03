import { useState } from 'react';
import { Check, Loader2, SkipForward, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { topicLabel } from '@/lib/topics';
import { revealsAnswer } from '@/lib/answer-guard';

// 記述カード。解答はAIが判定し、模範解答と解説をあとから見せる
export default function WrittenCard({ card, onResult, onSkip }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState('');

  const judge = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await base44.functions.invoke('judgeSecurityAnswer', {
        card_id: card.id,
        answer_text: draft.trim(),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setVerdict({ correct: res.data.correct === true, feedback: res.data.feedback || '' });
    } catch (e) {
      setError(e.message || '判定できませんでした');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {!verdict && revealsAnswer(topicLabel(card.topic), card) ? 'セキュリティ' : topicLabel(card.topic)}
        </span>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
          記述
        </span>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <SkipForward className="h-3 w-3" /> 飛ばす
          </button>
        )}
      </div>

      <p className="mt-5 whitespace-pre-wrap text-[14px] leading-loose text-foreground/90">{card.text}</p>

      {verdict ? (
        <div className="mt-5 space-y-3">
          <p
            className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
              verdict.correct ? 'text-primary' : 'text-destructive'
            }`}
          >
            {verdict.correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {verdict.correct ? '正解' : '不正解'}
          </p>
          <p className="text-[12.5px] leading-relaxed text-foreground/85">{verdict.feedback}</p>
          <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">模範解答</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/80">
              {card.model_answer || card.answer}
            </p>
            {card.explanation && (
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{card.explanation}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onResult(verdict.correct)}
            className="h-10 w-full rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.01]"
          >
            次へ
          </button>
        </div>
      ) : (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // 変換中のEnterは送信せず、確定に使う
              if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
              e.preventDefault();
              judge();
            }}
            rows={4}
            maxLength={2000}
            placeholder="分かる範囲で書いてください。長さは自由です。"
            className="mt-5 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
          <button
            type="button"
            onClick={judge}
            disabled={busy || !draft.trim()}
            className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? 'AIが判定中…' : '判定する'}
          </button>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
            Enterで送信、Shift+Enterで改行。あいまいな答えは不正解として扱います。
          </p>
        </>
      )}
    </div>
  );
}
