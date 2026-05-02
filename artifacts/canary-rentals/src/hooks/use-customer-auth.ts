import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface CustomerUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

async function fetchCustomerMe(): Promise<CustomerUser | null> {
  const res = await fetch("/api/customer/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Auth check failed");
  return res.json();
}

export function useCustomerAuth() {
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery<CustomerUser | null>({
    queryKey: ["customer", "me"],
    queryFn: fetchCustomerMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const setCustomer = (user: CustomerUser) => {
    queryClient.setQueryData(["customer", "me"], user);
  };

  const logout = async () => {
    await fetch("/api/customer/logout", { method: "POST", credentials: "include" });
    queryClient.setQueryData(["customer", "me"], null);
  };

  return {
    customer: customer ?? null,
    isLoggedIn: !!customer,
    isLoading,
    setCustomer,
    logout,
  };
}
