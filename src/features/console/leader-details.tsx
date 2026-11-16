import { FileText, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsole } from "./context";
import { ActionButton, Badge, RecordForm } from "./ui";
import { customerName, days, paid, TODAY, wan, type Row } from "./model";

const section = "rounded-xl border border-[#cbd9ea] bg-white p-4";
const table = "w-full border-collapse text-left text-sm";
const cell = "border border-[#d5e0ee] px-3 py-2";

export function LeaderAssetDetail({ asset }: { asset: Row }) {
  const { data, demo, go } = useConsole();
  const contract = data.contracts.find(
    (c) =>
      c.status === "生效" &&
      c.start <= TODAY &&
      c.end >= TODAY &&
      data.rents.some((r) => r.contractId === c.id && r.assetId === asset.id),
  );
  const rents = data.rents.filter((r) => r.contractId === contract?.id);
  const bills = data.bills.filter(
    (b) => b.assetId === asset.id && b.year === TODAY.slice(0, 4),
  );
  const due = bills.reduce((sum, b) => sum + Number(b.amount), 0);
  const received = bills.reduce((sum, b) => sum + paid(data, b.id), 0);
  const certificates = data.certificates.filter(
    (c) => c.assetId === asset.id && c.current === "是",
  );
  return (
    <div className="leader-detail space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => go("L02")}>
          ← 返回数量表
        </Button>
        <span className="text-sm text-slate-500">数据截至 {TODAY}</span>
      </div>
      <section
        className={section + " grid gap-5 lg:grid-cols-[minmax(210px,32%)_1fr]"}
      >
        <div>
          {demo || asset.photos ? (
            <>
              <img
                src={
                  demo
                    ? "/assets/leader-billboard-example.png"
                    : `/api/storage/files/${encodeURIComponent(asset.photos.split(",")[0])}?inline=true`
                }
                className="h-44 w-full rounded-lg object-cover xl:h-52"
                alt="广告牌示意"
              />
              {demo && <p className="mt-1 text-xs text-slate-500">示意图片</p>}
              {!demo && asset.photos.includes(",") && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {asset.photos
                    .split(",")
                    .filter(Boolean)
                    .map((id) => (
                      <a
                        key={id}
                        href={`/api/storage/files/${encodeURIComponent(id)}`}
                      >
                        <img
                          className="h-12 w-16 rounded object-cover"
                          src={`/api/storage/files/${encodeURIComponent(id)}?inline=true`}
                          alt="下载现场照片"
                        />
                      </a>
                    ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-44 items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm text-slate-500">
              <ImageOff className="size-5" />
              暂无可预览照片
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-xl font-bold">广告牌编号：{asset.id}</h2>
          <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
            {[
              ["路段", asset.road],
              ["地区", asset.region],
              ["运营单位", asset.unit],
              ["产权", asset.ownership],
              ["用地性质", asset.land],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-slate-200 py-2">
                <dt className="inline text-slate-500">{label}：</dt>
                <dd className="inline">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 grid grid-cols-3 rounded-lg bg-[#eaf2ff] py-3 text-center">
            {[
              ["合同桩号", asset.contractStake],
              ["实际桩号", asset.actualStake],
              ["批复桩号", asset.approvedStake],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-sm text-slate-600">{label}</div>
                <strong className="text-lg">{value || "—"}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="grid gap-3 xl:grid-cols-2">
        <section className={section}>
          <h2 className="mb-3 text-lg font-bold">合规证件</h2>
          <div className="overflow-x-auto">
            <table className={table}>
              <thead className="bg-[#e8eff8]">
                <tr>
                  {["证件类型", "有效期至", "状态"].map((x) => (
                    <th className={cell} key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {certificates.map((c) => {
                  const left = days(c.expires);
                  return (
                    <tr key={c.id}>
                      <td className={cell}>{c.type}</td>
                      <td className={cell}>{c.expires}</td>
                      <td className={cell}>
                        <Badge>
                          {c.issued > TODAY
                            ? "未生效"
                            : left < 0
                              ? "逾期"
                              : left <= 30
                                ? "临期"
                                : "有效"}
                        </Badge>
                        {c.issued > TODAY
                          ? ""
                          : left < 0
                            ? ` ${-left} 天`
                            : left <= 30
                              ? ` ${left} 天`
                              : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!certificates.length && (
              <p className="py-4 text-sm text-slate-500">暂无证件记录</p>
            )}
          </div>
        </section>
        <section className={section}>
          <h2 className="mb-3 text-lg font-bold">合同信息</h2>
          {contract ? (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm xl:grid-cols-3">
                {[
                  ["合同编号", contract.id],
                  ["合同状态", contract.status],
                  ["合同期限", `${contract.start} 至 ${contract.end}`],
                  [
                    "合同总金额",
                    `${wan(rents.reduce((sum, r) => sum + Number(r.amount), 0))} 万元`,
                  ],
                  [
                    `${TODAY.slice(0, 4)} 年本牌租金`,
                    `${wan(rents.filter((r) => r.assetId === asset.id && r.year === TODAY.slice(0, 4)).reduce((sum, r) => sum + Number(r.amount), 0))} 万元`,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-slate-200 py-2">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-1 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <button
                className="mt-3 text-sm text-blue-600"
                onClick={() => go("L07", contract.id)}
              >
                查看合同详情 →
              </button>
            </>
          ) : (
            <p className="py-4 text-sm text-slate-500">当前无生效合同</p>
          )}
        </section>
      </div>
      <section className={section}>
        <h2 className="mb-3 text-lg font-bold">
          {TODAY.slice(0, 4)} 年本牌收款情况
        </h2>
        <div className="grid grid-cols-3 rounded-lg bg-[#eaf2ff] p-4">
          {[
            ["本牌应收金额", due],
            ["已收金额", received],
            ["未收金额", due - received],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <div className="text-sm text-slate-600">{label}</div>
              <strong className="text-xl">{wan(Number(value))} 万元</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function LeaderContractDetail({ contract }: { contract: Row }) {
  const { data, go, demo } = useConsole();
  const rents = data.rents.filter((r) => r.contractId === contract.id);
  const bills = data.bills.filter((b) => b.contractId === contract.id);
  const years = [...new Set(rents.map((r) => r.year))].sort();
  const assetIds = [...new Set(rents.map((r) => r.assetId))];
  const total = rents.reduce((sum, r) => sum + Number(r.amount), 0);
  const remainingDays = days(contract.end);
  const annual = years.map((year) => {
    const group = bills.filter((b) => b.year === year);
    const due = group.reduce((sum, b) => sum + Number(b.amount), 0);
    const received = group.reduce((sum, b) => sum + paid(data, b.id), 0);
    return { year, due, received, remaining: due - received };
  });
  const current = annual.find((a) => a.year === TODAY.slice(0, 4));
  const percentage = current?.due
    ? Math.round((current.received / current.due) * 1000) / 10
    : 0;
  return (
    <div className="leader-detail space-y-3">
      <button
        onClick={() => go(contract.status === "待老板审批" ? "L09" : "L03")}
        className="text-sm font-medium text-blue-700"
      >
        ← 返回{contract.status === "待老板审批" ? "合同审批" : "合同执行情况"}
      </button>
      <section
        className={section + " flex flex-wrap items-center gap-x-8 gap-y-3"}
      >
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-100 p-3 text-blue-600">
            <FileText />
          </span>
          <div>
            <h2 className="text-xl font-bold">合同 {contract.id}</h2>
            <p className="text-sm">
              客户：{customerName(data, contract.customerId)}
            </p>
          </div>
        </div>
        {[
          ["合同状态", contract.status],
          ["合同期限", `${contract.start} 至 ${contract.end}`],
          ["剩余天数", remainingDays < 0 ? "已到期" : `${remainingDays} 天`],
          ["关联广告牌", `${assetIds.length} 块`],
          ["合同总金额", `${wan(total)} 万元`],
        ].map(([label, value]) => (
          <div key={label} className="border-l border-slate-200 pl-5">
            <div className="text-xs text-slate-500">{label}</div>
            <strong className="text-base">{value}</strong>
          </div>
        ))}
      </section>
      <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <section className={section}>
          <h2 className="mb-3 text-lg font-bold">合同基本信息</h2>
          <table className={table}>
            <tbody>
              {[
                ["合同编号", contract.id],
                ["客户名称", customerName(data, contract.customerId)],
                ["合同状态", contract.status],
                ["合同期限", `${contract.start} 至 ${contract.end}`],
                [
                  "剩余天数",
                  remainingDays < 0 ? "已到期" : `${remainingDays} 天`,
                ],
                ["合同总金额", `${wan(total)} 万元`],
                ["关联广告牌", assetIds.join("、") || "—"],
              ].map(([label, value]) => (
                <tr key={label}>
                  <th className={cell + " w-32 bg-[#eaf0f8] font-medium"}>
                    {label}
                  </th>
                  <td className={cell}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className={section}>
          <h2 className="mb-3 text-lg font-bold">
            年度 × 广告牌租金矩阵{" "}
            <span className="text-sm font-normal text-slate-500">
              （单位：万元）
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className={table}>
              <thead className="bg-[#e8eff8]">
                <tr>
                  <th className={cell}>广告牌编码</th>
                  {years.map((y) => (
                    <th className={cell} key={y}>
                      {y} 年
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assetIds.map((id) => (
                  <tr key={id}>
                    <th className={cell}>{id}</th>
                    {years.map((y) => (
                      <td className={cell} key={y}>
                        {rents.some((r) => r.assetId === id && r.year === y)
                          ? wan(
                              rents
                                .filter((r) => r.assetId === id && r.year === y)
                                .reduce((sum, r) => sum + Number(r.amount), 0),
                            )
                          : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-blue-100 font-bold">
                  <th className={cell}>年度合计</th>
                  {years.map((y) => (
                    <td className={cell} key={y}>
                      {wan(
                        rents
                          .filter((r) => r.year === y)
                          .reduce((sum, r) => sum + Number(r.amount), 0),
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
        <section className={section}>
          <h2 className="mb-3 text-lg font-bold">年度收款进度</h2>
          <div className="flex flex-wrap items-center gap-5">
            <div
              className="flex size-28 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#1769ed ${percentage}%, #e2e8f0 0)`,
              }}
            >
              <div className="grid size-20 place-items-center rounded-full bg-white text-center">
                <div>
                  <strong className="text-xl">{percentage}%</strong>
                  <div className="text-xs">{TODAY.slice(0, 4)} 年</div>
                </div>
              </div>
            </div>
            <div className="min-w-[300px] flex-1 overflow-x-auto">
              <table className={table}>
                <thead className="bg-[#e8eff8]">
                  <tr>
                    {[
                      "年度",
                      "应收（万元）",
                      "已收（万元）",
                      "未收（万元）",
                      "进度",
                    ].map((t) => (
                      <th className={cell} key={t}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {annual.map((a) => (
                    <tr key={a.year}>
                      <td className={cell}>{a.year}</td>
                      <td className={cell}>{wan(a.due)}</td>
                      <td className={cell}>{wan(a.received)}</td>
                      <td className={cell}>{wan(a.remaining)}</td>
                      <td className={cell}>
                        {a.due
                          ? `${Math.round((a.received / a.due) * 100)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section className={section}>
          <h2 className="mb-3 text-lg font-bold">关联合同文件</h2>
          {contract.file && !demo ? (
            <a
              className="text-sm text-blue-700 underline"
              href={`/api/storage/files/${encodeURIComponent(contract.file)}`}
            >
              下载合同文件
            </a>
          ) : (
            <p className="text-sm text-slate-600">
              {contract.file || "暂无文件"}
            </p>
          )}
        </section>
      </div>
      <section className={section}>
        <h2 className="mb-3 text-lg font-bold">审批记录</h2>
        {(data.approvals ?? []).filter((item) => item.contractId === contract.id)
          .length === 0 ? (
          <p className="text-sm text-slate-500">暂无审批记录。</p>
        ) : (
          <table className={table}>
            <thead className="bg-[#e8eff8]">
              <tr>
                {["时间", "环节", "结果", "审批人", "说明"].map((title) => (
                  <th className={cell} key={title}>
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.approvals ?? [])
                .filter((item) => item.contractId === contract.id)
                .map((item) => (
                  <tr key={item.id}>
                    <td className={cell}>{item.date}</td>
                    <td className={cell}>{item.step}</td>
                    <td className={cell}>{item.result}</td>
                    <td className={cell}>{item.name}</td>
                    <td className={cell}>{item.note || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
      {contract.status === "待老板审批" && (
        <section className={section}>
          <h2 className="mb-2 text-lg font-bold">老板审批</h2>
          <p className="mb-4 text-sm text-slate-600">
            请核对上方各年度租金。通过后交给财务审批，财务确认后合同才生效。
          </p>
          <ActionButton
            label="审批通过，转交财务"
            action={{ type: "bossApprove", values: { id: contract.id } }}
          />
          <div className="mt-4 max-w-xl">
            <RecordForm
              type="bossReject"
              initial={{ id: contract.id }}
              submitLabel="退回财务修改"
              fields={[
                {
                  key: "reason",
                  label: "退回原因",
                  type: "textarea",
                  required: true,
                },
              ]}
            />
          </div>
        </section>
      )}
      {current && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-100 px-4 py-3 text-sm font-medium text-blue-800">
          <span>
            {current.year} 年应收 {wan(current.due)} 万元，已收{" "}
            {wan(current.received)} 万元，未收 {wan(current.remaining)} 万元。
          </span>
          <Button onClick={() => go("L05")}>进入应收统计 →</Button>
        </div>
      )}
    </div>
  );
}
