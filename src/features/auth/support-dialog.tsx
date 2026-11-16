import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export type SupportTopic = "forgot" | "help" | "contact" | "notice";
const content: Record<SupportTopic, { title: string; body: string }> = {
  forgot: {
    title: "找回登录密码",
    body: "请联系所在单位的系统管理员，提供您的工作账号和姓名。管理员核实身份后将为您重置密码。",
  },
  help: {
    title: "使用帮助",
    body: "请输入管理员分配的账号和密码登录。可点击密码右侧的图标查看输入内容；在个人设备上可勾选“记住登录状态”，实际有效期由系统管理员设置。",
  },
  contact: {
    title: "联系我们",
    body: "如遇账号权限、登录异常或业务使用问题，请联系所在运营单位的系统管理员。",
  },
  notice: {
    title: "系统公告",
    body: "公告服务暂未接入，当前无法获取最新公告。请以所在单位发布的正式通知为准。",
  },
};
export function SupportDialog({
  topic,
  onClose,
}: {
  topic: SupportTopic | null;
  onClose: () => void;
}) {
  const item = topic ? content[topic] : null;
  return (
    <Dialog
      open={!!topic}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle className="pr-6 text-xl font-semibold">
          {item?.title}
        </DialogTitle>
        <DialogDescription className="mt-4 text-sm leading-7 text-slate-600">
          {item?.body}
        </DialogDescription>
        {topic === "contact" && import.meta.env.VITE_SUPPORT_EMAIL && (
          <a
            className="mt-3 block text-primary underline"
            href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL}`}
          >
            {import.meta.env.VITE_SUPPORT_EMAIL}
          </a>
        )}
        <Button className="mt-6 w-full" onClick={onClose}>
          我知道了
        </Button>
      </DialogContent>
    </Dialog>
  );
}
