import { supabase } from "@/lib/supabaseClient";

/** Single public bucket for all uploaded images, organized by folder. */
export const MEDIA_BUCKET = "media";

export const IMAGE_FOLDER = {
  product: "product",
  customer: "customer",
  supplier: "supplier",
  user: "user",
  // Staff (employee) profile photos.
  staff: "staff",
  // Supplier bills (a photo OR a PDF) attached when an order is received.
  supplier_bill: "supplier_bill",
  // Proof image (receipt photo / written IOU) attached to a khata entry.
  khata_proof: "khata_proof",
} as const;
export type ImageFolder = (typeof IMAGE_FOLDER)[keyof typeof IMAGE_FOLDER];

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// Documents (supplier bills) also accept PDF, up to 10MB (mirrors the bucket).
export const ACCEPTED_DOCUMENT_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];
export const ACCEPT_DOCUMENT_ATTR = ACCEPTED_DOCUMENT_TYPES.join(",");
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB

/** Client-side validation mirroring the bucket's server-enforced limits. */
export function validateImageFile(file: File): "type" | "size" | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_IMAGE_BYTES) return "size";
  return null;
}

/** Like validateImageFile but also allows PDF, with a higher size cap. */
export function validateDocumentFile(file: File): "type" | "size" | null {
  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_DOCUMENT_BYTES) return "size";
  return null;
}

/** Whether a stored file URL points at a PDF (vs an image) — for icon/preview choice. */
export function isPdfUrl(url: string): boolean {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
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
