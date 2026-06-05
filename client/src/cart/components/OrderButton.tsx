import styled from "@emotion/styled";
import { formatPrice } from "../../shared/lib/format.ts";

interface OrderButtonProps {
  amount: number;
  disabled?: boolean;
  onCheckout: () => void;
}

export function OrderButton({ amount, disabled, onCheckout }: OrderButtonProps) {
  return (
    <Button type="button" disabled={disabled} onClick={onCheckout}>
      {formatPrice(amount)} 결제하기
    </Button>
  );
}

const Button = styled.button`
  width: 100%;
  padding: 16px;
  background-color: #1d76d2;
  color: #fff;
  font-size: 16px;
  cursor: pointer;

  &:disabled {
    background-color: #b0b0b0;
    cursor: not-allowed;
  }
`;
