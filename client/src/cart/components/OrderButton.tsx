import styled from "@emotion/styled";

interface OrderButtonProps {
  disabled?: boolean;
  onCheckout: () => void;
}

export function OrderButton({ disabled, onCheckout }: OrderButtonProps) {
  return <Button type="button" disabled={disabled} onClick={onCheckout}>주문 확인</Button>
}

const Button = styled.button`
  width: 100%;
  padding: 16px;
`;
