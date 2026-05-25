import styled from 'styled-components';
import { DrawableTile } from './DrawableTile';
import type { Gender } from '../types';

interface Props {
  gender: Gender;
  component: number; // 3 for bares, 8 for innershirts
  drawables: number[];
  selected?: number | null;
  onPick: (drawable: number) => void;
  onHover?: (drawable: number) => void;
  emptyHint?: string;
  label: string;
}

const Bar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: ${(p) => p.theme.surface};
  border-bottom: 1px solid ${(p) => p.theme.border};
`;

const Row = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  align-items: center;
  min-height: 96px;
`;

const Label = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${(p) => p.theme.textSoft};
`;

const Empty = styled.div`
  font-size: 12px;
  color: ${(p) => p.theme.textSoft};
  padding: 8px;
`;

export function SwatchStrip({
  gender,
  component,
  drawables,
  selected,
  onPick,
  onHover,
  emptyHint,
  label,
}: Props) {
  return (
    <Bar>
      <Label>{label}</Label>
      <Row>
        {drawables.length === 0 ? (
          <Empty>{emptyHint || 'no entries'}</Empty>
        ) : (
          drawables.map((d) => (
            <DrawableTile
              key={d}
              gender={gender}
              component={component}
              drawable={d}
              state={selected === d ? 'active' : 'neutral'}
              size={88}
              hideId
              onClick={() => onPick(d)}
              onHover={onHover ? () => onHover(d) : undefined}
            />
          ))
        )}
      </Row>
    </Bar>
  );
}
