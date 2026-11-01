import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    feedback: { type: 'string' },
  },
  required: ['correct', 'feedback'],
};

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const cardId = String(body.card_id || '');
    const answerText = String(body.answer_text || '').trim().slice(0, 3000);
    if (!cardId) return Response.json({ error: 'card_id is required' }, { status: 400 });
    if (!answerText) return Response.json({ error: 'answer_text is required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 本人のカードだけを読む（アクセス制限により他人のカードは見つからない）
    const card = await base44.entities.KnowledgeCard.get(cardId).catch(() => null);
    if (!card) return Response.json({ error: 'Card not found' }, { status: 404 });

    const prompt = `あなたはWebセキュリティの採点者です。次の記述問題に対する学習者の解答を判定してください。

【問題】${card.text}
【想定した解答】${card.model_answer || card.answer || '(なし)'}
【解説】${card.explanation || '(なし)'}

判定の基準:
- 想定した解答の要点を、自分の言葉で説明できていれば正解。
- 要点が抜けている、逆の意味になっている、あいまいで正誤がはっきりしない場合は不正解。迷う場合は不正解にする。ただし用語の表記の違いだけなら正解にする。
- 対策を問う問題では、入力値チェックだけのような表面的な対策しか書かれていない場合、根本的な対策（例: プレースホルダ、出力時のエスケープ、サーバー側の認可）が欠けていれば不正解にする。
- 問題が名称を答えるよう求めている場合は、求められた名称がすべて解答に含まれているときだけ正解にする。問題文にすでに書かれている名称を解答に書かなかったことは、減点しない。

【学習者の解答】
${answerText}

feedback は日本語で2〜3文。正解なら足りない観点を1つだけ添える。不正解なら抜けている要点を具体的に示す。技術用語は正確に、励ます調子で書く。`;

    const verdict = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: VERDICT_SCHEMA });

    return Response.json({
      correct: verdict?.correct === true,
      feedback: String(verdict?.feedback || '').trim(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
