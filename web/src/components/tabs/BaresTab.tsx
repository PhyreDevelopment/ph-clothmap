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
`;

interface Props { store: ClothMapStore }

export function BaresTab({ store }: Props) {
  const { gender, map } = store;
  const bares = map.bares[gender];
  const canonSet = useMemo(() => new Set(bares), [bares]);

  return (
    <Wrap>
      <Status>
        {bares.length} canonical bare-arms declared. Click a tile to preview on the ped,
        click the ★ to add/remove from the list. Removing a bare also clears any glove or
        jacket entry that pointed to it.
      </Status>
      <DrawableScroll>
        {range(BARE_RANGE).map((d) => (
          <DrawableTile
            key={d}
            gender={gender}
            component={3}
            drawable={d}
            state={canonSet.has(d) ? 'fallback' : 'neutral'}
            onClick={() => store.previewBare(d)}
            star={{
              on: canonSet.has(d),
              onToggle: () => store.toggleCanonicalBare(d),
            }}
          />
        ))}
      </DrawableScroll>
    </Wrap>
  );
}
