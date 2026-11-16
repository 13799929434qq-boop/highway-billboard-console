import { z } from "zod";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const TODAY =
  typeof window !== "undefined" &&
  window.location.pathname.startsWith("/preview")
    ? "2026-11-03"
    : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
export type Role = "leader" | "operations" | "finance" | "admin";
export const roleNames: Record<Role, string> = {
  leader: "领导",
  operations: "运营档案",
  finance: "合同财务",
  admin: "系统管理员",
};
export const rowSchema = z.record(z.string(), z.string());
export type Row = z.infer<typeof rowSchema>;
export const datasetSchema = z.object({
  assets: z.array(rowSchema),
  organizations: z.array(rowSchema),
  certificates: z.array(rowSchema),
  customers: z.array(rowSchema),
  contracts: z.array(rowSchema),
  rents: z.array(rowSchema),
  bills: z.array(rowSchema),
  receipts: z.array(rowSchema),
  allocations: z.array(rowSchema),
  expenses: z.array(rowSchema),
  invoices: z.array(rowSchema),
  accounts: z.array(rowSchema),
  dictionaries: z.array(rowSchema),
  logs: z.array(rowSchema),
  approvals: z.array(rowSchema).default([]),
  drafts: z.array(rowSchema),
  permissions: z.array(rowSchema),
});
export type Dataset = z.infer<typeof datasetSchema>;
export type Collection = keyof Dataset;
export type Action = { type: string; values: Row; requestId?: string };
const asset = (
  id: string,
  name: string,
  road: string,
  status: string,
): Row => ({
  id,
  name,
  road,
  region: road === "沿江高速" ? "沿江地区" : "石化地区",
  unit: road === "沿江高速" ? "第二运营单位" : "第一运营单位",
  ownership: "自有",
  land: "国有土地",
  contractStake: "K32+500",
  actualStake: "K32+520",
  approvedStake: "K32+510",
  specification: "18m × 6m · 双面",
  built: "2020-06-01",
  status,
  address: `${road}上行右侧`,
  longitude: "113.347230",
  latitude: "23.156870",
  photos: "",
  landDocument: "土地使用资料.pdf",
});
export function initialData(): Dataset {
  return {
    assets: [
      asset("GZ-SH-028", "石化段东侧高立柱", "广深高速", "在用"),
      asset("GZ-SH-029", "石化段西侧高立柱", "广深高速", "在用"),
      asset("GZ-SH-030", "沿江段入口广告牌", "沿江高速", "在用"),
      asset("GZ-SH-031", "沿江服务区广告牌", "沿江高速", "停用"),
    ],
    organizations: [
      {
        id: "ROAD-01",
        name: "广深高速",
        type: "路段",
        parent: "",
        status: "启用",
      },
      {
        id: "REGION-01",
        name: "石化地区",
        type: "地区",
        parent: "ROAD-01",
        status: "启用",
      },
      {
        id: "UNIT-01",
        name: "第一运营单位",
        type: "运营单位",
        parent: "REGION-01",
        status: "启用",
      },
      {
        id: "ROAD-02",
        name: "沿江高速",
        type: "路段",
        parent: "",
        status: "启用",
      },
      {
        id: "REGION-02",
        name: "沿江地区",
        type: "地区",
        parent: "ROAD-02",
        status: "启用",
      },
      {
        id: "UNIT-02",
        name: "第二运营单位",
        type: "运营单位",
        parent: "REGION-02",
        status: "启用",
      },
    ],
    certificates: ["路政批复", "保险", "年审"].map((type, i) => ({
      id: `CERT-0${i + 1}`,
      assetId: "GZ-SH-028",
      type,
      number: `ZJ-2026-00${i + 1}`,
      issued: "2025-11-01",
      expires: ["2027-06-30", "2026-11-20", "2026-10-20"][i],
      file: `${type}文件.pdf`,
      version: "1",
      current: "是",
      reason: "初始档案",
    })),
    customers: [
      {
        id: "KH-001",
        name: "华夏传媒",
        code: "DEMO-001",
        contact: "张先生",
        phone: "13800000000",
        address: "广州市天河区（演示）",
        title: "华夏传媒有限公司",
        taxId: "演示税号",
        bank: "演示银行",
        bankAccount: "**** 5678",
        blacklisted: "否",
        reason: "",
      },
      {
        id: "KH-002",
        name: "远通广告",
        code: "DEMO-002",
        contact: "李女士",
        phone: "13900000000",
        address: "广州市（演示）",
        title: "远通广告有限公司",
        taxId: "",
        bank: "",
        bankAccount: "",
        blacklisted: "否",
        reason: "",
      },
    ],
    contracts: [
      {
        id: "HT-2024-001",
        customerId: "KH-001",
        name: "石化段广告牌租赁合同",
        start: "2024-01-01",
        end: "2026-12-31",
        status: "生效",
        file: "租赁合同.pdf",
      },
      {
        id: "HT-2027-002",
        customerId: "KH-002",
        name: "沿江段广告牌租赁草稿",
        start: "2027-01-01",
        end: "2029-12-31",
        status: "待老板审批",
        file: "",
        note: "",
      },
    ],
    rents: [2024, 2025, 2026]
      .flatMap((year) =>
        ["028", "029"].map((n) => ({
          id: `RENT-${year}-${n}`,
          contractId: "HT-2024-001",
          assetId: `GZ-SH-${n}`,
          year: String(year),
          amount: { 2024: "10000000", 2025: "12000000", 2026: "13000000" }[year]!,
          due: `${year}-10-01`,
        })),
      )
      .concat(
        [2027, 2028, 2029].map((year) => ({
          id: `RENT-${year}-028`,
          contractId: "HT-2027-002",
          assetId: "GZ-SH-028",
          year: String(year),
          amount: { 2027: "9000000", 2028: "9800000", 2029: "10600000" }[year]!,
          due: `${year}-10-01`,
        })),
      ),
    bills: [2024, 2025, 2026].flatMap((year) =>
      ["028", "029"].map((n) => ({
        id: `AR-${year}-${n}`,
        contractId: "HT-2024-001",
        customerId: "KH-001",
        assetId: `GZ-SH-${n}`,
        year: String(year),
        amount: { 2024: "10000000", 2025: "12000000", 2026: "13000000" }[year]!,
        due: `${year}-10-01`,
      })),
    ),
    receipts: [
      {
        id: "SK-2024-001",
        customerId: "KH-001",
        amount: "20000000",
        date: "2024-10-01",
        type: "租金",
        method: "银行转账",
        account: "**** 5678",
        reference: "DEMO2024",
      },
      {
        id: "SK-2025-001",
        customerId: "KH-001",
        amount: "20000000",
        date: "2025-10-01",
        type: "租金",
        method: "银行转账",
        account: "**** 5678",
        reference: "DEMO2025",
      },
      {
        id: "SK-2026-001",
        customerId: "KH-001",
        amount: "11000000",
        date: "2026-10-01",
        type: "租金",
        method: "银行转账",
        account: "**** 5678",
        reference: "DEMO2026",
      },
      {
        id: "SK-20261015-001",
        customerId: "KH-001",
        amount: "4000000",
        date: "2026-10-15",
        type: "租金",
        method: "银行转账",
        account: "**** 5678",
        reference: "DEMO1015",
        note: "待分配示例",
      },
    ],
    allocations: [2024, 2025]
      .flatMap((year) =>
        ["028", "029"].map((n) => ({
          id: `ALLOC-${year}-${n}`,
          receiptId: `SK-${year}-001`,
          billId: `AR-${year}-${n}`,
          amount: "10000000",
          date: `${year}-10-01`,
        })),
      )
      .concat([
        {
          id: "ALLOC-2026-028",
          receiptId: "SK-2026-001",
          billId: "AR-2026-028",
          amount: "3000000",
          date: "2026-10-01",
        },
        {
          id: "ALLOC-2026-029",
          receiptId: "SK-2026-001",
          billId: "AR-2026-029",
          amount: "8000000",
          date: "2026-10-01",
        },
      ]),
    expenses: [
      {
        id: "EXP-001",
        amount: "1000000",
        date: "2026-11-03",
        type: "保险费",
        payee: "演示保险公司",
        assetId: "GZ-SH-028",
        file: "保险费用凭证.pdf",
        account: "**** 8899",
      },
    ],
    invoices: [
      {
        id: "INV-001",
        customerId: "KH-001",
        contractId: "HT-2024-001",
        number: "DEMO2026001",
        title: "华夏传媒有限公司",
        taxId: "演示税号",
        amount: "20000000",
        date: "2026-10-01",
        file: "发票示例.pdf",
        status: "已登记",
      },
    ],
    accounts: (Object.keys(roleNames) as Role[]).map((role, i) => ({
      id: `USER-${i + 1}`,
      username: `${role}01`,
      name: ["刘海峰", "张建国", "李慧", "王志强"][i],
      role,
      unit: "第一运营单位",
      scope: "全部授权范围",
      status: "启用",
    })),
    dictionaries: [
      {
        id: "DICT-01",
        category: "用地性质",
        name: "国有土地",
        code: "STATE",
        status: "启用",
        references: "4",
        order: "10",
      },
      {
        id: "DICT-02",
        category: "用地性质",
        name: "集体土地",
        code: "COLLECTIVE",
        status: "启用",
        references: "0",
        order: "20",
      },
      {
        id: "DICT-03",
        category: "款项类型",
        name: "履约金",
        code: "PERFORMANCE",
        status: "启用",
        references: "0",
        order: "10",
      },
    ],
    approvals: [
      {
        id: "AP-001",
        contractId: "HT-2024-001",
        date: "2024-01-02 09:00",
        step: "提交",
        result: "提交",
        actor: "finance",
        name: "合同财务",
        note: "",
      },
      {
        id: "AP-002",
        contractId: "HT-2024-001",
        date: "2024-01-02 11:00",
        step: "老板审批",
        result: "通过",
        actor: "leader",
        name: "领导",
        note: "",
      },
      {
        id: "AP-003",
        contractId: "HT-2024-001",
        date: "2024-01-02 15:00",
        step: "财务审批",
        result: "通过",
        actor: "finance",
        name: "合同财务",
        note: "",
      },
      {
        id: "AP-004",
        contractId: "HT-2027-002",
        date: "2026-11-01 10:00",
        step: "提交",
        result: "提交",
        actor: "finance",
        name: "合同财务",
        note: "",
      },
    ],
    logs: [
      {
        id: "LOG-001",
        date: "2026-11-03 09:30:00",
        actor: "运营档案",
        operation: "维护资产档案",
        target: "GZ-SH-028",
        before: "实际桩号：K32+500",
        after: "实际桩号：K32+520",
        reason: "现场复核",
        result: "成功",
      },
    ],
    drafts: [],
    permissions: [],
  };
}
export const cents = (value: string) => {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("金额最多保留两位小数");
  const n = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new Error("金额必须大于零且在有效范围内");
  return n;
};
export const money = (amount: number | string) =>
  (Number(amount) / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const wan = (amount: number) =>
  (amount / 1000000).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
export const days = (date: string) =>
  Math.round((Date.parse(date) - Date.parse(TODAY)) / 86400000);
export const paid = (data: Dataset, billId: string) => {
  const bill = data.bills.find((item) => item.id === billId);
  if (bill?.received !== undefined && bill.received !== "") {
    return Number(bill.received);
  }
  return data.allocations
    .filter((a) => a.billId === billId)
    .reduce((sum, a) => sum + Number(a.amount), 0);
};
export const allocated = (data: Dataset, receiptId: string) =>
  data.allocations
    .filter((a) => a.receiptId === receiptId)
    .reduce((sum, a) => sum + Number(a.amount), 0);
export const outstanding = (data: Dataset, bill: Row) =>
  Number(bill.amount) - paid(data, bill.id);
export const activeContracts = (data: Dataset, assetId: string) =>
  data.contracts.filter(
    (c) =>
      c.status === "生效" &&
      c.start <= TODAY &&
      c.end >= TODAY &&
      data.rents.some((r) => r.contractId === c.id && r.assetId === assetId),
  );
export const assetStatus = (data: Dataset, asset: Row) =>
  asset.status !== "在用"
    ? asset.status
    : activeContracts(data, asset.id).length
      ? "在租"
      : "空置";
export const customerName = (data: Dataset, id: string) =>
  data.customers.find((c) => c.id === id)?.name ?? "—";
export const contractYears = (contract: Row) => {
  const years: number[] = [];
  for (
    let year = Number(contract.start.slice(0, 4));
    year <= Number(contract.end.slice(0, 4));
    year++
  )
    years.push(year);
  return years;
};
function assertDemoYearsDiffer(data: Dataset, contract: Row, assetId: string) {
  const years = contractYears(contract);
  if (years.length <= 1) return;
  const amounts = years.map(
    (year) =>
      data.rents.find(
        (rent) =>
          rent.contractId === contract.id &&
          rent.assetId === assetId &&
          Number(rent.year) === year,
      )?.amount,
  );
  if (amounts.some((amount) => !amount)) return;
  if (new Set(amounts).size !== amounts.length)
    throw new Error("同一广告牌各年度租金必须不同");
}
export function contractChecks(
  data: Dataset,
  contract: Row,
): { label: string; ok: boolean; detail: string }[] {
  const rents = data.rents.filter((r) => r.contractId === contract.id);
  const assets = data.assets.filter((a) =>
    rents.some((r) => r.assetId === a.id),
  );
  return [
    {
      label: "客户状态",
      ok: data.customers.some(
        (c) => c.id === contract.customerId && c.blacklisted !== "是",
      ),
      detail: "客户存在且未列入黑名单",
    },
    {
      label: "年度租金完整性",
      ok:
        rents.length > 0 &&
        assets.length > 0 &&
        assets.every((a) => {
          for (
            let y = Number(contract.start.slice(0, 4));
            y <= Number(contract.end.slice(0, 4));
            y++
          )
            if (
              !rents.some(
                (r) =>
                  r.assetId === a.id &&
                  Number(r.year) === y &&
                  Number(r.amount) > 0,
              )
            )
              return false;
          return true;
        }),
      detail: "每块广告牌、每年度均需设置租金与到期日",
    },
    {
      label: "各年度金额不同",
      ok:
        assets.length > 0 &&
        assets.every((asset) => {
          const amounts = contractYears(contract).map(
            (year) =>
              rents.find(
                (rent) =>
                  rent.assetId === asset.id && Number(rent.year) === year,
              )?.amount,
          );
          return (
            amounts.every((amount) => Number(amount) > 0) &&
            new Set(amounts).size === amounts.length
          );
        }),
      detail: "同一广告牌各年度租金必须分别填写，且金额不能相同",
    },
    {
      label: "土地与资产状态",
      ok:
        assets.length > 0 &&
        assets.every(
          (a) =>
            a.status === "在用" && (a.land !== "集体土地" || !!a.landDocument),
        ),
      detail: "资产在用；集体土地须有流转手续",
    },
    {
      label: "路政批复、保险、年审",
      ok:
        assets.length > 0 &&
        assets.every((a) =>
          ["路政批复", "保险", "年审"].every((type) =>
            data.certificates.some(
              (c) =>
                c.assetId === a.id &&
                c.type === type &&
                c.current === "是" &&
                c.issued <= TODAY &&
                c.expires >= TODAY,
            ),
          ),
        ),
      detail: "三类证件均在有效期内",
    },
    {
      label: "广告牌租期冲突",
      ok: !assets.some((a) =>
        data.contracts.some(
          (c) =>
            c.id !== contract.id &&
            c.status === "生效" &&
            c.start <= contract.end &&
            c.end >= contract.start &&
            data.rents.some((r) => r.assetId === a.id && r.contractId === c.id),
        ),
      ),
      detail: "同一广告牌不得存在有效合同租期重叠",
    },
  ];
}
const writeRoles: Record<string, Role[]> = {
  saveAsset: ["operations"],
  saveOrganization: ["operations"],
  saveCertificate: ["operations"],
  saveAssetDraft: ["operations"],
  deleteAsset: ["operations"],
  saveCustomer: ["finance"],
  blacklist: ["finance"],
  saveContract: ["finance"],
  saveRent: ["finance"],
  saveRentSchedule: ["finance"],
  submitContract: ["finance"],
  bossApprove: ["leader"],
  bossReject: ["leader"],
  activate: ["finance"],
  saveContractDraft: ["finance"],
  saveReceipt: ["finance"],
  allocate: ["finance"],
  saveExpense: ["finance"],
  saveInvoice: ["finance"],
  saveAccount: ["admin"],
  toggleAccount: ["admin"],
  resetPassword: ["admin"],
  saveDictionary: ["admin"],
  toggleDictionary: ["admin"],
  savePermissions: ["admin"],
};
export function applyAction(
  source: Dataset,
  role: Role,
  action: Action,
): Dataset {
  if (!writeRoles[action.type]?.includes(role))
    throw new Error("当前角色无此操作权限");
  const data = structuredClone(source),
    v = { ...action.values };
  const required = (...keys: string[]) =>
    keys.forEach((key) => {
      if (!v[key]?.trim()) throw new Error("请填写所有必填项");
    });
  for (const key of ["date", "start", "end", "issued", "expires", "due"]) {
    if (
      v[key] &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(v[key]) ||
        !Number.isFinite(Date.parse(v[key])) ||
        new Date(v[key]).toISOString().slice(0, 10) !== v[key])
    )
      throw new Error("请填写有效日期");
  }
  if (v.customerId && !data.customers.some((c) => c.id === v.customerId))
    throw new Error("客户不存在");
  if (v.assetId && !data.assets.some((a) => a.id === v.assetId))
    throw new Error("广告牌不存在");
  if (v.contractId && !data.contracts.some((c) => c.id === v.contractId))
    throw new Error("合同不存在");
  if (
    action.type === "saveRent" &&
    (!/^\d{4}$/.test(v.year) || v.due.slice(0, 4) !== v.year)
  )
    throw new Error("应收日期须在所填年度内");
  if (action.type === "saveAsset") {
    const road = data.organizations.find(
      (o) => o.type === "路段" && o.name === v.road,
    );
    const region = data.organizations.find(
      (o) => o.type === "地区" && o.name === v.region && o.parent === road?.id,
    );
    if (
      !region ||
      !data.organizations.some(
        (o) =>
          o.type === "运营单位" && o.name === v.unit && o.parent === region.id,
      )
    )
      throw new Error("路段、地区与运营单位的归属关系不匹配");
  }
  const uid = () => crypto.randomUUID();
  data.approvals ??= [];
  const approve = (
    contractId: string,
    step: string,
    result: string,
    actor: string,
    name: string,
    note = "",
  ) =>
    data.approvals.push({
      id: uid(),
      contractId,
      date: `${TODAY} 10:00`,
      step,
      result,
      actor,
      name,
      note,
    });
  let before: Row | undefined, after: Row | undefined;
  const save = (key: Collection, row: Row) => {
    before = data[key].find((r) => r.id === row.id);
    after = row;
    data[key] = before
      ? data[key].map((r) => (r.id === row.id ? row : r))
      : [...data[key], row];
  };
  switch (action.type) {
    case "saveAsset":
      required(
        "id",
        "name",
        "road",
        "region",
        "unit",
        "contractStake",
        "actualStake",
        "approvedStake",
      );
      if (!v.editing && data.assets.some((a) => a.id === v.id))
        throw new Error("广告牌编号已存在");
      save("assets", {
        ...data.assets.find((a) => a.id === v.id),
        ...v,
        status: data.assets.find((a) => a.id === v.id)?.status ?? "在用",
      });
      break;
    case "saveOrganization":
      required("name", "type");
      if (v.type !== "路段") {
        const parent = data.organizations.find((o) => o.id === v.parent);
        if (!parent || parent.type !== (v.type === "地区" ? "路段" : "地区"))
          throw new Error("请选择正确的上级：路段 → 地区 → 运营单位");
      }
      save("organizations", { ...v, id: v.id || uid(), status: "启用" });
      break;
    case "saveCertificate":
      required(
        "assetId",
        "type",
        "number",
        "issued",
        "expires",
        "file",
        "reason",
      );
      if (v.expires < v.issued) throw new Error("有效期不得早于签发日期");
      {
        const old = data.certificates.filter(
          (c) => c.assetId === v.assetId && c.type === v.type,
        );
        data.certificates = data.certificates.map((c) =>
          old.includes(c) ? { ...c, current: "否" } : c,
        );
        save("certificates", {
          ...v,
          id: uid(),
          version: String(old.length + 1),
          current: "是",
        });
      }
      break;
    case "saveAssetDraft":
      required("assetId", "reason", "date");
      save("drafts", {
        ...v,
        id: uid(),
        status: "草稿 · 审批规则待确认",
        kind: "资产变动",
      });
      break;
    case "deleteAsset":
      if (
        data.rents.some((r) => r.assetId === v.id) ||
        data.certificates.some((c) => c.assetId === v.id) ||
        data.logs.some((l) => l.target === v.id)
      )
        throw new Error("存在合同、证件或历史引用，不能删除");
      before = data.assets.find((a) => a.id === v.id);
      data.assets = data.assets.filter((a) => a.id !== v.id);
      break;
    case "saveCustomer":
      required("name", "contact", "phone");
      save("customers", {
        ...v,
        id: v.id || uid(),
        blacklisted:
          data.customers.find((c) => c.id === v.id)?.blacklisted ?? "否",
      });
      break;
    case "blacklist":
      required("reason");
      {
        const c = data.customers.find((c) => c.id === v.id);
        if (!c) throw new Error("客户不存在");
        save("customers", {
          ...c,
          blacklisted: c.blacklisted === "是" ? "否" : "是",
          reason: v.reason,
        });
      }
      break;
    case "saveContract":
      required("id", "name", "customerId", "start", "end");
      if (v.start > v.end) throw new Error("结束日期不得早于开始日期");
      if (!v.editing && data.contracts.some((c) => c.id === v.id))
        throw new Error("合同编号已存在");
      if (data.contracts.some((c) => c.id === v.id && c.status !== "草稿"))
        throw new Error("生效合同不能直接覆盖");
      save("contracts", { ...v, status: "草稿" });
      break;
    case "saveRent":
      required("contractId", "assetId", "year", "due", "amount");
      {
        const c = data.contracts.find((c) => c.id === v.contractId);
        if (!c || c.status !== "草稿") throw new Error("仅草稿可修改年度租金");
        if (v.year < c.start.slice(0, 4) || v.year > c.end.slice(0, 4))
          throw new Error("年度必须在合同期限内");
        const old = data.rents.find(
          (r) =>
            r.contractId === c.id &&
            r.assetId === v.assetId &&
            r.year === v.year,
        );
        save("rents", {
          ...v,
          id: old?.id || uid(),
          amount: String(cents(v.amount)),
        });
        assertDemoYearsDiffer(data, c, v.assetId);
      }
      break;
    case "saveRentSchedule":
      required("contractId", "assetId");
      {
        const c = data.contracts.find((c) => c.id === v.contractId);
        if (!c || c.status !== "草稿") throw new Error("仅草稿可修改年度租金");
        const amounts = contractYears(c).map((year) => {
          const amount = v[`amount${year}`];
          const due = v[`due${year}`];
          if (!amount?.trim() || !due?.trim())
            throw new Error("请填写每个年度的租金和应收日期");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due.slice(0, 4) !== String(year))
            throw new Error("应收日期须落在对应年度");
          return String(cents(amount));
        });
        if (new Set(amounts).size !== amounts.length)
          throw new Error("同一广告牌各年度租金必须不同");
        contractYears(c).forEach((year, index) => {
          const old = data.rents.find(
            (r) =>
              r.contractId === c.id &&
              r.assetId === v.assetId &&
              Number(r.year) === year,
          );
          save("rents", {
            id: old?.id || uid(),
            contractId: c.id,
            assetId: v.assetId,
            year: String(year),
            amount: amounts[index],
            due: v[`due${year}`],
          });
        });
      }
      break;
    case "submitContract":
      {
        const c = data.contracts.find((c) => c.id === v.id);
        if (!c || c.status !== "草稿") throw new Error("仅草稿可以提交老板审批");
        if (contractChecks(data, c).some((check) => !check.ok))
          throw new Error("校验未全部通过");
        save("contracts", { ...c, status: "待老板审批", note: "" });
        approve(c.id, "提交", "提交", "finance", "合同财务");
      }
      break;
    case "bossApprove":
      {
        const c = data.contracts.find((c) => c.id === v.id);
        if (!c || c.status !== "待老板审批")
          throw new Error("当前合同不在老板审批环节");
        save("contracts", { ...c, status: "待财务审批", note: "" });
        approve(c.id, "老板审批", "通过", "leader", "领导");
      }
      break;
    case "bossReject":
      required("reason");
      {
        const c = data.contracts.find((c) => c.id === v.id);
        if (!c || c.status !== "待老板审批")
          throw new Error("当前合同不在老板审批环节");
        save("contracts", { ...c, status: "草稿", note: v.reason });
        approve(c.id, "老板审批", "退回", "leader", "领导", v.reason);
      }
      break;
    case "activate":
      {
        const c = data.contracts.find((c) => c.id === v.id);
        if (!c || c.status !== "待财务审批")
          throw new Error("需老板审批通过后，财务才能审批生效");
        if (contractChecks(data, c).some((check) => !check.ok))
          throw new Error("校验未全部通过");
        save("contracts", { ...c, status: "生效" });
        approve(c.id, "财务审批", "通过", "finance", "合同财务");
        data.rents
          .filter((r) => r.contractId === c.id)
          .forEach((r) =>
            data.bills.push({
              id: uid(),
              contractId: c.id,
              customerId: c.customerId,
              assetId: r.assetId,
              year: r.year,
              amount: r.amount,
              due: r.due,
            }),
          );
      }
      break;
    case "saveContractDraft":
      required("contractId", "reason", "date");
      save("drafts", {
        ...v,
        id: uid(),
        kind: "合同变更",
        status: "待核定 · 草稿",
      });
      break;
    case "saveReceipt":
      required("customerId", "amount", "date", "type", "reference");
      if (v.date > TODAY) throw new Error("到账日期不能晚于演示业务日期");
      if (
        data.receipts.some(
          (r) => r.reference === v.reference && r.account === v.account,
        )
      )
        throw new Error("该账户流水号已登记，请勿重复入账");
      save("receipts", { ...v, id: uid(), amount: String(cents(v.amount)) });
      break;
    case "allocate":
      {
        const receipt = data.receipts.find((r) => r.id === v.receiptId);
        if (!receipt || receipt.type !== "租金")
          throw new Error("仅租金可分配年度租金应收");
        if (
          Object.entries(v).some(
            ([key, value]) =>
              key.startsWith("bill:") &&
              value.trim() &&
              (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) < 0),
          )
        )
          throw new Error("分配金额须为非负数，最多两位小数");
        const entries = Object.entries(v)
          .filter(
            ([key, value]) => key.startsWith("bill:") && Number(value) > 0,
          )
          .map(([key, value]) => ({
            billId: key.slice(5),
            amount: cents(value),
          }));
        if (!entries.length) throw new Error("请输入至少一笔分配金额");
        const total = entries.reduce((s, e) => s + e.amount, 0);
        if (total > Number(receipt.amount) - allocated(data, receipt.id))
          throw new Error("分配合计超过收款可用余额");
        for (const entry of entries) {
          const bill = data.bills.find((b) => b.id === entry.billId);
          if (
            !bill ||
            bill.customerId !== receipt.customerId ||
            entry.amount > outstanding(data, bill)
          )
            throw new Error("不能超额分配或跨客户核销");
        }
        entries.forEach((e) =>
          data.allocations.push({
            id: uid(),
            receiptId: receipt.id,
            billId: e.billId,
            amount: String(e.amount),
            date: TODAY,
          }),
        );
        after = { receiptId: receipt.id, allocated: String(total) };
      }
      break;
    case "saveExpense":
      required("amount", "date", "type", "payee", "file");
      save("expenses", { ...v, id: uid(), amount: String(cents(v.amount)) });
      break;
    case "saveInvoice":
      required(
        "customerId",
        "contractId",
        "number",
        "title",
        "taxId",
        "amount",
        "date",
        "file",
      );
      if (data.invoices.some((i) => i.number === v.number))
        throw new Error("发票号码已登记");
      if (
        !data.contracts.some(
          (c) => c.id === v.contractId && c.customerId === v.customerId,
        )
      )
        throw new Error("客户与合同不匹配");
      save("invoices", {
        ...v,
        id: uid(),
        amount: String(cents(v.amount)),
        status: "已登记",
      });
      break;
    case "saveAccount":
      required("username", "name", "role", "scope");
      if (data.accounts.some((a) => a.username === v.username && a.id !== v.id))
        throw new Error("账号已存在");
      if (
        data.accounts.some(
          (a) => a.id === v.id && a.role === "admin" && a.status === "启用",
        ) &&
        v.role !== "admin" &&
        data.accounts.filter((a) => a.role === "admin" && a.status === "启用")
          .length <= 1
      )
        throw new Error("不能移除最后一个管理员");
      save("accounts", {
        ...v,
        id: v.id || uid(),
        status: data.accounts.find((a) => a.id === v.id)?.status ?? "启用",
      });
      break;
    case "toggleAccount":
      {
        const a = data.accounts.find((a) => a.id === v.id);
        if (!a) throw new Error("账号不存在");
        if (
          a.role === "admin" &&
          a.status === "启用" &&
          data.accounts.filter((a) => a.role === "admin" && a.status === "启用")
            .length <= 1
        )
          throw new Error("不能停用最后一个可用管理员");
        save("accounts", {
          ...a,
          status: a.status === "启用" ? "停用" : "启用",
        });
      }
      break;
    case "resetPassword":
      throw new Error("密码重置需要身份服务；演示环境不生成可用凭据");
    case "saveDictionary":
      required("category", "name", "code");
      if (
        data.dictionaries.some(
          (d) =>
            d.category === v.category && d.code === v.code && d.id !== v.id,
        )
      )
        throw new Error("字典编码重复");
      save("dictionaries", {
        ...v,
        id: v.id || uid(),
        status: "启用",
        references:
          data.dictionaries.find((d) => d.id === v.id)?.references ?? "0",
      });
      break;
    case "toggleDictionary":
      {
        const d = data.dictionaries.find((d) => d.id === v.id);
        if (!d) throw new Error("字典不存在");
        save("dictionaries", {
          ...d,
          status: d.status === "启用" ? "停用" : "启用",
        });
      }
      break;
    case "savePermissions":
      required("role", "scope");
      if (
        v.role === "leader" &&
        Object.entries(v).some(
          ([k, value]) => k.startsWith("write") && value === "是",
        )
      )
        throw new Error("领导预置角色只读");
      save("permissions", { ...v, id: v.role });
      break;
    default:
      throw new Error("未支持的操作");
  }
  data.logs.unshift({
    id: uid(),
    date: `${TODAY} ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`,
    actor: roleNames[role],
    operation: action.type,
    target: v.id || v.assetId || v.contractId || v.receiptId || after?.id || "",
    before: before ? JSON.stringify(before) : "无",
    after: after ? JSON.stringify(after) : "操作已记录",
    reason: v.reason || "",
    result: "成功（演示）",
  });
  return data;
}
export const useDemoStore = create<{
  data: Dataset;
  commit: (role: Role, action: Action) => void;
  reset: () => void;
}>()(
  persist(
    (set, get) => ({
      data: initialData(),
      commit: (role, action) =>
        set({ data: applyAction(get().data, role, action) }),
      reset: () => set({ data: initialData() }),
    }),
    {
      name: "billboard-demo-v1",
      version: 3,
      migrate: () => ({ data: initialData() }),
    },
  ),
);
