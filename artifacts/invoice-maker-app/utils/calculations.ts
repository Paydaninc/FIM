export interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
}

export interface CustomFee {
  id: string;
  name: string;
  type: "flat" | "percent";
  value: number;
}

export function calculateTotals(
  lineItems: LineItemInput[],
  taxRate: number,
  discountAmount: number,
  discountType: "fixed" | "percent",
  customFees: CustomFee[] = [],
) {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  const discount =
    discountType === "percent"
      ? (subtotal * discountAmount) / 100
      : discountAmount;

  const taxableAmount = lineItems
    .filter((i) => i.taxable)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const taxableAfterDiscount =
    discountType === "percent"
      ? taxableAmount * (1 - discountAmount / 100)
      : Math.max(0, taxableAmount - Math.min(discount, taxableAmount));

  const taxAmount = (taxableAfterDiscount * taxRate) / 100;

  const feesTotal = customFees.reduce((sum, fee) => {
    if (fee.type === "percent") return sum + (subtotal * fee.value) / 100;
    return sum + fee.value;
  }, 0);

  const total = subtotal - discount + taxAmount + feesTotal;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function generateInvoiceNumber(count: number): string {
  return `INV-${String(count + 1001).padStart(4, "0")}`;
}

export function generateEstimateNumber(count: number): string {
  return `EST-${String(count + 1001).padStart(4, "0")}`;
}
