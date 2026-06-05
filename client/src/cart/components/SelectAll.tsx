import { Row } from "../../shared/components/layout/Row.tsx";

interface SelectAllProps {
  checked: boolean;
  onSelectAll: (checked: boolean) => void;
}

export function SelectAll({ checked, onSelectAll }: SelectAllProps) {
  return (
    <Row
      left={
        <label>
          <input type="checkbox" checked={checked} onChange={(e) => onSelectAll(e.target.checked)} />
          전체 선택
        </label>
      }
    />
  );
}
