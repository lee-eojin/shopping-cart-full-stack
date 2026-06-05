import styled from "@emotion/styled";
import { Stack } from "../shared/components/layout/Stack.tsx";
import { CartContainer } from "../cart/components/CartContainer.tsx";

export function CartPage() {
  return (
    <Page>
      <Stack gap={24}>
        <Title>SHOP</Title>
        <CartContainer />
      </Stack>
    </Page>
  );
}

const Page = styled.div`
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
`;

const Title = styled.h1``;
