import styled from 'styled-components';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
  gap: 6px;
  padding: 10px;
  overflow-y: auto;
  flex: 1;
`;

export const DrawableScroll = Grid;
