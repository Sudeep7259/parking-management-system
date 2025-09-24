import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, UserPlus, Edit, Trash2, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface AppUser {
  id: number;
  authUserId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "customer" | "client" | "admin";
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const ROLES = ["customer", "client", "admin"] as const;
const STATUSES = ["active", "inactive"] as const;

export function UserManagement() {
  const { data: session, isPending } = useSession();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "customer" | "client" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [pageSize] = useState(10);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    authUserId: "",
    name: "",
    email: "",
    phone: "",
    role: "customer" as "customer" | "client" | "admin",
    status: "active" as "active" | "inactive",
  });
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async (page = currentPage, searchTerm = search, role = roleFilter, status = statusFilter) => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (searchTerm) params.append("search", searchTerm);
      if (role !== "all") params.append("role", role);
      if (status !== "all") params.append("status", status);

      const token = localStorage.getItem("bearer_token");
      if (!token) throw new Error("No authentication token");

      const res = await fetch(`/api/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) throw new Error("Authentication required. Please log in.");
        if (res.status === 403) throw new Error("Admin access required.");
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setUsers(data.data || []);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (err: any) {
      console.error("Fetch users error:", err);
      setError(err.message);
      toast.error(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchUsers(1, "", "all", "all");
    }
  }, [session]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(1, search, roleFilter, statusFilter);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, roleFilter, statusFilter]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const createUser = async () => {
    if (!session?.user?.id) {
      toast.error("Please log in to create users.");
      return;
    }
    try {
      setSubmitting(true);
      const token = localStorage.getItem("bearer_token");
      if (!token) throw new Error("Authentication required");

      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) throw new Error("Authentication required. Please log in.");
        if (res.status === 403) throw new Error("Admin access required.");
        throw new Error(data.error || `Failed to create user (HTTP ${res.status})`);
      }

      toast.success("User created successfully");
      setCreateDialogOpen(false);
      setFormData({ authUserId: "", name: "", email: "", phone: "", role: "customer", status: "active" });
      fetchUsers(1, "", "all", "all");
    } catch (err: any) {
      console.error("Create user error:", err);
      toast.error(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const updateUser = async () => {
    if (!editingUser || !session?.user?.id) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem("bearer_token");
      if (!token) throw new Error("Authentication required");

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) throw new Error("Authentication required. Please log in.");
        if (res.status === 403) throw new Error("Admin access required.");
        throw new Error(data.error || `Failed to update user (HTTP ${res.status})`);
      }

      toast.success("User updated successfully");
      setEditDialogOpen(false);
      setFormData({ authUserId: "", name: "", email: "", phone: "", role: "customer", status: "active" });
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error("Update user error:", err);
      toast.error(err.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId || !session?.user?.id) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem("bearer_token");
      if (!token) throw new Error("Authentication required");

      const res = await fetch(`/api/users/${deletingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) throw new Error("Authentication required. Please log in.");
        if (res.status === 403) throw new Error("Admin access required.");
        throw new Error(data.error || `Failed to delete user (HTTP ${res.status})`);
      }

      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchUsers();
    } catch (err: any) {
      console.error("Delete user error:", err);
      toast.error(err.message || "Failed to delete user");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      authUserId: user.authUserId,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      status: user.status,
    });
    setEditDialogOpen(true);
  };

  const openDelete = (id: number) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isPending) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading user session...</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">Please sign in to access user management.</p>
            <Button asChild>
              <Link href="/sign-in?redirect=/admin/users">
                Sign In
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage platform users and their roles</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} disabled={submitting}>
          <UserPlus className="mr-2 h-4 w-4" /> Create User
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="text-destructive text-sm mb-2">{error}</div>
            <Button variant="outline" onClick={() => fetchUsers(1, "", "all", "all")}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle>Users ({pagination?.total || 0})</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={handleSearch}
                className="pl-10 w-64 h-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Filter Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <Filter className="mr-1 h-3 w-3" /> Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
              <span className="text-muted-foreground">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users found matching your filters.
              <Button variant="link" onClick={resetFilters} className="mt-2">
                Clear filters to see all users
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                      <TableHead className="text-right w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium w-12">
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            #{user.id}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="break-all text-sm">{user.email}</div>
                        </TableCell>
                        <TableCell>{user.phone || <span className="text-muted-foreground">No phone</span>}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === "admin" ? "destructive" : user.role === "client" ? "default" : "secondary"}
                            className="px-2 py-1 text-xs"
                          >
                            {user.role.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.status === "active" ? "default" : "secondary"}
                            className="px-2 py-1 text-xs"
                          >
                            {user.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(user)}
                              title="Edit user"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDelete(user.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination && (
                <div className="flex items-center justify-between space-x-2 mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                    {pagination.total} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(p + 1, pagination.totalPages))}
                      disabled={currentPage === pagination.totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle><UserPlus className="inline mr-2" />Create New User</DialogTitle>
            <DialogDescription>Create a new platform user account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-authUserId">Auth User ID <span className="text-destructive">*</span></Label>
              <Input
                id="create-authUserId"
                value={formData.authUserId}
                onChange={(e) => setFormData({ ...formData, authUserId: e.target.value })}
                placeholder="From auth system (e.g., auth_user_006)"
                required
              />
              <p className="text-xs text-muted-foreground">This must match an existing auth user ID.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone (Optional)</Label>
                <Input
                  id="create-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+919876543210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role <span className="text-destructive">*</span></Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as any })}>
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role} className={`capitalize`}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-status">Status <span className="text-destructive">*</span></Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                  <SelectTrigger id="create-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={createUser} disabled={submitting || !formData.authUserId || !formData.name || !formData.email || !formData.role}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle><Edit className="inline mr-2" />Edit User</DialogTitle>
            <DialogDescription>Update {editingUser?.name}'s details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              value={editingUser?.id || ""}
              className="bg-muted"
              readOnly
              placeholder="User ID"
            />
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+919876543210"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as any })}>
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role} className="capitalize">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={updateUser} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={() => setDeleteDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone and will permanently delete user #{deletingId} and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}