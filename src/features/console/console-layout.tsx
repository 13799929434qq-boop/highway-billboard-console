import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  PanelsTopLeft,
  FileText,
  Coins,
  ChartNoAxesCombined,
  Map,
  ShieldCheck,
  ArrowLeftRight,
  History,
  Users,
  TriangleAlert,
  ReceiptText,
  Settings2,
  Menu,
  X,
  ArrowLeft,
  LogOut,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { useConsole } from "./context";
import { menus, parentPage, titles } from "./catalog";
import { roleNames, TODAY, useDemoStore, type Role } from "./model";
import { Button } from "@/components/ui/button";
import { FormDialog } from "./ui";
import { ConsolePages } from "./pages";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { login, loginError, logout } from "../auth/auth-api";
const roleSummaries: Record<Role, string> = {
  leader: "看广告牌数量、合同执行、收款和应收",
  operations: "管路段、广告牌档案、证件和资产变动",
  finance: "管客户、合同、收款、欠款和发票",
  admin: "管账号、角色权限、字典和操作日志",
};
const canSwitchRoles =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === "true";
const icons = {
  assets: PanelsTopLeft,
  contracts: FileText,
  receipts: Coins,
  bills: ChartNoAxesCombined,
  road: Map,
  certificates: ShieldCheck,
  changes: ArrowLeftRight,
  history: History,
  customers: Users,
  alerts: TriangleAlert,
  invoices: ReceiptText,
  permissions: Settings2,
};
export function ConsoleLayout() {
  const ctx = useConsole(),
    navigate = useNavigate(),
    queryClient = useQueryClient(),
    [open, setOpen] = useState(false),
    [resetOpen, setResetOpen] = useState(false),
    [switchOpen, setSwitchOpen] = useState(false),
    [switching, setSwitching] = useState<Role | null>(null),
    [switchError, setSwitchError] = useState(""),
    reset = useDemoStore((s) => s.reset);
  const switchRole = async (role: Role) => {
    if (role === ctx.role) {
      setSwitchOpen(false);
      return;
    }
    const home = menus[role][0].page;
    if (ctx.demo) {
      navigate(`/preview/${role}/${home}`);
      setSwitchOpen(false);
      return;
    }
    setSwitching(role);
    setSwitchError("");
    try {
      const user = await login({
        username: role,
        password: "123456",
        rememberMe: false,
      });
      queryClient.setQueryData(["session"], user);
      await queryClient.invalidateQueries({ queryKey: ["management"] });
      navigate(`/workbench/${role}/${home}`);
      setSwitchOpen(false);
    } catch (error) {
      setSwitchError(loginError(error));
    } finally {
      setSwitching(null);
    }
  };
  const active = parentPage[ctx.page] ?? ctx.page;
  return (
    <div className="min-h-svh bg-[#f4f7fc] text-[#18314f] lg:fixed lg:inset-0 lg:overflow-hidden print:static">
      {open && (
        <button
          aria-label="关闭菜单遮罩"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      )}
      <aside
        className={`console-sidebar fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-[#102940] text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"} print:hidden`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <svg width="42" height="42" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="white"
              d="M19 4h4l-2 21H10zM26 4h4l9 21H28zM9 29h11l-2 15H3zM29 29h10l6 15H31zM5 24h38v5H5z"
            />
          </svg>
          <div>
            <strong className="text-2xl tracking-wider">高速广告</strong>
            <p className="mt-1 text-xs tracking-[.14em] text-blue-100/70">
              经营管理系统
            </p>
          </div>
          <button
            aria-label="关闭菜单"
            className="lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 pb-3 text-[11px] tracking-widest text-slate-400">
          {roleNames[ctx.role]}工作空间
        </div>
        <nav
          aria-label="业务菜单"
          className="flex-1 space-y-1 overflow-y-auto px-3"
        >
          {menus[ctx.role].map((item) => {
            const Icon = icons[item.icon as keyof typeof icons];
            return (
              <button
                key={item.page}
                aria-current={active === item.page ? "page" : undefined}
                onClick={() => {
                  ctx.go(item.page);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${active === item.page ? "bg-[#1769ed] text-white shadow-lg shadow-blue-950/20" : "text-[#c1d0e0] hover:bg-white/8 hover:text-white"}`}
              >
                <Icon className="size-5" strokeWidth={1.7} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 lg:ml-60 lg:h-svh print:ml-0">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-[#dfe7f1] bg-white px-5 sm:px-6 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="展开菜单"
              className="lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="hidden text-sm text-slate-400 sm:inline">
              经营管理
            </span>
            <ChevronRight className="hidden size-4 text-slate-300 sm:block" />
            <span className="truncate text-sm font-medium">
              {titles[active]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 xl:inline">
              业务日期 {TODAY}
            </span>
            {(ctx.demo || canSwitchRoles) && (
              <Button
                variant="ghost"
                className="h-9 border border-[#d5e2f2] bg-[#f4f8fd] px-3 text-[#1769ed]"
                onClick={() => {
                  setSwitchError("");
                  setSwitchOpen(true);
                }}
              >
                <ArrowLeftRight className="size-4" />
                切换角色
              </Button>
            )}
            <span className="hidden text-sm font-medium md:inline">
              {ctx.name}
            </span>
            {ctx.demo && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="重置演示"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="返回登录"
              onClick={async () => {
                if (!ctx.demo) {
                  try {
                    await logout();
                  } catch {
                    window.alert("退出登录失败，请重试。");
                    return;
                  }
                }
                queryClient.clear();
                navigate("/login");
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto flex max-w-[1760px] flex-col gap-3 p-4 lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden">
          <div className="flex min-h-8 items-center gap-3">
            {parentPage[ctx.page] && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="返回列表"
                onClick={() => ctx.go(parentPage[ctx.page])}
              >
                <ArrowLeft className="size-5" />
              </Button>
            )}
            <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">
              {titles[ctx.page]}
            </h1>
          </div>
          <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">
            <div className="space-y-3">
              <ConsolePages
                key={`${ctx.role}-${ctx.page}-${ctx.selected ?? ""}`}
              />
            </div>
          </div>
        </main>
      </div>
      <Dialog
        open={switchOpen}
        onOpenChange={(value) => !switching && setSwitchOpen(value)}
      >
        <DialogContent className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white bg-white p-6 shadow-xl outline-none">
          <DialogTitle className="text-xl font-semibold">切换演示角色</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-500">
            当前是{roleNames[ctx.role]}。选择后进入该角色的工作台。
          </DialogDescription>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(Object.keys(roleNames) as Role[]).map((role) => {
              const current = role === ctx.role;
              return (
                <button
                  key={role}
                  type="button"
                  disabled={switching !== null}
                  aria-current={current ? "true" : undefined}
                  onClick={() => switchRole(role)}
                  className={`cursor-pointer rounded-xl border px-4 py-4 text-left transition-colors disabled:cursor-wait ${current ? "border-[#1769ed] bg-[#eef5ff]" : "border-[#dfe7f1] bg-white hover:border-[#1769ed] hover:bg-[#f7faff]"}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <strong className="text-base">{roleNames[role]}</strong>
                    <span className="text-xs text-slate-400">
                      {switching === role ? "切换中…" : current ? "当前" : role}
                    </span>
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-slate-500">
                    {roleSummaries[role]}
                  </span>
                </button>
              );
            })}
          </div>
          {switchError && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {switchError}
            </p>
          )}
        </DialogContent>
      </Dialog>
      <FormDialog
        title="重置演示数据"
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      >
        <p className="mb-5 text-sm text-slate-600">
          将清除本机新增、编辑和收款分配记录，恢复初始样例。正式业务数据不受影响。
        </p>
        <Button
          onClick={() => {
            reset();
            setResetOpen(false);
          }}
        >
          确认重置演示
        </Button>
      </FormDialog>
    </div>
  );
}
