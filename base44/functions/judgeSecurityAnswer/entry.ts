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
【想定した解答（正解の一例）】${card.model_answer || card.answer || '(なし)'}
${Array.isArray(card.expected_points) && card.expected_points.length ? `【問題文で求めている要素】${card.expected_points.join(' / ')}\n` : ''}【解説】${card.explanation || '(なし)'}

判定の基準:
- 想定した解答は、正解の一例にすぎない。問題文の条件（聞いている対象・観点・数）を満たし、技術的に正しい内容なら、想定した解答と違う要素を挙げていても正解にする。言い回しや用語の表記の違いは問わない。
- 妥当な答えが何通りもある問いでは、問いに合った正しい答えを挙げていれば正解。想定した解答の要素がそろっていないことだけを理由に不正解にしない。問題文で求めていない要素を書いていないことも減点しない。
- 問題文で数や観点が示されているときは、それを満たしているかを確かめる。足りなければ不正解。
- 不正解にするのは、事実の誤りがある、逆の意味になっている、問いに答えていない、指定の数や観点を満たしていない、あいまいで正しいかどうか判断できない、のいずれかの場合だけ。妥当な別解かどうか迷うときは、技術的に正しければ正解にする。
- ただし、問題文が根本的な対策を求めているのに、入力値チェックだけのような表面的な対策しか書かれていない場合は、問いの条件を満たしていないので不正解にする（根本的な対策の例: プレースホルダ、出力時のエスケープ、サーバー側の認可）。
- 問題が名称を答えるよう求めている場合は、求められた名称がすべて解答に含まれているときだけ正解にする。問題文にすでに書かれている名称を解答に書かなかったことは、減点しない。

【学習者の解答】
${answerText}

feedback は日本語で2〜3文。正解なら補足になる観点を1つだけ添える。不正解なら、問いのどの条件を満たしていないか・どこが誤りかを具体的に示し、正解になる答え方の例を1つ添える。技術用語は正確に、励ます調子で書く。`;

    const verdict = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: VERDICT_SCHEMA });

    return Response.json({
      correct: verdict?.correct === true,
      feedback: String(verdict?.feedback || '').trim(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
