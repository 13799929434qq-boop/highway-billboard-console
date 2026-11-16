import { test, expect } from "@playwright/test";
test("表单、显隐、偏好持久化和帮助", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByText("请输入账号", { exact: true })).toBeVisible();
  await expect(page.getByText("请输入密码", { exact: true })).toBeVisible();
  await page.getByLabel("账号", { exact: true }).fill("operator");
  await page.getByLabel("密码", { exact: true }).fill("secret");
  await page.getByRole("button", { name: "显示密码" }).click();
  await expect(page.getByLabel("密码", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "隐藏密码" }).click();
  await expect(page.getByLabel("密码", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  for (const name of ["忘记密码?", "使用帮助", "联系我们", "系统公告"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});
test("失败提示、重复提交保护、记住状态不保存凭据", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/session/csrf", (route) =>
    route.fulfill({ json: { token: "test-csrf", headerName: "X-CSRF-TOKEN" } }),
  );
  await page.route("**/api/session/login", async (route) => {
    requests++;
    expect(route.request().headers()["x-csrf-token"]).toBe("test-csrf");
    expect(route.request().postDataJSON().rememberMe).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ status: 401, json: {} });
  });
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill("operator");
  await page.getByLabel("密码", { exact: true }).fill("secret");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("button", { name: "登录中…" })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("账号或密码错误");
  expect(requests).toBe(1);
  await expect(page).toHaveURL(/login/);
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  expect(storage).not.toContain("secret");
  expect(storage).not.toContain("operator");
  await page.reload();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await expect(page.getByLabel("密码", { exact: true })).toHaveValue("");
});
test("仅有效会话才能跳转，直接访问工作台需认证", async ({ page }) => {
  await page.route("**/api/session/me", (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto("/workbench");
  await expect(page).toHaveURL(/login/);
  await page.route("**/api/session/csrf", (route) =>
    route.fulfill({ json: { token: "test-csrf", headerName: "X-CSRF-TOKEN" } }),
  );
  await page.route("**/api/session/login", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/session/me", (route) =>
    route.fulfill({
      json: { id: "test", displayName: "测试用户", roles: ["LEADER"] },
    }),
  );
  await page.getByLabel("账号", { exact: true }).fill("operator");
  await page.getByLabel("密码", { exact: true }).fill("secret");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/workbench/);
  await expect(page.getByText("欢迎，测试用户")).toBeVisible();
});
test("桌面和移动端无横向溢出", async ({ page }) => {
  for (const size of [
    { width: 1586, height: 992 },
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "欢迎登录" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (size.width === 1586 || size.width === 390)
      await page.screenshot({
        path: `test-results/login-${size.width}.png`,
        fullPage: true,
      });
  }
});
