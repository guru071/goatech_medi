import { useState } from "react";
import {
  Search, CheckCircle, XCircle, Building2, Plus, Pencil, Trash2,
  Ban, ChevronDown, MapPin, Phone, Mail, Globe, MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import Layout from "@/components/Layout";
import {
  useAdminListClinics, useApproveClinic, useRejectClinic,
  useListCategories, getAdminListClinicsQueryKey,
} from "@workspace/api-client-react";
import { formatDate, getStatusColor, cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Chandigarh",
];

const PLAN_OPTIONS = ["basic","premium","enterprise"];

interface ClinicForm {
  name: string; ownerName: string; ownerEmail: string; ownerPhone: string;
  categoryId: string; email: string; phone: string; address: string;
  city: string; state: string; pincode: string;
  subscriptionPlan: string; workingHours: string;
  whatsappNumber: string; instagramUrl: string; websiteUrl: string;
  isEmergencyAvailable: boolean; latitude: string; longitude: string;
}

const EMPTY_FORM: ClinicForm = {
  name: "", ownerName: "", ownerEmail: "", ownerPhone: "",
  categoryId: "", email: "", phone: "", address: "",
  city: "", state: "", pincode: "",
  subscriptionPlan: "basic", workingHours: "Mon-Sat: 9 AM - 6 PM",
  whatsappNumber: "", instagramUrl: "", websiteUrl: "",
  isEmergencyAvailable: false, latitude: "", longitude: "",
};

export default function AdminClinicsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ id: number; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editClinic, setEditClinic] = useState<any | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState<ClinicForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic"|"contact"|"owner">("basic");

  const { data: clinics, isLoading } = useAdminListClinics({ params: { status: statusFilter || undefined } });
  const { data: categories } = useListCategories();
  const approveMutation = useApproveClinic();
  const rejectMutation = useRejectClinic();

  const clinicsList = (clinics as any[]) ?? [];
  const categoriesList = (categories as any[]) ?? [];

  const filtered = search
    ? clinicsList.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : clinicsList;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getAdminListClinicsQueryKey() });

  const setField = (k: keyof ClinicForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setActiveTab("basic");
    setAddOpen(true);
    setEditClinic(null);
  };

  const openEdit = (c: any) => {
    setForm({
      name: c.name || "", ownerName: c.ownerName || "", ownerEmail: c.email || "", ownerPhone: c.phone || "",
      categoryId: String(c.categoryId || ""), email: c.email || "", phone: c.phone || "",
      address: c.address || "", city: c.city || "", state: c.state || "", pincode: c.pincode || "",
      subscriptionPlan: c.subscriptionPlan || "basic", workingHours: c.workingHours || "",
      whatsappNumber: c.whatsappNumber || "", instagramUrl: c.instagramUrl || "",
      websiteUrl: c.websiteUrl || "", isEmergencyAvailable: !!c.isEmergencyAvailable,
      latitude: c.latitude || "", longitude: c.longitude || "",
    });
    setActiveTab("basic");
    setEditClinic(c);
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.ownerName || !form.categoryId || !form.email || !form.phone || !form.address || !form.city || !form.state || !form.pincode) {
      toast({ title: "Please fill all required fields", variant: "destructive" }); return;
    }
    if (!editClinic && !form.ownerEmail) {
      toast({ title: "Owner email is required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      if (editClinic) {
        // Edit existing clinic
        const res = await fetch(`/api/admin/clinics/${editClinic.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
          body: JSON.stringify({
            name: form.name, ownerName: form.ownerName,
            categoryId: parseInt(form.categoryId, 10),
            email: form.email, phone: form.phone,
            address: form.address, city: form.city, state: form.state, pincode: form.pincode,
            subscriptionPlan: form.subscriptionPlan, workingHours: form.workingHours,
            whatsappNumber: form.whatsappNumber || null, instagramUrl: form.instagramUrl || null,
            websiteUrl: form.websiteUrl || null, isEmergencyAvailable: form.isEmergencyAvailable,
            latitude: form.latitude || null, longitude: form.longitude || null,
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        toast({ title: "Clinic updated", description: form.name });
      } else {
        // Create new clinic
        const res = await fetch("/api/admin/clinics", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
          body: JSON.stringify({
            name: form.name, ownerName: form.ownerName, ownerEmail: form.ownerEmail, ownerPhone: form.ownerPhone,
            categoryId: parseInt(form.categoryId, 10),
            email: form.email, phone: form.phone,
            address: form.address, city: form.city, state: form.state, pincode: form.pincode,
            subscriptionPlan: form.subscriptionPlan, workingHours: form.workingHours,
            whatsappNumber: form.whatsappNumber || null, instagramUrl: form.instagramUrl || null,
            websiteUrl: form.websiteUrl || null, isEmergencyAvailable: form.isEmergencyAvailable,
            latitude: form.latitude || null, longitude: form.longitude || null,
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        const data = await res.json();
        toast({
          title: "Clinic added & approved!",
          description: `${form.name} is live. Owner login: ${form.ownerEmail} / clinic123`,
        });
      }
      invalidate();
      setAddOpen(false);
    } catch (err: any) {
      toast({ title: "Failed to save clinic", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleApprove = async (id: number) => {
    await approveMutation.mutateAsync({ id });
    invalidate();
    toast({ title: "Clinic approved ✓" });
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    await rejectMutation.mutateAsync({ id: rejectDialog.id, data: { reason: rejectReason } });
    invalidate();
    setRejectDialog(null);
    setRejectReason("");
    toast({ title: "Clinic rejected" });
  };

  const handleSuspend = async (id: number, name: string) => {
    const res = await fetch(`/api/admin/clinics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      body: JSON.stringify({ status: "suspended" }),
    });
    if (res.ok) { invalidate(); toast({ title: `${name} suspended` }); }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/clinics/${deleteDialog.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
    });
    if (res.ok) { invalidate(); toast({ title: "Clinic deleted" }); }
    setDeleteDialog(null);
    setDeleting(false);
  };

  const TAB_FIELDS = {
    basic: ["Clinic Name *","Category *","Speciality Plan","Working Hours","Emergency Available","Latitude","Longitude"],
    contact: ["Clinic Email *","Clinic Phone *","Address *","City *","State *","Pincode *","WhatsApp","Instagram URL","Website URL"],
    owner: ["Owner Name *","Owner Email *","Owner Phone"],
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Clinic Management</h1>
            <p className="text-muted-foreground text-sm">{filtered.length} clinic{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search name, city, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-56" />
            </div>
            <Select value={statusFilter || "__all__"} onValueChange={v => setStatusFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openAdd} className="gap-2">
              <Plus size={16} />Add Clinic
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["approved","pending","rejected","suspended"] as const).map(s => {
            const cnt = clinicsList.filter((c: any) => c.status === s).length;
            const colors: Record<string, string> = { approved: "text-green-600 bg-green-50 border-green-200", pending: "text-yellow-600 bg-yellow-50 border-yellow-200", rejected: "text-red-600 bg-red-50 border-red-200", suspended: "text-gray-500 bg-gray-50 border-gray-200" };
            return (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
                className={cn("border rounded-xl p-3 text-center transition-all hover:shadow-sm cursor-pointer", colors[s], statusFilter === s && "ring-2 ring-offset-1")}>
                <div className="text-2xl font-bold">{cnt}</div>
                <div className="text-xs capitalize">{s}</div>
              </button>
            );
          })}
        </div>

        {/* Clinics list */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No clinics found</h3>
            <p className="text-muted-foreground text-sm mb-4">Try changing filters or add a clinic</p>
            <Button onClick={openAdd} className="gap-2"><Plus size={14} />Add First Clinic</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c: any) => (
              <div key={c.id} className="bg-card border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm">
                  {c.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/clinics/${c.id}`}>
                      <h3 className="font-semibold hover:text-primary cursor-pointer">{c.name}</h3>
                    </Link>
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(c.status))}>{c.status}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{c.subscriptionPlan}</Badge>
                    {c.isEmergencyAvailable && <Badge variant="outline" className="text-xs text-red-600 border-red-200">24/7</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} />{c.city}, {c.state}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail size={11} />{c.email}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={11} />{c.phone}</span>
                  </div>
                  {c.rejectionReason && <p className="text-xs text-red-600 mt-0.5">Reason: {c.rejectionReason}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">Registered {formatDate(c.createdAt)} · Owner: {c.ownerName}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(c.id)} disabled={approveMutation.isPending} className="gap-1 text-xs bg-green-600 hover:bg-green-700 h-8">
                        <CheckCircle size={12} />Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectDialog({ id: c.id, name: c.name })} className="gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50 h-8">
                        <XCircle size={12} />Reject
                      </Button>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical size={14} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => openEdit(c)} className="gap-2 cursor-pointer">
                        <Pencil size={13} />Edit Clinic
                      </DropdownMenuItem>
                      <Link href={`/clinics/${c.id}`}>
                        <DropdownMenuItem className="gap-2 cursor-pointer">
                          <Building2 size={13} />View Public Page
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      {c.status === "approved" && (
                        <DropdownMenuItem onClick={() => handleSuspend(c.id, c.name)} className="gap-2 cursor-pointer text-orange-600">
                          <Ban size={13} />Suspend
                        </DropdownMenuItem>
                      )}
                      {c.status === "suspended" && (
                        <DropdownMenuItem onClick={() => handleApprove(c.id)} className="gap-2 cursor-pointer text-green-600">
                          <CheckCircle size={13} />Re-activate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteDialog({ id: c.id, name: c.name })} className="gap-2 cursor-pointer text-red-600">
                        <Trash2 size={13} />Delete Clinic
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Add / Edit Clinic Dialog ─── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editClinic ? <><Pencil size={16} />Edit Clinic — {editClinic.name}</> : <><Plus size={16} />Add New Clinic</>}
            </DialogTitle>
            {!editClinic && <p className="text-sm text-muted-foreground">Clinic will be added with <strong>Approved</strong> status. Owner login credentials will be auto-created (default password: <code className="bg-muted px-1 rounded">clinic123</code>).</p>}
          </DialogHeader>

          {/* Tab Nav */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg mt-2">
            {(["basic","contact","owner"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={cn("flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all capitalize",
                  activeTab === t ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {t === "basic" ? "Clinic Info" : t === "contact" ? "Contact & Location" : "Owner Details"}
              </button>
            ))}
          </div>

          <div className="space-y-4 mt-2">
            {/* Tab: Basic */}
            {activeTab === "basic" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Clinic Name *</Label>
                    <Input value={form.name} onChange={setField("name")} placeholder="e.g. SmilePro Dental Clinic" className="mt-1" />
                  </div>
                  <div>
                    <Label>Category / Speciality *</Label>
                    <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categoriesList.map((cat: any) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.icon} {cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subscription Plan</Label>
                    <Select value={form.subscriptionPlan} onValueChange={v => setForm(f => ({ ...f, subscriptionPlan: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map(p => <SelectItem key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Working Hours</Label>
                    <Input value={form.workingHours} onChange={setField("workingHours")} placeholder="e.g. Mon-Sat: 9 AM - 8 PM" className="mt-1" />
                  </div>
                  <div className="col-span-2 flex items-center justify-between bg-muted/50 border rounded-xl p-3">
                    <div>
                      <p className="text-sm font-medium">24/7 Emergency Available</p>
                      <p className="text-xs text-muted-foreground">Shows red "24/7 Emergency" badge on listing</p>
                    </div>
                    <Switch checked={form.isEmergencyAvailable} onCheckedChange={v => setForm(f => ({ ...f, isEmergencyAvailable: v }))} />
                  </div>
                  <div>
                    <Label>Latitude <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input value={form.latitude} onChange={setField("latitude")} placeholder="19.0760" className="mt-1" />
                  </div>
                  <div>
                    <Label>Longitude <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input value={form.longitude} onChange={setField("longitude")} placeholder="72.8777" className="mt-1" />
                  </div>
                </div>
              </>
            )}

            {/* Tab: Contact */}
            {activeTab === "contact" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Clinic Email *</Label>
                  <Input type="email" value={form.email} onChange={setField("email")} placeholder="clinic@example.com" className="mt-1" />
                </div>
                <div>
                  <Label>Clinic Phone *</Label>
                  <Input value={form.phone} onChange={setField("phone")} placeholder="+91 98765 43210" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Address *</Label>
                  <Input value={form.address} onChange={setField("address")} placeholder="Street, Building, Area" className="mt-1" />
                </div>
                <div>
                  <Label>City *</Label>
                  <Input value={form.city} onChange={setField("city")} placeholder="Mumbai" className="mt-1" />
                </div>
                <div>
                  <Label>State *</Label>
                  <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      {INDIA_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pincode *</Label>
                  <Input value={form.pincode} onChange={setField("pincode")} placeholder="400001" className="mt-1" maxLength={6} />
                </div>
                <div className="col-span-2 border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Social / Digital</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>WhatsApp Number</Label>
                      <Input value={form.whatsappNumber} onChange={setField("whatsappNumber")} placeholder="+91 98765 43210" className="mt-1" />
                    </div>
                    <div>
                      <Label>Instagram URL</Label>
                      <Input value={form.instagramUrl} onChange={setField("instagramUrl")} placeholder="https://instagram.com/..." className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <Label>Website URL</Label>
                      <Input value={form.websiteUrl} onChange={setField("websiteUrl")} placeholder="https://clinicwebsite.com" className="mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Owner */}
            {activeTab === "owner" && (
              <div className="space-y-3">
                {!editClinic && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3 text-sm">
                    <strong>Auto account creation:</strong> If no user exists with this email, a new <em>Clinic Owner</em> account is automatically created with password <code className="bg-blue-100 px-1 rounded">clinic123</code>. Share these credentials with the owner.
                  </div>
                )}
                <div>
                  <Label>Owner Full Name *</Label>
                  <Input value={form.ownerName} onChange={setField("ownerName")} placeholder="Dr. Rajesh Kumar" className="mt-1" />
                </div>
                {!editClinic && (
                  <div>
                    <Label>Owner Email * <span className="text-muted-foreground text-xs">(used for login)</span></Label>
                    <Input type="email" value={form.ownerEmail} onChange={setField("ownerEmail")} placeholder="owner@clinic.com" className="mt-1" />
                  </div>
                )}
                <div>
                  <Label>Owner Phone</Label>
                  <Input value={form.ownerPhone} onChange={setField("ownerPhone")} placeholder="+91 98765 43210" className="mt-1" />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t mt-4 gap-2 flex-wrap">
            <div className="flex gap-1">
              {(["basic","contact","owner"] as const).map(t => (
                <div key={t} className={cn("w-2 h-2 rounded-full transition-all", activeTab === t ? "bg-primary" : "bg-muted-foreground/30")} />
              ))}
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              {activeTab !== "owner" ? (
                <Button onClick={() => setActiveTab(activeTab === "basic" ? "contact" : "owner")}>
                  Next →
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? "Saving..." : editClinic ? <><Pencil size={14} />Update Clinic</> : <><Plus size={14} />Add Clinic</>}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Reject Dialog ─── */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><XCircle size={16} className="text-red-500" />Reject: {rejectDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this clinic is being rejected..." className="mt-1" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectDialog(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleReject} disabled={!rejectReason || rejectMutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700">
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ─── */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Trash2 size={16} className="text-red-500" />Delete Clinic?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete <strong>{deleteDialog?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700">
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
