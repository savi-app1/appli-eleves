import { ThemeToggle } from "@/components/shell/theme";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-safe min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
        <div className="flex h-12 items-center justify-end">
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}
