import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";

import { CartContainer } from "../cart/components/CartContainer.tsx";
import { Stack } from "../shared/components/layout/Stack.tsx";

export function CartPage() {
  const navigate = useNavigate();

  return (
    <Page>
      <Stack gap={24}>
        <Title>SHOP</Title>
        <CartContainer onCheckout={() => navigate("/order")} />
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
