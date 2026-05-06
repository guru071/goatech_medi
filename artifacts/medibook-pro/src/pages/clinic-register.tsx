import { useState } from "react";
import { useLocation } from "wouter";
import { Stethoscope, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRegisterClinic, useListCategories } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Step = "basics" | "location" | "details" | "plan";
const STEPS: Step[] = ["basics", "location", "details", "plan"];
const STEP_LABELS = ["Basic Info", "Location", "Details", "Plan"];

const PLANS = [
  { id: "basic", name: "Basic", price: "₹499/mo", features: ["Up to 5 Doctors", "100 Appointments/Month"] },
  { id: "premium", name: "Premium", price: "₹1499/mo", features: ["Unlimited Doctors", "Analytics", "WhatsApp Integration", "Featured Listing"] },
  { id: "enterprise", name: "Enterprise", price: "Custom", features: ["Everything in Premium", "Dedicated Support", "API Access"] },
];

export default function ClinicRegisterPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("basics");
  const [form, setForm] = useState({
    name: "", ownerName: user?.name || "", email: user?.email || "", phone: "",
    address: "", city: "", state: "", pincode: "",
    latitude: "", longitude: "",
    categoryId: "", workingHours: "Mon-Sat: 9:00 AM - 7:00 PM",
    whatsappNumber: "", instagramUrl: "", websiteUrl: "",
    isEmergencyAvailable: false, services: "",
    subscriptionPlan: "basic",
  });

  const { data: categories } = useListCategories();
  const registerMutation = useRegisterClinic();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const stepIdx = STEPS.indexOf(step);

  const handleSubmit = async () => {
    if (!user) { navigate("/login"); return; }
    try {
      await registerMutation.mutateAsync({
        data: {
          name: form.name, ownerName: form.ownerName, ownerId: user.id as any,
          categoryId: parseInt(form.categoryId),
          email: form.email, phone: form.phone,
          address: form.address, city: form.city, state: form.state, pincode: form.pincode,
          latitude: form.latitude ? parseFloat(form.latitude) : undefined,
          longitude: form.longitude ? parseFloat(form.longitude) : undefined,
          workingHours: form.workingHours,
          whatsappNumber: form.whatsappNumber || undefined,
          instagramUrl: form.instagramUrl || undefined,
          websiteUrl: form.websiteUrl || undefined,
          isEmergencyAvailable: form.isEmergencyAvailable,
          services: form.services ? form.services.split(",").map(s => s.trim()).filter(Boolean) : [],
          subscriptionPlan: form.subscriptionPlan as any,
        }
      });
      toast({ title: "Clinic registered!", description: "Your clinic is under review. We'll notify you within 24 hours." });
      navigate("/clinic/dashboard");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.data?.error || "Please try again", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <Stethoscope size={16} className="text-white" />
        </div>
        <span className="font-bold text-primary">MediBook Pro</span>
        <span className="text-muted-foreground">/ Register Clinic</span>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Stepper */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all whitespace-nowrap",
                i < stepIdx ? "bg-primary/10 text-primary" :
                i === stepIdx ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                {i < stepIdx ? <Check size={12} /> : <span className="w-4 text-center">{i + 1}</span>}
                <span className="hidden sm:block">{STEP_LABELS[i]}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("h-0.5 flex-1 mx-1", i < stepIdx ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>

        {/* Step: Basics */}
        {step === "basics" && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-xl font-bold">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Clinic Name *</Label>
                <Input value={form.name} onChange={set("name")} placeholder="e.g. Smile Dental Clinic" className="mt-1" required />
              </div>
              <div>
                <Label>Owner Name *</Label>
                <Input value={form.ownerName} onChange={set("ownerName")} placeholder="Your full name" className="mt-1" />
              </div>
              <div>
                <Label>Specialty *</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select specialty" /></SelectTrigger>
                  <SelectContent>
                    {(categories as any[])?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={set("email")} placeholder="clinic@example.com" className="mt-1" />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" className="mt-1" />
              </div>
              <div>
                <Label>Working Hours</Label>
                <Input value={form.workingHours} onChange={set("workingHours")} placeholder="Mon-Sat: 9 AM - 7 PM" className="mt-1" />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Switch checked={form.isEmergencyAvailable} onCheckedChange={v => setForm(f => ({ ...f, isEmergencyAvailable: v }))} />
                <Label className="cursor-pointer">24/7 Emergency Available</Label>
              </div>
            </div>
            <Button onClick={() => form.name && form.categoryId && setStep("location")} disabled={!form.name || !form.categoryId} className="w-full gap-2">
              Continue <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {/* Step: Location */}
        {step === "location" && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-xl font-bold">Location Details</h2>
            <div>
              <Label>Full Address *</Label>
              <Textarea value={form.address} onChange={set("address")} placeholder="Street, Building, Area" className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>City *</Label>
                <Input value={form.city} onChange={set("city")} placeholder="Mumbai" className="mt-1" />
              </div>
              <div>
                <Label>State *</Label>
                <Input value={form.state} onChange={set("state")} placeholder="Maharashtra" className="mt-1" />
              </div>
              <div>
                <Label>Pincode *</Label>
                <Input value={form.pincode} onChange={set("pincode")} placeholder="400001" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitude (optional)</Label>
                <Input value={form.latitude} onChange={set("latitude")} placeholder="19.0760" className="mt-1" type="number" step="any" />
              </div>
              <div>
                <Label>Longitude (optional)</Label>
                <Input value={form.longitude} onChange={set("longitude")} placeholder="72.8777" className="mt-1" type="number" step="any" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("basics")} className="gap-2"><ArrowLeft size={16} />Back</Button>
              <Button onClick={() => form.city && form.pincode && setStep("details")} disabled={!form.city || !form.pincode} className="flex-1 gap-2">
                Continue <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === "details" && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-xl font-bold">Social & Services</h2>
            <div>
              <Label>WhatsApp Number</Label>
              <Input value={form.whatsappNumber} onChange={set("whatsappNumber")} placeholder="9876543210" className="mt-1" type="tel" />
            </div>
            <div>
              <Label>Instagram URL</Label>
              <Input value={form.instagramUrl} onChange={set("instagramUrl")} placeholder="https://instagram.com/yourclinic" className="mt-1" />
            </div>
            <div>
              <Label>Website URL</Label>
              <Input value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://yourclinic.com" className="mt-1" />
            </div>
            <div>
              <Label>Services Offered</Label>
              <Textarea value={form.services} onChange={set("services")} placeholder="Root Canal, Teeth Whitening, Orthodontics (comma-separated)" className="mt-1" rows={2} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("location")} className="gap-2"><ArrowLeft size={16} />Back</Button>
              <Button onClick={() => setStep("plan")} className="flex-1 gap-2">Continue <ArrowRight size={16} /></Button>
            </div>
          </div>
        )}

        {/* Step: Plan */}
        {step === "plan" && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-xl font-bold">Select a Plan</h2>
            <div className="space-y-3">
              {PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setForm(f => ({ ...f, subscriptionPlan: plan.id }))}
                  className={cn(
                    "w-full text-left border rounded-xl p-4 transition-all",
                    form.subscriptionPlan === plan.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{plan.name}</span>
                    <span className="font-bold text-primary">{plan.price}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plan.features.map(f => (
                      <span key={f} className="text-xs bg-muted px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("details")} className="gap-2"><ArrowLeft size={16} />Back</Button>
              <Button onClick={handleSubmit} disabled={registerMutation.isPending} className="flex-1">
                {registerMutation.isPending ? "Registering..." : "Register Clinic"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
