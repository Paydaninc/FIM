import { describe, it, expect } from "vitest";
import {
  calculateTotals,
  generateInvoiceNumber,
  generateEstimateNumber,
} from "../utils/calculations";

const item = (qty: number, price: number, taxable = true) => ({
  description: "Item",
  quantity: qty,
  unitPrice: price,
  taxable,
});

describe("calculateTotals", () => {
  it("returns zero totals for empty line items", () => {
    const result = calculateTotals([], 0, 0, "fixed");
    expect(result).toEqual({ subtotal: 0, taxAmount: 0, total: 0 });
  });

  it("computes subtotal from multiple line items", () => {
    const result = calculateTotals(
      [item(2, 50), item(3, 20)],
      0,
      0,
      "fixed",
    );
    expect(result.subtotal).toBe(160);
    expect(result.total).toBe(160);
  });

  it("applies a fixed discount", () => {
    const result = calculateTotals([item(1, 100)], 0, 20, "fixed");
    expect(result.subtotal).toBe(100);
    expect(result.total).toBe(80);
  });

  it("applies a percentage discount", () => {
    const result = calculateTotals([item(1, 200)], 0, 10, "percent");
    expect(result.subtotal).toBe(200);
    expect(result.total).toBe(180);
  });

  it("computes tax only on taxable items", () => {
    const result = calculateTotals(
      [item(1, 100, true), item(1, 50, false)],
      10,
      0,
      "fixed",
    );
    expect(result.subtotal).toBe(150);
    expect(result.taxAmount).toBe(10);
    expect(result.total).toBe(160);
  });

  it("applies tax after percentage discount on taxable items", () => {
    const result = calculateTotals([item(1, 100, true)], 10, 50, "percent");
    expect(result.taxAmount).toBe(5);
    expect(result.total).toBe(55);
  });

  it("applies tax after fixed discount on taxable items", () => {
    const result = calculateTotals([item(1, 100, true)], 10, 20, "fixed");
    expect(result.taxAmount).toBe(8);
    expect(result.total).toBe(88);
  });

  it("adds a flat custom fee", () => {
    const fee = { id: "1", name: "Service fee", type: "flat" as const, value: 15 };
    const result = calculateTotals([item(1, 100)], 0, 0, "fixed", [fee]);
    expect(result.total).toBe(115);
  });

  it("adds a percentage custom fee based on subtotal", () => {
    const fee = { id: "2", name: "Processing", type: "percent" as const, value: 3 };
    const result = calculateTotals([item(1, 200)], 0, 0, "fixed", [fee]);
    expect(result.total).toBe(206);
  });

  it("handles combined discount, tax, and custom fees", () => {
    const fee = { id: "f", name: "Fee", type: "flat" as const, value: 5 };
    const result = calculateTotals([item(2, 100, true)], 10, 10, "percent", [fee]);
    expect(result.subtotal).toBe(200);
    expect(result.taxAmount).toBe(18);
    expect(result.total).toBe(200 - 20 + 18 + 5);
  });

  it("rounds totals to two decimal places", () => {
    const result = calculateTotals([item(1, 33.333)], 0, 0, "fixed");
    expect(result.subtotal).toBe(33.33);
  });

  it("does not apply negative total when discount exceeds subtotal", () => {
    const result = calculateTotals([item(1, 50, true)], 10, 100, "fixed");
    expect(result.taxAmount).toBe(0);
  });
});

describe("generateInvoiceNumber", () => {
  it("generates INV-1001 for count 0", () => {
    expect(generateInvoiceNumber(0)).toBe("INV-1001");
  });

  it("generates INV-1010 for count 9", () => {
    expect(generateInvoiceNumber(9)).toBe("INV-1010");
  });

  it("pads to at least 4 digits", () => {
    expect(generateInvoiceNumber(0)).toMatch(/^INV-\d{4,}$/);
  });
});

describe("generateEstimateNumber", () => {
  it("generates EST-1001 for count 0", () => {
    expect(generateEstimateNumber(0)).toBe("EST-1001");
  });

  it("generates EST-1100 for count 99", () => {
    expect(generateEstimateNumber(99)).toBe("EST-1100");
  });
});
