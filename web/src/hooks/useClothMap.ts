import { useCallback, useEffect, useState } from 'react';
import Nui, { post } from '../Nui';
import type { ClothMap, Gender, Tab } from '../types';

const emptyMap = (): ClothMap => ({
  version: 0,
  empty: { shirt: 15, top: 15 },
  bares: { male: [], female: [] },
  innershirts: { male: [], female: [] },
  gloves: { male: {}, female: {} },
  jacketToArms: { male: {}, female: {} },
  tops: { male: {}, female: {} },
  innershirtToFallbackTop: { male: {}, female: {} },
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

  const previewInnershirt = useCallback((drawable: number) => {
    post('clothmap:previewInnershirt', { drawable });
  }, []);

  // ===== Gloves: flat map mutations =====
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

  // ===== Jackets =====
  const setJacketArms = useCallback(
    (jacket: number, bare: number) => {
      setMap((m) => ({
        ...m,
        jacketToArms: {
          ...m.jacketToArms,
          [gender]: { ...m.jacketToArms[gender], [jacket]: bare },
        },
      }));
    },
    [gender],
  );

  const clearJacketArms = useCallback(
    (jacket: number) => {
      setMap((m) => {
        const { [jacket]: _, ...rest } = m.jacketToArms[gender];
        return { ...m, jacketToArms: { ...m.jacketToArms, [gender]: rest } };
      });
    },
    [gender],
  );

  // ===== Tops: flat map mutations =====
  const setTopMapping = useCallback(
    (drawable: number, innershirt: number) => {
      setMap((m) => ({
        ...m,
        tops: { ...m.tops, [gender]: { ...m.tops[gender], [drawable]: innershirt } },
      }));
    },
    [gender],
  );

  const clearTopMapping = useCallback(
    (drawable: number) => {
      setMap((m) => {
        const { [drawable]: _, ...rest } = m.tops[gender];
        return { ...m, tops: { ...m.tops, [gender]: rest } };
      });
    },
    [gender],
  );

  // ===== Bares: canonical bare-arms list =====
  const toggleCanonicalBare = useCallback(
    (drawable: number) => {
      setMap((m) => {
        const list = m.bares[gender];
        const has = list.includes(drawable);
        const next = has
          ? list.filter((d) => d !== drawable)
          : [...list, drawable].sort((a, b) => a - b);
        let gloves = m.gloves[gender];
        let jacketToArms = m.jacketToArms[gender];
        if (has) {
          // Cascade: any glove/jacket mapped to this bare becomes orphaned. Drop them.
          const cleanedGloves: Record<number, number> = {};
          for (const k of Object.keys(gloves).map(Number)) {
            if (gloves[k] !== drawable) cleanedGloves[k] = gloves[k];
          }
          gloves = cleanedGloves;
          const cleanedJackets: Record<number, number> = {};
          for (const k of Object.keys(jacketToArms).map(Number)) {
            if (jacketToArms[k] !== drawable) cleanedJackets[k] = jacketToArms[k];
          }
          jacketToArms = cleanedJackets;
        }
        return {
          ...m,
          bares: { ...m.bares, [gender]: next },
          gloves: { ...m.gloves, [gender]: gloves },
          jacketToArms: { ...m.jacketToArms, [gender]: jacketToArms },
        };
      });
    },
    [gender],
  );

  // ===== Innershirts: canonicals + fallback top =====
  const toggleCanonicalInnershirt = useCallback(
    (drawable: number) => {
      setMap((m) => {
        const list = m.innershirts[gender];
        const has = list.includes(drawable);
        const next = has
          ? list.filter((d) => d !== drawable)
          : [...list, drawable].sort((a, b) => a - b);
        let fallback = m.innershirtToFallbackTop[gender];
        let tops = m.tops[gender];
        if (has) {
          if (fallback[drawable] !== undefined) {
            const { [drawable]: _, ...rest } = fallback;
            fallback = rest;
          }
          const cleaned: Record<number, number> = {};
          for (const k of Object.keys(tops).map(Number)) {
            if (tops[k] !== drawable) cleaned[k] = tops[k];
          }
          tops = cleaned;
        }
        return {
          ...m,
          innershirts: { ...m.innershirts, [gender]: next },
          innershirtToFallbackTop: { ...m.innershirtToFallbackTop, [gender]: fallback },
          tops: { ...m.tops, [gender]: tops },
        };
      });
    },
    [gender],
  );

  const setFallbackTop = useCallback(
    (innershirt: number, top: number) => {
      setMap((m) => ({
        ...m,
        innershirtToFallbackTop: {
          ...m.innershirtToFallbackTop,
          [gender]: { ...m.innershirtToFallbackTop[gender], [innershirt]: top },
        },
      }));
    },
    [gender],
  );

  const clearFallbackTop = useCallback(
    (innershirt: number) => {
      setMap((m) => {
        const { [innershirt]: _, ...rest } = m.innershirtToFallbackTop[gender];
        return { ...m, innershirtToFallbackTop: { ...m.innershirtToFallbackTop, [gender]: rest } };
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
    previewInnershirt,
    setGloveMapping,
    clearGloveMapping,
    setJacketArms,
    clearJacketArms,
    setTopMapping,
    clearTopMapping,
    toggleCanonicalBare,
    toggleCanonicalInnershirt,
    setFallbackTop,
    clearFallbackTop,
    save,
    close,
  };
}

export type ClothMapStore = ReturnType<typeof useClothMap>;
