import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Stethoscope, Eye, EyeOff, CheckCircle, Phone, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OtpInput from "@/components/OtpInput";
import { useRegisterUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Step = "form" | "otp" | "done";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<any>(null);

  const registerMutation = useRegisterUser();
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const sendOtp = async (identifier: string): Promise<string | null> => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(identifier.includes("@") ? { email: identifier, purpose: "verify" } : { phone: identifier, purpose: "verify" }),
    });
    const data = await res.json();
    return data.devOtp || null;
  };

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
      setPendingToken(result.token);
      setPendingUser(result.user);

      // Send OTP to phone (if provided) else email
      const identifier = form.phone || form.email;
      const dev = await sendOtp(identifier);
      setDevOtp(dev);
      setStep("otp");

      if (dev) {
        toast({ title: "OTP (Dev Mode)", description: `Your OTP is: ${dev}`, duration: 30000 });
      }
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.data?.error || "Please try again", variant: "destructive" });
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.replace(/\s/g, "").length < 6) {
      toast({ title: "Enter all 6 digits", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const identifier = form.phone || form.email;
      const body = identifier.includes("@") ? { email: identifier, otp } : { phone: identifier, otp };
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "OTP verification failed", variant: "destructive" });
        return;
      }
      setStep("done");
      if (pendingToken && pendingUser) {
        login(pendingToken, { ...pendingUser, isVerified: true });
      }
      setTimeout(() => navigate("/"), 1500);
    } catch {
      toast({ title: "Verification failed", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const identifier = form.phone || form.email;
    const dev = await sendOtp(identifier);
    setDevOtp(dev);
    setOtp("");
    setResending(false);
    toast({ title: "OTP resent!" });
    if (dev) toast({ title: "OTP (Dev)", description: `${dev}`, duration: 30000 });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Stethoscope size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl text-primary">MediBook Pro</span>
        </div>

        {/* Step: Form */}
        {step === "form" && (
          <div className="animate-slide-up">
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
                <Label htmlFor="phone">Phone <span className="text-muted-foreground text-xs">(for OTP)</span></Label>
                <div className="relative mt-1">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" className="pl-8" />
                </div>
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
                {registerMutation.isPending ? "Creating account..." : "Create Account & Verify"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login"><span className="text-primary font-medium hover:underline cursor-pointer">Sign in</span></Link>
            </p>
          </div>
        )}

        {/* Step: OTP */}
        {step === "otp" && (
          <div className="animate-slide-up">
            <button onClick={() => setStep("form")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft size={14} />Back
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Phone size={28} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Verify your account</h2>
              <p className="text-muted-foreground text-sm">
                Enter the 6-digit OTP sent to{" "}
                <span className="font-medium text-foreground">{form.phone || form.email}</span>
              </p>
              {devOtp && (
                <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg">
                  <span className="font-semibold">Dev OTP:</span>
                  <span className="font-mono text-base font-bold tracking-widest">{devOtp}</span>
                </div>
              )}
            </div>

            <OtpInput value={otp} onChange={setOtp} disabled={verifying} />

            <Button
              onClick={handleVerifyOtp}
              disabled={otp.replace(/\s/g, "").length < 6 || verifying}
              className="w-full h-11 mt-6"
            >
              {verifying ? "Verifying..." : "Verify OTP"}
            </Button>

            <div className="text-center mt-4">
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mx-auto"
              >
                <RefreshCw size={12} className={cn(resending && "animate-spin")} />
                {resending ? "Resending..." : "Resend OTP"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Account Verified!</h2>
            <p className="text-muted-foreground">Redirecting you to the app...</p>
          </div>
        )}
      </div>
    </div>
  );
}
