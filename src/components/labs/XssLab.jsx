import { useEffect, useMemo, useRef, useState } from 'react';
import LabShell from './LabShell';
import { AlertTriangle, MessageSquare } from 'lucide-react';

const INITIAL = [
  { id: 1, author: 'mika', body: 'はじめまして！今日のランチ最高でした。' },
  { id: 2, author: 'guest_88', body: 'このサイト、デザインが好きです。' },
];

const FLAG = 'FLAG{xss_st0r3d_p4yl0ad}';
// 演習用のにせのセッション。document.cookie を読むペイロードで見えるようにする
const FAKE_COOKIE = `notebox_session=4f9c2e71b0a8; flag=${FLAG}`;

// 投稿者名はアプリ側でエスケープする。本文だけがエスケープされない、という設定
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// アプリのテーマ色を、枠の中のページにも渡す
const themeColor = (name, fallback) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
};

// ゲストブックのページを丸ごと作る。本文は「エスケープせずに」埋め込む（これが脆弱性）
function buildPage(comments) {
  const fg = themeColor('--foreground', '#e5e7eb');
  const primary = themeColor('--primary', '#d9f99d');
  const border = themeColor('--border', '#27272a');
  const card = themeColor('--card', '#18181b');
  const items = comments
    .map(
      (c) =>
        `<div class="c"><p class="a">@${escapeHtml(c.author)}</p><div class="b">${c.body}</div></div>`
    )
    .join('');
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:">
<style>
  html,body{margin:0;background:transparent;color:${fg};font:11px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace}
  .c{border:1px solid ${border};background:${card};border-radius:8px;padding:12px;margin:0 0 8px}
  .a{margin:0 0 4px;font-size:10px;color:${primary}}
  .b{word-break:break-all;opacity:.9}
</style>
<script>
(function () {
  var send = function (kind, arg) { parent.postMessage({ xssLab: true, kind: kind, arg: String(arg) }, '*'); };
  // 呼ばれたことをアプリに知らせてから、ブラウザ本物のダイアログを出す
  var nativeAlert = window.alert, nativeConfirm = window.confirm, nativePrompt = window.prompt;
  window.alert = function (a) { send('alert', a); return nativeAlert.call(window, a); };
  window.confirm = function (a) { send('confirm', a); return nativeConfirm.call(window, a); };
  window.prompt = function (a, d) { send('prompt', a); return nativePrompt.call(window, a, d); };
  try { Object.defineProperty(document, 'cookie', { get: function () { return ${JSON.stringify(FAKE_COOKIE)}; }, set: function () {} }); } catch (e) {}
  var report = function () { send('height', document.documentElement.scrollHeight); };
  window.addEventListener('load', report);
  new ResizeObserver(report).observe(document.documentElement);
})();
</script>
</head><body>${items}</body></html>`;
}

export default function XssLab() {
  const [comments, setComments] = useState(INITIAL);
  const [value, setValue] = useState('');
  const [executed, setExecuted] = useState(null);
  const [height, setHeight] = useState(180);
  const frameRef = useRef(null);

  const page = useMemo(() => buildPage(comments), [comments]);

  // 枠の中のページから届いた知らせだけを受け取る
  useEffect(() => {
    const onMessage = (e) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const data = e.data || {};
      if (!data.xssLab) return;
      if (data.kind === 'height') {
        const h = Number(data.arg);
        if (Number.isFinite(h)) setHeight(Math.min(Math.max(h + 4, 60), 1200));
        return;
      }
      setExecuted({ kind: data.kind, arg: data.arg });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const post = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setComments((prev) => [...prev, { id: Date.now(), author: 'you', body: value }]);
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
            <p className="font-mono text-[11px] text-foreground/80">
              投稿に含まれたスクリプトが、ページを開いた人のブラウザで {executed.kind}() を呼び出しました。
            </p>
            <div className="mx-auto mt-3 max-w-sm rounded-lg border border-primary/40 bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{executed.kind}</p>
              <p className="mt-2 break-all font-mono text-[12px] text-foreground">{executed.arg || '（空の文字列）'}</p>
              <p className="mt-3 border-t border-border pt-3 font-mono text-sm font-bold text-primary">{FLAG}</p>
            </div>
          </div>
        </div>
      )}

      {/* 投稿の一覧は、本物のブラウザでHTMLとして表示する。
          アプリ本体から切り離した枠（sandbox）の中なので、ログイン情報やアプリのデータには触れない。
          allow-modals で alert などの本物のダイアログだけは出せるようにしている */}
      <iframe
        ref={frameRef}
        title="ゲストブックの投稿"
        sandbox="allow-scripts allow-modals"
        srcDoc={page}
        style={{ height }}
        className="block w-full border-0 bg-transparent"
      />
    </LabShell>
  );
}
