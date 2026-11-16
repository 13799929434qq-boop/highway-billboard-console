import {
  Database,
  FileClock,
  ChartNoAxesCombined,
  ChartColumnIncreasing,
} from "lucide-react";
const features = [
  { icon: Database, title: "资产档案", detail: "统一管理" },
  { icon: FileClock, title: "合同租赁", detail: "全程跟踪" },
  { icon: ChartNoAxesCombined, title: "财务收支", detail: "清晰可控" },
  { icon: ChartColumnIncreasing, title: "经营数据", detail: "实时统计" },
];
export function BrandSection() {
  return (
    <section className="brand-section" aria-label="系统介绍">
      <div className="flex items-center gap-[1.15vw] max-lg:gap-4">
        <div className="brand-logo flex shrink-0 items-center justify-center rounded-[14px] bg-primary shadow-sm">
          <svg
            viewBox="0 0 80 80"
            className="size-[78%] text-white"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M32 8h7l-3 21H25zm10 0h6l7 21H44zM9 32h62l5 7H4zm14 11h13l-4 33H12zm21 0h13l11 33H48z"
            />
          </svg>
        </div>
        <div>
          <h1 className="brand-title font-bold tracking-tight text-[#092449]">
            高速公路广告牌经营管理系统
          </h1>
          <p className="brand-subtitle mt-1 text-[#55779f]">
            Highway Billboard Operation Management System
          </p>
        </div>
      </div>
      <ul className="feature-list grid grid-cols-4 divide-x divide-[#aebed1]/55">
        {features.map(({ icon: Icon, title, detail }) => (
          <li key={title} className="flex flex-col items-center text-center">
            <Icon
              className="feature-icon mb-2.5 text-[#387ed2]"
              strokeWidth={2.1}
            />
            <p>
              {title}
              <br />
              {detail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
