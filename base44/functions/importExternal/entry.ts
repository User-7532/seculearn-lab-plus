import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// ほかのAIとの会話の記録を取り込み、知識カード・今日の復習・AIの記憶に反映する
const TOPICS = {
  'sql-injection': 'SQLインジェクション',
  'stored-xss': 'クロスサイトスクリプティング（XSS）',
  idor: 'アクセス制御の不備とIDOR',
  'path-traversal': 'ディレクトリトラバーサル',
  basics: 'Webセキュリティの基礎（上の4つ以外のセキュリティの話題もここ）',
};
const SUMMARY_MAX = 1500;

const CARD_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string', enum: Object.keys(TOPICS) },
          kind: { type: 'string', enum: ['cloze', 'written'] },
          text: { type: 'string' },
          answer: { type: 'string' },
          model_answer: { type: 'string' },
          // 解答者が自分で答えるべき語句。問題文に出ていないかの確認に使う（保存はしない）
          target_terms: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
          difficulty: { type: 'string', enum: ['basic', 'intermediate', 'advanced'] },
        },
        required: ['topic', 'kind', 'text', 'answer', 'target_terms', 'explanation', 'difficulty'],
      },
    },
  },
  required: ['cards'],
};

const normalize = (s) =>
  String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s・･\-‐_]/g, '');

// 答えの語句（略称・正式名称・その一部）が問題文に出ていないかを確かめる
function leaksAnswer(text, card) {
  const sources = [...(card.kind === 'cloze' ? [card.answer] : []), ...(Array.isArray(card.target_terms) ? card.target_terms : [])];
  const terms = [];
  sources.forEach((value) => {
    String(value || '')
      .normalize('NFKC')
      .split(/[()、,，/]/)
      .forEach((part) => {
        const t = normalize(part);
        if (t) terms.push(t);
      });
  });
  const body = normalize(String(text).replace(/___/g, ' '));
  return terms.filter((t) => t.length >= 2 && !/^[0-9.]+$/.test(t)).some((t) => body.includes(t));
}

const pad = (n) => String(n).padStart(2, '0');
// 日本時間の今日の日付（復習の予定日に使う）
const todayJst = () => {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // ラボのフラグは伏せてから扱う（アシスタントにフラグを覚えさせないため）
    const text = String(body.text || '')
      .replace(/FLAG\{[^}]*\}/gi, 'FLAG{…}')
      .trim()
      .slice(0, 60000);
    if (text.length < 40) return Response.json({ error: '貼り付けた文章が短すぎます。対話をそのまま貼り付けてください。' }, { status: 400 });

    const count = Math.min(16, Math.max(6, Math.ceil(text.length / 3000)));
    const [existingPage, memoryPage] = await Promise.all([
      base44.entities.KnowledgeCard.list({ sort: '-created_date', limit: 200 }),
      base44.entities.AssistantMemory.list({ sort: '-updated_date', limit: 1 }),
    ]);
    const existing = (existingPage.items || []).map((c) => String(c.text || '').replace(/\s+/g, ' ').slice(0, 60));
    const memory = (memoryPage.items || [])[0] || null;

    const [cardsOut, digest] = await Promise.all([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `あなたはWebセキュリティの学習問題を作る出題者です。次は、利用者がほかのAIと交わした対話の記録です。この対話に出てきたセキュリティの知識を、知識確認問題にしてください。最大${count}問。

分野（topic）は次のIDから選ぶ:
${Object.entries(TOPICS).map(([id, label]) => `- ${id}: ${label}`).join('\n')}

書き方:
- 対話に出てきた、セキュリティに関わる正しい知識だけを問題にする。セキュリティと関係のない話題や、挨拶・進行の確認だけの部分は問題にしない。対話の中の誤りはそのまま問題にしない。
- 話題（用語、仕組み、成立する条件、被害、見つけ方、対策）を漏らさず拾い、1問に1つの話題にする。話題が少なければ問題数も少なくてよい。
- kind は "cloze"（空所補充）か "written"（記述）。語句1つで答えられる知識は cloze、仕組み・理由・対策の説明が必要な知識は written にする。
- cloze の text は1〜2文で、空所を ___（半角アンダースコア3つ）で1か所だけ表す。answer には空所の語句を短く入れる。
- written の text は答えを含まない問い。model_answer に2〜4文の模範解答、answer に要点を10〜20字で入れる。
- 問題文に答えを書かない。空所の語句、答えさせたい名前・略称・正式名称、その一部や英語表記・括弧書きの補足も、問題文には入れない。
- target_terms には、解答者が自分で答えるべき語句をすべて入れる。
- 守る側の視点で書く。実在のサービスを攻撃する手順や、検知を回避する方法は扱わない。
- 技術用語は正確な標準用語を使い、比喩や曖昧な言い換えはしない。日本語で、1問は短く。explanation は1〜2文。
${existing.length ? `\n既存の問題（同じ内容は作らない）:\n- ${existing.slice(0, 40).join('\n- ')}` : ''}

[対話の記録]
${text}`,
        response_json_schema: CARD_SCHEMA,
      }),
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `次は、利用者がほかのAIと交わした対話の記録です。セキュリティ学習アプリのアシスタントが、本人について覚えておく要点を更新します。

[これまでに残している要点]
${memory?.summary || '（まだありません）'}

[やること]
summary: これまでの要点に、この対話から分かったことを統合して書き直す。
- 残すのは、本人の学習の目標、関心のある分野、理解できたこと、つまずいたこと・誤解していたこと、説明の好み、継続中の話題、決めたこと。
- 本人が実際に言ったこと・示したことだけを残す。AIの説明そのものや一般論、フラグや攻撃用の具体的な入力は残さない。推測で人物像を作らない。
- これまでの要点と食い違うときは新しい内容で置き換え、同じ内容を重ねない。箇条書きの記号は使わず、短い文を並べる。${SUMMARY_MAX}文字以内。

[対話の記録]
${text}`,
        response_json_schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] },
      }),
    ]);

    const seen = new Set(existing.map((t) => t.slice(0, 40)));
    const records = [];
    (Array.isArray(cardsOut?.cards) ? cardsOut.cards : []).slice(0, count + 2).forEach((c) => {
      const qtext = String(c?.text || '').trim();
      const kind = c?.kind === 'written' ? 'written' : 'cloze';
      if (qtext.length < 12) return;
      if (kind === 'cloze' && !qtext.includes('___')) return;
      if (leaksAnswer(qtext, { ...c, kind })) return;
      const key = qtext.replace(/\s+/g, ' ').slice(0, 40);
      if (seen.has(key)) return;
      seen.add(key);
      records.push({
        topic: TOPICS[c?.topic] ? c.topic : 'basics',
        kind,
        text: qtext,
        answer: String(c?.answer || '').slice(0, 200),
        model_answer: kind === 'written' ? String(c?.model_answer || '').slice(0, 800) : '',
        explanation: String(c?.explanation || '').slice(0, 600),
        difficulty: ['basic', 'intermediate', 'advanced'].includes(c?.difficulty) ? c.difficulty : 'basic',
        source: 'import',
      });
    });

    let cards = [];
    let scheduled = 0;
    if (records.length) {
      const created = await base44.entities.KnowledgeCard.bulkCreate(records.slice(0, count));
      cards = Array.isArray(created) ? created : created?.items || [];
      // 取り込んだカードは、解く前から今日の復習に並べる
      if (cards.length) {
        const due = todayJst();
        await base44.entities.ReviewItem.bulkCreate(
          cards.map((c) => ({
            item_type: 'card',
            item_id: c.id,
            // 解いたときに付く題名（src/lib/knowledge.js）と同じ決め方にする
            title: c.kind === 'written' ? String(c.text || '').slice(0, 40) : c.answer,
            topic: c.topic,
            due_date: due,
            interval_days: 0,
            streak: 0,
          }))
        );
        scheduled = cards.length;
      }
    }

    const summary = String(digest?.summary || '').replace(/FLAG\{[^}]*\}/gi, 'FLAG{…}').trim().slice(0, SUMMARY_MAX);
    let memoryUpdated = false;
    if (summary) {
      if (memory) await base44.entities.AssistantMemory.update(memory.id, { summary, updated_from: 'import' });
      else await base44.entities.AssistantMemory.create({ summary, updated_from: 'import' });
      memoryUpdated = true;
    }

    return Response.json({ cards, scheduled, memoryUpdated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
