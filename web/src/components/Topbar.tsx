import styled from 'styled-components';
import type { ClothMapStore } from '../hooks/useClothMap';
import type { Tab, Gender } from '../types';

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 14px;
  background: ${(p) => p.theme.bg};
  border-bottom: 1px solid ${(p) => p.theme.border};
`;

const Title = styled.div`
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${(p) => p.theme.accent};
  font-weight: 600;
`;

const Segmented = styled.div`
  display: inline-flex;
  border: 1px solid ${(p) => p.theme.border};
  border-radius: ${(p) => p.theme.radius};
  overflow: hidden;
`;

const Seg = styled.button<{ $on: boolean }>`
  padding: 6px 12px;
  font-size: 12px;
  background: ${(p) => (p.$on ? p.theme.accent : 'transparent')};
  color: ${(p) => (p.$on ? p.theme.bg : p.theme.text)};
  text-transform: uppercase;
  letter-spacing: 1px;
  &:hover { background: ${(p) => (p.$on ? p.theme.accentBright : p.theme.surfaceSoft)}; }
`;

const Spacer = styled.div`flex: 1;`;

const Badge = styled.div<{ $error?: boolean }>`
  font-size: 11px;
  color: ${(p) => (p.$error ? p.theme.bad : p.theme.textSoft)};
  margin-right: 6px;
`;

const Btn = styled.button<{ $primary?: boolean; $disabled?: boolean }>`
  padding: 6px 16px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-radius: ${(p) => p.theme.radius};
  border: 1px solid ${(p) => (p.$primary ? p.theme.accent : p.theme.border)};
  background: ${(p) => (p.$primary ? p.theme.accent : 'transparent')};
  color: ${(p) => (p.$primary ? p.theme.bg : p.theme.text)};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  pointer-events: ${(p) => (p.$disabled ? 'none' : 'auto')};
  &:hover { background: ${(p) => (p.$primary ? p.theme.accentBright : p.theme.surfaceSoft)}; }
`;

const tabs: { key: Tab; label: string }[] = [
  { key: 'gloves', label: 'Gloves' },
  { key: 'jackets', label: 'Jackets' },
  { key: 'tops', label: 'Tops' },
  { key: 'bares', label: 'Bares' },
  { key: 'innershirts', label: 'Innershirts' },
];

const genders: Gender[] = ['male', 'female'];

interface Props { store: ClothMapStore }

export function Topbar({ store }: Props) {
  const isError = store.savedAt?.startsWith('error');
  return (
    <Bar>
      <Title>ph-clothmap</Title>
      <Segmented>
        {genders.map((g) => (
          <Seg key={g} $on={store.gender === g} onClick={() => store.setGender(g)}>
            {g}
          </Seg>
        ))}
      </Segmented>
      <Segmented>
        {tabs.map((t) => (
          <Seg key={t.key} $on={store.tab === t.key} onClick={() => store.setTab(t.key)}>
            {t.label}
          </Seg>
        ))}
      </Segmented>
      <Spacer />
      {store.savedAt ? (
        <Badge $error={isError}>
          {isError ? store.savedAt : `saved ${store.savedAt} (v${store.map.version})`}
        </Badge>
      ) : null}
      <Btn $primary $disabled={store.saving} onClick={() => store.save()}>
        {store.saving ? 'Saving…' : 'Save'}
      </Btn>
      <Btn onClick={() => store.close()}>Close</Btn>
    </Bar>
  );
}
