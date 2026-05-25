import { useCallback, useEffect, useState } from 'react';
import Nui, { post } from '../Nui';
import type { ClothMap, Gender, Tab } from '../types';

const emptyMap = (): ClothMap => ({
  version: 0,
  bares: { male: [], female: [] },
  gloves: { male: {}, female: {} },
});

export function useClothMap() {
  const [map, setMap] = useState<ClothMap>(emptyMap);
  const [visible, setVisible] = useState(false);
  const [gender, setGenderState] = useState<Gender>('male');
  const [tab, setTab] = useState<Tab>('gloves');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = useCallback(() => {
    setVisible(false);
    post('clothmap:close');
  }, []);

  useEffect(() => {
    Nui.startNuiListener();
    Nui.onEvent('clothmap:open', (payload: { map: ClothMap; gender: Gender }) => {
      if (payload?.map) setMap(payload.map);
      if (payload?.gender) setGenderState(payload.gender);
      setVisible(true);
    });
    Nui.onEvent('clothmap:close', () => setVisible(false));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const setGender = useCallback((g: Gender) => {
    setGenderState(g);
    post('clothmap:setGender', { gender: g });
  }, []);

  const previewDrawable = useCallback((component: number, drawable: number) => {
    post('clothmap:previewDrawable', { component, drawable });
  }, []);

  const previewBare = useCallback((drawable: number) => {
    post('clothmap:previewBare', { drawable });
  }, []);

  // ===== Gloves =====
  const setGloveMapping = useCallback(
    (drawable: number, bare: number) => {
      setMap((m) => ({
        ...m,
        gloves: { ...m.gloves, [gender]: { ...m.gloves[gender], [drawable]: bare } },
      }));
    },
    [gender],
  );

  const clearGloveMapping = useCallback(
    (drawable: number) => {
      setMap((m) => {
        const { [drawable]: _, ...rest } = m.gloves[gender];
        return { ...m, gloves: { ...m.gloves, [gender]: rest } };
      });
    },
    [gender],
  );

  // ===== Bares =====
  const toggleCanonicalBare = useCallback(
    (drawable: number) => {
      setMap((m) => {
        const list = m.bares[gender];
        const has = list.includes(drawable);
        const next = has
          ? list.filter((d) => d !== drawable)
          : [...list, drawable].sort((a, b) => a - b);
        let gloves = m.gloves[gender];
        if (has) {
          const cleaned: Record<number, number> = {};
          for (const k of Object.keys(gloves).map(Number)) {
            if (gloves[k] !== drawable) cleaned[k] = gloves[k];
          }
          gloves = cleaned;
        }
        return {
          ...m,
          bares: { ...m.bares, [gender]: next },
          gloves: { ...m.gloves, [gender]: gloves },
        };
      });
    },
    [gender],
  );

  // ===== Save =====
  const save = useCallback(async () => {
    setSaving(true);
    const response = await post<{ ok: boolean; version?: number; savedAt?: string; error?: string }>(
      'clothmap:save',
      map,
    );
    setSaving(false);
    if (response?.ok) {
      setSavedAt(response.savedAt || new Date().toTimeString().slice(0, 8));
      if (response.version) {
        setMap((m) => ({ ...m, version: response.version! }));
      }
    } else {
      setSavedAt(`error: ${response?.error || 'unknown'}`);
    }
  }, [map]);

  return {
    map,
    visible,
    gender,
    setGender,
    tab,
    setTab,
    savedAt,
    saving,
    previewDrawable,
    previewBare,
    setGloveMapping,
    clearGloveMapping,
    toggleCanonicalBare,
    save,
    close,
  };
}

export type ClothMapStore = ReturnType<typeof useClothMap>;
