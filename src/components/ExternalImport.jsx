import { useState } from 'react';
import { ClipboardPaste, Loader2 } from 'lucide-react';
import { IMPORT_MAX, IMPORT_MIN, importExternal } from '@/lib/external-import';

// ほかのAIとのやり取りを貼り付けて、アプリ全体に取り込む窓口
export default function ExternalImport({ onDone }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const ready = text.trim().length >= IMPORT_MIN;

  const run = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setNote('');
    try {
      const result = await importExternal(text);
      if (result.cards.length === 0 && !result.memoryUpdated) {
        setNote('取り込めるものが見つかりませんでした。少し待ってからもう一度お試しください。');
        return;
      }
      setText('');
      setOpen(false);
      onDone(result);
    } catch (e) {
      setNote(e.message || '取り込めませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] transition-colors ${
          open ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
        }`}
        title="ほかのAIとの対話を貼り付けて、知識カードを作ります"
      >
        <ClipboardPaste className="h-3 w-3" />
        他AIの会話を取り込む
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-card/60 p-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            ほかのAIとのやり取りをそのまま貼り付けてください。セキュリティの知識を知識カードにして今日の復習に入れ、会話の要点はアシスタントが覚えます。ラボのフラグ（FLAG&#123;…&#125;）は伏せて扱います。
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            maxLength={IMPORT_MAX}
            placeholder="（例）AIとの対話をコピーして貼り付け"
            className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-[12px] leading-relaxed outline-none focus:border-primary/60"
          />
          {note && <p className="mt-1.5 text-[11px] text-destructive">{note}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={run}
              disabled={busy || !ready}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? '対話を読み取っています（1〜2分かかることがあります）…' : 'この対話を取り込む'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setNote('');
              }}
              className="h-9 shrink-0 rounded-lg border border-border px-4 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              閉じる
            </button>
          </div>
          <p className="mt-1.5 text-right font-mono text-[10px] tabular-nums text-muted-foreground/70">
            {text.trim().length.toLocaleString()} / {IMPORT_MAX.toLocaleString()}字
          </p>
        </div>
      )}
    </div>
  );
}
