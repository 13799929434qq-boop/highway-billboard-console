import { useState } from "react";
import { BrandSection } from "./brand-section";
import { LoginForm } from "./login-form";
import { LoginDecoration } from "./login-decoration";
import { SupportDialog, type SupportTopic } from "./support-dialog";
import { authConfigured } from "./auth-api";
export function LoginPage() {
  const [topic, setTopic] = useState<SupportTopic | null>(null);
  return (
    <main className="login-page relative isolate min-h-svh overflow-hidden">
      <div
        className="login-background pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      />
      <div className="login-layout">
        <BrandSection />
        <section
          className="login-panel rounded-[20px] bg-white/98 shadow-[0_15px_50px_-25px_#316cc62e]"
          aria-labelledby="login-heading"
        >
          <header className="text-center">
            <h2
              id="login-heading"
              className="text-[clamp(28px,2.4vw,38px)] font-bold tracking-wide"
            >
              欢迎登录
            </h2>
            <p className="mt-2 text-[clamp(14px,1.2vw,19px)] text-[#65728a]">
              高速公路广告牌经营管理系统
            </p>
          </header>
          <LoginForm onForgot={() => setTopic("forgot")} />
          <div className="login-decoration border-t border-[#e6ebf2] pt-5">
            <LoginDecoration />
          </div>
          <footer className="mt-7 flex items-center justify-center divide-x divide-slate-300 text-[clamp(14px,1.05vw,17px)] text-[#747f92]">
            {(
              [
                ["help", "使用帮助"],
                ["contact", "联系我们"],
                ["notice", "系统公告"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="cursor-pointer px-4 leading-none hover:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
                onClick={() => setTopic(key)}
              >
                {label}
              </button>
            ))}
          </footer>
          {(import.meta.env.DEV ||
            import.meta.env.VITE_ENABLE_DEMO === "true") && (
            <div className="mt-4 text-center text-xs text-slate-400">
              <p>
                {authConfigured ? "本地测试账号：" : "演示账号："}
                <span className="font-medium text-slate-600">
                  {authConfigured
                    ? "leader / operations / finance / admin"
                    : "admin"}
                </span>
                <span className="px-1.5">·</span>
                密码：<span className="font-medium text-slate-600">123456</span>
              </p>
              <a
                className="mt-1 inline-block hover:text-primary underline underline-offset-4"
                href="/preview/leader/L02"
              >
                免登录查看业务演示
              </a>
            </div>
          )}
        </section>
      </div>
      <SupportDialog topic={topic} onClose={() => setTopic(null)} />
    </main>
  );
}
