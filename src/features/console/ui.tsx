import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowUpDown,
  Inbox,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useConsole } from "./context";
import type { Row, Action } from "./model";
import * as echarts from "echarts/core";
import { PieChart, BarChart, LineChart } from "echarts/charts";
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  AriaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";
echarts.use([
  PieChart,
  BarChart,
  LineChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  AriaComponent,
  CanvasRenderer,
]);

export function Panel({
  title,
  children,
  action,
  className = "",
  compact = true,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`min-w-0 border border-[#dfe7f1] bg-white ${compact ? "rounded-lg" : "rounded-xl"} ${className}`}
    >
      {title && (
        <header
          className={`flex flex-wrap items-center justify-between border-b border-slate-100 ${compact ? "gap-2 px-4 py-2.5" : "gap-3 px-6 py-5"}`}
        >
          <h2
            className={
              compact ? "text-sm font-semibold" : "text-lg font-semibold"
            }
          >
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={compact ? "p-3" : "p-5 sm:p-6"}>{children}</div>
    </section>
  );
}
export function Notice({
  children,
  warning = false,
}: {
  children: ReactNode;
  warning?: boolean;
}) {
  if (!warning) return null;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-5 ${warning ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-100 bg-blue-50 text-blue-900"}`}
    >
      <Info className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  const text = String(children);
  const color = /逾期|过期|未通过|停用|黑名单/.test(text)
    ? "bg-red-50 text-red-700"
    : /草稿|临期|待|空置/.test(text)
      ? "bg-amber-50 text-amber-700"
      : /生效|启用|在租|有效|通过|结清/.test(text)
        ? "bg-emerald-50 text-emerald-700"
        : "bg-blue-50 text-blue-700";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${color}`}
    >
      {children}
    </span>
  );
}
export function Metrics({
  items,
  compact = true,
}: {
  items: {
    label: string;
    value: string | number;
    unit?: string;
    hint?: string;
  }[];
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "grid grid-cols-2 gap-2 md:grid-cols-5"
          : "grid grid-cols-2 gap-4 xl:flex"
      }
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`min-w-0 flex-1 border border-[#dde6f1] bg-white ${compact ? "rounded-lg px-4 py-2.5" : "rounded-xl p-5"}`}
        >
          <div
            className={`flex items-center gap-2 text-slate-500 ${compact ? "mb-1 text-xs" : "mb-3 text-sm"}`}
          >
            <span
              className={`size-2 rounded-full ${["bg-blue-600", "bg-emerald-500", "bg-amber-500", "bg-rose-500"][i % 4]}`}
            />
            {item.label}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <strong
              className={`${compact ? "text-2xl" : "text-3xl"} font-semibold tabular-nums tracking-tight text-[#142f50]`}
            >
              {item.value}
            </strong>
            <span className="text-sm text-slate-500">
              {item.unit ?? "万元"}
            </span>
          </div>
          {item.hint && !compact && (
            <p className="mt-2 text-xs text-slate-400">{item.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
export function Chart({
  option,
  label,
  compact = true,
}: {
  option: EChartsCoreOption;
  label: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      ...option,
      animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      aria: { enabled: true },
      color: ["#1769ed", "#77b4f8", "#d5dfe9", "#10b981"],
      textStyle: { fontFamily: "Microsoft YaHei, sans-serif" },
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);
  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={`${compact ? "h-40 2xl:h-44" : "h-64"} w-full`}
    />
  );
}
export type Column = {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
};
const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export function exportExcel(rows: Row[], columns: Column[], name: string) {
  const cell = (s: string) =>
    `<Cell><Data ss:Type="String">${escapeXml(s)}</Data></Cell>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="报表"><Table><Row>${columns.map((c) => cell(c.label)).join("")}</Row>${rows.map((r) => `<Row>${columns.map((c) => cell(r[c.key] ?? "")).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
  const url = URL.createObjectURL(
    new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.xls`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function DataTable({
  rows,
  columns,
  name,
  actions,
  exportable = true,
  filterKeys = [],
  onRow,
}: {
  rows: Row[];
  columns: Column[];
  name: string;
  actions?: ReactNode;
  exportable?: boolean;
  filterKeys?: string[];
  onRow?: (row: Row) => void;
}) {
  const [search, setSearch] = useState(""),
    [sort, setSort] = useState({ key: "", asc: true }),
    [page, setPage] = useState(0),
    [filters, setFilters] = useState<Row>({});
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            Object.values(r).some((v) =>
              v.toLowerCase().includes(search.toLowerCase()),
            ) &&
            Object.entries(filters).every(([key, v]) => !v || r[key] === v),
        )
        .sort((a, b) =>
          !sort.key
            ? 0
            : (a[sort.key] ?? "").localeCompare(b[sort.key] ?? "", "zh-CN", {
                numeric: true,
              }) * (sort.asc ? 1 : -1),
        ),
    [rows, search, filters, sort],
  );
  const last = Math.max(0, Math.ceil(filtered.length / 8) - 1),
    current = Math.min(page, last);
  return (
    <div className="min-w-0 space-y-2.5">
      <div className="flex flex-wrap gap-2 print:hidden">
        <div className="relative min-w-44 flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            aria-label={`${name}搜索`}
            placeholder="搜索编号、名称或关键词"
            className="h-9 pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {filterKeys.map((key) => (
          <select
            key={key}
            aria-label={`${name}${columns.find((c) => c.key === key)?.label ?? key}筛选`}
            className="console-select min-h-9 py-1"
            value={filters[key] ?? ""}
            onChange={(e) => {
              setFilters({ ...filters, [key]: e.target.value });
              setPage(0);
            }}
          >
            <option value="">
              全部{columns.find((c) => c.key === key)?.label}
            </option>
            {[...new Set(rows.map((r) => r[key]))]
              .filter(Boolean)
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        ))}
        <Button
          variant="ghost"
          onClick={() => {
            setSearch("");
            setFilters({});
            setPage(0);
          }}
        >
          重置
        </Button>
        {actions}
        {exportable && (
          <Button
            variant="ghost"
            onClick={() => exportExcel(filtered, columns, name)}
          >
            <Download className="size-4" />
            导出 Excel
          </Button>
        )}
        {exportable && (
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer className="size-4" />
            打印 / PDF
          </Button>
        )}
      </div>
      <div className="overflow-auto rounded-lg border border-slate-200 lg:max-h-[46vh]">
        <table className="w-full min-w-[650px] text-left text-sm">
          <caption className="sr-only">{name}</caption>
          <thead className="bg-[#f0f5fb] text-[#465b75]">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="whitespace-nowrap px-3 py-2 font-medium"
                >
                  <button
                    onClick={() =>
                      setSort({
                        key: c.key,
                        asc: sort.key === c.key ? !sort.asc : true,
                      })
                    }
                    className="inline-flex cursor-pointer items-center gap-1"
                  >
                    {c.label}
                    <ArrowUpDown className="size-3 opacity-40" />
                  </button>
                </th>
              ))}
              {onRow && <th className="px-3 py-2 print:hidden">操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(current * 8, current * 8 + 8).map((r) => (
              <tr
                key={r.id}
                className="border-t border-slate-100 hover:bg-blue-50/40"
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2.5 tabular-nums">
                    {c.render ? c.render(r) : r[c.key] || "—"}
                  </td>
                ))}
                {onRow && (
                  <td className="px-3 py-2.5 print:hidden">
                    <button
                      className="cursor-pointer whitespace-nowrap text-primary hover:underline"
                      onClick={() => onRow(r)}
                    >
                      查看
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="grid justify-items-center gap-1.5 p-4 text-slate-400">
            <Inbox className="size-7" />
            <p>暂无匹配记录</p>
            {(search || Object.keys(filters).length > 0) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setFilters({});
                }}
              >
                清除筛选
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          共 {filtered.length} 条 · 第 {current + 1} / {last + 1} 页
        </span>
        <div className="flex gap-2 print:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="上一页"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="下一页"
            disabled={current === last}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
export type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  hint?: string;
};
export function RecordForm({
  fields,
  initial = {},
  type,
  submitLabel = "保存",
  onDone,
  extra,
}: {
  fields: Field[];
  initial?: Row;
  type: string;
  submitLabel?: string;
  onDone?: () => void;
  extra?: ReactNode;
}) {
  const ctx = useConsole(),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const schema = z.object(
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        f.required ? z.string().trim().min(1, `请填写${f.label}`) : z.string(),
      ]),
    ),
  );
  const form = useForm<Row>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(
      fields.map((f) => [f.key, initial[f.key] ?? ""]),
    ),
  });
  const lock = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const selectedFiles = useRef<Record<string, File[]>>({});
  const uploadedFiles = useRef<Record<string, string[]>>({});
  const submit = form.handleSubmit(async (values) => {
    if (lock.current) return;
    lock.current = true;
    setError("");
    setSuccess("");
    try {
      const submittedValues = { ...initial, ...values };
      if (!ctx.demo) {
        for (const field of fields) {
          const files = selectedFiles.current[field.key];
          if (field.type !== "file" || !files?.length) continue;
          uploadedFiles.current[field.key] ??= [];
          for (let index = 0; index < files.length; index++) {
            uploadedFiles.current[field.key][index] ??= await ctx.upload(
              files[index],
            );
          }
          const previous =
            field.key === "photos" && initial[field.key]
              ? [initial[field.key]]
              : [];
          submittedValues[field.key] = [
            ...previous,
            ...uploadedFiles.current[field.key],
          ].join(",");
        }
      }
      await ctx.commit({
        type,
        values: submittedValues,
        requestId: requestId.current,
      });
      requestId.current = crypto.randomUUID();
      setSuccess(ctx.demo ? "已保存至本机演示数据" : "已保存");
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      lock.current = false;
    }
  });
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((f) => (
          <label
            className={`block text-xs ${f.type === "textarea" || f.type === "file" ? "md:col-span-2 xl:col-span-3" : ""}`}
            key={f.key}
          >
            <span className="mb-1 block font-medium">
              {f.label}
              {f.required && <span className="ml-1 text-red-500">*</span>}
            </span>
            {f.options ? (
              <select
                className="console-select min-h-9 w-full py-1"
                {...form.register(f.key)}
                disabled={f.disabled}
              >
                <option value="">请选择{f.label}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                className="console-select min-h-16 w-full resize-y"
                {...form.register(f.key)}
              />
            ) : f.type === "file" ? (
              <>
                <Input
                  type="file"
                  className="h-9"
                  accept=".pdf,.png,.jpg,.jpeg"
                  multiple={f.key === "photos"}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
                      form.setValue(f.key, "");
                      form.setError(f.key, { message: "文件不能超过 10MB" });
                      return;
                    }
                    if (files.length) selectedFiles.current[f.key] = files;
                    else delete selectedFiles.current[f.key];
                    delete uploadedFiles.current[f.key];
                    form.setValue(
                      f.key,
                      files.map((file) => file.name).join("、"),
                      {
                        shouldValidate: true,
                      },
                    );
                  }}
                />
                <p className="mt-1 text-xs text-slate-400">
                  {form.watch(f.key) || "PDF / PNG / JPG，最大 10MB"}
                  {ctx.demo && " · 演示数据仅保留文件名"}
                </p>
              </>
            ) : (
              <Input
                className="h-9"
                type={f.type ?? "text"}
                step={f.type === "number" ? "0.01" : undefined}
                {...form.register(f.key)}
                readOnly={f.disabled}
              />
            )}
            {form.formState.errors[f.key] && (
              <span role="alert" className="mt-1 block text-xs text-red-600">
                {String(form.formState.errors[f.key]?.message)}
              </span>
            )}
            {f.hint && (
              <span className="mt-1 block text-xs text-slate-400">
                {f.hint}
              </span>
            )}
          </label>
        ))}
      </div>
      {extra}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-emerald-700">
          {success}
        </p>
      )}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
        <Button
          type="submit"
          disabled={ctx.pending || form.formState.isSubmitting}
        >
          {ctx.pending && <LoaderCircle className="size-4 animate-spin" />}
          {ctx.pending ? "正在保存…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
export function FormDialog({
  title,
  children,
  open,
  onClose,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 max-h-[90svh] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <DialogTitle className="mb-2 text-xl font-semibold">
          {title}
        </DialogTitle>
        <DialogDescription className="mb-4 text-sm text-slate-500">
          请核对信息后保存，带 * 为必填项。
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function ActionButton({
  label,
  action,
  disabled = false,
}: {
  label: string;
  action: Action;
  disabled?: boolean;
}) {
  const ctx = useConsole(),
    [message, setMessage] = useState("");
  const requestId = useRef(crypto.randomUUID());
  return (
    <div>
      <Button
        disabled={disabled || ctx.pending}
        onClick={async () => {
          setMessage("");
          try {
            await ctx.commit({ ...action, requestId: requestId.current });
            requestId.current = crypto.randomUUID();
            setMessage(ctx.demo ? "演示操作已完成" : "操作已完成");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "操作失败");
          }
        }}
      >
        {label}
      </Button>
      {message && (
        <p role="status" className="mt-2 max-w-md text-sm text-slate-600">
          {message}
        </p>
      )}
    </div>
  );
}
export function Details({ entries }: { entries: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
      {entries.map(([label, value]) => (
        <div key={label} className="border-b border-slate-100 pb-2">
          <dt className="mb-1 text-xs text-slate-500">{label}</dt>
          <dd className="break-words text-sm font-medium">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
export const options = (values: string[]) =>
  values.map((v) => ({ value: v, label: v }));
