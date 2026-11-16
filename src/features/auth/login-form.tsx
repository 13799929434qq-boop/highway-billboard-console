import { useState } from "react";
import { Controller } from "react-hook-form";
import {
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
  LoaderCircle,
  CircleAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLogin } from "./use-login";
import { loginError } from "./auth-api";
export function LoginForm({ onForgot }: { onForgot: () => void }) {
  const [visible, setVisible] = useState(false),
    { form, mutation, submit } = useLogin();
  const busy = form.formState.isSubmitting || mutation.isPending,
    errors = form.formState.errors;
  return (
    <form
      onSubmit={submit}
      noValidate
      className="login-form"
      aria-busy={busy}
      onChange={() => {
        if (mutation.isError) mutation.reset();
      }}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="username" className="sr-only">
            账号
          </label>
          <div className="relative">
            <UserRound className="field-icon" aria-hidden="true" />
            <Input
              id="username"
              autoComplete="username"
              placeholder="请输入账号"
              maxLength={80}
              disabled={busy}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
              className="h-[6.15vh] min-h-13 border-[1.5px] pl-15 text-[clamp(16px,1.2vw,20px)]"
              {...form.register("username")}
            />
          </div>
          {errors.username && (
            <p
              id="username-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.username.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            密码
          </label>
          <div className="relative">
            <LockKeyhole className="field-icon" aria-hidden="true" />
            <Input
              id="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="请输入密码"
              maxLength={256}
              disabled={busy}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="h-[6.15vh] min-h-13 border-[1.5px] pl-15 pr-13 text-[clamp(16px,1.2vw,20px)]"
              {...form.register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "隐藏密码" : "显示密码"}
              aria-pressed={visible}
            >
              {visible ? (
                <Eye className="size-5" />
              ) : (
                <EyeOff className="size-5" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p
              id="password-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.password.message}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-500">
          <Controller
            name="rememberMe"
            control={form.control}
            render={({ field }) => (
              <Checkbox
                id="remember"
                checked={field.value}
                onCheckedChange={(value) => field.onChange(value === true)}
                disabled={busy}
                aria-label="记住登录状态"
              />
            )}
          />
          记住登录状态
        </label>
        <Button
          type="button"
          variant="link"
          onClick={onForgot}
          className="h-8 px-0 text-base"
        >
          忘记密码?
        </Button>
      </div>
      <Button
        type="submit"
        disabled={busy}
        className="mt-7 h-[6.15vh] min-h-13 w-full text-xl font-semibold tracking-[.35em]"
      >
        {busy ? (
          <>
            <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />
            登录中…
          </>
        ) : (
          "登录"
        )}
      </Button>
      {mutation.isError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700"
        >
          <CircleAlert className="mt-1 size-4 shrink-0" />
          {loginError(mutation.error)}
        </div>
      )}
    </form>
  );
}
