import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import {
  apiFetchMe,
  apiLogin,
  apiInitiateRegister,
  apiVerifyOtp,
  apiLogout,
} from "../lib/authApi";
import type { AuthUser } from "../types/user";

export function useAuth() {
  const queryClient = useQueryClient();
  const { guestMode, setGuestMode } = useAuthStore();

  const { data: user = null, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: apiFetchMe,
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: apiLogin,
    onSuccess: (user) => queryClient.setQueryData<AuthUser>(["me"], user),
  });

  const registerMutation = useMutation({
    mutationFn: apiInitiateRegister,
  });

  const verifyOtpMutation = useMutation({
    mutationFn: apiVerifyOtp,
    onSuccess: (user) => queryClient.setQueryData<AuthUser>(["me"], user),
  });

  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSuccess: () => queryClient.setQueryData(["me"], null),
  });

  return {
    user,
    loading: isLoading,
    guestMode,
    setGuestMode,
    loginMutation,
    registerMutation,
    verifyOtpMutation,
    logout: () => logoutMutation.mutate(),
  };
}
