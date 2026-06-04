import styled from "@emotion/styled";
import type { ComponentPropsWithRef } from "react";

interface ErrorMessageProps extends ComponentPropsWithRef<"div"> {
  message?: string;
  onRetry: () => void;
}

export function ErrorMessage({
  message = "문제가 발생했습니다.",
  onRetry,
  ...rest
}: ErrorMessageProps) {
  return (
    <Box role="alert" {...rest}>
      <span>{message}</span>
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
    </Box>
  );
}

const Box = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;
