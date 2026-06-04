"use client";

import { useTranslation } from "react-i18next";

import { useUsers, useSetUserActive, useSetUserRole } from "@/hooks/use-users";
import { useDialogManager } from "@/components/dialogs/dialog-manager";
import { useAuth } from "@/providers/auth-provider";
import { DialogKey } from "@/lib/dialog-keys";
import { UserRole } from "@/lib/enums";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
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
import type { Profile } from "@/types/models";

export default function UsersPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { openDialog } = useDialogManager();
  const { data: users = [], isLoading } = useUsers();
  const setActive = useSetUserActive();
  const setRole = useSetUserRole();

  const columns: Column<Profile>[] = [
    { key: "name", header: t("fields.name"), cell: (u) => <span className="font-medium">{u.full_name ?? "—"}</span> },
    {
      key: "role",
      header: t("fields.role"),
      cell: (u) => (
        <Select
          value={u.role}
          onValueChange={(v) => setRole.mutate({ id: u.id, role: v as UserRole })}
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
          onCheckedChange={(checked) => setActive.mutate({ id: u.id, isActive: checked })}
        />
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
