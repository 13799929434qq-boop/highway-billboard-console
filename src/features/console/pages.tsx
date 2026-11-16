import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConsole } from "./context";
import { LeaderAssetDetail, LeaderContractDetail } from "./leader-details";
import {
  Reports,
  BillDetail,
  useReportRows,
  billColumns,
  receiptColumns,
  statusColumn,
} from "./reports";
import {
  Panel,
  Notice,
  Metrics,
  DataTable,
  RecordForm,
  FormDialog,
  Details,
  Badge,
  ActionButton,
  options,
  type Field,
} from "./ui";
import {
  money,
  wan,
  outstanding,
  allocated,
  contractChecks,
  contractYears,
  customerName,
  roleNames,
  TODAY,
  days,
  type Row,
} from "./model";
const field = (
  key: string,
  label: string,
  type = "text",
  required = true,
): Field => ({ key, label, type, required });
const select = (key: string, label: string, values: string[]): Field => ({
  key,
  label,
  required: true,
  options: options(values),
});
const cols = (...entries: string[]) =>
  entries.map((e) => {
    const [key, label] = e.split(":");
    return { key, label };
  });
function Missing() {
  return <Notice warning>记录不存在，请返回列表重新选择。</Notice>;
}
function ApprovalHistory({ contractId }: { contractId?: string }) {
  const { data } = useConsole();
  const rows = (data.approvals ?? []).filter(
    (item) => !contractId || item.contractId === contractId,
  );
  if (!rows.length) return <Notice>暂无审批记录。</Notice>;
  return (
    <DataTable
      name={contractId ? "本合同审批记录" : "审批记录"}
      rows={[...rows].reverse()}
      columns={cols(
        ...(contractId ? [] : ["contractId:合同编号"]),
        "date:时间",
        "step:环节",
        "result:结果",
        "name:审批人",
        "note:说明",
      )}
    />
  );
}
function YearlyRentEditor({ contract }: { contract: Row }) {
  const { data } = useConsole();
  const [assetId, setAssetId] = useState(data.assets[0]?.id ?? "");
  return (
    <div className="space-y-3">
      <label className="block text-xs">
        <span className="mb-1 block font-medium">广告牌</span>
        <select
          className="console-select w-full"
          value={assetId}
          onChange={(event) => setAssetId(event.target.value)}
        >
          {data.assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.id} · {asset.name}
            </option>
          ))}
        </select>
      </label>
      {assetId && (
        <YearlyRentFields
          key={`${contract.id}-${assetId}`}
          contract={contract}
          assetId={assetId}
        />
      )}
    </div>
  );
}
function YearlyRentFields({
  contract,
  assetId,
}: {
  contract: Row;
  assetId: string;
}) {
  const ctx = useConsole();
  const years = contractYears(contract);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      years.flatMap((year) => {
        const row = ctx.data.rents.find(
          (rent) =>
            rent.contractId === contract.id &&
            rent.assetId === assetId &&
            Number(rent.year) === year,
        );
        return [
          [`amount${year}`, row ? (Number(row.amount) / 100).toFixed(2) : ""],
          [`due${year}`, row?.due || `${year}-10-01`],
        ];
      }),
    ),
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const amounts = years.map((year) => values[`amount${year}`]?.trim() ?? "");
  const duplicated =
    amounts.every(Boolean) && new Set(amounts).size !== amounts.length;
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving || duplicated) return;
        setSaving(true);
        setError("");
        setSuccess("");
        try {
          await ctx.commit({
            type: "saveRentSchedule",
            values: { contractId: contract.id, assetId, ...values },
          });
          setSuccess(ctx.demo ? "已保存至本机演示数据" : "各年度租金已保存");
        } catch (err) {
          setError(err instanceof Error ? err.message : "保存失败，请重试");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-3">
        {years.map((year) => (
          <div key={year} className="grid gap-3 sm:grid-cols-[5rem_1fr_1fr]">
            <div className="self-end pb-2 text-sm font-medium">{year} 年</div>
            <label className="block text-xs">
              <span className="mb-1 block font-medium">本年度租金（元）</span>
              <Input
                inputMode="decimal"
                value={values[`amount${year}`] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [`amount${year}`]: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium">应收日期</span>
              <Input
                type="date"
                value={values[`due${year}`] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [`due${year}`]: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        ))}
      </div>
      {duplicated && (
        <p className="text-sm text-red-600">各年度租金不能相同，请分别填写。</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}
      <Button type="submit" disabled={saving || duplicated}>
        {saving ? "保存中…" : "保存各年度租金"}
      </Button>
    </form>
  );
}
export function ConsolePages() {
  const ctx = useConsole(),
    { data, page, selected, go, role } = ctx;
  const rows = useReportRows();
  const [modal, setModal] = useState(false);
  const customers: Field = {
    key: "customerId",
    label: "客户",
    required: true,
    options: data.customers.map((c) => ({ value: c.id, label: c.name })),
  };
  const assets: Field = {
    key: "assetId",
    label: "广告牌",
    required: true,
    options: data.assets.map((a) => ({
      value: a.id,
      label: `${a.id} · ${a.name}`,
    })),
  };
  const contracts: Field = {
    key: "contractId",
    label: "合同",
    required: true,
    options: data.contracts.map((c) => ({ value: c.id, label: c.id })),
  };
  const asset = data.assets.find((a) => a.id === selected),
    contract = data.contracts.find((c) => c.id === selected),
    customer = data.customers.find((c) => c.id === selected),
    account = data.accounts.find((a) => a.id === selected);
  const create = (label: string, target: string) => (
    <Button onClick={() => go(target)}>{label}</Button>
  );
  if (/^L0[1-5]$/.test(page)) return <Reports />;
  if (page === "L08")
    return selected ? (
      <Panel title="账款关联">
        <BillDetail
          bill={data.bills.find((b) => b.id === selected)}
          receipt={data.receipts.find((r) => r.id === selected)}
        />
      </Panel>
    ) : (
      <Missing />
    );
  if (page === "L06")
    return asset ? <LeaderAssetDetail asset={asset} /> : <Missing />;
  if (page === "L09")
    return (
      <>
      <Panel title="待老板审批">
        <Notice>
          财务提交后在这里审批。通过后合同进入财务审批，财务确认后才会生效并生成应收。
        </Notice>
        <DataTable
          name="待老板审批合同"
          rows={data.contracts
            .filter((item) => item.status === "待老板审批")
            .map((item) => ({
              ...item,
              customer: customerName(data, item.customerId),
            }))}
          columns={[
            ...cols(
              "id:合同编号",
              "name:名称",
              "customer:客户",
              "start:起始日期",
              "end:结束日期",
            ),
            statusColumn,
          ]}
          onRow={(item) => go("L07", item.id)}
        />
      </Panel>
      <Panel title="历史审批">
        <ApprovalHistory />
      </Panel>
      </>
    );
  if (page === "L07")
    return contract ? (
      <LeaderContractDetail contract={contract} />
    ) : (
      <Missing />
    );
  if (page === "L06" || page === "O05")
    return asset ? (
      <>
        <Panel
          title={asset.name}
          action={
            role === "operations" && (
              <div className="flex gap-2">
                <Button onClick={() => go("O04", asset.id)}>编辑档案</Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `确定删除广告牌 ${asset.id} 吗？有关联合同、证件或历史记录的档案不能删除。`,
                      )
                    )
                      return;
                    try {
                      await ctx.commit({
                        type: "deleteAsset",
                        values: { id: asset.id },
                      });
                      go("O03");
                    } catch (error) {
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "删除失败，请重试",
                      );
                    }
                  }}
                >
                  删除档案
                </Button>
              </div>
            )
          }
        >
          <Details
            entries={cols(
              "id:广告牌编号",
              "road:路段",
              "region:地区",
              "unit:运营单位",
              "contractStake:合同桩号",
              "actualStake:实际桩号",
              "approvedStake:路政批复桩号",
              "land:用地性质",
              "ownership:产权",
              "specification:规格",
              "landDocument:土地资料",
              ...(ctx.demo ? ["photos:现场照片"] : []),
            ).map((c) => [c.label, asset[c.key]])}
          />
          {!ctx.demo && asset.photos && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium">现场照片</h3>
              <div className="flex flex-wrap gap-2">
                {asset.photos
                  .split(",")
                  .filter(Boolean)
                  .map((id) => (
                    <a
                      key={id}
                      href={`/api/storage/files/${encodeURIComponent(id)}`}
                    >
                      <img
                        className="h-20 w-28 rounded object-cover"
                        src={`/api/storage/files/${encodeURIComponent(id)}?inline=true`}
                        alt="广告牌现场照片，点击下载"
                      />
                    </a>
                  ))}
              </div>
            </div>
          )}
        </Panel>
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title="证件与历史版本">
            <DataTable
              name="资产证件"
              rows={data.certificates.filter((c) => c.assetId === asset.id)}
              columns={cols(
                "type:证件类型",
                "number:编号",
                "expires:有效期至",
                "version:版本",
                "current:当前版本",
                "file:附件登记",
              )}
            />
          </Panel>
          <Panel title="关联合同">
            <DataTable
              name="关联合同"
              rows={data.contracts.filter((c) =>
                data.rents.some(
                  (r) => r.contractId === c.id && r.assetId === asset.id,
                ),
              )}
              columns={[
                ...cols(
                  "id:合同编号",
                  "name:合同名称",
                  "start:开始",
                  "end:结束",
                ),
                statusColumn,
              ]}
              onRow={role === "leader" ? (c) => go("L07", c.id) : undefined}
            />
          </Panel>
        </div>
      </>
    ) : (
      <Missing />
    );
  if (page === "L07" || page === "F07" || page === "F06")
    return contract ? (
      <>
        <Panel
          title={contract.name}
          action={
            role === "finance" && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    go(
                      contract.status === "草稿"
                        ? "F05"
                        : contract.status === "生效"
                          ? "F08"
                          : "F06",
                      contract.id,
                    )
                  }
                >
                  {contract.status === "草稿"
                    ? "编辑草稿"
                    : contract.status === "生效"
                      ? "变更 / 解除"
                      : "查看审批"}
                </Button>
                {contract.status === "草稿" && (
                  <Button onClick={() => go("F06", contract.id)}>
                    提交审批
                  </Button>
                )}
              </div>
            )
          }
        >
          <Details
            entries={[
              ["合同编号", contract.id],
              ["客户", customerName(data, contract.customerId)],
              ["合同状态", <Badge>{contract.status}</Badge>],
              ["合同期限", `${contract.start} 至 ${contract.end}`],
              ...(contract.note
                ? [["退回原因", contract.note] as [string, string]]
                : []),
            ]}
          />
        </Panel>
        {page === "F06" && (
          <Panel title="审批校验">
            <div className="grid gap-x-5 gap-y-1 xl:grid-cols-2">
              {contractChecks(data, contract).map((c) => (
                <div
                  key={c.label}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5"
                >
                  <div>
                    <p className="font-medium">{c.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{c.detail}</p>
                  </div>
                  <Badge>{c.ok ? "通过" : "未通过"}</Badge>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 pt-2 xl:col-span-2">
                <p className="text-xs text-slate-500">
                  {contract.status === "待财务审批"
                    ? "老板已通过。财务确认后按各年度不同租金生成应收。"
                    : contract.status === "待老板审批"
                      ? "已提交老板审批，通过后才会回到财务。"
                      : "各年度租金不同，且校验通过后，才能提交老板审批。"}
                </p>
                {contract.status === "草稿" && (
                  <ActionButton
                    label="提交老板审批"
                    disabled={contractChecks(data, contract).some((c) => !c.ok)}
                    action={{ type: "submitContract", values: { id: contract.id } }}
                  />
                )}
                {contract.status === "待财务审批" && (
                  <ActionButton
                    label="财务审批通过并生成年度应收"
                    disabled={contractChecks(data, contract).some((c) => !c.ok)}
                    action={{ type: "activate", values: { id: contract.id } }}
                  />
                )}
              </div>
            </div>
          </Panel>
        )}
        {page !== "F06" && (
          <div className="grid gap-3 xl:grid-cols-2">
            <Panel title="年度租金矩阵">
              <DataTable
                name="年度租金"
                rows={data.rents
                  .filter((r) => r.contractId === contract.id)
                  .map((r) => ({ ...r, amountText: money(r.amount) }))}
                columns={cols(
                  "assetId:广告牌",
                  "year:年度",
                  "amountText:年租金（元）",
                  "due:应收日期",
                )}
              />
            </Panel>
            <Panel title="年度执行情况">
              <DataTable
                name="合同应收执行"
                rows={rows.bills.filter((b) => b.contractId === contract.id)}
                columns={billColumns}
                onRow={(b) => go(role === "leader" ? "L08" : "F09", b.id)}
              />
            </Panel>
          </div>
        )}
        {page === "F07" && (
          <Panel title="审批记录">
            <ApprovalHistory contractId={contract.id} />
          </Panel>
        )}
      </>
    ) : (
      <Missing />
    );
  if (page === "O01" || page === "F01")
    return (
      <>
        <Metrics
          items={
            page === "O01"
              ? [
                  {
                    label: "广告牌档案",
                    value: data.assets.length,
                    unit: "块",
                  },
                  {
                    label: "当前证件",
                    value: data.certificates.filter((c) => c.current === "是")
                      .length,
                    unit: "份",
                  },
                  {
                    label: "已过期证件",
                    value: data.certificates.filter(
                      (c) => c.current === "是" && c.expires < TODAY,
                    ).length,
                    unit: "份",
                  },
                  {
                    label: "变动草稿",
                    value: data.drafts.filter((d) => d.kind === "资产变动")
                      .length,
                    unit: "笔",
                  },
                ]
              : [
                  {
                    label: "合同数量",
                    value: data.contracts.length,
                    unit: "份",
                  },
                  {
                    label: "未收金额",
                    value: wan(
                      data.bills.reduce((n, b) => n + outstanding(data, b), 0),
                    ),
                  },
                  {
                    label: "待分配到账",
                    value: wan(
                      data.receipts.reduce(
                        (n, r) => n + (r.legacyUnreconciled === "是" ? 0 : Number(r.amount) - allocated(data, r.id)),
                        0,
                      ),
                    ),
                  },
                  {
                    label: "客户数量",
                    value: data.customers.length,
                    unit: "家",
                  },
                ]
          }
        />
        <Panel title="业务快捷入口">
          <div className="flex flex-wrap gap-3">
            {page === "O01" ? (
              <>
                {create("新增广告牌", "O04")}
                {create("维护证件", "O06")}
                {create("登记资产变动", "O07")}
              </>
            ) : (
              <>
                {create("新增合同", "F05")}
                {create("登记收款", "F10")}
                {create("分配收款", "F11")}
                {create("查看欠款", "F15")}
              </>
            )}
          </div>
        </Panel>
        <Panel title={page === "O01" ? "证件到期提醒" : "待分配收款"}>
          {page === "O01" ? (
            <DataTable
              name="证件提醒"
              rows={data.certificates
                .filter((c) => c.current === "是" && days(c.expires) <= 30)
                .map((c) => ({
                  ...c,
                  status: days(c.expires) < 0 ? "已过期" : "临期",
                }))}
              columns={[
                ...cols("assetId:广告牌", "type:证件类型", "expires:到期日"),
                statusColumn,
              ]}
              onRow={(r) => go("O06", r.assetId)}
            />
          ) : (
            <DataTable
              name="待分配收款"
              rows={rows.receipts.filter(
                (r) => r.legacyUnreconciled !== "是" && Number(r.amount) > allocated(data, r.id),
              )}
              columns={receiptColumns}
              onRow={(r) => go("F11", r.id)}
            />
          )}
        </Panel>
      </>
    );
  if (page === "O02")
    return (
      <>
        <Notice>
          档案层级：路段 → 地区 → 运营单位。新增下级时须选择对应层级的上级档案。
        </Notice>
        <Panel
          title="组织档案"
          action={<Button onClick={() => setModal(true)}>新增档案</Button>}
        >
          <DataTable
            name="组织档案"
            rows={data.organizations.map((o) => ({
              ...o,
              parentName:
                data.organizations.find((p) => p.id === o.parent)?.name ?? "—",
            }))}
            columns={[
              ...cols("name:名称", "type:层级", "parentName:上级档案"),
              statusColumn,
            ]}
            filterKeys={["type"]}
          />
        </Panel>
        <FormDialog
          title="新增组织档案"
          open={modal}
          onClose={() => setModal(false)}
        >
          <RecordForm
            type="saveOrganization"
            fields={[
              field("name", "名称"),
              select("type", "层级", ["路段", "地区", "运营单位"]),
              {
                key: "parent",
                label: "上级档案",
                options: data.organizations.map((o) => ({
                  value: o.id,
                  label: `${o.type} · ${o.name}`,
                })),
              },
            ]}
            onDone={() => setModal(false)}
          />
        </FormDialog>
      </>
    );
  if (page === "O03")
    return (
      <Panel title="广告牌资产台账" action={create("新增广告牌", "O04")}>
        <DataTable
          name="广告牌档案"
          rows={rows.assets}
          columns={[
            ...cols(
              "id:编号",
              "name:名称",
              "road:路段",
              "region:地区",
              "unit:运营单位",
              "land:用地性质",
            ),
            statusColumn,
          ]}
          filterKeys={["road", "status"]}
          onRow={(r) => go("O05", r.id)}
        />
      </Panel>
    );
  if (page === "O04")
    return (
      <Panel title={asset ? "编辑资产档案" : "新增资产档案"}>
        <RecordForm
          type="saveAsset"
          initial={
            asset
              ? { ...asset, editing: "是" }
              : { ownership: "自有", land: "国有土地" }
          }
          fields={[
            { ...field("id", "广告牌编号"), disabled: !!asset },
            field("name", "广告牌名称"),
            select(
              "road",
              "路段",
              data.organizations
                .filter((o) => o.type === "路段")
                .map((o) => o.name),
            ),
            select(
              "region",
              "地区",
              data.organizations
                .filter((o) => o.type === "地区")
                .map((o) => o.name),
            ),
            select(
              "unit",
              "运营单位",
              data.organizations
                .filter((o) => o.type === "运营单位")
                .map((o) => o.name),
            ),
            select(
              "ownership",
              "产权",
              ctx.demo
                ? ["自有", "租赁"]
                : data.dictionaries
                    .filter(
                      (item) =>
                        item.category === "产权" &&
                        (item.status === "启用" ||
                          item.name === asset?.ownership),
                    )
                    .map((item) => item.name),
            ),
            select(
              "land",
              "用地性质",
              ctx.demo
                ? ["国有土地", "集体土地"]
                : data.dictionaries
                    .filter(
                      (item) =>
                        item.category === "用地性质" &&
                        (item.status === "启用" || item.name === asset?.land),
                    )
                    .map((item) => item.name),
            ),
            ...(!ctx.demo
              ? [
                  {
                    key: "nature",
                    label: "性质",
                    required: false,
                    options: options(
                      data.dictionaries
                        .filter(
                          (item) =>
                            item.category === "性质" &&
                            (item.status === "启用" ||
                              item.name === asset?.nature),
                        )
                        .map((item) => item.name),
                    ),
                  },
                ]
              : []),
            field("contractStake", "合同桩号"),
            field("actualStake", "实际桩号"),
            field("approvedStake", "路政批复桩号"),
            ctx.demo
              ? field("specification", "规格")
              : select(
                  "specification",
                  "规格",
                  data.dictionaries
                    .filter(
                      (item) =>
                        item.category === "规格" &&
                        (item.status === "启用" ||
                          item.name === asset?.specification),
                    )
                    .map((item) => item.name),
                ),
            field("address", "位置描述"),
            field("landDocument", "土地资料", "file", false),
            field("photos", "现场照片", "file", false),
          ]}
          onDone={() => go("O03")}
        />
      </Panel>
    );
  if (page === "O06")
    return (
      <>
        <Panel title="更新证件">
          <RecordForm
            type="saveCertificate"
            initial={{ assetId: selected ?? "", issued: TODAY }}
            fields={[
              assets,
              select("type", "证件类型", ["路政批复", "保险", "年审"]),
              field("number", "证件编号"),
              field("issued", "签发日期", "date"),
              field("expires", "有效期至", "date"),
              field("reason", "更新原因"),
              field("file", "证件附件", "file"),
            ]}
          />
        </Panel>
        <Panel title="证件版本档案">
          <DataTable
            name="证件版本"
            rows={data.certificates}
            columns={[
              ...cols(
                "assetId:广告牌",
                "type:类型",
                "number:证件编号",
                "expires:有效期至",
                "version:版本",
                "current:当前版本",
                "reason:更新原因",
              ),
              {
                key: "file",
                label: "附件",
                render: (row) =>
                  !ctx.demo && row.file ? (
                    <a
                      className="text-blue-700 underline"
                      href={`/api/storage/files/${encodeURIComponent(row.file)}`}
                    >
                      下载
                    </a>
                  ) : (
                    row.file || "—"
                  ),
              },
            ]}
            filterKeys={["type", "current"]}
          />
        </Panel>
      </>
    );
  if (page === "O07" || page === "O08" || page === "F08")
    return (
      <>
        <Notice warning>
          审批、合同解除结算及退款规则尚待业务核定。本页保存变动草稿，暂不改变资产状态、合同和账款。
        </Notice>
        <Panel
          title="变动登记"
          action={
            page.startsWith("O") && (
              <Button
                variant="ghost"
                onClick={() => go(page === "O07" ? "O08" : "O07")}
              >
                {page === "O07" ? "拆除登记" : "移位登记"}
              </Button>
            )
          }
        >
          <RecordForm
            type={page === "F08" ? "saveContractDraft" : "saveAssetDraft"}
            initial={{
              contractId: selected ?? "",
              assetId: selected ?? "",
              date: TODAY,
              changeType:
                page === "O08" ? "拆除" : page === "F08" ? "解除" : "移位",
            }}
            fields={[
              page === "F08" ? contracts : assets,
              select(
                "changeType",
                "变动类型",
                page === "F08" ? ["变更", "解除"] : ["移位", "拆除"],
              ),
              field("date", "拟生效日期", "date"),
              field("reason", "原因与影响说明", "textarea"),
            ]}
            submitLabel="保存变动草稿"
          />
        </Panel>
        <Panel title="变动草稿">
          <DataTable
            name="变动草稿"
            rows={data.drafts.filter(
              (d) => d.kind === (page === "F08" ? "合同变更" : "资产变动"),
            )}
            columns={[
              ...cols(
                "assetId:广告牌",
                "contractId:合同",
                "changeType:变动类型",
                "date:拟生效日期",
                "reason:原因",
              ),
              statusColumn,
            ]}
          />
        </Panel>
      </>
    );
  if (page === "O09" || page === "A05")
    return (
      <Panel title="操作与变更记录">
        <DataTable
          name="操作日志"
          rows={data.logs}
          columns={cols(
            "date:操作时间",
            "actor:操作角色",
            "operation:操作",
            "target:关联记录",
            "reason:原因",
            "result:结果",
          )}
          onRow={(r) => go(page, r.id)}
        />
        {selected && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {["before", "after"].map((key) => (
              <div key={key} className="min-w-0 rounded-lg bg-slate-50 p-4">
                <h3 className="mb-3 font-medium">
                  {key === "before" ? "变更前" : "变更后"}
                </h3>
                <pre className="whitespace-pre-wrap break-all text-xs leading-6">
                  {data.logs.find((l) => l.id === selected)?.[key]}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Panel>
    );
  if (page === "F02" || page === "F03")
    return (
      <>
        <Panel
          title={customer ? customer.name : "客户档案"}
          action={
            <Button onClick={() => setModal(true)}>
              {customer ? "编辑客户" : "新增客户"}
            </Button>
          }
        >
          {customer ? (
            <Details
              entries={cols(
                "name:客户名称",
                "contact:联系人",
                "phone:联系电话",
                "title:开票抬头",
                "taxId:税号",
                "bank:开户银行",
                "bankAccount:银行账号",
                "blacklisted:黑名单",
                "reason:列入或解除原因",
              ).map((c) => [c.label, customer[c.key]])}
            />
          ) : (
            <DataTable
              name="客户档案"
              rows={data.customers}
              columns={cols(
                "name:客户名称",
                "contact:联系人",
                "phone:联系电话",
                "blacklisted:黑名单",
              )}
              filterKeys={["blacklisted"]}
              onRow={(r) => go("F03", r.id)}
            />
          )}
        </Panel>
        {customer && (
          <Panel title="黑名单管理">
            <Notice warning>
              黑名单客户不能生效新合同；已有合同不会自动解除。
            </Notice>
            <div className="mt-3">
              <RecordForm
                type="blacklist"
                initial={{ id: customer.id }}
                fields={[field("reason", "处理原因", "textarea")]}
                submitLabel={
                  customer.blacklisted === "是" ? "解除黑名单" : "列入黑名单"
                }
              />
            </div>
          </Panel>
        )}
        <FormDialog
          title={customer ? "编辑客户" : "新增客户"}
          open={modal}
          onClose={() => setModal(false)}
        >
          <RecordForm
            type="saveCustomer"
            initial={customer}
            fields={[
              field("name", "客户名称"),
              field("contact", "联系人"),
              field("phone", "联系电话"),
              field("code", "统一社会信用代码", "text", false),
              field("address", "地址", "text", false),
              field("title", "开票抬头", "text", false),
              field("taxId", "税号", "text", false),
              field("bank", "开户银行", "text", false),
              field("bankAccount", "银行账号", "text", false),
            ]}
            onDone={() => setModal(false)}
          />
        </FormDialog>
      </>
    );
  if (page === "F04")
    return (
      <>
      <Panel title="合同台账" action={create("新增合同", "F05")}>
        <DataTable
          name="合同台账"
          rows={data.contracts.map((c) => ({
            ...c,
            customer: customerName(data, c.customerId),
          }))}
          columns={[
            ...cols(
              "id:合同编号",
              "name:名称",
              "customer:客户",
              "start:起始日期",
              "end:结束日期",
            ),
            statusColumn,
          ]}
          filterKeys={["status"]}
          onRow={(r) =>
            go(
              r.status === "草稿"
                ? "F05"
                : r.status === "待老板审批" || r.status === "待财务审批"
                  ? "F06"
                  : "F07",
              r.id,
            )
          }
        />
      </Panel>
      <Panel title="历史审批">
        <ApprovalHistory />
      </Panel>
      </>
    );
  if (page === "F05")
    return (
      <>
        <Notice>
          先保存合同基本信息，再为每块广告牌按年填写不同租金。提交后先由老板审批，通过后再由财务审批生效。
        </Notice>
        <div className={contract ? "grid gap-3 xl:grid-cols-2" : undefined}>
          <Panel title="合同基本信息">
            <RecordForm
              type="saveContract"
              initial={contract ? { ...contract, editing: "是" } : {}}
              fields={[
                { ...field("id", "合同编号"), disabled: !!contract },
                field("name", "合同名称"),
                customers,
                field("start", "开始日期", "date"),
                field("end", "结束日期", "date"),
                field("file", "合同附件", "file", false),
              ]}
              onDone={() => go("F04")}
            />
          </Panel>
          {contract && contract.status === "草稿" && (
            <Panel
              title="分年租金"
              action={
                <Button onClick={() => go("F06", contract.id)}>
                  提交审批
                </Button>
              }
            >
              <YearlyRentEditor contract={contract} />
            </Panel>
          )}
          {contract && contract.status !== "草稿" && (
            <Notice>当前合同已进入审批，不能再修改各年度租金。</Notice>
          )}
        </div>
        {contract && (
          <Panel title="已设置租金">
            <DataTable
              name="合同年度租金"
              rows={data.rents
                .filter((r) => r.contractId === contract.id)
                .map((r) => ({ ...r, amountText: money(r.amount) }))}
              columns={cols(
                "assetId:广告牌",
                "year:年度",
                "amountText:租金（元）",
                "due:应收日期",
              )}
            />
          </Panel>
        )}
      </>
    );
  if (page === "F09" || page === "F15")
    return (
      <>
        <Metrics
          items={[
            {
              label: "应收合计",
              value: wan(data.bills.reduce((n, b) => n + Number(b.amount), 0)),
            },
            {
              label: "未收合计",
              value: wan(
                data.bills.reduce((n, b) => n + outstanding(data, b), 0),
              ),
            },
            {
              label: "逾期未收",
              value: wan(
                data.bills
                  .filter((b) => days(b.due) < 0)
                  .reduce((n, b) => n + outstanding(data, b), 0),
              ),
            },
          ]}
        />
        <Panel title={page === "F15" ? "欠款催收清单" : "年度应收台账"}>
          <DataTable
            name="年度应收与催收"
            rows={rows.bills
              .filter((b) => page !== "F15" || outstanding(data, b) > 0)
              .map((b) => ({
                ...b,
                age: !b.due
                  ? "未设置"
                  : days(b.due) >= 0
                    ? "未到期"
                    : `${-days(b.due)} 天`,
                contact:
                  data.customers.find((c) => c.id === b.customerId)?.phone ??
                  "",
              }))}
            columns={
              page === "F15"
                ? [...billColumns, ...cols("age:逾期天数", "contact:客户电话")]
                : billColumns
            }
            filterKeys={["year", "status"]}
            onRow={(r) => go(page, r.id)}
          />
          {selected && (
            <div className="mt-3 border-t pt-3">
              <BillDetail bill={data.bills.find((b) => b.id === selected)} />
            </div>
          )}
        </Panel>
      </>
    );
  if (page === "F10")
    return (
      <>
        <Notice>
          登记到账后资金处于待分配状态。押金、履约金和维修保证金单独登记，不能核销租金应收。
        </Notice>
        <Panel title="实际收款登记">
          <RecordForm
            type="saveReceipt"
            initial={{ date: TODAY, type: "租金", method: "银行转账" }}
            fields={[
              customers,
              field("amount", "到账金额（元）", "number"),
              field("date", "到账日期", "date"),
              select("type", "款项类型", [
                "租金",
                "押金",
                "履约金",
                "维修保证金",
              ]),
              select("method", "收款方式", ["银行转账", "现金", "其他"]),
              field("account", "收款账户"),
              field("reference", "银行流水号 / 收款凭据号"),
              field("note", "备注", "textarea", false),
            ]}
            onDone={() => go("F12")}
          />
        </Panel>
      </>
    );
  if (page === "F11") {
    const receipt = data.receipts.find((r) => r.id === selected);
    return (
      <>
        <Notice>
          请明确选择到账资金和应收账单。允许部分分配，合计不能超过可用余额，也不能超过单笔未收金额。
        </Notice>
        {!receipt ? (
          <Panel title="选择待分配租金">
            <DataTable
              name="可分配收款"
              rows={rows.receipts.filter(
                (r) =>
                  r.type === "租金" && r.legacyUnreconciled !== "是" && Number(r.amount) > allocated(data, r.id),
              )}
              columns={receiptColumns}
              onRow={(r) => go("F11", r.id)}
            />
          </Panel>
        ) : receipt.legacyUnreconciled === "是" ? (
          <Notice>历史收款缺少核销明细，需先核对后才能分配。</Notice>
        ) : (
          <>
            <Panel title="收款信息">
              <Details
                entries={[
                  ["收款单号", receipt.id],
                  ["客户", customerName(data, receipt.customerId)],
                  ["到账金额（元）", money(receipt.amount)],
                  [
                    "可分配余额（元）",
                    money(Number(receipt.amount) - allocated(data, receipt.id)),
                  ],
                ]}
              />
            </Panel>
            <Panel title="填写分配金额">
              <RecordForm
                type="allocate"
                initial={{ receiptId: receipt.id }}
                fields={data.bills
                  .filter(
                    (b) =>
                      b.customerId === receipt.customerId &&
                      outstanding(data, b) > 0,
                  )
                  .map((b) => ({
                    ...field(
                      `bill:${b.id}`,
                      `${b.assetId} · ${b.year} 年（未收 ${money(outstanding(data, b))} 元）`,
                      "number",
                      false,
                    ),
                  }))}
                submitLabel="确认分配并核销应收"
              />
            </Panel>
          </>
        )}
      </>
    );
  }
  if (page === "F12")
    return (
      <Panel title="实际收款流水" action={create("登记收款", "F10")}>
        <DataTable
          name="收款流水"
          rows={rows.receipts}
          columns={receiptColumns}
          filterKeys={["type", "status"]}
          onRow={(r) => go("F12", r.id)}
        />
        {selected && (
          <div className="mt-3 border-t pt-3">
            <BillDetail
              receipt={data.receipts.find((r) => r.id === selected)}
            />
          </div>
        )}
      </Panel>
    );
  if (page === "F13" || page === "F14") {
    const invoice = page === "F14";
    return (
      <>
        <Notice>
          {invoice
            ? "发票登记与实收资金独立，登记发票不会自动核销应收。"
            : "支出单独登记路政费、保险费和维修费，不冲减客户租金应收。"}
        </Notice>
        <Panel
          title={invoice ? "发票台账" : "支出流水"}
          action={
            <Button onClick={() => setModal(true)}>
              {invoice ? "登记发票" : "登记支出"}
            </Button>
          }
        >
          <DataTable
            name={invoice ? "发票台账" : "支出流水"}
            rows={(invoice ? data.invoices : data.expenses).map((r) => ({
              ...r,
              amountText: money(r.amount),
              customer: customerName(data, r.customerId),
            }))}
            columns={[
              ...(invoice
                ? cols(
                    "number:发票号码",
                    "customer:客户",
                    "contractId:合同",
                    "title:抬头",
                    "amountText:金额（元）",
                    "date:开票日期",
                    "status:状态",
                  )
                : cols(
                    "id:流水编号",
                    "type:支出类型",
                    "payee:收款单位",
                    "assetId:广告牌",
                    "amountText:金额（元）",
                    "date:支出日期",
                  )),
              {
                key: "file",
                label: "附件",
                render: (row) =>
                  !ctx.demo && row.file ? (
                    <a
                      className="text-blue-700 underline"
                      href={`/api/storage/files/${encodeURIComponent(row.file)}`}
                    >
                      下载
                    </a>
                  ) : (
                    row.file || "—"
                  ),
              },
            ]}
          />
        </Panel>
        <FormDialog
          title={invoice ? "登记发票" : "登记支出"}
          open={modal}
          onClose={() => setModal(false)}
        >
          <RecordForm
            type={invoice ? "saveInvoice" : "saveExpense"}
            initial={{ date: TODAY }}
            fields={
              invoice
                ? [
                    customers,
                    contracts,
                    field("number", "发票号码"),
                    field("title", "发票抬头"),
                    field("taxId", "税号"),
                    field("amount", "价税合计（元）", "number"),
                    field("date", "开票日期", "date"),
                    field("file", "发票附件", "file"),
                  ]
                : [
                    select("type", "支出类型", ["路政费", "保险费", "维修费"]),
                    assets,
                    field("payee", "收款单位"),
                    field("amount", "支出金额（元）", "number"),
                    field("date", "支出日期", "date"),
                    field("account", "付款账户"),
                    field("file", "支出凭证", "file"),
                  ]
            }
            onDone={() => setModal(false)}
          />
        </FormDialog>
      </>
    );
  }
  if (page === "A01")
    return (
      <Panel title="系统账号" action={create("新增账号", "A02")}>
        <DataTable
          name="账号管理"
          rows={data.accounts.map((a) => ({
            ...a,
            roleName: roleNames[a.role as keyof typeof roleNames],
          }))}
          columns={[
            ...cols(
              "username:账号",
              "name:姓名",
              "roleName:角色",
              "unit:单位",
              "scope:数据范围",
            ),
            statusColumn,
          ]}
          filterKeys={["roleName", "status"]}
          onRow={(r) => go("A02", r.id)}
        />
      </Panel>
    );
  if (page === "A02")
    return (
      <>
        <Panel title={account ? "编辑账号" : "新增账号"}>
          <RecordForm
            type="saveAccount"
            initial={account}
            fields={[
              field("username", "账号"),
              field("name", "姓名"),
              ...(!ctx.demo
                ? [
                    field(
                      "password",
                      account ? "新密码（留空不修改）" : "初始密码",
                      "password",
                      !account,
                    ),
                  ]
                : []),
              {
                key: "role",
                label: "角色",
                required: true,
                options: Object.entries(roleNames).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
              field("unit", "所属单位"),
              select("scope", "数据范围", [
                "全部授权范围",
                "所属运营单位",
                "指定路段",
              ]),
            ]}
            onDone={() => go("A01")}
          />
        </Panel>
        {account && (
          <Panel title="账号安全">
            <div className="flex flex-wrap gap-3">
              <ActionButton
                label={account.status === "启用" ? "停用账号" : "启用账号"}
                action={{ type: "toggleAccount", values: { id: account.id } }}
              />
              {ctx.demo && (
                <ActionButton
                  label="重置密码"
                  action={{ type: "resetPassword", values: { id: account.id } }}
                />
              )}
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {ctx.demo
                ? "演示账号不会生成真实登录凭据。"
                : "可在上方设置新密码。"}
              最后一个启用的管理员受到保护。
            </p>
          </Panel>
        )}
      </>
    );
  if (page === "A03")
    return (
      <>
        <Notice>
          预置职责：领导只读查看报表；运营维护资产；合同财务维护合同及账款；管理员维护系统配置。生产权限由后端校验。
        </Notice>
        <Panel title="角色与数据范围配置">
          <RecordForm
            type="savePermissions"
            fields={[
              {
                key: "role",
                label: "角色",
                required: true,
                options: Object.entries(roleNames).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
              select("scope", "数据范围", [
                "全部授权范围",
                "所属运营单位",
                "指定路段",
              ]),
              field("roads", "指定路段说明", "text", false),
            ]}
            extra={
              <p className="text-sm text-slate-500">
                当前保存配置草稿；演示权限固定按预置角色执行，范围配置待后端授权服务接入。
              </p>
            }
            submitLabel="保存配置草稿"
          />
        </Panel>
        <Panel title="已保存范围配置">
          {data.permissions.length ? (
            <DataTable
              name="权限范围"
              rows={data.permissions.map((r) => ({
                ...r,
                roleName: roleNames[r.role as keyof typeof roleNames],
              }))}
              columns={cols(
                "roleName:角色",
                "scope:数据范围",
                "roads:指定路段说明",
              )}
            />
          ) : (
            <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              暂无保存记录，完成上方配置后将在此展示
            </div>
          )}
        </Panel>
      </>
    );
  if (page === "A04")
    return (
      <>
        <Panel
          title="数据字典"
          action={<Button onClick={() => setModal(true)}>新增字典项</Button>}
        >
          <DataTable
            name="数据字典"
            rows={data.dictionaries}
            columns={[
              ...cols(
                "category:分类",
                "name:名称",
                "code:编码",
                "references:引用数量",
              ),
              statusColumn,
              {
                key: "action",
                label: "维护",
                render: (r) => (
                  <ActionButton
                    label={r.status === "启用" ? "停用" : "启用"}
                    action={{ type: "toggleDictionary", values: { id: r.id } }}
                  />
                ),
              },
            ]}
            filterKeys={["category", "status"]}
          />
        </Panel>
        <Notice>停用保留历史引用，不删除历史业务记录。</Notice>
        <FormDialog
          title="新增字典项"
          open={modal}
          onClose={() => setModal(false)}
        >
          <RecordForm
            type="saveDictionary"
            fields={[
              field("category", "分类"),
              field("name", "名称"),
              field("code", "编码"),
              field("order", "排序", "number"),
            ]}
            onDone={() => setModal(false)}
          />
        </FormDialog>
      </>
    );
  return <Missing />;
}
