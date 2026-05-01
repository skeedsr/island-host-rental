import { useUser, SignIn } from "@clerk/clerk-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Admin Access</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with your admin account to continue.
            </p>
          </div>
          <SignIn routing="hash" />
        </div>
      </div>
    );
  }

  const role = user?.publicMetadata?.role as string | undefined;

  if (role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-1">
            <Shield className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            Your account does not have admin privileges. Contact your administrator
            to request access.
          </p>
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium">{user?.primaryEmailAddress?.emailAddress}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
