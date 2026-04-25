import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { queries } from '../ecs';
import { saveSnapshot } from '../persistence';

const SAVE_INTERVAL_MS = 30000;

let lastSaveAt = 0;

/**
 * 매 30초 자동 저장 + 앱 unmount 시 저장.
 * creation + tree 만 영속 (spell은 즉발이라 X).
 */
export function PersistenceSystem() {
  useFrame(() => {
    const now = Date.now();
    if (now - lastSaveAt < SAVE_INTERVAL_MS) return;
    lastSaveAt = now;
    const entities = [...queries.creations, ...queries.trees];
    saveSnapshot(entities);
  });

  useEffect(() => {
    const handleBeforeUnload = () => {
      const entities = [...queries.creations, ...queries.trees];
      saveSnapshot(entities);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  return null;
}
