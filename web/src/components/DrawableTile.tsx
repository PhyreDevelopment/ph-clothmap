import { useState } from 'react';
import styled from 'styled-components';
import { buildThumbUrl } from '../utils/thumbnails';
import type { Gender } from '../types';

interface Props {
  gender: Gender;
  component: number;
  drawable: number;
  state?: 'neutral' | 'active' | 'other' | 'fallback';
  tag?: string;
  onClick?: () => void;
  onHover?: () => void;
  star?: { on: boolean; onToggle: () => void };
  size?: number;
  hideId?: boolean;
}

const Wrap = styled.button<{ $state: NonNullable<Props['state']>; $size: number }>`
  position: relative;
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => p.theme.surfaceSoft};
  border: 1px solid
    ${(p) =>
      p.$state === 'active'
        ? p.theme.accent
        : p.$state === 'fallback'
        ? p.theme.accentBright
        : p.$state === 'other'
        ? p.theme.borderSoft
        : p.theme.border};
  border-radius: ${(p) => p.theme.radius};
  padding: 0;
  overflow: hidden;
  opacity: ${(p) => (p.$state === 'other' ? 0.45 : 1)};
  box-shadow: ${(p) =>
    p.$state === 'active' || p.$state === 'fallback'
      ? `0 0 0 1px ${p.theme.accent}, 0 0 12px rgba(252, 163, 17, 0.35)`
      : 'none'};
  transition: border-color 0.1s, box-shadow 0.1s;
  &:hover { border-color: ${(p) => p.theme.accent}; }
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const Fallback = styled.div`
  font-size: 13px;
  color: ${(p) => p.theme.textSoft};
  letter-spacing: 0.5px;
`;

const Tag = styled.div`
  position: absolute;
  left: 4px;
  bottom: 4px;
  font-size: 9px;
  background: rgba(0, 0, 0, 0.6);
  color: ${(p) => p.theme.textMuted};
  padding: 1px 4px;
  border-radius: 2px;
  max-width: calc(100% - 8px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Id = styled.div`
  position: absolute;
  right: 4px;
  top: 4px;
  font-size: 10px;
  color: ${(p) => p.theme.textMuted};
  background: rgba(0, 0, 0, 0.6);
  padding: 1px 4px;
  border-radius: 2px;
`;

const Star = styled.button<{ $on: boolean }>`
  position: absolute;
  left: 4px;
  top: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: ${(p) => (p.$on ? p.theme.accent : p.theme.textSoft)};
  font-size: 13px;
  border: 1px solid
    ${(p) => (p.$on ? p.theme.accent : 'transparent')};
  &:hover { color: ${(p) => p.theme.accentBright}; }
`;

export function DrawableTile({
  gender,
  component,
  drawable,
  state = 'neutral',
  tag,
  onClick,
  onHover,
  star,
  size = 78,
  hideId = false,
}: Props) {
  const [broken, setBroken] = useState(false);
  return (
    <Wrap
      $state={state}
      $size={size}
      onClick={onClick}
      onMouseEnter={onHover}
      title={`#${drawable}${tag ? ` (${tag})` : ''}`}
    >
      {broken ? (
        <Fallback>#{drawable}</Fallback>
      ) : (
        <Img
          src={buildThumbUrl(gender, component, drawable)}
          alt={`#${drawable}`}
          onError={() => setBroken(true)}
        />
      )}
      {hideId ? null : <Id>#{drawable}</Id>}
      {tag ? <Tag>{tag}</Tag> : null}
      {star ? (
        <Star
          $on={star.on}
          onClick={(e) => {
            e.stopPropagation();
            star.onToggle();
          }}
          title={star.on ? 'Unmark canonical' : 'Mark as canonical'}
        >
          {star.on ? '★' : '☆'}
        </Star>
      ) : null}
    </Wrap>
  );
}
