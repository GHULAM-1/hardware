"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { UserRole } from "@/lib/enums";
import type { UserValues } from "@/lib/schemas";
import { createUser, listUsers, setUserActive, setUserRole } from "@/server/actions/users";

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: async () => listUsers(await getAccessToken()),
  });
}

function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.users() });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (values: UserValues) => createUser(await getAccessToken(), values),
    onSuccess: invalidate,
  });
}

export function useSetUserActive() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (args: { id: string; isActive: boolean }) =>
      setUserActive(await getAccessToken(), args.id, args.isActive),
    onSuccess: invalidate,
  });
}

export function useSetUserRole() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (args: { id: string; role: UserRole }) =>
      setUserRole(await getAccessToken(), args.id, args.role),
    onSuccess: invalidate,
  });
}
