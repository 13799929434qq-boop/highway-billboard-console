import { test, expect } from "@playwright/test";
import {
  initialData,
  applyAction,
  outstanding,
  allocated,
  contractChecks,
} from "../src/features/console/model";
import { titles } from "../src/features/console/catalog";

test("账款分配保持守恒，拒绝越权、超额及跨客户核销", () => {
  const source = initialData();
  const data = applyAction(source, "finance", {
    type: "allocate",
    values: {
      receiptId: "SK-20261015-001",
      "bill:AR-2026-028": "20000",
      "bill:AR-2026-029": "20000",
    },
  });
  expect(allocated(data, "SK-20261015-001")).toBe(4000000);
  expect(
    data.bills
      .filter((b) => b.year === "2026")
      .reduce((n, b) => n + outstanding(data, b), 0),
  ).toBe(5000000);
  expect(allocated(source, "SK-20261015-001")).toBe(0);
  expect(() =>
    applyAction(source, "leader", { type: "allocate", values: {} }),
  ).toThrow("无此操作权限");
  expect(() =>
    applyAction(source, "finance", {
      type: "allocate",
      values: { receiptId: "SK-20261015-001", "bill:AR-2026-028": "50000" },
    }),
  ).toThrow("超过收款可用余额");
  const other = initialData();
  other.receipts.find((r) => r.id === "SK-20261015-001")!.customerId = "KH-002";
  expect(() =>
    applyAction(other, "finance", {
      type: "allocate",
      values: { receiptId: "SK-20261015-001", "bill:AR-2026-028": "100" },
    }),
  ).toThrow("跨客户");
  expect(() =>
    applyAction(source, "admin", {
      type: "toggleAccount",
      values: { id: "USER-4" },
    }),
  ).toThrow("最后一个");
  expect(contractChecks(source, source.contracts[1]).some((c) => !c.ok)).toBe(
    true,
  );
});

test("34 个业务路由可访问，角色边界和移动布局正确", async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ids: Record<string, string> = {
    L06: "GZ-SH-028",
    L07: "HT-2024-001",
    L08: "AR-2026-028",
    O05: "GZ-SH-028",
    F03: "KH-001",
    F05: "HT-2027-002",
    F06: "HT-2027-002",
    F07: "HT-2024-001",
    A02: "USER-4",
  };
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const [code, title] of Object.entries(titles)) {
    const role = (
      { L: "leader", O: "operations", F: "finance", A: "admin" } as Record<
        string,
        string
      >
    )[code[0]];
    await page.goto(
      `/preview/${role}/${code}${ids[code] ? `?id=${ids[code]}` : ""}`,
    );
    await expect(
      page.getByRole("heading", { name: title, exact: true, level: 1 }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
      `${code} 不应产生浏览器级纵向滚动`,
    ).toBe(true);
    if (code === "L02")
      await page.screenshot({
        path: "test-results/leader-desktop.png",
        fullPage: true,
      });
  }
  await page.goto("/preview/leader/F10");
  await expect(page.getByRole("heading", { name: "无访问权限" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview/finance/F09");
  await expect(
    page.getByRole("heading", { name: titles.F09, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "展开菜单" }).click();
  await expect(
    page.getByRole("navigation", { name: "业务菜单" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭菜单", exact: true }).click();
  await expect
    .poll(async () => {
      const box = await page.locator("aside").boundingBox();
      return box ? box.x + box.width : 0;
    })
    .toBeLessThanOrEqual(0);
  await page.screenshot({
    path: "test-results/finance-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("分配交互持久化、超额错误、报表和导出联动", async ({ page }) => {
  await page.goto("/preview/finance/F11?id=SK-20261015-001");
  await page.getByLabel(/GZ-SH-028 · 2026/).fill("50000");
  await page.getByRole("button", { name: "确认分配并核销应收" }).click();
  await expect(page.getByRole("alert")).toContainText("超过收款可用余额");
  await page.getByLabel(/GZ-SH-028 · 2026/).fill("20000");
  await page.getByLabel(/GZ-SH-029 · 2026/).fill("20000");
  await page.getByRole("button", { name: "确认分配并核销应收" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  await page.reload();
  await expect(page.getByText("0.00", { exact: true })).toBeVisible();
  await page.goto("/preview/leader/L05");
  await expect(
    page.locator("strong").filter({ hasText: /^15$/ }),
  ).toBeVisible();
  await expect(page.locator("strong").filter({ hasText: /^5$/ })).toHaveCount(
    2,
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 Excel" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.xls$/);
  await expect(
    page.getByRole("button", { name: "保存", exact: true }),
  ).toHaveCount(0);
});
