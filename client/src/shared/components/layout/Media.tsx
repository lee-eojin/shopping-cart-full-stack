import styled from "@emotion/styled";

export const Media = styled.div<{ gap?: number }>`
  display: flex;
  align-items: center;
  gap: ${({ gap = 12 }) => gap}px;
`;
