import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Stethoscope, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const registerMutation = useRegisterUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    try {
      const result = await registerMutation.mutateAsync({
        data: { name: form.name, email: form.email, password: form.password, phone: form.phone || undefined, role: "patient" }
      }) as any;
      login(result.token, result.user);
      toast({ title: "Account created!", description: `Welcome, ${result.user.name}` });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.data?.error || "Please try again", variant: "destructive" });
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Stethoscope size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl text-primary">MediBook Pro</span>
        </div>

        <h2 className="text-2xl font-bold mb-1 text-center">Create account</h2>
        <p className="text-muted-foreground text-sm mb-8 text-center">Join thousands of patients booking smarter</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={form.name} onChange={set("name")} placeholder="Your full name" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input id="password" type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Min. 8 characters" required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Repeat password" className="mt-1" required />
          </div>
          <Button type="submit" className="w-full h-11" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login"><span className="text-primary font-medium hover:underline cursor-pointer">Sign in</span></Link>
        </p>
      </div>
    </div>
  );
}
