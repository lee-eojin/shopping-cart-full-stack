import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";

import { OrderConfirmContainer } from "../order/components/OrderConfirmContainer.tsx";
import { Row } from "../shared/components/layout/Row.tsx";
import { Stack } from "../shared/components/layout/Stack.tsx";

export function OrderConfirmPage() {
  const navigate = useNavigate();

  return (
    <Page>
      <Stack gap={24}>
        <Row left={<button type="button" aria-label="뒤로 가기" onClick={() => navigate(-1)}>←</button>}/>
        <Title>주문 확인</Title>
        <OrderConfirmContainer onProceed={() => navigate("/order/complete")} />
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
