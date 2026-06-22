import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";

import { PaymentConfirmContainer } from "../order/components/PaymentConfirmContainer.tsx";
import { Stack } from "../shared/components/layout/Stack.tsx";

export function PaymentConfirmPage() {
  const navigate = useNavigate();

  return (
    <Page>
      <Stack gap={24}>
        <Title>결제 확인</Title>
        <PaymentConfirmContainer onBackToCart={() => navigate("/")} />
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
