import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { Stack } from "../shared/components/layout/Stack.tsx";
import { Row } from "../shared/components/layout/Row.tsx";
import { OrderConfirmContainer } from "../cart/components/OrderConfirmContainer.tsx";

export function OrderConfirmPage() {
  const navigate = useNavigate();

  return (
    <Page>
      <Stack gap={24}>
        <Row
          left={
            <button type="button" aria-label="뒤로 가기" onClick={() => navigate(-1)}>
              ←
            </button>
          }
        />
        <Title>주문 확인</Title>
        <OrderConfirmContainer onBackToCart={() => navigate("/cart")} />
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
