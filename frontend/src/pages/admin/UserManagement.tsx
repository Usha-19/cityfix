import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { fmtDate } from "@/utils/format";
import type { User } from "@/types";

const roleColors: Record<string, string> = {
  citizen: "border-slate-200 bg-slate-50 text-slate-600",
  officer: "border-teal-200 bg-teal-50 text-teal-700",
  admin: "border-navy-200 bg-navy-50 text-navy-700",
};

export default function UserManagement() {
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get<User[]>("/api/admin/users")).data,
  });

  const roleMut = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) =>
      api.patch(`/api/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      toast.push("success", "Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const activeMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/api/admin/users/${id}/active?is_active=${active}`),
    onSuccess: () => {
      toast.push("success", "User updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">User management</h1>
        <p className="text-sm text-slate-500">
          Assign officer and admin roles. Public registration only creates citizens.
        </p>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={roleColors[u.role]}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <span className="text-green-600">Active</span>
                      ) : (
                        <span className="text-red-600">Disabled</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          className="h-8 w-28 py-0 text-xs"
                          value={u.role}
                          onChange={(e) => roleMut.mutate({ id: u.id, role: e.target.value })}
                        >
                          <option value="citizen">Citizen</option>
                          <option value="officer">Officer</option>
                          <option value="admin">Admin</option>
                        </Select>
                        <Button
                          size="sm"
                          variant={u.is_active ? "outline" : "secondary"}
                          onClick={() => activeMut.mutate({ id: u.id, active: !u.is_active })}
                        >
                          {u.is_active ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
