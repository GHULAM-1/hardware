"use server";

import { createActionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userSchema, type UserValues } from "@/lib/schemas";
import { UserRole } from "@/lib/enums";
import type { Profile } from "@/types/models";

/** Throw unless the caller is an active super_admin. Used before privileged ops. */
async function requireSuperAdmin(accessToken: string): Promise<void> {
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not authenticated");
  const { data } = await client.from("profiles").select("role, is_active").eq("id", uid).maybeSingle();
  if (data?.role !== UserRole.SuperAdmin || !data.is_active) throw new Error("Not authorized");
}

export async function listUsers(accessToken: string): Promise<Profile[]> {
  const client = createActionClient(accessToken);
  const { data, error } = await client.from("profiles").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createUser(accessToken: string, values: UserValues): Promise<Profile> {
  await requireSuperAdmin(accessToken);
  const input = userSchema.parse(values);
  const admin = createAdminClient();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (createErr) throw new Error(createErr.message);

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .upsert(
      { id: created.user.id, full_name: input.full_name, role: input.role, is_active: true },
      { onConflict: "id" },
    )
    .select("*")
    .single();
  if (profileErr) throw new Error(profileErr.message);
  return profile;
}

export async function setUserActive(
  accessToken: string,
  id: string,
  isActive: boolean,
): Promise<Profile> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setUserRole(
  accessToken: string,
  id: string,
  role: UserRole,
): Promise<Profile> {
  const client = createActionClient(accessToken);
  const { data, error } = await client
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
