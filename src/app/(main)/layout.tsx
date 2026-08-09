import type { ReactNode } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";
import { authService } from "@/features/auth/auth.service";

interface MainLayoutProps {
  children: ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
  const user = await authService.getCurrentUser().catch(() => null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <AppNavigation user={user ? { username: user.username, role: user.role } : null} />
      <div className="pt-14 lg:pl-64 lg:pt-0">{children}</div>
    </div>
  );
}
