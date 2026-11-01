import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// 知識カードの分野。ラボと同じ脆弱性と、共通の基礎
const TOPICS = {
  'sql-injection': 'SQLインジェクション（成立する条件、影響、プレースホルダ／プリペアドステートメントなどの対策）',
  'stored-xss': 'クロスサイトスクリプティング（反射型・格納型・DOM型の違い、出力時のエスケープ、CSP などの対策）',
  idor: 'アクセス制御の不備とIDOR（認証と認可の違い、サーバー側での所有者確認、推測しにくいIDの限界）',
  'path-traversal': 'ディレクトリトラバーサル（パスの正規化、許可リスト方式、公開ディレクトリの外に出させない対策）',
  basics: 'Webセキュリティの基礎（CIA、認証と認可、HTTPとCookie、同一オリジンポリシー、脆弱性診断の倫理と許可）',
};

const CARD_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['cloze', 'written'] },
          text: { type: 'string' },
          answer: { type: 'string' },
          model_answer: { type: 'string' },
          // 解答者が自分で答えるべき語句。問題文に出ていないかの確認に使う（保存はしない）
          target_terms: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
          difficulty: { type: 'string', enum: ['basic', 'intermediate', 'advanced'] },
        },
        required: ['kind', 'text', 'answer', 'target_terms', 'explanation', 'difficulty'],
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

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const topic = String(body.topic || '');
    const count = Math.max(4, Math.min(8, Number(body.count) || 6));
    if (!TOPICS[topic]) return Response.json({ error: 'unknown topic' }, { status: 400 });

    const [existingPage, attemptPage] = await Promise.all([
      base44.entities.KnowledgeCard.filter({ topic }, { sort: '-created_date', limit: 60 }),
      base44.entities.KnowledgeAttempt.filter({ topic }, { sort: '-created_date', limit: 100 }),
    ]);
    const existing = (existingPage.items || []).map((c) => String(c.text || '').replace(/\s+/g, ' ').slice(0, 60));
    const attempts = attemptPage.items || [];
    const accuracy = attempts.length ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100) : null;

    const level =
      accuracy === null || attempts.length < 6
        ? 'basic を中心に、intermediate を2問まぜる。'
        : accuracy >= 80
          ? `正答率は${accuracy}%と高い。intermediate と advanced を中心にし、basic は1問だけにする。`
          : accuracy <= 50
            ? `正答率は${accuracy}%と低い。basic を中心にし、定義と仕組みを固める。`
            : `正答率は${accuracy}%。basic 2問、intermediate 3問、advanced 1問の割合にする。`;

    const prompt = `あなたはWebセキュリティの学習問題を作る出題者です。「${TOPICS[topic]}」について、知識確認問題を${count}問作ってください。

書き方:
- kind は "cloze"（空所補充）か "written"（記述）。語句1つで答えられる知識は cloze、仕組み・理由・対策の説明が必要な知識は written にする。${count}問のうち2問は written にする。
- cloze の text は1〜2文で、空所を ___（半角アンダースコア3つ）で1か所だけ表す。answer には空所の語句を短く入れる。
- written の text は答えを含まない問い。model_answer に2〜4文の模範解答、answer に要点を10〜20字で入れる。
- 問題文に答えを書かない。空所の語句、答えさせたい名前・略称・正式名称、その一部や英語表記・括弧書きの補足も、問題文には入れない。
- target_terms には、解答者が自分で答えるべき語句をすべて入れる。仕組みや理由を説明させる問いで、主題として問題文に出てよい語は入れない。
- 守る側の視点で書く。成立する条件、起きる被害、見つけ方、根本的な対策を問う。実在のサービスを攻撃する手順や、検知を回避する方法は扱わない。
- 技術用語は正確な標準用語を使い、比喩や曖昧な言い換えはしない。日本語で、1問は短く。
- explanation は1〜2文で、なぜそうなるかを平易に説明する。
- 難易度: ${level}
${existing.length ? `\n既存の問題（同じ内容は作らない）:\n- ${existing.join('\n- ')}` : ''}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: CARD_SCHEMA });
    const raw = Array.isArray(result?.cards) ? result.cards : [];
    const seen = new Set(existing.map((t) => t.slice(0, 40)));
    const records = [];

    raw.slice(0, count + 2).forEach((c) => {
      const text = String(c?.text || '').trim();
      const kind = c?.kind === 'written' ? 'written' : 'cloze';
      if (text.length < 12) return;
      if (kind === 'cloze' && !text.includes('___')) return;
      if (leaksAnswer(text, { ...c, kind })) return;
      const key = text.replace(/\s+/g, ' ').slice(0, 40);
      if (seen.has(key)) return;
      seen.add(key);
      records.push({
        topic,
        kind,
        text,
        answer: String(c?.answer || '').slice(0, 200),
        model_answer: kind === 'written' ? String(c?.model_answer || '').slice(0, 800) : '',
        explanation: String(c?.explanation || '').slice(0, 600),
        difficulty: ['basic', 'intermediate', 'advanced'].includes(c?.difficulty) ? c.difficulty : 'basic',
      });
    });

    if (records.length === 0) return Response.json({ cards: [], reason: '作れる問題が見つかりませんでした。もう一度お試しください。' });

    const created = await base44.entities.KnowledgeCard.bulkCreate(records);
    return Response.json({ cards: Array.isArray(created) ? created : created?.items || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
