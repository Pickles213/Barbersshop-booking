import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Shield, Loader2, Edit2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Role = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  created_by: string | null;
};

type Permission = {
  key: string;
  label: string;
  description: string | null;
  category: string;
};

export function RolesPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  
  // Create form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // 1. Fetch all permissions
  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ["permissions-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permissions").select("*").order("key");
      if (error) throw error;
      return data as Permission[];
    },
  });

  // 2. Fetch all roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("name");
      if (error) throw error;
      return data as Role[];
    },
  });

  // 3. Fetch all role-permission assignments
  const { data: rolePermissionAssignments = [] } = useQuery({
    queryKey: ["role-permission-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permission_assignments").select("*");
      if (error) throw error;
      return data;
    },
  });

  // 4. Fetch all user-role assignments
  const { data: userRoleAssignments = [] } = useQuery({
    queryKey: ["user-role-assignments-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_role_assignments").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [permissions]);

  // Create Role Mutation
  const createRole = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .insert({
          name: newName.trim(),
          description: newDescription.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Role created successfully");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      qc.invalidateQueries({ queryKey: ["roles-list"] });
    },
    onError: (err: any) => {
      if (err.code === "23505") {
        toast.error(`A role named "${newName}" already exists. Please choose a unique name.`);
      } else {
        toast.error(err.message || "Failed to create role");
      }
    },
  });

  // Edit Role & Permission Assignments Mutation
  const updateRole = useMutation({
    mutationFn: async () => {
      if (!editRole) return;

      // 1. Update name and description if not system role
      if (!editRole.is_system) {
        const { error } = await supabase
          .from("roles")
          .update({
            name: editName.trim(),
            description: editDescription.trim() || null,
          })
          .eq("id", editRole.id);
        if (error) throw error;
      }

      // 2. Compute diff of permission assignments
      const currentKeys = rolePermissionAssignments
        .filter((a: any) => a.role_id === editRole.id)
        .map((a: any) => a.permission_key);

      const toAdd = selectedPermissions.filter((k) => !currentKeys.includes(k));
      const toDelete = currentKeys.filter((k) => !selectedPermissions.includes(k));

      // Execute insertions
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("role_permission_assignments")
          .insert(toAdd.map((key) => ({ role_id: editRole.id, permission_key: key })));
        if (error) throw error;
      }

      // Execute deletions
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from("role_permission_assignments")
          .delete()
          .eq("role_id", editRole.id)
          .in("permission_key", toDelete);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      setEditRole(null);
      qc.invalidateQueries({ queryKey: ["roles-list"] });
      qc.invalidateQueries({ queryKey: ["role-permission-assignments"] });
    },
    onError: (err: any) => {
      if (err.code === "23505") {
        toast.error(`A role named "${editName}" already exists. Please choose a unique name.`);
      } else {
        toast.error(err.message || "Failed to update role");
      }
    },
  });

  // Delete Role Mutation
  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role deleted successfully");
      qc.invalidateQueries({ queryKey: ["roles-list"] });
      qc.invalidateQueries({ queryKey: ["role-permission-assignments"] });
      qc.invalidateQueries({ queryKey: ["user-role-assignments-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete role");
    },
  });

  const handleStartEdit = (role: Role) => {
    setEditRole(role);
    setEditName(role.name);
    setEditDescription(role.description ?? "");
    
    // Pre-populate currently assigned permissions
    const assigned = rolePermissionAssignments
      .filter((a: any) => a.role_id === role.id)
      .map((a: any) => a.permission_key);
    setSelectedPermissions(assigned);
  };

  const handleDeleteClick = (role: Role) => {
    if (role.is_system) {
      toast.error("System roles cannot be deleted.");
      return;
    }

    const assigneeCount = userRoleAssignments.filter((a: any) => a.role_id === role.id).length;
    if (assigneeCount > 0) {
      if (
        confirm(
          `WARNING: This role is currently assigned to ${assigneeCount} user(s). Deleting it will immediately revoke all of its permissions from them. Are you sure you want to proceed?`
        )
      ) {
        deleteRole.mutate(role.id);
      }
    } else {
      if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
        deleteRole.mutate(role.id);
      }
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Roles & Permissions"
        subtitle="Manage access control groups, permissions, and default role assignments"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create role
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const permCount = rolePermissionAssignments.filter((a: any) => a.role_id === role.id).length;
          const userCount = userRoleAssignments.filter((a: any) => a.role_id === role.id).length;

          return (
            <Card key={role.id} className="flex flex-col justify-between border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="font-mono text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-sky-500" />
                      {role.name}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {role.description || "No description provided."}
                    </CardDescription>
                  </div>
                  {role.is_system && (
                    <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider shrink-0">
                      System
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex gap-4 font-mono text-xs text-muted-foreground">
                  <div>
                    <span className="font-bold text-foreground">{permCount}</span> {permCount === 1 ? "permission" : "permissions"}
                  </div>
                  <div>
                    <span className="font-bold text-foreground">{userCount}</span> {userCount === 1 ? "user" : "users"}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-3 flex justify-end gap-2 bg-muted/20">
                <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => handleStartEdit(role)}>
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                  Edit/Permissions
                </Button>
                {!role.is_system && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="font-mono text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteClick(role)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Create Role Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md font-mono">
          <DialogHeader>
            <DialogTitle>Create new role</DialogTitle>
            <DialogDescription>Add a new dynamic role to assign users permissions in bulk.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name (Unique)</Label>
              <Input
                id="role-name"
                placeholder="e.g. Senior Barber"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-desc">Description</Label>
              <Input
                id="role-desc"
                placeholder="e.g. Can manage schedules and view reports"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createRole.mutate()} disabled={!newName.trim() || createRole.isPending}>
              {createRole.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role & Permissions Dialog */}
      <Dialog open={!!editRole} onOpenChange={(open) => !open && setEditRole(null)}>
        {editRole && (
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto font-mono">
            <DialogHeader>
              <DialogTitle>Edit Role: {editRole.name}</DialogTitle>
              <DialogDescription>
                {editRole.is_system 
                  ? "System roles cannot have their name or description edited, but default permissions can be managed."
                  : "Edit role details and toggle default permission assignments."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              {/* Role info (disabled if system role) */}
              <div className="space-y-3 border-b pb-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Role Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    disabled={editRole.is_system}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-desc">Description</Label>
                  <Input
                    id="edit-desc"
                    value={editDescription}
                    disabled={editRole.is_system}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Permissions grid with bracket-style toggles */}
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <Label className="text-sm font-bold">Permissions Default Bundle</Label>
                  <span className="text-[10px] text-zinc-500">
                    {selectedPermissions.length} / {permissions.length} selected
                  </span>
                </div>

                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category} className="space-y-2 border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg font-mono bg-muted/10">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-2">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((p) => {
                          const checked = selectedPermissions.includes(p.key);
                          return (
                            <button
                              key={p.key}
                              type="button"
                              onClick={() => {
                                if (checked) {
                                  setSelectedPermissions(selectedPermissions.filter((k) => k !== p.key));
                                } else {
                                  setSelectedPermissions([...selectedPermissions, p.key]);
                                }
                              }}
                              className="flex items-start gap-2.5 text-left text-xs font-mono cursor-pointer hover:bg-muted/60 p-2 rounded transition-colors w-full"
                            >
                              <span className="text-sky-600 dark:text-sky-400 font-bold shrink-0">
                                {checked ? "[✓]" : "[ ]"}
                              </span>
                              <div className="min-w-0 leading-tight">
                                <span className="font-semibold block uppercase text-xs">{p.key}</span>
                                <span className="text-[10px] text-muted-foreground line-clamp-1">{p.description}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setEditRole(null)}>Cancel</Button>
              <Button 
                onClick={() => updateRole.mutate()} 
                disabled={(!editRole.is_system && !editName.trim()) || updateRole.isPending}
              >
                {updateRole.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
