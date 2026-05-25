import { useState } from 'react';
import styled from 'styled-components';
import type { ClothMapStore } from '../../hooks/useClothMap';
import { SwatchStrip } from '../SwatchStrip';
import { DrawableTile } from '../DrawableTile';
import { DrawableScroll } from '../DrawableScroll';

const GLOVE_RANGE = 200;
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

interface Props { store: ClothMapStore }

export function GlovesTab({ store }: Props) {
  const { gender, map } = store;
  const bares = map.bares[gender];
  const gloves = map.gloves[gender];

  const [selected, setSelected] = useState<number | null>(null);

  return (
    <Wrap>
      <SwatchStrip
        gender={gender}
        component={3}
        drawables={bares}
        selected={selected !== null ? gloves[selected] ?? null : null}
        onPick={(bare) => {
          if (selected !== null) {
            store.setGloveMapping(selected, bare);
            store.previewBare(bare);
          }
        }}
        onHover={(d) => store.previewBare(d)}
        label={
          selected !== null
            ? `Lock bare-arms for glove #${selected}`
            : 'Pick a glove below, then click the bare-arms it sits on.'
        }
      />
      {selected !== null ? (
        <Status>
          glove #{selected} →{' '}
          {gloves[selected] !== undefined ? (
            <>
              arms {gloves[selected]}
              <Pill onClick={() => store.clearGloveMapping(selected)}>clear</Pill>
            </>
          ) : (
            <span>not set — click a bare-arms above</span>
          )}
        </Status>
      ) : null}
      <DrawableScroll>
        {range(GLOVE_RANGE).map((d) => {
          const mapped = gloves[d];
          const isSel = selected === d;
          const state = isSel ? 'active' : mapped !== undefined ? 'fallback' : 'neutral';
          return (
            <DrawableTile
              key={d}
              gender={gender}
              component={3}
              drawable={d}
              state={state}
              tag={mapped !== undefined ? `arms ${mapped}` : undefined}
              onClick={() => {
                setSelected(d);
                store.previewDrawable(3, d);
              }}
              onHover={() => store.previewDrawable(3, d)}
            />
          );
        })}
      </DrawableScroll>
    </Wrap>
  );
}
