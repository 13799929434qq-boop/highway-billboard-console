import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  House,
  Monitor,
  Users,
  FileText,
  Wallet,
  BadgeCheck,
  ChartNoAxesCombined,
  Bell,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  PanelsTopLeft,
  HandCoins,
  MapPin,
  X,
  UserRound,
  ClipboardList,
  Wrench,
  FileCheck,
  Menu,
  type LucideIcon,
} from "lucide-react";
import * as ec from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import "./home.css";

ec.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);
const images = "/assets/r34/";
const nav: [string, LucideIcon, string?][] = [
  ["首页", House],
  ["广告牌管理", Monitor, "/preview/operations/O03"],
  ["客户管理", Users, "/preview/finance/F02"],
  ["合同管理", FileText, "/preview/finance/F04"],
  ["财务管理", Wallet, "/preview/finance/F09"],
  ["售后管理", BadgeCheck],
  ["经营统计", ChartNoAxesCombined, "/preview/leader/L02"],
  ["消息提醒", Bell],
  ["系统管理", Settings, "/preview/admin/A01"],
];
type Entry = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  time?: string;
};
const todos: Entry[] = [
  {
    title: "合同即将到期",
    description: "3 份合同将在 30 天内到期",
    icon: FileCheck,
    tone: "violet",
  },
  {
    title: "客户回访",
    description: "5 位客户需要进行定期回访",
    icon: UserRound,
    tone: "rose",
  },
  {
    title: "广告牌维护",
    description: "2 块广告牌需要安排维护",
    icon: Wrench,
    tone: "orange",
  },
  {
    title: "账单待审核",
    description: "4 条账单需要审核",
    icon: HandCoins,
    tone: "green",
  },
  {
    title: "客户资料待完善",
    description: "3 位客户资料不完整",
    icon: ClipboardList,
    tone: "red",
  },
];
const notices: Entry[] = [
  {
    title: "系统公告",
    description: "系统将于 6 月 20 日 23:00 进行维护",
    icon: ClipboardList,
    tone: "blue",
    time: "10:25",
  },
  {
    title: "合同提醒",
    description: "G60沪昆高速广告合同将在30天后到期",
    icon: FileText,
    tone: "sky",
    time: "06-15",
  },
  {
    title: "客户动态",
    description: "浙江华宇集团提交了新的广告投放需求",
    icon: Users,
    tone: "blue",
    time: "06-14",
  },
  {
    title: "维护通知",
    description: "G25长深高速（湖州段）广告牌需要维护",
    icon: Wrench,
    tone: "orange",
    time: "06-14",
  },
  {
    title: "财务提醒",
    description: "5 月收入报表已生成，请及时查看",
    icon: Wallet,
    tone: "orange",
    time: "06-13",
  },
];
const contracts = [
  [
    "HT20240101",
    "浙江华宇集团",
    "G60沪昆高速（杭州段）",
    "¥ 480,000",
    "2024-01-01",
    "2024-12-31",
    "执行中",
  ],
  [
    "HT20240102",
    "杭州诚达汽车",
    "G25长深高速（湖州段）",
    "¥ 320,000",
    "2024-02-15",
    "2024-12-31",
    "执行中",
  ],
  [
    "HT20240103",
    "浙江绿源食品",
    "G92杭州湾高速（绍兴段）",
    "¥ 280,000",
    "2024-03-01",
    "2025-02-28",
    "待执行",
  ],
  [
    "HT20240104",
    "杭州云创科技",
    "G56杭瑞高速（黄山段）",
    "¥ 500,000",
    "2024-03-10",
    "2025-03-09",
    "执行中",
  ],
];
const columns = [
  "合同编号",
  "客户名称",
  "广告牌位置",
  "合同金额",
  "开始日期",
  "结束日期",
  "状态",
];
const metrics: [string, string, number, LucideIcon, string][] = [
  ["广告牌总数", "286", 12, PanelsTopLeft, "blue"],
  ["客户总数", "152", 8, Users, "green"],
  ["在签合同", "68", 15, FileText, "orange"],
  ["本月收入", "¥ 1,268,000", 20, HandCoins, "violet"],
];
const points = [
  [45.4, 16, 0],
  [32.8, 30, 1],
  [21.2, 44, 0],
  [31.5, 62, 2],
  [45.5, 70, 0],
  [33.2, 85, 0],
  [17.2, 90, 1],
];
const statuses = ["已投放", "待投放", "维护中"];
const pinColors = ["#2487ff", "#39c678", "#ffab2b"];
type Show = (title: string, content: ReactNode) => void;

function Feed({
  title,
  items,
  show,
}: {
  title: string;
  items: Entry[];
  show: Show;
}) {
  return (
    <section className="rh-card rh-feed">
      <header>
        <h2>
          {title}
          {title === "待办事项" && <b className="rh-count">5</b>}
        </h2>
        <button
          onClick={() =>
            show(
              title,
              <dl>
                {items.map((e) => (
                  <div key={e.title}>
                    <dt>{e.title}</dt>
                    <dd>{e.description}</dd>
                  </div>
                ))}
              </dl>,
            )
          }
        >
          全部 <ChevronRight />
        </button>
      </header>
      <div className="rh-feedrows">
        {items.map((e) => (
          <button
            key={e.title}
            onClick={() => show(e.title, <p>{e.description}</p>)}
          >
            <span className={"rh-icon " + e.tone}>
              <e.icon />
            </span>
            <span className="rh-feedtext">
              <strong>{e.title}</strong>
              <small>{e.description}</small>
            </span>
            {e.time ? (
              <time>{e.time}</time>
            ) : (
              <ChevronRight className="rh-next" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
function Trend() {
  const box = useRef<HTMLDivElement>(null),
    [mode, setMode] = useState("收入");
  useEffect(() => {
    if (!box.current) return;
    const chart = ec.init(box.current);
    chart.setOption({
      animation: false,
      textStyle: {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: 11,
        color: "#607594",
      },
      tooltip: { trigger: "axis" },
      grid: { left: 36, right: 42, top: 16, bottom: 37 },
      xAxis: {
        type: "category",
        data: ["1月", "2月", "3月", "4月", "5月", "6月"],
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#dae2ee" } },
        axisLabel: { color: "#58708d" },
      },
      yAxis: [
        {
          type: "value",
          min: 0,
          max: 250,
          interval: 50,
          splitLine: { lineStyle: { color: "#edf1f7" } },
        },
        {
          type: "value",
          min: 0,
          max: 25,
          interval: 5,
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "广告收入",
          type: "bar",
          barWidth: "50%",
          data: [56, 96, 122, 150, 166, 208],
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: new ec.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#2284ff" },
              { offset: 1, color: "#56aaff" },
            ]),
            opacity: mode === "收入" ? 1 : 0.35,
          },
        },
        {
          name: "合同数量",
          type: "line",
          yAxisIndex: 1,
          data: [5.5, 9, 11.5, 14.8, 14, 20],
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 1.5, color: "#23b972" },
          itemStyle: {
            color: "#25be77",
            borderColor: "white",
            borderWidth: 0.8,
          },
        },
      ],
    });
    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(box.current);
    return () => {
      obs.disconnect();
      chart.dispose();
    };
  }, [mode]);
  return (
    <section className="rh-card rh-trend">
      <header>
        <h2>近6个月经营数据</h2>
        <select
          aria-label="经营数据指标"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option>收入</option>
          <option>合同数量</option>
        </select>
      </header>
      <div className="rh-legend">
        <i />
        广告收入 <em />
        合同数量
      </div>
      <div className="rh-units">
        <span>收入（万元）</span>
        <span>合同数量（个）</span>
      </div>
      <div
        className="rh-plot"
        ref={box}
        aria-label="1月至6月广告收入和合同数量趋势"
      />
    </section>
  );
}
function AssetMap({ show }: { show: Show }) {
  const [selected, select] = useState(0),
    asset = contracts[selected % 4][2],
    status = statuses[points[selected][2]];
  return (
    <section className="rh-card rh-map">
      <header>
        <h2>广告牌分布</h2>
        <button
          onClick={() =>
            show(
              "广告牌分布",
              <ul>
                {contracts.map((c) => (
                  <li key={c[0]}>{c[2]}</li>
                ))}
              </ul>,
            )
          }
        >
          全国 <ChevronRight />
        </button>
      </header>
      <div className="rh-mapbody">
        <div className="rh-maplegend">
          {statuses.map((s, i) => (
            <span key={s}>
              <i style={{ background: pinColors[i] }} />
              {s}
            </span>
          ))}
        </div>
        {points.map(([x, y, s], i) => (
          <button
            key={i}
            className="rh-pin"
            style={{ left: x + "%", top: y + "%", color: pinColors[s] }}
            aria-label={contracts[i % 4][2] + statuses[s]}
            onClick={() => select(i)}
          >
            <MapPin />
          </button>
        ))}
        <div className="rh-popup">
          <img src={images + "thumb.png"} alt="高速公路广告牌" />
          <div>
            <strong>{asset}</strong>
            <small>桩号：K{125 + selected}+300</small>
            <small>尺寸：18m × 6m</small>
            <small>状态：{status}</small>
          </div>
          <button
            onClick={() =>
              show(
                asset,
                <p>
                  桩号 K{125 + selected}+300　尺寸 18m × 6m　状态 {status}
                </p>,
              )
            }
          >
            查看详情
          </button>
        </div>
      </div>
    </section>
  );
}
export default function Home() {
  const viewport = () => ({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [size, resize] = useState(viewport),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState(""),
    [detail, setDetail] = useState<{
      title: string;
      content: ReactNode;
    } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const fn = () => resize(viewport());
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  useEffect(() => {
    if (detail && !dialog.current?.open) dialog.current?.showModal();
  }, [detail]);
  const show: Show = (title, content) => setDetail({ title, content });
  const openRow = (row: string[]) =>
    show(
      row[0],
      <dl>
        {columns.map((c, i) => (
          <div key={c}>
            <dt>{c}</dt>
            <dd>{row[i]}</dd>
          </div>
        ))}
      </dl>,
    );
  const matches = contracts.filter((c) =>
    c.join(" ").toLowerCase().includes(query.trim().toLowerCase()),
  );
  const scale = size.width >= 900 ? size.width / 1536 : 1;
  return (
    <div
      className="rh"
      style={
        {
          "--zoom": scale,
          "--height": Math.max(840, size.height / scale) + "px",
        } as CSSProperties
      }
    >
      <aside className={menu ? "rh-side visible" : "rh-side"}>
        <div className="rh-brand">
          <img src={images + "brand.png"} alt="" />
          <div>
            <b>高速广告</b>
            <small>经营管理系统</small>
          </div>
        </div>
        <nav>
          {nav.map(([label, Icon, url], i) => (
            <button
              key={label}
              aria-current={i === 0 ? "page" : undefined}
              onClick={() => {
                setMenu(false);
                if (url) location.assign(url);
                else if (i === 5) show(label, <p>{todos[2].description}</p>);
                else if (i === 7)
                  show(
                    label,
                    <ul>
                      {notices.map((n) => (
                        <li key={n.title}>{n.description}</li>
                      ))}
                    </ul>,
                  );
                else setQuery("");
              }}
            >
              <Icon />
              {label}
              {i === 8 && <ChevronDown />}
            </button>
          ))}
        </nav>
      </aside>
      <div className="rh-main">
        <div className="rh-top">
          <button
            className="rh-menu"
            aria-label="菜单"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <div className="rh-search">
            <Search />
            <input
              type="search"
              placeholder="搜索广告牌、客户、合同等..."
              aria-label="搜索广告牌、客户、合同"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
              }}
            />
            {query.trim() && (
              <div className="rh-results">
                {matches.map((c) => (
                  <button
                    key={c[0]}
                    onClick={() => {
                      setQuery("");
                      openRow(c);
                    }}
                  >
                    {c[0]} · {c[1]}
                  </button>
                ))}
                {!matches.length && "暂无匹配结果"}
              </div>
            )}
          </div>
          <button
            className="rh-bell"
            aria-label="查看消息通知"
            onClick={() =>
              show(
                "消息通知",
                <ul>
                  {notices.map((n) => (
                    <li key={n.title}>{n.description}</li>
                  ))}
                </ul>,
              )
            }
          >
            <Bell />
            <i />
          </button>
          <button
            className="rh-user"
            onClick={() => show("张经理", <p>高速广告 · 经营管理</p>)}
          >
            <img src={images + "portrait.png"} alt="" />
            张经理
            <ChevronDown />
          </button>
        </div>
        <main className="rh-work">
          <section className="rh-hero">
            <h1>连接城市与未来</h1>
            <h3>专业的高速公路广告牌经营管理平台</h3>
            <p>高效管理 · 精准运营 · 数据驱动 · 创造更大商业价值</p>
          </section>
          <div className="rh-board">
            <div className="rh-center">
              <div className="rh-metrics">
                {metrics.map(([label, num, pct, Icon, tone]) => (
                  <section className="rh-card rh-metric" key={label}>
                    <span className={"rh-icon big " + tone}>
                      <Icon />
                    </span>
                    <div>
                      <small>{label}</small>
                      <strong>{num}</strong>
                      <footer>
                        <b>↑ {pct}%</b>
                        <span>较上月</span>
                      </footer>
                    </div>
                  </section>
                ))}
              </div>
              <div className="rh-mid">
                <AssetMap show={show} />
                <Trend />
              </div>
              <section className="rh-card rh-contract">
                <header>
                  <h2>近期合同</h2>
                  <a href="/preview/finance/F04">
                    查看更多 <ChevronRight />
                  </a>
                </header>
                <div className="rh-tablescroll">
                  <table>
                    <thead>
                      <tr>
                        {columns.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c) => (
                        <tr key={c[0]}>
                          {c.map((v, i) => (
                            <td key={i}>
                              {i === 0 ? (
                                <button onClick={() => openRow(c)}>{v}</button>
                              ) : i === 6 ? (
                                <span
                                  className={
                                    v === "执行中" ? "running" : "pending"
                                  }
                                >
                                  {v}
                                </span>
                              ) : (
                                v
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <div className="rh-rail">
              <Feed title="待办事项" items={todos} show={show} />
              <Feed title="消息通知" items={notices} show={show} />
            </div>
          </div>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="rh-dialog"
        onClose={() => setDetail(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <header>
          <h2>{detail?.title}</h2>
          <button aria-label="关闭详情" onClick={() => dialog.current?.close()}>
            <X />
          </button>
        </header>
        {detail?.content}
      </dialog>
    </div>
  );
}
