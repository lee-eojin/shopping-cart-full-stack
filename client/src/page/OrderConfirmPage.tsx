import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { Stack } from "../shared/components/layout/Stack.tsx";
import { Row } from "../shared/components/layout/Row.tsx";
import { useCart } from "../cart/hooks/useCart.ts";
import { useSelection } from "../cart/hooks/useSelection.ts";
import { calcSummary } from "../cart/cartModel.ts";
import { formatPrice } from "../shared/lib/format.ts";

export function OrderConfirmPage() {
  const navigate = useNavigate();
  const { data: items } = useCart();
  const { isSelected } = useSelection();

  const view = (items ?? []).map((item) => ({ ...item, selected: isSelected(item.id) }));
  const { total } = calcSummary(view);

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
        <Stack gap={4}>
          <span>총 결제 금액</span>
          <Amount>{formatPrice(total)}</Amount>
        </Stack>
        <Button type="button">결제하기</Button>
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
const Amount = styled.p``;
const Button = styled.button`
  width: 100%;
  padding: 16px;
`;
