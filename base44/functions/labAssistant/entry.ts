import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const LAB_TITLES = {
  'sql-injection': 'SQLインジェクション',
  'stored-xss': 'クロスサイトスクリプティング',
  idor: '認証バイパス / IDOR',
  'path-traversal': 'ディレクトリトラバーサル',
};
const TOPIC_TITLES = { ...LAB_TITLES, basics: 'セキュリティの基礎' };

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // 長い文章をそのまま貼って相談できるようにする（過去の発言は短く切って使う）
    const message = String(body.message || '').trim().slice(0, 60000);
    const page = String(body.page || '').slice(0, 60);
    const path = String(body.path || '').slice(0, 120);
    // 画面の抜粋からフラグの文字列は取り除いて渡す（答えをそのまま言わせないため）
    const pageContext = String(body.context || '')
      .replace(/FLAG\{[^}]*\}/gi, 'FLAG{…}')
      .trim()
      .slice(0, 1600);
    // 画面で選んだ文章（この部分についての質問）。フラグは同じく伏せる
    const quote = String(body.quote || '')
      .replace(/FLAG\{[^}]*\}/gi, 'FLAG{…}')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
    if (!message) return Response.json({ error: 'メッセージを入力してください' }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);

    const [history, progress, attempts, reviews, memories] = await Promise.all([
      base44.entities.AssistantMessage.filter({}, { sort: '-created_date', limit: 12 }),
      base44.entities.LabProgress.filter({}, { limit: 20 }),
      base44.entities.KnowledgeAttempt.filter({}, { sort: '-created_date', limit: 200 }),
      base44.entities.ReviewItem.filter({}, { sort: 'due_date', limit: 200 }),
      base44.entities.AssistantMemory.list({ sort: '-updated_date', limit: 1 }).catch(() => ({ items: [] })),
    ]);
    // ほかのAIとの会話などから覚えた、本人についての要点
    const memorySummary = String((memories.items || [])[0]?.summary || '').trim();

    const labLine =
      Object.entries(LAB_TITLES)
        .map(([slug, title]) => {
          const p = (progress.items || []).find((r) => r.lab_slug === slug);
          if (!p) return `${title}: 未着手`;
          return `${title}: ${p.status === 'cleared' ? 'クリア済み' : '挑戦中'}（提出${p.attempts || 0}回・ヒント${p.hints_used || 0}個）`;
        })
        .join('\n') || '記録なし';

    const topicStats = {};
    (attempts.items || []).forEach((a) => {
      const key = a.topic || 'basics';
      topicStats[key] = topicStats[key] || { total: 0, ok: 0 };
      topicStats[key].total += 1;
      if (a.correct) topicStats[key].ok += 1;
    });
    const cardLine =
      Object.entries(topicStats)
        .map(([k, v]) => `${TOPIC_TITLES[k] || k} ${Math.round((v.ok / v.total) * 100)}%（${v.total}問）`)
        .join('、') || '記録なし';
    const dueCount = (reviews.items || []).filter((r) => r.due_date <= today).length;

    const talk = (history.items || [])
      .slice()
      .reverse()
      .map((m) => `${m.role === 'user' ? '本人' : 'あなた'}: ${m.quote ? `（引用「${String(m.quote).slice(0, 200)}」について）` : ''}${String(m.content).slice(0, 500)}`)
      .join('\n');

    const prompt = `あなたは、ペネトレーションテストの学習アプリ「NULLLAB」の学習アシスタントです。本人の学習状況と、いま見ている画面の内容を踏まえて会話します。

【守ること】
- 演習はアプリ内の模擬環境だけが対象。実在するサービスやサーバーを攻撃する手順、許可のない対象への診断、検知を回避する方法は案内しない。そうした質問には、許可を得た対象でのみ診断するよう短く伝える。
- ラボのフラグの文字列や、まだクリアしていないラボでそのまま通る入力（完成したペイロード）は答えない。代わりに、何を観察すればよいか、どんな仕組みで起きるのかを段階的に示す。ラボの3段階のヒントより先の答えは出さない。
- クリア済みのラボについては、仕組み・被害・実際のコードでの対策（プレースホルダ、出力時のエスケープ、サーバー側の認可、パスの正規化と許可リストなど）を具体的に説明してよい。

【答え方】
- まず質問に直接答える。結論を先に、理由や補足はそのあと。
- 簡潔で読みやすい日本語で書く。技術用語は正確な標準用語で書き、比喩や曖昧な言い換えはしない。
- 画面や記録に出ていないことは断定しない。存在しないメニューやページ名を作らない。
- 記号の装飾（アスタリスクや見出し記号）は使わない。目安は2〜6文。

【いま見ている画面】${page || '不明'}${path ? `（${path}）` : ''}
【画面に表示されている内容（抜粋）】
${pageContext || '（取得できませんでした）'}

【これまでに分かっている本人のこと（ほかのAIとの会話などから。参考情報で、今回の発言や記録と食い違うときはそちらを優先する）】
${memorySummary || '（まだありません）'}

【ラボの進み具合】
${labLine}
【知識カードの正答率】${cardLine}
【今日の復習待ち】${dueCount}件

【直近の会話（古い順）】
${talk || '（はじめての会話）'}

【今回引用された本文（この部分についての質問）】
${quote ? `「${quote}」` : '（引用なし）'}

【今回の発言】${message}`;

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const text = String(reply || '').trim() || 'うまく答えを作れませんでした。もう一度話しかけてください。';

    await base44.entities.AssistantMessage.bulkCreate([
      { role: 'user', content: message, quote },
      { role: 'assistant', content: text },
    ]);

    return Response.json({ reply: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
