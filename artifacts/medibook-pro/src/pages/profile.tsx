import { useState } from "react";
import { User, Mail, Phone, Shield, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateUser, useListAppointments, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate, getStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const updateMutation = useUpdateUser();

  const { data: appointments } = useListAppointments(
    { params: { userId: user?.id as any, limit: 5 } },
    { query: { enabled: !!user } }
  );
  const apptList = (appointments as any[]) ?? [];

  const handleSave = async () => {
    if (!user) return;
    try {
      const updated = await updateMutation.mutateAsync({ id: user.id as any, data: form }) as any;
      setUser({ ...user, ...updated });
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      toast({ title: "Profile updated" });
      setEditing(false);
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  if (!user) return (
    <Layout>
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">Please sign in</h2>
        <Link href="/login"><Button className="mt-4">Sign In</Button></Link>
      </div>
    </Layout>
  );

  const roleBadgeColor = user.role === "admin" ? "bg-purple-100 text-purple-800 border-purple-200" : user.role === "clinic_owner" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-teal-100 text-teal-800 border-teal-200";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>

        {/* Profile Card */}
        <div className="bg-card border rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {user.name?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{user.name}</h2>
                <Badge variant="outline" className={cn("text-xs capitalize", roleBadgeColor)}>
                  {user.role?.replace("_", " ")}
                </Badge>
                {user.isVerified && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <Shield size={10} className="mr-1" />Verified
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? "Cancel" : "Edit"}
            </Button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" type="tel" />
              </div>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail size={14} className="text-primary" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone size={14} className="text-primary" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <User size={14} className="text-primary" />
                <span className="capitalize">{user.role?.replace("_", " ")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Appointments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent Bookings</h3>
            <Link href="/appointments"><span className="text-sm text-primary hover:underline cursor-pointer">View all</span></Link>
          </div>
          {apptList.length === 0 ? (
            <p className="text-muted-foreground text-sm">No appointments yet</p>
          ) : (
            <div className="space-y-2">
              {apptList.map((a: any) => (
                <div key={a.id} className="bg-card border rounded-lg p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{a.clinicName}</p>
                    <p className="text-xs text-muted-foreground">{a.doctorName} · {formatDate(a.appointmentDate)}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", getStatusColor(a.status))}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
