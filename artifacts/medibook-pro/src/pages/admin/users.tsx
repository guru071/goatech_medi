import { useState } from "react";
import { Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Layout from "@/components/Layout";
import { useAdminListUsers } from "@workspace/api-client-react";
import { formatDate, cn } from "@/lib/utils";

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  clinic_owner: "bg-amber-100 text-amber-800 border-amber-200",
  patient: "bg-teal-100 text-teal-800 border-teal-200",
};

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAdminListUsers();
  const [search, setSearch] = useState("");

  const usersList = (users as any[]) ?? [];
  const filtered = search
    ? usersList.filter((u: any) => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
    : usersList;

  const roleCounts = usersList.reduce((acc: Record<string, number>, u: any) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground text-sm">
              {usersList.length} total · {roleCounts.patient || 0} patients · {roleCounts.clinic_owner || 0} clinic owners
            </p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-56" />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">No users found</h3>
          </div>
        ) : (
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="divide-y">
              {filtered.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {u.name?.slice(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{u.name}</p>
                      {u.isVerified && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Verified</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {u.phone && <p className="text-xs text-muted-foreground hidden sm:block">{u.phone}</p>}
                    <Badge variant="outline" className={cn("text-[10px]", roleColors[u.role] || "")}>
                      {u.role?.replace("_", " ")}
                    </Badge>
                    <p className="text-xs text-muted-foreground hidden md:block">{formatDate(u.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
