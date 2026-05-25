import { useCallback, useEffect, useState } from 'react';
import Nui, { post } from '../Nui';
import type { ClothMap, Gender, GroupEntry, Tab } from '../types';

const emptyMap = (): ClothMap => ({
  version: 0,
  bares: { male: [], female: [] },
  innershirts: { male: [], female: [] },
  gloveGroups: { male: [], female: [] },
  jacketToArms: { male: {}, female: {} },
  topGroups: { male: [], female: [] },
  innershirtToFallbackTop: { male: {}, female: {} },
});

export function useClothMap() {
  const [map, setMap] = useState<ClothMap>(emptyMap);
  const [visible, setVisible] = useState(false);
  const [gender, setGenderState] = useState<Gender>('male');
  const [tab, setTab] = useState<Tab>('gloves');
  const [activeGloveGroup, setActiveGloveGroup] = useState<string | null>(null);
  const [activeTopGroup, setActiveTopGroup] = useState<string | null>(null);
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
    setActiveGloveGroup(null);
    setActiveTopGroup(null);
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

  // ===== Glove group mutations =====
  const addGloveGroup = useCallback(() => {
    setMap((m) => {
      const groups = [...m.gloveGroups[gender]];
      const name = `group_${groups.length + 1}`;
      groups.push({ name, members: {} });
      setActiveGloveGroup(name);
      return { ...m, gloveGroups: { ...m.gloveGroups, [gender]: groups } };
    });
  }, [gender]);

  const renameGloveGroup = useCallback(
    (oldName: string, newName: string) => {
      setMap((m) => {
        const groups = m.gloveGroups[gender].map((g) =>
          g.name === oldName ? { ...g, name: newName } : g,
        );
        if (activeGloveGroup === oldName) setActiveGloveGroup(newName);
        return { ...m, gloveGroups: { ...m.gloveGroups, [gender]: groups } };
      });
    },
    [gender, activeGloveGroup],
  );

  const removeGloveGroup = useCallback(
    (name: string) => {
      setMap((m) => {
        const groups = m.gloveGroups[gender].filter((g) => g.name !== name);
        if (activeGloveGroup === name) setActiveGloveGroup(null);
        return { ...m, gloveGroups: { ...m.gloveGroups, [gender]: groups } };
      });
    },
    [gender, activeGloveGroup],
  );

  const assignGloveToActive = useCallback(
    (drawable: number, bare: number) => {
      if (!activeGloveGroup) return;
      setMap((m) => {
        const groups: GroupEntry[] = m.gloveGroups[gender].map((g) => {
          // Remove drawable from any other group first.
          if (g.name !== activeGloveGroup && g.members[drawable] !== undefined) {
            const { [drawable]: _, ...rest } = g.members;
            return { ...g, members: rest };
          }
          if (g.name === activeGloveGroup) {
            return { ...g, members: { ...g.members, [drawable]: bare } };
          }
          return g;
        });
        return { ...m, gloveGroups: { ...m.gloveGroups, [gender]: groups } };
      });
    },
    [gender, activeGloveGroup],
  );

  const removeGloveFromActive = useCallback(
    (drawable: number) => {
      if (!activeGloveGroup) return;
      setMap((m) => {
        const groups = m.gloveGroups[gender].map((g) => {
          if (g.name !== activeGloveGroup) return g;
          const { [drawable]: _, ...rest } = g.members;
          return { ...g, members: rest };
        });
        return { ...m, gloveGroups: { ...m.gloveGroups, [gender]: groups } };
      });
    },
    [gender, activeGloveGroup],
  );

  // ===== Jacket map =====
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

  // ===== Top group mutations (mirrors gloves) =====
  const addTopGroup = useCallback(() => {
    setMap((m) => {
      const groups = [...m.topGroups[gender]];
      const name = `group_${groups.length + 1}`;
      groups.push({ name, members: {} });
      setActiveTopGroup(name);
      return { ...m, topGroups: { ...m.topGroups, [gender]: groups } };
    });
  }, [gender]);

  const renameTopGroup = useCallback(
    (oldName: string, newName: string) => {
      setMap((m) => {
        const groups = m.topGroups[gender].map((g) =>
          g.name === oldName ? { ...g, name: newName } : g,
        );
        if (activeTopGroup === oldName) setActiveTopGroup(newName);
        return { ...m, topGroups: { ...m.topGroups, [gender]: groups } };
      });
    },
    [gender, activeTopGroup],
  );

  const removeTopGroup = useCallback(
    (name: string) => {
      setMap((m) => {
        const groups = m.topGroups[gender].filter((g) => g.name !== name);
        if (activeTopGroup === name) setActiveTopGroup(null);
        return { ...m, topGroups: { ...m.topGroups, [gender]: groups } };
      });
    },
    [gender, activeTopGroup],
  );

  const assignTopToActive = useCallback(
    (drawable: number, innershirt: number) => {
      if (!activeTopGroup) return;
      setMap((m) => {
        const groups: GroupEntry[] = m.topGroups[gender].map((g) => {
          if (g.name !== activeTopGroup && g.members[drawable] !== undefined) {
            const { [drawable]: _, ...rest } = g.members;
            return { ...g, members: rest };
          }
          if (g.name === activeTopGroup) {
            return { ...g, members: { ...g.members, [drawable]: innershirt } };
          }
          return g;
        });
        return { ...m, topGroups: { ...m.topGroups, [gender]: groups } };
      });
    },
    [gender, activeTopGroup],
  );

  const removeTopFromActive = useCallback(
    (drawable: number) => {
      if (!activeTopGroup) return;
      setMap((m) => {
        const groups = m.topGroups[gender].map((g) => {
          if (g.name !== activeTopGroup) return g;
          const { [drawable]: _, ...rest } = g.members;
          return { ...g, members: rest };
        });
        return { ...m, topGroups: { ...m.topGroups, [gender]: groups } };
      });
    },
    [gender, activeTopGroup],
  );

  // ===== Innershirts: canonicals + fallback top =====
  const toggleCanonicalInnershirt = useCallback(
    (drawable: number) => {
      setMap((m) => {
        const list = m.innershirts[gender];
        const has = list.includes(drawable);
        const next = has ? list.filter((d) => d !== drawable) : [...list, drawable].sort((a, b) => a - b);
        // Cascade: if removing, also drop any fallback recorded for it and any topGroups members pointing to it.
        let fallback = m.innershirtToFallbackTop[gender];
        let topGroups = m.topGroups[gender];
        if (has) {
          if (fallback[drawable] !== undefined) {
            const { [drawable]: _, ...rest } = fallback;
            fallback = rest;
          }
          topGroups = topGroups.map((g) => {
            const cleaned: Record<number, number> = {};
            for (const k of Object.keys(g.members).map(Number)) {
              if (g.members[k] !== drawable) cleaned[k] = g.members[k];
            }
            return { ...g, members: cleaned };
          });
        }
        return {
          ...m,
          innershirts: { ...m.innershirts, [gender]: next },
          innershirtToFallbackTop: { ...m.innershirtToFallbackTop, [gender]: fallback },
          topGroups: { ...m.topGroups, [gender]: topGroups },
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
    setVisible,
    gender,
    setGender,
    tab,
    setTab,
    activeGloveGroup,
    setActiveGloveGroup,
    activeTopGroup,
    setActiveTopGroup,
    savedAt,
    saving,
    previewDrawable,
    previewBare,
    previewInnershirt,
    addGloveGroup,
    renameGloveGroup,
    removeGloveGroup,
    assignGloveToActive,
    removeGloveFromActive,
    setJacketArms,
    clearJacketArms,
    addTopGroup,
    renameTopGroup,
    removeTopGroup,
    assignTopToActive,
    removeTopFromActive,
    toggleCanonicalInnershirt,
    setFallbackTop,
    clearFallbackTop,
    save,
    close,
  };
}

export type ClothMapStore = ReturnType<typeof useClothMap>;
