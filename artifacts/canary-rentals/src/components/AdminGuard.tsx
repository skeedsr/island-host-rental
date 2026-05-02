import { useAuth } from "@/hooks/use-auth";
import { LoginPage } from "@/pages/LoginPage";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  if (!isAdmin) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
