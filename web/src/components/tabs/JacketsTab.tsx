import { useState } from 'react';
import styled from 'styled-components';
import type { ClothMapStore } from '../../hooks/useClothMap';
import { SwatchStrip } from '../SwatchStrip';
import { DrawableTile } from '../DrawableTile';
import { DrawableScroll } from '../DrawableScroll';

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
                  setSelected(d);
                  store.previewDrawable(11, d);
                }}
                onHover={() => store.previewDrawable(11, d)}
              />
            );
          })}
        </DrawableScroll>
      </Right>
    </Row>
  );
}
