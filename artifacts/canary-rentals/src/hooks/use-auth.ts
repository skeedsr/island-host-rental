import { useQuery, useQueryClient } from "@tanstack/react-query";

export type AdminRole = "super_admin" | "property_manager";

export interface AuthState {
  isAdmin: boolean;
  role?: AdminRole;
  username?: string;
  userId?: number;
}

async function fetchMe(): Promise<AuthState> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return { isAdmin: false };
  if (!res.ok) throw new Error("Auth check failed");
  return res.json();
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AuthState>({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    queryClient.setQueryData(["auth", "me"], { isAdmin: false });
  };

  return {
    isAdmin: data?.isAdmin ?? false,
    role: data?.role,
    username: data?.username,
    userId: data?.userId,
    isSuperAdmin: data?.role === "super_admin",
    isPropertyManager: data?.role === "property_manager",
    isLoading,
    logout,
  };
}
