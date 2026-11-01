import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useLabProgress(slug) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const recordRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await base44.entities.LabProgress.filter({ lab_slug: slug });
        if (!active) return;
        const existing = rows[0] || null;
        recordRef.current = existing;
        setRecord(existing);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  const save = useCallback(
    async (patch) => {
      const current = recordRef.current;
      if (current) {
        const next = { ...current, ...patch };
        recordRef.current = next;
        setRecord(next);
        await base44.entities.LabProgress.update(current.id, patch);
        return next;
      }
      const created = await base44.entities.LabProgress.create({
        lab_slug: slug,
        status: 'in_progress',
        attempts: 0,
        hints_used: 0,
        xp: 0,
        ...patch,
      });
      recordRef.current = created;
      setRecord(created);
      return created;
    },
    [slug]
  );

  return { record, loading, save };
}