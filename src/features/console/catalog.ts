import type { Role } from "./model";
export const menus: Record<
  Role,
  { label: string; page: string; icon: string }[]
> = {
  leader: [
    { label: "广告牌数量表", page: "L02", icon: "assets" },
    { label: "合同执行情况", page: "L03", icon: "contracts" },
    { label: "合同审批", page: "L09", icon: "contracts" },
    { label: "收款情况", page: "L04", icon: "receipts" },
    { label: "应收款统计", page: "L05", icon: "bills" },
  ],
  operations: [
    { label: "路段档案", page: "O02", icon: "road" },
    { label: "广告牌档案", page: "O03", icon: "assets" },
    { label: "证件维护", page: "O06", icon: "certificates" },
    { label: "资产变动", page: "O07", icon: "changes" },
    { label: "变更历史", page: "O09", icon: "history" },
  ],
  finance: [
    { label: "客户档案", page: "F02", icon: "customers" },
    { label: "合同管理", page: "F04", icon: "contracts" },
    { label: "应收管理", page: "F09", icon: "bills" },
    { label: "收款管理", page: "F12", icon: "receipts" },
    { label: "欠款管理", page: "F15", icon: "alerts" },
    { label: "资金流水", page: "F13", icon: "changes" },
    { label: "发票管理", page: "F14", icon: "invoices" },
  ],
  admin: [
    { label: "账号管理", page: "A01", icon: "customers" },
    { label: "角色权限", page: "A03", icon: "permissions" },
    { label: "数据字典", page: "A04", icon: "contracts" },
    { label: "操作日志", page: "A05", icon: "history" },
  ],
};
export const titles: Record<string, string> = {
  L02: "广告牌数量表",
  L03: "合同执行情况表",
  L09: "合同审批",
  L04: "收款情况表",
  L05: "应收款统计表",
  L06: "广告牌只读详情",
  L07: "合同执行只读详情",
  L08: "应收与收款关联详情",
  O02: "路段与组织档案",
  O03: "广告牌档案",
  O04: "广告牌新增与编辑",
  O05: "广告牌档案详情",
  O06: "证件维护与更新",
  O07: "广告牌移位登记",
  O08: "广告牌拆除与删除校验",
  O09: "资产变更历史",
  F02: "客户档案",
  F03: "客户详情与黑名单",
  F04: "合同管理",
  F05: "合同草稿与年度租金",
  F06: "合同生效前校验",
  F07: "合同详情与年度执行",
  F08: "合同变更与解除影响",
  F09: "年度应收与账单详情",
  F10: "登记收款与待分配",
  F11: "收款分配与核销确认",
  F12: "收款流水与分配详情",
  F13: "资金流水与支出登记",
  F14: "发票台账与登记",
  F15: "欠款查询与催收清单",
  A01: "账号管理",
  A02: "账号编辑与密码重置",
  A03: "角色权限与数据范围",
  A04: "数据字典维护",
  A05: "操作日志与变更追溯",
};
export const pageRole = (page: string): Role | undefined =>
  (
    ({ L: "leader", O: "operations", F: "finance", A: "admin" }) as Record<
      string,
      Role
    >
  )[page[0]];
export const parentPage: Record<string, string> = {
  L06: "L02",
  L07: "L03",
  L08: "L05",
  O04: "O03",
  O05: "O03",
  O08: "O07",
  F03: "F02",
  F05: "F04",
  F06: "F04",
  F07: "F04",
  F08: "F04",
  F10: "F12",
  F11: "F12",
  A02: "A01",
};
