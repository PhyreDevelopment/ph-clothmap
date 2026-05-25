import { useMemo, useState } from 'react';
import styled from 'styled-components';
import type { ClothMapStore } from '../../hooks/useClothMap';
import { GroupsPanel } from '../GroupsPanel';
import { SwatchStrip } from '../SwatchStrip';
import { DrawableTile } from '../DrawableTile';
import { DrawableScroll } from '../DrawableScroll';

const Row = styled.div`flex: 1; display: flex; min-height: 0;`;
const Right = styled.div`flex: 1; display: flex; flex-direction: column; min-width: 0;`;
const Notice = styled.div`
  padding: 8px 12px;
  font-size: 12px;
  color: ${(p) => p.theme.textSoft};
  background: ${(p) => p.theme.surface};
  border-bottom: 1px solid ${(p) => p.theme.border};
`;

const GLOVE_RANGE = 200; // covers all freemode glove drawables (ids stop around 194)
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

interface Props { store: ClothMapStore }

export function GlovesTab({ store }: Props) {
  const { gender, map, activeGloveGroup } = store;
  const groups = map.gloveGroups[gender];
  const bares = map.bares[gender];

  const [pendingDrawable, setPendingDrawable] = useState<number | null>(null);

  // Build owner-index: drawable -> group name
  const owner = useMemo(() => {
    const m: Record<number, string> = {};
    groups.forEach((g) => {
      Object.keys(g.members).map(Number).forEach((d) => { m[d] = g.name; });
    });
    return m;
  }, [groups]);

  const activeMembers: Record<number, number> | undefined = useMemo(
    () => groups.find((g) => g.name === activeGloveGroup)?.members,
    [groups, activeGloveGroup],
  );

  return (
    <Row>
      <GroupsPanel
        title="Glove groups"
        groups={groups}
        active={activeGloveGroup}
        onSelect={(n) => store.setActiveGloveGroup(n)}
        onAdd={() => store.addGloveGroup()}
        onRename={(o, n) => store.renameGloveGroup(o, n)}
        onRemove={(n) => store.removeGloveGroup(n)}
      />
      <Right>
        <SwatchStrip
          gender={gender}
          component={3}
          drawables={bares}
          selected={pendingDrawable !== null ? null : null}
          onPick={(bare) => {
            if (pendingDrawable !== null && activeGloveGroup) {
              store.assignGloveToActive(pendingDrawable, bare);
              setPendingDrawable(null);
            }
          }}
          onHover={(d) => store.previewBare(d)}
          label={
            pendingDrawable !== null
              ? `Pick bare-arms for drawable #${pendingDrawable}`
              : 'Bare-arms (hover to preview)'
          }
        />
        {!activeGloveGroup ? (
          <Notice>Select or create a group to start assigning drawables.</Notice>
        ) : null}
        <DrawableScroll>
          {range(GLOVE_RANGE).map((d) => {
            const ownerName = owner[d];
            const inActive = activeMembers && activeMembers[d] !== undefined;
            const state = inActive ? 'active' : ownerName ? 'other' : 'neutral';
            return (
              <DrawableTile
                key={d}
                gender={gender}
                component={3}
                drawable={d}
                state={state}
                tag={ownerName && !inActive ? ownerName : inActive ? `→ bare ${activeMembers![d]}` : undefined}
                onHover={() => store.previewDrawable(3, d)}
                onClick={() => {
                  if (!activeGloveGroup) return;
                  if (inActive) {
                    store.removeGloveFromActive(d);
                    return;
                  }
                  setPendingDrawable(d);
                }}
              />
            );
          })}
        </DrawableScroll>
      </Right>
    </Row>
  );
}
