import { topicLabel } from '@/lib/topics';

// 穴埋めカード。隠しているあいだは答えの文字を画面に置かない（切り替え時に一瞬見えるのを防ぐ）
export default function ClozeCard({ card, revealed, onToggle }) {
  const parts = String(card?.text || '').split('___');

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {topicLabel(card.topic)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">cloze</span>
      </div>

      <p className="mt-5 text-[14px] leading-loose text-foreground/90">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <button
                type="button"
                onClick={onToggle}
                aria-label={revealed ? undefined : '空所を開く'}
                className={
                  revealed
                    ? 'mx-0.5 rounded bg-primary/15 px-1 font-mono font-medium text-primary'
                    : 'mx-0.5 rounded bg-secondary px-7 shadow-[inset_0_-2px_0_hsl(var(--primary)/0.5)]'
                }
              >
                {revealed ? card.answer : '\u00a0'}
              </button>
            )}
          </span>
        ))}
      </p>

      {revealed ? (
        <div className="mt-5 rounded-lg border border-border bg-secondary/40 px-4 py-3">
          <p className="text-[12px] leading-relaxed text-muted-foreground">{card.explanation || '解説はまだありません'}</p>
        </div>
      ) : (
        <p className="mt-5 font-mono text-[10px] text-muted-foreground/70">空欄をタップすると答えが見られます</p>
      )}
    </div>
  );
}
