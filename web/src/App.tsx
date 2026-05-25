import styled from 'styled-components';
import { useClothMap } from './hooks/useClothMap';
import { Topbar } from './components/Topbar';
import { GlovesTab } from './components/tabs/GlovesTab';
import { JacketsTab } from './components/tabs/JacketsTab';
import { TopsTab } from './components/tabs/TopsTab';
import { InnershirtsTab } from './components/tabs/InnershirtsTab';

const Shell = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  pointer-events: none;
`;

const Panel = styled.div`
  margin-left: auto;
  width: 60vw;
  max-width: 1100px;
  min-width: 680px;
  background: ${(p) => p.theme.bg};
  border-left: 1px solid ${(p) => p.theme.border};
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.4);
`;

export default function App() {
  const store = useClothMap();
  if (!store.visible) return null;

  return (
    <Shell>
      <Panel>
        <Topbar store={store} />
        {store.tab === 'gloves' && <GlovesTab store={store} />}
        {store.tab === 'jackets' && <JacketsTab store={store} />}
        {store.tab === 'tops' && <TopsTab store={store} />}
        {store.tab === 'innershirts' && <InnershirtsTab store={store} />}
      </Panel>
    </Shell>
  );
}
