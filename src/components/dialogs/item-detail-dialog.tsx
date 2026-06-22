"use client";

import type { DialogComponentProps } from "@/components/dialogs/dialog-manager";
import { useLanguage } from "@/providers/i18n-provider";
import { displayName } from "@/lib/display";
import { ImageThumb } from "@/components/common/image-thumb";
import { ItemDetailBody } from "@/components/warehouse/item-detail-body";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Item } from "@/types/models";

export type ItemDetailPayload = { item: Item };

/**
 * Mobile item detail. On desktop the warehouse page shows the same content
 * (`ItemDetailBody`) inline in a master-detail side panel instead of this dialog.
 */
export function ItemDetailDialog({ payload, onClose }: DialogComponentProps<ItemDetailPayload>) {
  const { language } = useLanguage();
  const { item } = payload;
  const images = item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-x-hidden overflow-y-auto sm:max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex min-w-0 items-center gap-3">
            <ImageThumb src={images[0]} alt={item.name_en} />
            <span className="min-w-0 truncate pe-6">{displayName(item, language)}</span>
          </DialogTitle>
        </DialogHeader>
        <ItemDetailBody item={item} />
      </DialogContent>
    </Dialog>
  );
}
