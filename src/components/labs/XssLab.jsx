import { useState } from 'react';
import LabShell from './LabShell';
import { AlertTriangle, MessageSquare } from 'lucide-react';

const INITIAL = [
  { id: 1, author: 'mika', body: 'はじめまして！今日のランチ最高でした。' },
  { id: 2, author: 'guest_88', body: 'このサイト、デザインが好きです。' },
];

const SCRIPT_PAYLOAD = /<script[\s\S]*?>[\s\S]*?alert\s*\([\s\S]*?<\/script\s*>/i;
const IMG_PAYLOAD = /<img[^>]+onerror\s*=/i;

export default function XssLab() {
  const [comments, setComments] = useState(INITIAL);
  const [value, setValue] = useState('');
  const [executed, setExecuted] = useState(null);

  const post = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    const body = value;
    setComments((prev) => [...prev, { id: Date.now(), author: 'you', body }]);
    if (SCRIPT_PAYLOAD.test(body) || IMG_PAYLOAD.test(body)) {
      setExecuted(body);
    }
    setValue('');
  };

  return (
    <LabShell title="NoteBox" host="notebox.sandbox.local">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h4 className="font-heading text-base font-semibold">ゲストブック</h4>
      </div>

      <form onSubmit={post} className="mb-5">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          placeholder="メッセージを入力（この欄はエスケープされずに保存されます）"
          className="w-full resize-none rounded-lg border border-input bg-background p-3 font-mono text-[11px] leading-relaxed outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            className="h-8 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            投稿する
          </button>
        </div>
      </form>

      {executed && (
        <div className="mb-5 overflow-hidden rounded-lg border border-destructive/50 bg-destructive/10">
          <div className="flex items-center gap-2 border-b border-destructive/30 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-destructive">
              閲覧者のブラウザで実行されました
            </p>
          </div>
          <div className="px-3 py-4 text-center">
            <p className="font-mono text-[11px] text-foreground/80">ペイロードが script タグとして解釈され、実行されました。</p>
            <div className="mx-auto mt-3 max-w-xs rounded-lg border border-primary/40 bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">alert</p>
              <p className="mt-2 font-mono text-sm font-bold text-primary">FLAG&#123;xss_st0r3d_p4yl0ad&#125;</p>
              <p className="mt-3 text-[11px] text-muted-foreground">OK</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-card/60 p-3">
            <p className="mb-1 font-mono text-[10px] text-primary">@{c.author}</p>
            <p className="break-all font-mono text-[11px] leading-relaxed text-foreground/85">{c.body}</p>
            {(SCRIPT_PAYLOAD.test(c.body) || IMG_PAYLOAD.test(c.body)) && (
              <p className="mt-2 font-mono text-[10px] text-destructive">
                ⚠ この投稿はHTMLとして解釈されます（エスケープなし）
              </p>
            )}
          </div>
        ))}
      </div>
    </LabShell>
  );
}