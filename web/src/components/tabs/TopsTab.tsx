import { useState } from 'react';
import styled from 'styled-components';
import type { ClothMapStore } from '../../hooks/useClothMap';
import { SwatchStrip } from '../SwatchStrip';
import { DrawableTile } from '../DrawableTile';
import { DrawableScroll } from '../DrawableScroll';

const TOP_RANGE = 250;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const Wrap = styled.div`flex: 1; display: flex; flex-direction: column; min-height: 0;`;
const Status = styled.div`
  padding: 8px 12px;
  font-size: 12px;
  background: ${(p) => p.theme.surface};
  border-bottom: 1px solid ${(p) => p.theme.border};
  color: ${(p) => p.theme.textMuted};
`;
const Pill = styled.button`
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 11px;
  border-radius: ${(p) => p.theme.radius};
  border: 1px solid ${(p) => p.theme.borderSoft};
  color: ${(p) => p.theme.bad};
`;
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

interface Props { store: ClothMapStore }

export function TopsTab({ store }: Props) {
  const { gender, map } = store;
  const innershirts = map.innershirts[gender];
  const tops = map.tops[gender];

  const [selected, setSelected] = useState<number | null>(null);

  if (innershirts.length === 0) {
    return (
      <Wrap>
        <Empty>
          <div>
            No canonical innershirts declared yet.
            <br />
            Open the
            <Link onClick={() => store.setTab('innershirts')}>Innershirts</Link>
            tab and mark some drawables as canonical first.
          </div>
        </Empty>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <SwatchStrip
        gender={gender}
        component={8}
        drawables={innershirts}
        selected={selected !== null ? tops[selected] ?? null : null}
        onPick={(innershirt) => {
          if (selected !== null) {
            store.setTopMapping(selected, innershirt);
            store.previewInnershirt(innershirt);
          }
        }}
        onHover={(d) => store.previewInnershirt(d)}
        label={
          selected !== null
            ? `Lock innershirt for top #${selected}`
            : 'Pick a top below, then click the innershirt it sits on.'
        }
      />
      {selected !== null ? (
        <Status>
          top #{selected} →{' '}
          {tops[selected] !== undefined ? (
            <>
              innershirt {tops[selected]}
              <Pill onClick={() => store.clearTopMapping(selected)}>clear</Pill>
            </>
          ) : (
            <span>not set — click an innershirt above</span>
          )}
        </Status>
      ) : null}
      <DrawableScroll>
        {range(TOP_RANGE).map((d) => {
          const mapped = tops[d];
          const isSel = selected === d;
          const state = isSel ? 'active' : mapped !== undefined ? 'fallback' : 'neutral';
          return (
            <DrawableTile
              key={d}
              gender={gender}
              component={11}
              drawable={d}
              state={state}
              tag={mapped !== undefined ? `inner ${mapped}` : undefined}
              onClick={() => {
                setSelected(d);
                store.previewDrawable(11, d);
              }}
              onHover={() => store.previewDrawable(11, d)}
            />
          );
        })}
      </DrawableScroll>
    </Wrap>
  );
}
