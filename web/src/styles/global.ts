import { createGlobalStyle } from 'styled-components';
import type { Theme } from '../theme';

export const GlobalStyles = createGlobalStyle<{ theme: Theme }>`
  * { box-sizing: border-box; }
  html, body, #root {
    margin: 0; padding: 0; height: 100%; width: 100%;
    font-family: ${(p) => p.theme.font};
    color: ${(p) => p.theme.text};
    background: transparent;
    user-select: none;
    overflow: hidden;
  }
  body { background: transparent; }
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    background: none;
    color: inherit;
  }
  input {
    font-family: inherit;
    color: inherit;
  }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: ${(p) => p.theme.bg}; }
  ::-webkit-scrollbar-thumb {
    background: ${(p) => p.theme.surfaceLift};
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover { background: ${(p) => p.theme.borderSoft}; }
`;
