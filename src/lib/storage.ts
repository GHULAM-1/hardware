import { supabase } from "@/lib/supabaseClient";

/** Single public bucket for all uploaded images, organized by folder. */
export const MEDIA_BUCKET = "media";

export const IMAGE_FOLDER = {
  product: "product",
  customer: "customer",
  supplier: "supplier",
  user: "user",
} as const;
export type ImageFolder = (typeof IMAGE_FOLDER)[keyof typeof IMAGE_FOLDER];

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/** Client-side validation mirroring the bucket's server-enforced limits. */
export function validateImageFile(file: File): "type" | "size" | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_IMAGE_BYTES) return "size";
  return null;
}

/** Upload a file under `folder/<uuid>.<ext>` and return its public URL. */
export async function uploadImage(folder: ImageFolder, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Recover the storage path from a public URL (for deletion). */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

/** Best-effort delete of an uploaded image by its public URL. */
export async function removeImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const path = storagePathFromUrl(url);
  if (!path) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
