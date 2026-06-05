import styled from "@emotion/styled";
import { Stack } from "../shared/components/layout/Stack.tsx";
import { CartContainer } from "../cart/components/CartContainer.tsx";

export function CartPage() {
  return (
    <Stack gap={24}>
      <Title>SHOP</Title>
      <CartContainer />
    </Stack>
  );
}

const Title = styled.h1`
  margin: 0;
  font-size: 20px;
`;
