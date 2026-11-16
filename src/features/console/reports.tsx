import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  FileText,
  Wallet,
  CalendarClock,
} from "lucide-react";
import { useConsole } from "./context";
import {
  activeContracts,
  allocated,
  assetStatus,
  customerName,
  days,
  money,
  outstanding,
  paid,
  wan,
  TODAY,
  type Row,
} from "./model";
import {
  Panel,
  Metrics,
  Chart,
  DataTable,
  Badge,
  Notice,
  Details,
  type Column,
} from "./ui";
import { Button } from "@/components/ui/button";
export const statusColumn: Column = {
  key: "status",
  label: "状态",
  render: (r) => <Badge>{r.status}</Badge>,
};
export function useReportRows() {
  const { data } = useConsole();
  const bills: Row[] = data.bills.map((b) => ({
    ...b,
    customer: customerName(data, b.customerId),
    amountText: money(b.amount),
    paidText: money(paid(data, b.id)),
    outstandingText: money(outstanding(data, b)),
    overdueText: money(days(b.due) < 0 ? outstanding(data, b) : 0),
    status:
      outstanding(data, b) === 0
        ? "已结清"
        : !b.due
          ? "日期未设置"
          : days(b.due) < 0
            ? "逾期"
            : "未到期",
  }));
  const receipts: Row[] = data.receipts.map((r) => ({
    ...r,
    customer: customerName(data, r.customerId),
    amountText: money(r.amount),
    allocatedText: r.legacyUnreconciled === "是" ? "待核对" : money(allocated(data, r.id)),
    remainingText: r.legacyUnreconciled === "是" ? "待核对" : money(Number(r.amount) - allocated(data, r.id)),
    status: r.legacyUnreconciled === "是" ? "历史待核对" : Number(r.amount) === allocated(data, r.id) ? "已分配" : "待分配",
  }));
  const assets: Row[] = data.assets.map((a) => {
    const c = activeContracts(data, a.id)[0];
    return {
      ...a,
      status: assetStatus(data, a),
      customer: c ? customerName(data, c.customerId) : "—",
      contractId: c?.id ?? "",
      end: c?.end ?? "",
      remaining: c ? `${days(c.end)} 天` : "—",
    };
  });
  return { bills, receipts, assets };
}
export function Reports() {
  const { data, page, go } = useConsole(),
    rows = useReportRows();
  const [year, setYear] = useState(TODAY.slice(0, 4)),
    [road, setRoad] = useState(""),
    [customer, setCustomer] = useState(""),
    [assetGroup, setAssetGroup] = useState("road"),
    [from, setFrom] = useState(`${TODAY.slice(0, 4)}-01-01`),
    [to, setTo] = useState(TODAY),
    [distribution, setDistribution] = useState("合同");
  const bills = rows.bills.filter(
    (b) =>
      b.year === year &&
      (!customer || b.customerId === customer) &&
      (!road || data.assets.find((a) => a.id === b.assetId)?.road === road),
  );
  const assets = rows.assets.filter(
    (a) =>
      (!road || a.road === road) &&
      (!customer ||
        activeContracts(data, a.id).some((c) => c.customerId === customer)),
  );
  const receipts = rows.receipts.filter(
    (r) =>
      r.date >= from &&
      r.date <= to &&
      (!customer || r.customerId === customer),
  );
  const total = bills.reduce((n, b) => n + Number(b.amount), 0),
    collected = bills.reduce((n, b) => n + paid(data, b.id), 0),
    overdue = bills.reduce(
      (n, b) => n + (days(b.due) < 0 ? outstanding(data, b) : 0),
      0,
    );
  const cash = receipts.reduce((n, r) => n + Number(r.amount), 0),
    assignment = receipts.reduce((n, r) => n + allocated(data, r.id), 0);
  const monthlyReceipts = receipts.reduce<Record<string, number>>(
    (groups, receipt) => {
      const month = receipt.date.slice(0, 7);
      groups[month] = (groups[month] ?? 0) + Number(receipt.amount);
      return groups;
    },
    {},
  );
  const collectionGroups = new Map<string, number>();
  const addCollection = (dimension: string, name: string, amount: number) => {
    const key = `${dimension}\u0000${name || "未指定"}`;
    collectionGroups.set(key, (collectionGroups.get(key) ?? 0) + amount);
  };
  for (const receipt of receipts) {
    addCollection("客户", receipt.customer, Number(receipt.amount));
    addCollection("类型", receipt.type, Number(receipt.amount));
    let assignedToContracts = 0;
    for (const allocation of data.allocations.filter(
      (item) => item.receiptId === receipt.id,
    )) {
      const bill = data.bills.find((item) => item.id === allocation.billId);
      if (!bill) continue;
      const amount = Number(allocation.amount);
      addCollection("合同", bill.contractId, amount);
      assignedToContracts += amount;
    }
    const unassigned = Number(receipt.amount) - assignedToContracts;
    if (unassigned > 0) addCollection("合同", receipt.legacyUnreconciled === "是" ? "历史待核对" : "待分配", unassigned);
  }
  const collectionRows = [...collectionGroups.entries()].map(
    ([key, amount]) => {
      const [dimension, name] = key.split("\u0000");
      return {
        id: key,
        dimension,
        name,
        amount: String(amount),
        amountText: money(amount),
      };
    },
  );
  const filterLabelClass = "flex items-center gap-2 text-xs text-slate-500";
  const filterControlClass = "console-select block min-h-8 py-1";
  const filters = (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#dfe7f1] bg-white px-4 py-2 print:hidden">
      {page === "L04" ? (
        <>
          <label className={filterLabelClass}>
            到账开始日期
            <input
              aria-label="到账开始日期"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={filterControlClass}
            />
          </label>
          <label className={filterLabelClass}>
            到账结束日期
            <input
              aria-label="到账结束日期"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={filterControlClass}
            />
          </label>
        </>
      ) : (
        <>
          <label className={filterLabelClass}>
            应收年度
            <select
              aria-label="应收年度"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={filterControlClass}
            >
              {[...new Set(data.bills.map((b) => b.year))].sort().map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className={filterLabelClass}>
            路段
            <select
              aria-label="路段"
              className={filterControlClass}
              value={road}
              onChange={(e) => setRoad(e.target.value)}
            >
              <option value="">全部路段</option>
              {[...new Set(data.assets.map((a) => a.road))].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <label className={filterLabelClass}>
        客户
        <select
          aria-label="客户"
          className={filterControlClass}
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
        >
          <option value="">全部客户</option>
          {data.customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <p className="ml-auto text-xs text-slate-400">
        统计随上方筛选变化 · 金额以人民币计
      </p>
    </div>
  );
  const billMetrics = (
    <Metrics
      items={[
        { label: "年度应收", value: wan(total) },
        { label: "对应已收", value: wan(collected) },
        { label: "未收金额", value: wan(total - collected) },
        {
          label: "其中逾期",
          value: wan(overdue),
          hint: "逾期属于未收金额的一部分",
        },
      ]}
    />
  );
  if (page === "L01")
    return (
      <>
        {filters}
        <Metrics
          compact
          items={[
            { label: "广告牌总数", value: assets.length, unit: "块" },
            {
              label: "在租广告牌",
              value: assets.filter((a) => a.status === "在租").length,
              unit: "块",
            },
            {
              label: "空置广告牌",
              value: assets.filter((a) => a.status === "空置").length,
              unit: "块",
            },
            { label: "年度应收", value: wan(total) },
            { label: "未收金额", value: wan(total - collected) },
          ]}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel
            compact
            title="广告牌出租结构"
            action={
              <button
                onClick={() => go("L02")}
                className="inline-flex items-center gap-1 text-xs text-primary"
              >
                查看数量表
                <ArrowUpRight className="size-3" />
              </button>
            }
          >
            <Chart
              compact
              label="广告牌出租状态占比"
              option={{
                tooltip: { trigger: "item" },
                legend: { bottom: 0 },
                series: [
                  {
                    type: "pie",
                    radius: ["50%", "73%"],
                    center: ["50%", "45%"],
                    label: { show: false },
                    data: ["在租", "空置", "停用"].map((name) => ({
                      name,
                      value: assets.filter((a) => a.status === name).length,
                    })),
                  },
                ],
              }}
            />
          </Panel>
          <Panel
            compact
            title="年度应收款情况"
            action={
              <button
                onClick={() => go("L05")}
                className="inline-flex items-center gap-1 text-xs text-primary"
              >
                查看应收表
                <ArrowUpRight className="size-3" />
              </button>
            }
          >
            <Chart
              compact
              label={`应收${wan(total)}万元，已收${wan(collected)}万元，未收${wan(total - collected)}万元`}
              option={{
                grid: { top: 10, bottom: 20, left: 58, right: 42 },
                tooltip: {},
                xAxis: {
                  type: "value",
                  name: "万元",
                  splitLine: { lineStyle: { color: "#eef2f6" } },
                },
                yAxis: { type: "category", data: ["未收", "对应已收", "应收"] },
                series: [
                  {
                    type: "bar",
                    barWidth: 18,
                    data: [
                      (total - collected) / 1000000,
                      collected / 1000000,
                      total / 1000000,
                    ],
                    itemStyle: { borderRadius: [0, 5, 5, 0] },
                    label: { show: true, position: "right" },
                  },
                ],
              }}
            />
          </Panel>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,.75fr)]">
          <Panel
            compact
            title="关注合同"
            action={
              <button
                onClick={() => go("L03")}
                className="inline-flex items-center gap-1 text-xs text-primary"
              >
                查看全部
                <ArrowUpRight className="size-3" />
              </button>
            }
          >
            <div className="overflow-hidden rounded-md border border-slate-100">
              <table className="w-full table-fixed text-left text-xs">
                <thead className="bg-[#f0f5fb] text-[#586d86]">
                  <tr>
                    <th className="px-3 py-2 font-medium">合同编号</th>
                    <th className="px-3 py-2 font-medium">客户</th>
                    <th className="px-3 py-2 font-medium">到期日</th>
                    <th className="px-3 py-2 font-medium">期限</th>
                    <th className="w-20 px-3 py-2 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contracts
                    .filter((c) => c.status === "生效" && days(c.end) >= 0)
                    .slice(0, 3)
                    .map((c) => (
                      <tr
                        key={c.id}
                        className="cursor-pointer border-t border-slate-100 hover:bg-blue-50/50"
                        onClick={() => go("L07", c.id)}
                      >
                        <td className="truncate px-3 py-2.5 font-medium text-primary">
                          {c.id}
                        </td>
                        <td className="truncate px-3 py-2.5">
                          {customerName(data, c.customerId)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{c.end}</td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {days(c.end)} 天
                        </td>
                        <td className="px-3 py-2">
                          <Badge>{days(c.end) <= 30 ? "临期" : "生效"}</Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel compact title="快捷报表">
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "数量表", id: "L02", icon: Building2 },
                { name: "合同执行", id: "L03", icon: FileText },
                { name: "实际收款", id: "L04", icon: Wallet },
                { name: "应收统计", id: "L05", icon: CalendarClock },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-left text-xs hover:border-blue-300 hover:bg-blue-50/40"
                >
                  <item.icon className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </>
    );
  if (page === "L02" || page === "L03")
    return (
      <>
        {filters}
        <Metrics
          items={["全部", "在租", "空置", "停用"].map((status) => ({
            label: status === "全部" ? "资产总数" : status,
            value:
              status === "全部"
                ? assets.length
                : assets.filter((a) => a.status === status).length,
            unit: "块",
          }))}
        />
        <Panel title={page === "L02" ? "资产数量与明细" : "广告牌维度合同执行"}>
          <DataTable
            name={page === "L02" ? "广告牌数量表" : "合同执行情况"}
            rows={assets.map((a) => ({
              ...a,
              annual: money(
                bills
                  .filter(
                    (b) => b.assetId === a.id && b.contractId === a.contractId,
                  )
                  .reduce((n, b) => n + Number(b.amount), 0),
              ),
              progress: (() => {
                const related = bills.filter(
                  (b) => b.assetId === a.id && b.contractId === a.contractId,
                );
                const due = related.reduce((n, b) => n + Number(b.amount), 0);
                return due
                  ? `${Math.round((related.reduce((n, b) => n + paid(data, b.id), 0) / due) * 100)}%`
                  : "—";
              })(),
              expiryStatus:
                a.end && days(a.end) >= 0 && days(a.end) <= 30 ? "临期" : "—",
            }))}
            filterKeys={
              page === "L02" ? ["ownership", "land", "status"] : ["status"]
            }
            columns={
              page === "L02"
                ? [
                    { key: "id", label: "广告牌编号" },
                    { key: "road", label: "路段" },
                    { key: "ownership", label: "产权" },
                    { key: "nature", label: "性质" },
                    { key: "land", label: "用地性质" },
                    statusColumn,
                    { key: "customer", label: "当前客户" },
                  ]
                : [
                    {
                      key: "id",
                      label: "广告牌编号",
                      render: (a) => (
                        <button
                          className="text-primary"
                          onClick={() => go("L06", a.id)}
                        >
                          {a.id}
                        </button>
                      ),
                    },
                    { key: "customer", label: "客户" },
                    {
                      key: "contractId",
                      label: "合同编号",
                      render: (a) =>
                        a.contractId ? (
                          <button
                            className="text-primary"
                            onClick={() => go("L07", a.contractId)}
                          >
                            {a.contractId}
                          </button>
                        ) : (
                          "—"
                        ),
                    },
                    { key: "end", label: "合同到期" },
                    { key: "remaining", label: "剩余期限" },
                    {
                      key: "expiryStatus",
                      label: "到期提示",
                      render: (a) =>
                        a.expiryStatus === "临期" ? <Badge>临期</Badge> : "—",
                    },
                    {
                      key: "annual",
                      label: "年度应收（元）",
                      render: (a) => (a.contractId ? a.annual : "—"),
                    },
                    { key: "progress", label: "年度收款进度" },
                    statusColumn,
                  ]
            }
            onRow={(a) => go("L06", a.id)}
          />
        </Panel>
        {page === "L02" && (
          <Panel
            title="分类数量（按上方筛选）"
            action={
              <select
                className={filterControlClass}
                value={assetGroup}
                onChange={(event) => setAssetGroup(event.target.value)}
                aria-label="广告牌统计维度"
              >
                <option value="road">路段</option>
                <option value="ownership">产权</option>
                <option value="nature">性质</option>
                <option value="land">用地性质</option>
                <option value="status">状态</option>
              </select>
            }
          >
            <div className="flex flex-wrap gap-2">
              {Object.entries(
                assets.reduce<Record<string, number>>((groups, asset) => {
                  const value = asset[assetGroup] || "未设置";
                  groups[value] = (groups[value] ?? 0) + 1;
                  return groups;
                }, {}),
              ).map(([name, count]) => (
                <span
                  key={name}
                  className="rounded-md bg-blue-50 px-3 py-1.5 text-sm"
                >
                  {name}：<strong>{count}</strong> 块
                </span>
              ))}
              {!assets.length && (
                <span className="text-sm text-slate-500">暂无数据</span>
              )}
            </div>
          </Panel>
        )}
      </>
    );
  if (page === "L04")
    return (
      <>
        {filters}
        {from > to && (
          <Notice warning>开始日期不得晚于结束日期，请调整日期范围。</Notice>
        )}
        <Metrics
          items={[
            { label: "实际到账", value: wan(cash) },
            { label: "已分配", value: wan(assignment) },
            { label: "未核对或待分配", value: wan(cash - assignment) },
            { label: "收款笔数", value: receipts.length, unit: "笔" },
          ]}
        />
        <Notice>
          按实际到账日期统计。历史收款因缺少明细需要核对；待分配资金不直接减少年度未收金额。
        </Notice>
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title="月度到账趋势">
            <Chart
              label="实际到账月度趋势"
              option={{
                grid: { left: 50, right: 30, top: 20, bottom: 30 },
                tooltip: { trigger: "axis" },
                xAxis: {
                  type: "category",
                  data: Object.keys(monthlyReceipts).sort(),
                },
                yAxis: { type: "value", name: "万元" },
                series: [
                  {
                    type: "line",
                    smooth: true,
                    areaStyle: { opacity: 0.08 },
                    data: Object.keys(monthlyReceipts)
                      .sort()
                      .map((month) => monthlyReceipts[month] / 1000000),
                  },
                ],
              }}
            />
          </Panel>
          <Panel
            title="到账金额分布"
            action={
              <select
                aria-label="分布维度"
                className={filterControlClass}
                value={distribution}
                onChange={(event) => setDistribution(event.target.value)}
              >
                <option>客户</option>
                <option>类型</option>
                <option>合同</option>
              </select>
            }
          >
            {collectionRows.some((row) => row.dimension === distribution) ? (
              <Chart
                compact={false}
                label={`按${distribution}分布：${collectionRows
                  .filter((row) => row.dimension === distribution)
                  .map((row) => `${row.name} ${row.amountText}元`)
                  .join("，")}`}
                option={{
                  tooltip: {
                    trigger: "item",
                    valueFormatter: (value: unknown) =>
                      `${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元`,
                  },
                  legend: { bottom: 0, type: "scroll" },
                  series: [
                    {
                      type: "pie",
                      radius: ["42%", "64%"],
                      center: ["50%", "42%"],
                      label: { show: false },
                      labelLine: { show: false },
                      data: collectionRows
                        .filter((row) => row.dimension === distribution)
                        .map((row) => ({
                          name: row.name,
                          value: Number(row.amount) / 100,
                        })),
                    },
                  ],
                }}
              />
            ) : (
              <div className="grid h-64 place-items-center text-sm text-slate-500">
                暂无到账数据
              </div>
            )}
          </Panel>
        </div>
        <Panel title="实收流水">
          <DataTable
            name="收款情况"
            rows={receipts}
            columns={receiptColumns}
            filterKeys={["type", "status"]}
            onRow={(r) => go("L08", r.id)}
          />
        </Panel>
      </>
    );
  return (
    <>
      {filters}
      {billMetrics}
      <Notice>
        应收按“合同 × 广告牌 × 年度”统计；对应已收仅包含分配到这些账单的收款。
      </Notice>
      <Panel title="年度应收明细">
        <DataTable
          name="应收款统计及催收清单"
          rows={bills}
          columns={billColumns}
          filterKeys={["status"]}
          onRow={(r) => go("L08", r.id)}
          actions={
            <Button
              variant="ghost"
              onClick={() => {
                setCustomer("");
                setRoad("");
              }}
            >
              全部客户
            </Button>
          }
        />
      </Panel>
    </>
  );
}
export const billColumns: Column[] = [
  { key: "id", label: "应收单号" },
  { key: "customer", label: "客户" },
  { key: "assetId", label: "广告牌" },
  { key: "year", label: "年度" },
  { key: "due", label: "到期日" },
  { key: "amountText", label: "应收（元）" },
  { key: "paidText", label: "对应已收（元）" },
  { key: "outstandingText", label: "未收（元）" },
  statusColumn,
];
export const receiptColumns: Column[] = [
  { key: "id", label: "收款单号" },
  { key: "customer", label: "客户" },
  { key: "date", label: "到账日期" },
  { key: "type", label: "款项类型" },
  { key: "amountText", label: "到账（元）" },
  { key: "allocatedText", label: "已分配（元）" },
  { key: "remainingText", label: "待分配（元）" },
  statusColumn,
];
export function BillDetail({ bill, receipt }: { bill?: Row; receipt?: Row }) {
  const { data, role, go } = useConsole();
  const allocations = data.allocations.filter((a) =>
    bill ? a.billId === bill.id : a.receiptId === receipt?.id,
  );
  return (
    <div className="space-y-3">
      {bill && (
        <>
          <Details
            entries={[
              ["应收单号", bill.id],
              ["客户", customerName(data, bill.customerId)],
              ["合同", bill.contractId],
              ["广告牌", bill.assetId],
              ["应收年度", bill.year],
              ["到期日", bill.due],
            ]}
          />
          <Metrics
            items={[
              { label: "应收", value: wan(Number(bill.amount)) },
              { label: "对应已收", value: wan(paid(data, bill.id)) },
              { label: "未收", value: wan(outstanding(data, bill)) },
            ]}
          />
        </>
      )}
      {receipt && (
        <Details
          entries={[
            ["收款单号", receipt.id],
            ["客户", customerName(data, receipt.customerId)],
            ["到账金额", `${money(receipt.amount)} 元`],
            ["到账日期", receipt.date],
            ["款项类型", receipt.type],
            [
              "待分配金额",
              receipt.legacyUnreconciled === "是" ? "历史数据待核对" : `${money(Number(receipt.amount) - allocated(data, receipt.id))} 元`,
            ],
          ]}
        />
      )}
      <DataTable
        name="应收收款分配关联"
        rows={allocations.map((a) => ({
          ...a,
          amountText: money(a.amount),
          cashText: money(
            data.receipts.find((r) => r.id === a.receiptId)?.amount ?? "0",
          ),
        }))}
        columns={[
          { key: "receiptId", label: "实收单号" },
          { key: "billId", label: "应收单号" },
          { key: "cashText", label: "整笔到账（元）" },
          { key: "amountText", label: "本账单分配（元）" },
          { key: "date", label: "分配日期" },
        ]}
      />
      {role === "finance" && (
        <Button onClick={() => go(receipt ? "F11" : "F10", receipt?.id)}>
          {" "}
          {receipt ? "分配收款" : "登记收款"}
        </Button>
      )}
    </div>
  );
}
