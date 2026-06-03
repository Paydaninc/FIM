import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatShortDate,
  statusLabel,
  statusBg,
  statusFg,
  initials,
} from "../utils/format";

describe("formatCurrency", () => {
  it("formats a positive amount", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("returns $0.00 for null", () => {
    expect(formatCurrency(null)).toBe("$0.00");
  });

  it("returns $0.00 for undefined", () => {
    expect(formatCurrency(undefined)).toBe("$0.00");
  });

  it("formats a small decimal amount", () => {
    expect(formatCurrency(9.99)).toBe("$9.99");
  });
});

describe("formatDate", () => {
  it("returns a formatted date string", () => {
    const result = formatDate("2024-06-15");
    expect(result).toMatch(/Jun 15, 2024/);
  });

  it("returns em-dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("returns em-dash for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("accepts a Date object", () => {
    const result = formatDate(new Date("2024-01-01"));
    expect(result).toContain("2024");
  });
});

describe("formatShortDate", () => {
  it("returns month and day without year", () => {
    const result = formatShortDate("2024-06-15");
    expect(result).toMatch(/Jun 15/);
    expect(result).not.toContain("2024");
  });

  it("returns em-dash for null", () => {
    expect(formatShortDate(null)).toBe("—");
  });
});

describe("statusLabel", () => {
  const cases: Array<[string, string]> = [
    ["draft", "Draft"],
    ["sent", "Sent"],
    ["viewed", "Viewed"],
    ["paid", "Paid"],
    ["overdue", "Overdue"],
    ["accepted", "Accepted"],
    ["declined", "Declined"],
    ["converted", "Converted"],
  ];

  it.each(cases)("maps %s → %s", (status, label) => {
    expect(statusLabel(status)).toBe(label);
  });

  it("capitalises unknown statuses", () => {
    expect(statusLabel("pending")).toBe("Pending");
  });
});

describe("statusBg", () => {
  it("returns green for paid", () => {
    expect(statusBg("paid")).toBe("#dcfce7");
  });

  it("returns red for overdue", () => {
    expect(statusBg("overdue")).toBe("#fee2e2");
  });

  it("returns blue for sent", () => {
    expect(statusBg("sent")).toBe("#dbeafe");
  });

  it("returns a default for unknown status", () => {
    expect(statusBg("unknown")).toBe("#f1f5f9");
  });
});

describe("statusFg", () => {
  it("returns green text for paid", () => {
    expect(statusFg("paid")).toBe("#16a34a");
  });

  it("returns red text for overdue", () => {
    expect(statusFg("overdue")).toBe("#dc2626");
  });
});

describe("initials", () => {
  it("returns first letters of each word uppercased", () => {
    expect(initials("John Doe")).toBe("JD");
  });

  it("returns at most 2 characters", () => {
    expect(initials("Alice Bob Charlie")).toBe("AB");
  });

  it("returns ? for null", () => {
    expect(initials(null)).toBe("?");
  });

  it("returns ? for undefined", () => {
    expect(initials(undefined)).toBe("?");
  });

  it("handles a single name", () => {
    expect(initials("Maria")).toBe("M");
  });
});
