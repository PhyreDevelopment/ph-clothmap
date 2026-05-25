import { useState } from 'react';
import styled from 'styled-components';
import type { GroupEntry } from '../types';

interface Props {
  title: string;
  groups: GroupEntry[];
  active: string | null;
  onSelect: (name: string) => void;
  onAdd: () => void;
  onRename: (oldName: string, newName: string) => void;
  onRemove: (name: string) => void;
  emptyHint?: string;
}

const Wrap = styled.div`
  width: 220px;
  background: ${(p) => p.theme.surface};
  border-right: 1px solid ${(p) => p.theme.border};
  display: flex;
  flex-direction: column;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid ${(p) => p.theme.border};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${(p) => p.theme.textSoft};
`;

const AddBtn = styled.button`
  font-size: 11px;
  color: ${(p) => p.theme.accent};
  &:hover { color: ${(p) => p.theme.accentBright}; }
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px;
`;

const Item = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 12px;
  border-radius: ${(p) => p.theme.radius};
  background: ${(p) => (p.$active ? p.theme.surfaceLift : 'transparent')};
  color: ${(p) => (p.$active ? p.theme.accent : p.theme.text)};
  cursor: pointer;
  &:hover { background: ${(p) => p.theme.surfaceSoft}; }
`;

const Name = styled.span<{ $editing: boolean }>`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Count = styled.span`
  font-size: 10px;
  color: ${(p) => p.theme.textSoft};
`;

const NameInput = styled.input`
  flex: 1;
  background: ${(p) => p.theme.bg};
  border: 1px solid ${(p) => p.theme.borderSoft};
  border-radius: ${(p) => p.theme.radius};
  padding: 2px 4px;
  font-size: 12px;
`;

const IconBtn = styled.button`
  font-size: 10px;
  color: ${(p) => p.theme.textSoft};
  &:hover { color: ${(p) => p.theme.bad}; }
`;

const Empty = styled.div`
  padding: 12px;
  font-size: 12px;
  color: ${(p) => p.theme.textSoft};
`;

export function GroupsPanel({
  title,
  groups,
  active,
  onSelect,
  onAdd,
  onRename,
  onRemove,
  emptyHint,
}: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  return (
    <Wrap>
      <Head>
        <span>{title}</span>
        <AddBtn onClick={onAdd}>+ new</AddBtn>
      </Head>
      <List>
        {groups.length === 0 ? (
          <Empty>{emptyHint || 'no groups yet'}</Empty>
        ) : (
          groups.map((g) => {
            const count = Object.keys(g.members).length;
            const isEditing = editing === g.name;
            return (
              <Item key={g.name} $active={active === g.name} onClick={() => onSelect(g.name)}>
                {isEditing ? (
                  <NameInput
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const trimmed = draft.trim();
                        if (trimmed && trimmed !== g.name) onRename(g.name, trimmed);
                        setEditing(null);
                      } else if (e.key === 'Escape') {
                        setEditing(null);
                      }
                    }}
                    onBlur={() => {
                      const trimmed = draft.trim();
                      if (trimmed && trimmed !== g.name) onRename(g.name, trimmed);
                      setEditing(null);
                    }}
                  />
                ) : (
                  <>
                    <Name
                      $editing={false}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setDraft(g.name);
                        setEditing(g.name);
                      }}
                    >
                      {g.name}
                    </Name>
                    <Count>{count}</Count>
                    <IconBtn
                      title="Rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraft(g.name);
                        setEditing(g.name);
                      }}
                    >
                      ✎
                    </IconBtn>
                    <IconBtn
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(g.name);
                      }}
                    >
                      ✕
                    </IconBtn>
                  </>
                )}
              </Item>
            );
          })
        )}
      </List>
    </Wrap>
  );
}
