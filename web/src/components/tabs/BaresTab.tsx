import { useMemo } from 'react';
import styled from 'styled-components';
import type { ClothMapStore } from '../../hooks/useClothMap';
import { DrawableTile } from '../DrawableTile';
import { DrawableScroll } from '../DrawableScroll';

const BARE_RANGE = 200;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const Wrap = styled.div`flex: 1; display: flex; flex-direction: column; min-height: 0;`;
const Status = styled.div`
  padding: 8px 12px;
  font-size: 12px;
  background: ${(p) => p.theme.surface};
  border-bottom: 1px solid ${(p) => p.theme.border};
  color: ${(p) => p.theme.textMuted};
  display: flex;
  align-items: center;
  gap: 12px;
`;
const Chip = styled.span<{ $accent?: boolean }>`
  padding: 2px 8px;
  border-radius: ${(p) => p.theme.radius};
  border: 1px solid ${(p) => (p.$accent ? p.theme.accent : p.theme.borderSoft)};
  color: ${(p) => (p.$accent ? p.theme.accent : p.theme.text)};
  font-size: 11px;
`;

const TileWrap = styled.div`position: relative;`;

const DefaultBtn = styled.button<{ $on: boolean; $canonical: boolean }>`
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: ${(p) => (p.$on ? p.theme.accent : p.theme.textSoft)};
  font-size: 13px;
  border: 1px solid ${(p) => (p.$on ? p.theme.accent : 'transparent')};
  opacity: ${(p) => (p.$canonical ? 1 : 0.3)};
  pointer-events: ${(p) => (p.$canonical ? 'auto' : 'none')};
  &:hover { color: ${(p) => p.theme.accentBright}; }
`;

interface Props { store: ClothMapStore }

export function BaresTab({ store }: Props) {
  const { gender, map } = store;
  const bares = map.bares[gender];
  const def = map.defaultBare[gender];
  const canonSet = useMemo(() => new Set(bares), [bares]);

  return (
    <Wrap>
      <Status>
        <span>{bares.length} canonical bare-arms</span>
        <Chip $accent>default: {def}</Chip>
        <span style={{ flex: 1 }} />
        <span>★ toggle canonical · ⌂ set as default · click tile to preview</span>
      </Status>
      <DrawableScroll>
        {range(BARE_RANGE).map((d) => {
          const isCanon = canonSet.has(d);
          const isDefault = def === d;
          const state = isDefault ? 'active' : isCanon ? 'fallback' : 'neutral';
          return (
            <TileWrap key={d}>
              <DrawableTile
                gender={gender}
                component={3}
                drawable={d}
                state={state}
                onClick={() => store.previewBare(d)}
                star={{
                  on: isCanon,
                  onToggle: () => store.toggleCanonicalBare(d),
                }}
              />
              <DefaultBtn
                $on={isDefault}
                $canonical={isCanon}
                title={
                  !isCanon
                    ? 'Mark this drawable as a canonical bare first'
                    : isDefault
                    ? 'This is the default bare'
                    : 'Set as default bare for this gender'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCanon) store.setDefaultBare(d);
                }}
              >
                ⌂
              </DefaultBtn>
            </TileWrap>
          );
        })}
      </DrawableScroll>
    </Wrap>
  );
}
