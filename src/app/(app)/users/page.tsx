"use client";

import { useTranslation } from "react-i18next";

import { useUsers, useSetUserActive, useSetUserRole } from "@/hooks/use-users";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useConfirmDelete } from "@/hooks/use-confirm-delete";
import { useAuth } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { UserRole } from "@/lib/enums";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ImageThumb } from "@/components/common/image-thumb";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

import { Icon3D } from "@/components/ui/icon-3d";
import type { ProfileWithEmail } from "@/types/models";

export default function UsersPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { openDialog } = useDialogManager();
  const confirmDelete = useConfirmDelete();
  const { data: users = [], isLoading } = useUsers();
  const setActive = useSetUserActive();
  const setRole = useSetUserRole();

  // Both of these flip silently on a single click (a stray tap on the switch or
  // the role picker), so each is gated behind a confirm. Neither is a "delete",
  // so they use the non-destructive (non-red) confirm button.
  const confirmSetActive = (u: ProfileWithEmail, isActive: boolean) =>
    confirmDelete({
      title: isActive ? t("users.activateTitle") : t("users.deactivateTitle"),
      description: t(isActive ? "users.activateConfirm" : "users.deactivateConfirm", {
        name: u.full_name ?? u.email ?? "",
      }),
      confirmLabel: isActive ? t("users.activate") : t("users.deactivate"),
      destructive: !isActive,
      onConfirm: () => setActive.mutateAsync({ id: u.id, isActive }),
    });

  const confirmSetRole = (u: ProfileWithEmail, role: UserRole) => {
    if (role === u.role) return;
    confirmDelete({
      title: t("users.changeRoleTitle"),
      description: t("users.changeRoleConfirm", {
        name: u.full_name ?? u.email ?? "",
        role: t(`roles.${role}`),
      }),
      confirmLabel: t("users.changeRole"),
      destructive: false,
      onConfirm: () => setRole.mutateAsync({ id: u.id, role }),
    });
  };

  const columns: Column<ProfileWithEmail>[] = [
    {
      key: "img",
      header: "",
      headerClassName: "w-12",
      cell: (u) => <ImageThumb src={u.image_url} alt={u.full_name ?? ""} className="rounded-full" />,
    },
    { key: "name", header: t("fields.name"), cell: (u) => <span className="font-medium">{u.full_name ?? "—"}</span> },
    {
      key: "email",
      header: t("auth.email"),
      cell: (u) => (u.email ? <span dir="ltr">{u.email}</span> : "—"),
    },
    {
      key: "role",
      header: t("fields.role"),
      cell: (u) => (
        <Select
          value={u.role}
          onValueChange={(v) => confirmSetRole(u, v as UserRole)}
          disabled={u.id === profile?.id}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UserRole.Admin}>{t("roles.admin")}</SelectItem>
            <SelectItem value={UserRole.SuperAdmin}>{t("roles.super_admin")}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "status",
      header: t("fields.status"),
      cell: (u) =>
        u.is_active ? (
          <StatusBadge tone="success" label={t("users.active")} />
        ) : (
          <StatusBadge tone="muted" label={t("users.inactive")} />
        ),
    },
    {
      key: "active",
      header: "",
      headerClassName: "w-16",
      cell: (u) => (
        <Switch
          checked={u.is_active}
          disabled={u.id === profile?.id}
          onCheckedChange={(checked) => confirmSetActive(u, checked)}
        />
      ),
    },
    {
      key: "edit",
      header: "",
      headerClassName: "w-16 text-end",
      className: "text-end",
      cell: (u) => (
        <button
          type="button"
          className="ms-auto shrink-0 active:scale-95"
          title={t("users.editUser")}
          aria-label={t("users.editUser")}
          onClick={() => openDialog(DialogKey.UserEdit, { user: u })}
        >
          <Icon3D name="pencil" size={34} alt="" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("users.title")}
        actions={
          <Button onClick={() => openDialog(DialogKey.UserForm, null)}>
            <Plus className="me-1 h-4 w-4" />
            {t("users.newUser")}
          </Button>
        }
      />
      <DataTable columns={columns} rows={users} getRowId={(u) => u.id} loading={isLoading} />
    </div>
  );
}
