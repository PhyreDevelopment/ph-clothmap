import { useMemo, useState } from 'react';
import styled from 'styled-components';
import type { ClothMapStore } from '../../hooks/useClothMap';
import { DrawableTile } from '../DrawableTile';
import { DrawableScroll } from '../DrawableScroll';

const INNERSHIRT_RANGE = 200;
const TOP_RANGE = 250;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const Row = styled.div`flex: 1; display: flex; flex-direction: column; min-height: 0;`;
const Tabs = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: ${(p) => p.theme.surface};
  border-bottom: 1px solid ${(p) => p.theme.border};
`;
const SubTab = styled.button<{ $on: boolean }>`
  padding: 4px 12px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-radius: ${(p) => p.theme.radius};
  border: 1px solid ${(p) => (p.$on ? p.theme.accent : p.theme.border)};
  background: ${(p) => (p.$on ? p.theme.accent : 'transparent')};
  color: ${(p) => (p.$on ? p.theme.bg : p.theme.text)};
`;

const Split = styled.div`flex: 1; display: flex; min-height: 0;`;
const Side = styled.div`
  width: 220px;
  background: ${(p) => p.theme.surface};
  border-right: 1px solid ${(p) => p.theme.border};
  display: flex;
  flex-direction: column;
`;
const SideHead = styled.div`
  padding: 10px 12px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${(p) => p.theme.textSoft};
  border-bottom: 1px solid ${(p) => p.theme.border};
`;
const SideList = styled.div`flex: 1; overflow-y: auto; padding: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;`;
const Main = styled.div`flex: 1; display: flex; flex-direction: column; min-width: 0;`;
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
  padding: 16px;
  font-size: 12px;
  color: ${(p) => p.theme.textSoft};
`;

type SubMode = 'fallbacks' | 'canonicals';

interface Props { store: ClothMapStore }

export function InnershirtsTab({ store }: Props) {
  const { gender, map } = store;
  const canonicals = map.innershirts[gender];
  const fallback = map.innershirtToFallbackTop[gender];

  const [sub, setSub] = useState<SubMode>('fallbacks');
  const [selectedInnershirt, setSelectedInnershirt] = useState<number | null>(null);

  const canonSet = useMemo(() => new Set(canonicals), [canonicals]);

  return (
    <Row>
      <Tabs>
        <SubTab $on={sub === 'fallbacks'} onClick={() => setSub('fallbacks')}>Manage fallbacks</SubTab>
        <SubTab $on={sub === 'canonicals'} onClick={() => setSub('canonicals')}>Manage canonicals</SubTab>
      </Tabs>

      {sub === 'fallbacks' ? (
        <Split>
          <Side>
            <SideHead>Canonical innershirts</SideHead>
            {canonicals.length === 0 ? (
              <Empty>No canonicals yet — switch to "Manage canonicals".</Empty>
            ) : (
              <SideList>
                {canonicals.map((d) => (
                  <DrawableTile
                    key={d}
                    gender={gender}
                    component={8}
                    drawable={d}
                    state={selectedInnershirt === d ? 'active' : fallback[d] !== undefined ? 'fallback' : 'neutral'}
                    tag={fallback[d] !== undefined ? `→ top ${fallback[d]}` : undefined}
                    onClick={() => {
                      setSelectedInnershirt(d);
                      store.previewInnershirt(d);
                      const fb = fallback[d];
                      if (fb !== undefined) store.previewDrawable(11, fb);
                    }}
                  />
                ))}
              </SideList>
            )}
          </Side>
          <Main>
            {selectedInnershirt === null ? (
              <Empty>Pick a canonical innershirt on the left to record its fallback top.</Empty>
            ) : (
              <>
                <Status>
                  innershirt #{selectedInnershirt} →{' '}
                  {fallback[selectedInnershirt] !== undefined ? (
                    <>
                      top {fallback[selectedInnershirt]}
                      <Pill onClick={() => store.clearFallbackTop(selectedInnershirt)}>clear</Pill>
                    </>
                  ) : (
                    <span>not set — click a top below</span>
                  )}
                </Status>
                <DrawableScroll>
                  {range(TOP_RANGE).map((d) => (
                    <DrawableTile
                      key={d}
                      gender={gender}
                      component={11}
                      drawable={d}
                      state={fallback[selectedInnershirt] === d ? 'fallback' : 'neutral'}
                      onHover={() => store.previewDrawable(11, d)}
                      onClick={() => store.setFallbackTop(selectedInnershirt, d)}
                    />
                  ))}
                </DrawableScroll>
              </>
            )}
          </Main>
        </Split>
      ) : (
        <Split>
          <Main>
            <Status>
              {canonicals.length} canonical{canonicals.length === 1 ? '' : 's'} declared. Click the star to toggle.
              Removing a canonical also clears its fallback top and any top-group member that pointed to it.
            </Status>
            <DrawableScroll>
              {range(INNERSHIRT_RANGE).map((d) => (
                <DrawableTile
                  key={d}
                  gender={gender}
                  component={8}
                  drawable={d}
                  state={canonSet.has(d) ? 'fallback' : 'neutral'}
                  onHover={() => store.previewInnershirt(d)}
                  star={{
                    on: canonSet.has(d),
                    onToggle: () => store.toggleCanonicalInnershirt(d),
                  }}
                />
              ))}
            </DrawableScroll>
          </Main>
        </Split>
      )}
    </Row>
  );
}
