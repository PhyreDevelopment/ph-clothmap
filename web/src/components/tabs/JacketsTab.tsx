import { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { ClothMapStore } from '../../hooks/useClothMap';
import { SwatchStrip } from '../SwatchStrip';
import { DrawableTile } from '../DrawableTile';
import { DrawableScroll } from '../DrawableScroll';

// Drawable 15 of component 8 is the empty/invisible undershirt on freemode peds.
// Removing the undershirt while we capture jacket->bare-arms keeps the jacket's
// own collar/underside visible without an undershirt poking through.
const HIDDEN_UNDERSHIRT = 15;
// Drawable 15 of component 11 is "no jacket" on freemode peds — used to toggle
// the jacket off so we can compare the bare-arms swatch against bare arms.
const HIDDEN_TOP = 15;

const JACKET_RANGE = 250;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const Row = styled.div`flex: 1; display: flex; min-height: 0;`;
const Right = styled.div`flex: 1; display: flex; flex-direction: column; min-width: 0;`;
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
  &:hover { background: ${(p) => p.theme.surfaceSoft}; }
`;

interface Props { store: ClothMapStore }

export function JacketsTab({ store }: Props) {
  const { gender, map } = store;
  const bares = map.bares[gender];
  const jacketMap = map.jacketToArms[gender];

  const [selected, setSelected] = useState<number | null>(null);
  const [jacketVisible, setJacketVisible] = useState(false);

  // Hide the undershirt for the whole time this tab is open. Re-fire on gender
  // change since the freemode model swap resets all components to drawable 0.
  useEffect(() => {
    store.previewInnershirt(HIDDEN_UNDERSHIRT);
  }, [gender, store.previewInnershirt]);

  return (
    <Row>
      <Right>
        <SwatchStrip
          gender={gender}
          component={3}
          drawables={bares}
          selected={selected !== null ? jacketMap[selected] : null}
          onPick={(bare) => {
            if (selected !== null) {
              store.setJacketArms(selected, bare);
            }
          }}
          onHover={(d) => store.previewBare(d)}
          label={
            selected !== null
              ? `Lock bare-arms for jacket #${selected}`
              : 'Pick a jacket below, then click the bare-arms that fits.'
          }
        />
        {selected !== null ? (
          <Status>
            jacket #{selected} →{' '}
            {jacketMap[selected] !== undefined ? (
              <>
                arms {jacketMap[selected]}
                <Pill onClick={() => store.clearJacketArms(selected)}>clear</Pill>
              </>
            ) : (
              <span>not set</span>
            )}
          </Status>
        ) : null}
        <DrawableScroll>
          {range(JACKET_RANGE).map((d) => {
            const has = jacketMap[d] !== undefined;
            const isSel = selected === d;
            return (
              <DrawableTile
                key={d}
                gender={gender}
                component={11}
                drawable={d}
                state={isSel ? 'active' : has ? 'fallback' : 'neutral'}
                tag={has ? `arms ${jacketMap[d]}` : undefined}
                onClick={() => {
                  if (isSel) {
                    // Same tile clicked again -> toggle jacket on/off so user
                    // can compare bare-arms vs jacketed look directly.
                    const showing = !jacketVisible;
                    setJacketVisible(showing);
                    store.previewDrawable(11, showing ? d : HIDDEN_TOP);
                  } else {
                    setSelected(d);
                    setJacketVisible(true);
                    store.previewDrawable(11, d);
                  }
                }}
                onHover={() => {
                  if (jacketVisible || selected !== d) {
                    store.previewDrawable(11, d);
                  }
                }}
              />
            );
          })}
        </DrawableScroll>
      </Right>
    </Row>
  );
}
