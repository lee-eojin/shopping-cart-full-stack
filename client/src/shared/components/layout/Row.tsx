import styled from "@emotion/styled";
import type { ComponentPropsWithRef, ReactNode } from "react";

interface RowProps extends ComponentPropsWithRef<"div"> {
  left?: ReactNode;
  right?: ReactNode;
}

export function Row({ left, right, ...rest }: RowProps) {
  return (
    <RowBox {...rest}>
      <div>{left}</div>
      <div>{right}</div>
    </RowBox>
  );
}

const RowBox = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
