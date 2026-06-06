"use server";

import { createActionClient } from "@/lib/supabase/server";
import { runQuery } from "@/server/actions/_client";
import { staffSchema, type StaffValues } from "@/lib/schemas";
import { DUPLICATE_CNIC, DUPLICATE_PHONE } from "@/lib/errors";
import type { Staff } from "@/types/models";

/** List staff, newest-active first. `activeOnly` hides retired staff (e.g. attendance). */
export async function listStaff(
  accessToken: string,
  search = "",
  opts: { activeOnly?: boolean } = {},
): Promise<Staff[]> {
  return runQuery(accessToken, (c) => {
    let q = c.from("staff").select("*").order("name").limit(100);
    if (opts.activeOnly) q = q.eq("is_active", true);
    if (search.trim()) {
      const term = search.trim().replace(/[%,]/g, "");
      q = q.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
    }
    return q;
  });
}

export async function getStaff(accessToken: string, id: string): Promise<Staff> {
  return runQuery(accessToken, (c) => c.from("staff").select("*").eq("id", id).single());
}

/** Phone is the unique key, CNIC is unique when present — pre-check both for clear errors. */
async function assertUnique(
  accessToken: string,
  phone: string,
  cnic: string | null,
  exceptId?: string,
) {
  const phoneDupes = await runQuery<{ id: string }[]>(accessToken, (c) => {
    let q = c.from("staff").select("id").eq("phone", phone).limit(1);
    if (exceptId) q = q.neq("id", exceptId);
    return q;
  });
  if (phoneDupes.length) throw new Error(DUPLICATE_PHONE);

  if (cnic) {
    const cnicDupes = await runQuery<{ id: string }[]>(accessToken, (c) => {
      let q = c.from("staff").select("id").eq("cnic", cnic).limit(1);
      if (exceptId) q = q.neq("id", exceptId);
      return q;
    });
    if (cnicDupes.length) throw new Error(DUPLICATE_CNIC);
  }
}

export async function createStaff(accessToken: string, values: StaffValues): Promise<Staff> {
  const data = staffSchema.parse(values);
  await assertUnique(accessToken, data.phone, data.cnic);
  const client = createActionClient(accessToken);
  const { data: userData } = await client.auth.getUser();
  const { data: row, error } = await client
    .from("staff")
    .insert({ ...data, created_by: userData.user?.id ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function updateStaff(
  accessToken: string,
  id: string,
  values: StaffValues,
): Promise<Staff> {
  const data = staffSchema.parse(values);
  await assertUnique(accessToken, data.phone, data.cnic, id);
  return runQuery(accessToken, (c) =>
    c.from("staff").update(data).eq("id", id).select("*").single(),
  );
}

export async function setStaffActive(
  accessToken: string,
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await createActionClient(accessToken)
    .from("staff")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Hard delete — cascades attendance/advances, blocked by FK if salary was paid. */
export async function deleteStaff(accessToken: string, id: string): Promise<null> {
  return runQuery(accessToken, (c) =>
    c.from("staff").delete().eq("id", id).then((r) => ({ data: null, error: r.error })),
  );
}
