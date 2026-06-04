"use server";

import { createActionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ownProfileSchema,
  userSchema,
  userUpdateSchema,
  type OwnProfileValues,
  type UserValues,
  type UserUpdateValues,
} from "@/lib/schemas";
import { UserRole } from "@/lib/enums";
import type { Profile, ProfileWithEmail } from "@/types/models";

/** Throw unless the caller is an active super_admin. Used before privileged ops. */
async function requireSuperAdmin(accessToken: string): Promise<void> {
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not authenticated");
  const { data } = await client.from("profiles").select("role, is_active").eq("id", uid).maybeSingle();
  if (data?.role !== UserRole.SuperAdmin || !data.is_active) throw new Error("Not authorized");
}

export async function listUsers(accessToken: string): Promise<ProfileWithEmail[]> {
  await requireSuperAdmin(accessToken);
  const admin = createAdminClient();

  const { data: profiles, error } = await admin.from("profiles").select("*").order("created_at");
  if (error) throw new Error(error.message);

  // Emails live in auth.users, not profiles — resolve them via the admin API.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((list?.users ?? []).map((u) => [u.id, u.email ?? null]));

  return (profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? null }));
}

/** A user updating their OWN account (name + avatar). Can only touch their own row. */
export async function updateOwnProfile(
  accessToken: string,
  values: OwnProfileValues,
): Promise<Profile> {
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const input = ownProfileSchema.parse(values);
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .update({ full_name: input.full_name, image_url: input.image_url ?? null })
    .eq("id", uid)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return profile;
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

/** Update a staff member's name + avatar, and optionally set a new password. */
export async function updateUser(
  accessToken: string,
  id: string,
  values: UserUpdateValues,
): Promise<Profile> {
  await requireSuperAdmin(accessToken);
  const input = userUpdateSchema.parse(values);
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .update({ full_name: input.full_name, image_url: input.image_url ?? null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  if (input.password) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(id, { password: input.password });
    if (pwErr) throw new Error(pwErr.message);
  }

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
