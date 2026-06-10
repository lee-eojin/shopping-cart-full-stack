import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

export function Spinner() {
  return <Circle role="status" aria-label="로딩 중" />;
}

const Circle = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid #eee;
  border-top-color: #333;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;
