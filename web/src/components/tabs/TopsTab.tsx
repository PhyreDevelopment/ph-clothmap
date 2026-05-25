import { useMemo, useState } from 'react';
import styled from 'styled-components';
import type { ClothMapStore } from '../../hooks/useClothMap';
import { GroupsPanel } from '../GroupsPanel';
import { SwatchStrip } from '../SwatchStrip';
import { DrawableTile } from '../DrawableTile';
import { DrawableScroll } from '../DrawableScroll';

const TOP_RANGE = 250;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const Row = styled.div`flex: 1; display: flex; min-height: 0;`;
const Right = styled.div`flex: 1; display: flex; flex-direction: column; min-width: 0;`;

const Empty = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: ${(p) => p.theme.textSoft};
`;

const Link = styled.button`
  color: ${(p) => p.theme.accent};
  text-decoration: underline;
  margin-left: 4px;
  &:hover { color: ${(p) => p.theme.accentBright}; }
`;

const Notice = styled.div`
  padding: 8px 12px;
  font-size: 12px;
  color: ${(p) => p.theme.textSoft};
  background: ${(p) => p.theme.surface};
  border-bottom: 1px solid ${(p) => p.theme.border};
`;

interface Props { store: ClothMapStore }

export function TopsTab({ store }: Props) {
  const { gender, map, activeTopGroup } = store;
  const groups = map.topGroups[gender];
  const innershirts = map.innershirts[gender];

  const [pendingDrawable, setPendingDrawable] = useState<number | null>(null);

  const owner = useMemo(() => {
    const m: Record<number, string> = {};
    groups.forEach((g) => {
      Object.keys(g.members).map(Number).forEach((d) => { m[d] = g.name; });
    });
    return m;
  }, [groups]);

  const activeMembers = useMemo(
    () => groups.find((g) => g.name === activeTopGroup)?.members,
    [groups, activeTopGroup],
  );

  if (innershirts.length === 0) {
    return (
      <Row>
        <Empty>
          <div>
            No canonical innershirts declared yet.
            <br />
            Open the
            <Link onClick={() => store.setTab('innershirts')}>Innershirts</Link>
            tab and mark some drawables as canonical first.
          </div>
        </Empty>
      </Row>
    );
  }

  return (
    <Row>
      <GroupsPanel
        title="Top groups"
        groups={groups}
        active={activeTopGroup}
        onSelect={(n) => {
          store.setActiveTopGroup(n);
          const g = groups.find((x) => x.name === n);
          if (g) {
            const first = Object.keys(g.members).map(Number).sort((a, b) => a - b)[0];
            if (first !== undefined) {
              store.previewInnershirt(g.members[first]);
              store.previewDrawable(11, first);
            }
          }
        }}
        onAdd={() => store.addTopGroup()}
        onRename={(o, n) => store.renameTopGroup(o, n)}
        onRemove={(n) => store.removeTopGroup(n)}
        emptyHint="No top groups yet — click + new"
      />
      <Right>
        <SwatchStrip
          gender={gender}
          component={8}
          drawables={innershirts}
          selected={null}
          onPick={(innershirt) => {
            if (pendingDrawable !== null && activeTopGroup) {
              store.assignTopToActive(pendingDrawable, innershirt);
              setPendingDrawable(null);
            }
          }}
          onHover={(d) => store.previewInnershirt(d)}
          label={
            pendingDrawable !== null
              ? `Pick innershirt for top #${pendingDrawable}`
              : 'Innershirts (hover changes ped innershirt; click to lock)'
          }
        />
        {!activeTopGroup ? (
          <Notice>Select or create a top group to start assigning drawables.</Notice>
        ) : null}
        <DrawableScroll>
          {range(TOP_RANGE).map((d) => {
            const ownerName = owner[d];
            const inActive = activeMembers && activeMembers[d] !== undefined;
            const state = inActive ? 'active' : ownerName ? 'other' : 'neutral';
            return (
              <DrawableTile
                key={d}
                gender={gender}
                component={11}
                drawable={d}
                state={state}
                tag={ownerName && !inActive ? ownerName : inActive ? `→ inner ${activeMembers![d]}` : undefined}
                onHover={() => store.previewDrawable(11, d)}
                onClick={() => {
                  if (!activeTopGroup) return;
                  if (inActive) {
                    store.removeTopFromActive(d);
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
