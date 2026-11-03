import { useEffect, useRef, useState } from 'react';
import { ImagePlus, ClipboardPaste, GripHorizontal, Loader2, Quote, Search, Send, X } from 'lucide-react';
import { IMPORT_MAX, IMPORT_MIN } from '@/lib/external-import';
import MessageSearch from '@/components/assistant/MessageSearch';
import { ImageStrip, MessageImages } from '@/components/assistant/ImageStrip';
import { MAX_IMAGES, imagesFromClipboard, useImageAttachments } from '@/lib/attachments';

const CHIPS = [
  'この画面の脆弱性は、なぜ起きるの？',
  '実際のコードではどう防ぐ？',
  '記録から、苦手な分野を教えて',
  '次に何をやるといい？',
];
// 文章を選んで聞くときは、その部分についての聞き方だけを出す
const CHIPS_QUOTE = ['どういう意味？', '詳しく説明して', 'なぜ？'];

export default function AssistantPanel({
  messages,
  busy,
  onSend,
  onImport,
  importing = false,
  onClose,
  onLoadFrom,
  quote = '',
  onClearQuote,
  dragProps,
  dragging,
}) {
  const [draft, setDraft] = useState('');
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  // 添付する画像（貼り付け・選択した時点でアップロードを始める）
  const att = useImageAttachments();
  const fileRef = useRef(null);
  const msgRefs = useRef({});
  // 読み込みを待ってから移動する発言のID
  const pendingJump = useRef(null);

  const scrollToMessage = (id) => {
    const el = msgRefs.current[id];
    if (!el) return false;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return true;
  };

  useEffect(() => {
    // 検索から移動する途中なら、最下部ではなくその発言へ移動する
    if (pendingJump.current) {
      scrollToMessage(pendingJump.current);
      pendingJump.current = null;
      return;
    }
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, busy]);

  // 開いたとき・引用が入ったときに、すぐ入力できるようキャレットを置く
  useEffect(() => {
    // クリック処理のあとで確実にフォーカスが残るよう、次の描画タイミングで置く
    const timer = setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }, 0);
    return () => clearTimeout(timer);
  }, [quote]);

  // 検索候補を閉じてから、選んだ発言の位置までスクロールする（目印は付けない）
  const jumpTo = (m) => {
    setSearching(false);
    if (msgRefs.current[m.id]) {
      setTimeout(() => scrollToMessage(m.id), 0);
      return;
    }
    // 画面にまだない古い発言は、読み込んでから移動する
    if (!onLoadFrom || !m.created_date) return;
    pendingJump.current = m.id;
    onLoadFrom(m.created_date);
  };

  const submit = () => {
    if ((!draft.trim() && !att.ready.length) || busy || att.uploading) return;
    onSend(draft, att.ready);
    setDraft('');
    att.clear();
  };

  // 入力欄に貼った長い文章を、ほかのAIとの会話として取り込む
  // 会話のスクリーンショットだけでも取り込める
  const canImport = !!onImport && !busy && !att.uploading && (draft.trim().length >= IMPORT_MIN || att.ready.length > 0);
  const runImport = () => {
    if (!canImport) return;
    onImport(draft, att.ready);
    setDraft('');
    att.clear();
  };

  const chips = quote ? CHIPS_QUOTE : CHIPS;

  // サジェストは送らずに入力欄へ入れ、手を加えてから送れるようにする
  const fill = (text) => {
    setDraft(text);
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    requestAnimationFrame(() => el.setSelectionRange(text.length, text.length));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/50">
      <div
        {...dragProps}
        className={`flex touch-none select-none items-center justify-between border-b border-border px-4 py-2.5 ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        title="ドラッグで移動できます"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground">lab assistant</p>
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearching((v) => !v)}
            onPointerDown={(e) => e.stopPropagation()}
            className={`rounded-full p-1 transition-colors hover:bg-secondary hover:text-foreground ${
              searching ? 'text-primary' : 'text-muted-foreground'
            }`}
            title="これまでの会話を検索"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="閉じる"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {searching && <MessageSearch onPick={jumpTo} />}

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
        {messages === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] leading-relaxed text-muted-foreground">
            いま見ている画面と学習の記録を踏まえて答えます。
            <br />
            ラボの答えそのものは教えませんが、考え方は一緒に整理します。
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              ref={(el) => {
                msgRefs.current[m.id] = el;
              }}
              className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                  m.role === 'user' ? 'bg-primary/15 text-foreground' : 'border border-border bg-background/60 text-foreground/90'
                }`}
              >
                {(m.images?.length > 0 || m.previews?.length > 0) && (
                  <MessageImages uris={m.images || []} previews={m.previews || []} />
                )}
                {m.quote && (
                  <p className="mb-1.5 border-l-2 border-primary/40 pl-2 text-[10px] leading-relaxed text-muted-foreground">
                    {m.quote}
                  </p>
                )}
                {m.content}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="flex items-center gap-1.5 px-1 font-mono text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {importing ? '会話を取り込んでいます（1〜2分かかることがあります）…' : '考えています…'}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border px-3 py-2.5">
        {quote && (
          <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1.5">
            <Quote className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
            <p className="max-h-16 flex-1 overflow-y-auto text-[10px] leading-relaxed text-muted-foreground">{quote}</p>
            <button
              type="button"
              onClick={onClearQuote}
              className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              title="引用を外す"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => fill(c)}
              disabled={busy}
              className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
        <ImageStrip images={att.images} onRemove={att.remove} />
        {att.error && <p className="mb-1.5 text-[10px] text-destructive">{att.error}</p>}
        {onImport && draft.trim().length > 800 && (
          <p className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>ほかのAIとの会話なら、送るボタンの左の取り込みボタンで知識カードに反映できます。</span>
            <span className="shrink-0 font-mono tabular-nums">{draft.trim().length.toLocaleString()} / {IMPORT_MAX.toLocaleString()}字</span>
          </p>
        )}
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => {
              // 画像が貼り付けられたら添付する（文字の貼り付けはそのまま）
              const files = imagesFromClipboard(e);
              if (files.length) att.add(files);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
              e.preventDefault();
              submit();
            }}
            rows={1}
            maxLength={IMPORT_MAX}
            placeholder={quote ? 'この部分について、どう聞きますか？' : '何でも聞いてください'}
            className="max-h-24 min-h-9 flex-1 resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-[12px] leading-relaxed outline-none focus:border-primary/60"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              att.add(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy || att.images.length >= MAX_IMAGES}
            className="flex h-9 w-9 rounded-lg shrink-0 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
            title={`画像を添付する（${MAX_IMAGES}枚まで。入力欄に貼り付けても添付できます）`}
          >
            <ImagePlus className="h-3.5 w-3.5" />
          </button>
          {onImport && (
            <button
              type="button"
              onClick={runImport}
              disabled={!canImport}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
              title="入力欄に貼った、ほかのAIとの会話を取り込む（知識カード・今日の復習・アシスタントの記憶に反映）"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={busy || att.uploading || (!draft.trim() && !att.ready.length)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            title="送る"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
