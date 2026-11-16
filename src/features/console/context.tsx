import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import axios from "axios";
import { z } from "zod";
import { getSession, authConfigured } from "../auth/auth-api";
import {
  datasetSchema,
  type Dataset,
  type Role,
  type Action,
  useDemoStore,
  roleNames,
} from "./model";
import { menus, pageRole, titles } from "./catalog";
import { Button } from "@/components/ui/button";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});
type ConsoleContext = {
  data: Dataset;
  role: Role;
  demo: boolean;
  page: string;
  selected: string | null;
  name: string;
  go: (page: string, id?: string) => void;
  commit: (action: Action) => Promise<void>;
  upload: (file: File) => Promise<string>;
  pending: boolean;
};
const Context = createContext<ConsoleContext | null>(null);
export function useConsole() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Console context missing");
  return ctx;
}
const roleMap: Record<string, Role> = {
  LEADER: "leader",
  OPERATIONS: "operations",
  OPERATOR: "operations",
  ARCHIVIST: "operations",
  FINANCE: "finance",
  CONTRACT_FINANCE: "finance",
  ADMIN: "admin",
  leader: "leader",
  operations: "operations",
  finance: "finance",
  admin: "admin",
};
export function ConsoleProvider({
  demo,
  children,
}: {
  demo: boolean;
  children: ReactNode;
}) {
  const params = useParams(),
    [search] = useSearchParams(),
    navigate = useNavigate(),
    client = useQueryClient();
  const store = useDemoStore();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    enabled: !demo && authConfigured,
  });
  const roles =
    session.data?.roles
      .map((r) => roleMap[r.replace(/^ROLE_/, "")])
      .filter(Boolean) ?? [];
  const requested = params.role as Role | undefined;
  const role: Role =
    requested && requested in roleNames ? requested : (roles[0] ?? "leader");
  const snapshot = useQuery({
    queryKey: ["management", role],
    queryFn: async () =>
      datasetSchema.parse(
        (await http.get("/management/snapshot", { params: { role } })).data,
      ),
    enabled: !demo && session.isSuccess && roles.includes(role),
  });
  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (demo) {
        await new Promise((resolve) => setTimeout(resolve, 180));
        store.commit(role, action);
        return;
      }
      const csrf = z
        .object({ headerName: z.string().min(1), token: z.string().min(1) })
        .parse((await http.get("/session/csrf")).data);
      try {
        await http.post("/management/actions", action, {
          headers: { [csrf.headerName]: csrf.token },
        });
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          typeof error.response?.data?.message === "string"
        )
          throw new Error(error.response.data.message);
        throw error;
      }
      await client.invalidateQueries({ queryKey: ["management"] });
    },
  });
  if (!demo && (!authConfigured || session.isError))
    return <Navigate to="/login" replace />;
  if (!demo && session.isPending)
    return (
      <div className="grid min-h-svh place-items-center" role="status">
        正在验证登录状态…
      </div>
    );
  if (
    (!demo && !roles.includes(role)) ||
    (requested && !(requested in roleNames))
  )
    return <AccessDenied />;
  const page = params.page ?? menus[role][0].page;
  if (!titles[page] || pageRole(page) !== role) return <AccessDenied />;
  const go = (next: string, id?: string) =>
    navigate(
      `${demo ? "/preview" : "/workbench"}/${role}/${next}${id ? `?id=${encodeURIComponent(id)}` : ""}`,
    );
  if (!demo && snapshot.isError)
    return (
      <main className="grid min-h-svh place-items-center bg-slate-50 p-6">
        <section className="max-w-lg rounded-xl border bg-white p-8">
          <h1 className="text-2xl font-bold">
            欢迎，{session.data?.displayName}
          </h1>
          <p role="alert" className="my-5 text-slate-600">
            业务数据暂时无法加载。请确认管理服务已接入后重试。
          </p>
          <div className="flex gap-3">
            <Button onClick={() => snapshot.refetch()}>重试</Button>
            <Button variant="ghost" onClick={() => navigate("/login")}>
              返回登录
            </Button>
          </div>
        </section>
      </main>
    );
  if (!demo && !snapshot.data)
    return (
      <div className="grid min-h-svh place-items-center" role="status">
        正在加载业务页面…
      </div>
    );
  return (
    <Context.Provider
      value={{
        data: demo ? store.data : snapshot.data!,
        role,
        demo,
        page,
        selected: search.get("id"),
        name: demo ? `${roleNames[role]}演示账号` : session.data!.displayName,
        go,
        commit: (action) => mutation.mutateAsync(action),
        upload: async (file) => {
          const csrf = z
            .object({ headerName: z.string().min(1), token: z.string().min(1) })
            .parse((await http.get("/session/csrf")).data);
          const body = new FormData();
          body.append("file", file);
          try {
            const response = await http.post("/storage/files", body, {
              headers: { [csrf.headerName]: csrf.token },
            });
            return z.object({ id: z.string().uuid() }).parse(response.data).id;
          } catch (error) {
            if (
              axios.isAxiosError(error) &&
              typeof error.response?.data?.message === "string"
            )
              throw new Error(error.response.data.message);
            throw error;
          }
        },
        pending: mutation.isPending,
      }}
    >
      {children}
    </Context.Provider>
  );
}
function AccessDenied() {
  return (
    <main className="grid min-h-svh place-items-center bg-slate-50">
      <section className="text-center">
        <h1 className="text-2xl font-bold">无访问权限</h1>
        <p className="my-4 text-slate-500">当前角色不能访问此业务页面。</p>
        <a href="/login" className="text-primary underline">
          返回登录
        </a>
      </section>
    </main>
  );
}
