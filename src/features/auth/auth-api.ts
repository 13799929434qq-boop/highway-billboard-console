import axios from "axios";
import { z } from "zod";
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "请输入账号")
    .max(80, "账号不能超过 80 个字符"),
  password: z.string().min(1, "请输入密码").max(256, "密码不能超过 256 个字符"),
  rememberMe: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;
const userSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  roles: z.array(z.string()),
});
export type AuthUser = z.infer<typeof userSchema>;
export const authConfigured = Boolean(
  import.meta.env.VITE_API_BASE_URL?.trim(),
);
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
// Spring Security 会话认证：由服务端设置 HttpOnly Cookie，前端不保存密码或令牌。
export async function login(values: LoginValues): Promise<AuthUser> {
  if (!authConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    if (values.username !== "admin" || values.password !== "123456")
      throw new Error("账号或密码错误，请重新输入。");
    return {
      id: "demo-admin",
      displayName: "系统演示账号",
      roles: ["LEADER", "OPERATIONS", "FINANCE", "ADMIN"],
    };
  }
  const csrf = await http.get("/session/csrf");
  const token = z
    .object({ token: z.string().min(1), headerName: z.string().min(1) })
    .parse(csrf.data);
  await http.post("/session/login", values, {
    headers: { [token.headerName]: token.token },
  });
  return getSession();
}
export async function getSession(): Promise<AuthUser> {
  if (!authConfigured) throw new Error("登录服务尚未连接");
  return userSchema.parse((await http.get("/session/me")).data);
}
export async function logout(): Promise<void> {
  if (!authConfigured) return;
  const csrf = z
    .object({ headerName: z.string().min(1), token: z.string().min(1) })
    .parse((await http.get("/session/csrf")).data);
  await http.post("/session/logout", null, {
    headers: { [csrf.headerName]: csrf.token },
  });
}
export function loginError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return "账号或密码错误，请重新输入。";
    if (error.response?.status === 403)
      return "账号无访问权限或安全校验失效，请联系管理员。";
    if (error.response?.status === 429) return "尝试次数过多，请稍后再试。";
    if (error.code === "ECONNABORTED") return "登录请求超时，请稍后重试。";
    return "暂时无法连接登录服务，请稍后重试。";
  }
  if (error instanceof z.ZodError)
    return "登录服务返回的数据不完整，请联系管理员。";
  return error instanceof Error ? error.message : "登录失败，请稍后重试。";
}
