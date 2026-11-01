import { base44 } from '@/api/base44Client';
import { recordReview } from '@/lib/srs';
import { topicLabel } from '@/lib/topics';

// カードの解答を記録し、次に出し直す日を決める
export function recordKnowledgeAnswer(card, correct, mode = 'practice') {
  if (!card) return;
  base44.entities.KnowledgeAttempt.create({
    card_id: card.id,
    topic: card.topic || '',
    kind: card.kind || 'cloze',
    correct,
    mode,
  }).catch(() => {});

  recordReview({
    item_type: 'card',
    item_id: card.id,
    title: card.kind === 'written' ? String(card.text || '').slice(0, 40) : card.answer,
    topic: card.topic,
    correct,
  }).catch(() => {});
}

export const cardTopicLabel = (card) => topicLabel(card?.topic);
