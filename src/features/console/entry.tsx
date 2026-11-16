import { ConsoleProvider } from "./context";
import { ConsoleLayout } from "./console-layout";
export default function Console({ demo }: { demo: boolean }) {
  return (
    <ConsoleProvider demo={demo}>
      <ConsoleLayout />
    </ConsoleProvider>
  );
}
