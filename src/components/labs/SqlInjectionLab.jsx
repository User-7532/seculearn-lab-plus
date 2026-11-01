import { useEffect, useRef, useState } from 'react';
import LabShell from './LabShell';
import { Loader2, Search, ShieldAlert } from 'lucide-react';
import { loadSqlite } from '@/lib/labs/sqlite';

const FLAG = 'FLAG{sql_1nj3ct10n_m4st3r}';

// 演習用のデータベース。hidden=1 の行と secrets テーブルは、ふつうの検索では見えない
const SCHEMA = `
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, email TEXT, plan TEXT, hidden INTEGER DEFAULT 0);
INSERT INTO customers (id, name, email, plan, hidden) VALUES
  (1, '佐藤 健', 'ken.sato@acme.co.jp', 'Pro', 0),
  (2, '鈴木 美咲', 'misaki@acme.co.jp', 'Basic', 0),
  (3, '高橋 涼', 'ryo.t@acme.co.jp', 'Pro', 0),
  (4, '田中 由紀', 'yuki.t@acme.co.jp', 'Basic', 0),
  (5, '伊藤 大輔', 'd.ito@acme.co.jp', 'Pro', 0),
  (99, '[RESTRICTED] internal_admin', 'root@acme.internal', '${FLAG}', 1);
CREATE TABLE secrets (id INTEGER PRIMARY KEY, name TEXT, value TEXT);
INSERT INTO secrets (name, value) VALUES ('flag', '${FLAG}'), ('admin_note', '顧客データの持ち出し禁止');
`;

// アプリが組み立てているクエリ。入力をそのまま文字列に埋め込んでいる（これが脆弱性）
const buildSql = (input) =>
  `SELECT id, name, email, plan FROM customers WHERE hidden = 0 AND name LIKE '%${input}%'`;

export default function SqlInjectionLab() {
  const [query, setQuery] = useState('');
  const [last, setLast] = useState(null);
  const [engine, setEngine] = useState('loading');
  const dbRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadSqlite()
      .then((SQL) => {
        if (!alive) return;
        const db = new SQL.Database();
        db.run(SCHEMA);
        dbRef.current = db;
        setEngine('ready');
      })
      .catch(() => alive && setEngine('error'));
    return () => {
      alive = false;
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, []);

  const run = (e) => {
    e.preventDefault();
    const db = dbRef.current;
    if (!db) return;
    const sql = buildSql(query);
    try {
      // 1回の呼び出しで最初の文だけを実行する（; で区切った2つ目以降の文は実行しない）
      const stmt = db.prepare(sql);
      const columns = stmt.getColumnNames();
      const rows = [];
      while (stmt.step()) rows.push(stmt.get());
      stmt.free();
      const text = JSON.stringify(rows);
      const leaked = text.includes(FLAG) || text.includes('internal_admin');
      setLast({ sql, columns, rows, error: '', leaked });
    } catch (err) {
      setLast({ sql, columns: [], rows: [], error: String(err.message || err), leaked: false });
    }
  };

  return (
    <LabShell title="Acme CRM" host="crm.acme-sandbox.local/customers">
      <div className="mb-4">
        <h4 className="font-heading text-base font-semibold">顧客検索</h4>
        <p className="mt-1 text-xs text-muted-foreground">顧客名の一部を入力してください。</p>
      </div>

      <form onSubmit={run} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: 佐藤"
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 font-mono text-xs outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={engine !== 'ready'}
          className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          検索
        </button>
      </form>

      {engine === 'loading' && (
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> データベースを起動しています
        </p>
      )}
      {engine === 'error' && (
        <p className="mt-3 font-mono text-[11px] text-destructive">
          データベースを起動できませんでした。ページを読み込み直してください。
        </p>
      )}

      {last && (
        <div className="mt-5 space-y-3">
          <div className="rounded-lg border border-border bg-background/70 p-3">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              実行されたクエリ
            </p>
            <code className="block whitespace-pre-wrap break-all font-mono text-[11px] text-accent">{last.sql}</code>
          </div>

          {last.error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 font-mono text-[11px] text-destructive">
              SQLITE_ERROR: {last.error}
            </div>
          )}

          {last.leaked && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-xs font-semibold text-destructive">見えてはいけないデータが返ってきました</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">
                  入力がSQLの一部として解釈され、hidden = 0 の条件や、別のテーブルの壁を越えて読み出せています。
                </p>
              </div>
            </div>
          )}

          {!last.error && last.rows.length === 0 && (
            <p className="font-mono text-[11px] text-muted-foreground">0 件のレコードが見つかりました。</p>
          )}

          {last.rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-secondary/50 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    {last.columns.map((c, i) => (
                      <th key={`${c}-${i}`} className="px-3 py-2">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {last.rows.map((row, r) => (
                    <tr key={r} className="hover:bg-secondary/30">
                      {row.map((v, i) => (
                        <td key={i} className="break-all px-3 py-2 font-mono text-foreground/85">
                          {v === null ? 'NULL' : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </LabShell>
  );
}
