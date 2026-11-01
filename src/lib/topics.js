import { LABS } from '@/lib/labs';

// 知識カードの分野。4つのラボと、どのラボにも共通する基礎
export const TOPICS = [
  ...LABS.map((lab) => ({ id: lab.slug, label: lab.title, no: lab.no })),
  { id: 'basics', label: 'セキュリティの基礎', no: '00' },
];

export const topicLabel = (id) => TOPICS.find((t) => t.id === id)?.label || id || '未分類';
