import { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { ClothMapStore } from '../../hooks/useClothMap';
import { SwatchStrip } from '../SwatchStrip';
import { DrawableTile } from '../DrawableTile';
import { DrawableScroll } from '../DrawableScroll';

const SHIRT_RANGE = 200;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// Hide the top while capturing shirt -> bare-arms so the shirt is fully visible.
const HIDDEN_TOP = 15;
// Drawable 15 of component 8 is the empty/invisible undershirt — used to toggle
// the shirt off so we can compare bare-arms against actual bare arms.
const HIDDEN_SHIRT = 15;

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

export function ShirtsTab({ store }: Props) {
  const { gender, map } = store;
  const bares = map.bares[gender];
  const shirts = map.shirts[gender];

  const [selected, setSelected] = useState<number | null>(null);
  const [shirtVisible, setShirtVisible] = useState(false);

  // Keep the top hidden whenever this tab is active so the shirt isn't covered.
  // Re-fire on gender change since the freemode model swap resets components.
  useEffect(() => {
    store.previewDrawable(11, HIDDEN_TOP);
  }, [gender, store.previewDrawable]);

  return (
    <Wrap>
      <SwatchStrip
        gender={gender}
        component={3}
        drawables={bares}
        selected={selected !== null ? shirts[selected] ?? null : null}
        onPick={(bare) => {
          if (selected !== null) {
            store.setShirtMapping(selected, bare);
            store.previewBare(bare);
          }
        }}
        onHover={(d) => store.previewBare(d)}
        label={
          selected !== null
            ? `Lock bare-arms for shirt #${selected}`
            : 'Pick a shirt below, then click the bare-arms it sits on.'
        }
      />
      {selected !== null ? (
        <Status>
          shirt #{selected} →{' '}
          {shirts[selected] !== undefined ? (
            <>
              arms {shirts[selected]}
              <Pill onClick={() => store.clearShirtMapping(selected)}>clear</Pill>
            </>
          ) : (
            <span>not set — click a bare-arms above</span>
          )}
        </Status>
      ) : null}
      <DrawableScroll>
        {range(SHIRT_RANGE).map((d) => {
          const mapped = shirts[d];
          const isSel = selected === d;
          const state = isSel ? 'active' : mapped !== undefined ? 'fallback' : 'neutral';
          return (
            <DrawableTile
              key={d}
              gender={gender}
              component={8}
              drawable={d}
              state={state}
              tag={mapped !== undefined ? `arms ${mapped}` : undefined}
              onClick={() => {
                if (isSel) {
                  // Toggle shirt on/off so user can compare bare-arms vs shirted.
                  const showing = !shirtVisible;
                  setShirtVisible(showing);
                  store.previewInnershirt(showing ? d : HIDDEN_SHIRT);
                } else {
                  setSelected(d);
                  setShirtVisible(true);
                  store.previewInnershirt(d);
                }
              }}
              onHover={() => {
                if (shirtVisible || selected !== d) {
                  store.previewInnershirt(d);
                }
              }}
            />
          );
        })}
      </DrawableScroll>
    </Wrap>
  );
}
