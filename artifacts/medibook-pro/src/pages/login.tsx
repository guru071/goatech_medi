import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginUser, useFirebaseAuth } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const loginMutation = useLoginUser();
  const firebaseMutation = useFirebaseAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await loginMutation.mutateAsync({ data: { email, password } }) as any;
      login(result.token, result.user);
      toast({ title: "Welcome back!", description: `Hello, ${result.user.name}` });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.data?.error || "Invalid credentials", variant: "destructive" });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const apiResult = await firebaseMutation.mutateAsync({ data: { idToken, provider: "google" } }) as any;
      login(apiResult.token, apiResult.user);
      toast({ title: "Welcome!", description: `Hello, ${apiResult.user.name}` });
      navigate("/");
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") return;
      toast({ title: "Google login failed", description: "Please try again", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-teal-400 blur-3xl" />
        </div>
        <div className="text-center relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
            <Stethoscope size={40} />
          </div>
          <h1 className="text-4xl font-bold mb-4">MediBook Pro</h1>
          <p className="text-xl text-white/80 max-w-xs">India's trusted clinic booking platform. Book appointments in under 2 minutes.</p>
          <div className="mt-12 grid grid-cols-2 gap-6 text-center">
            {[["500+", "Verified Clinics"], ["50K+", "Patients"], ["4.8", "Avg Rating"], ["< 2 min", "Booking"]].map(([v, l]) => (
              <div key={l} className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-sm text-white/70">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Stethoscope size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl text-primary">MediBook Pro</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-8">Sign in to your account</p>

          {/* Google Login */}
          <Button
            variant="outline" className="w-full mb-6 gap-3 h-11"
            onClick={handleGoogleLogin}
            disabled={firebaseMutation.isPending}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            {firebaseMutation.isPending ? "Signing in..." : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password" type={showPw ? "text" : "password"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register"><span className="text-primary font-medium hover:underline cursor-pointer">Sign up</span></Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Are you a clinic?{" "}
            <Link href="/clinic-register"><span className="text-primary font-medium hover:underline cursor-pointer">Register your clinic</span></Link>
          </p>
        </div>
      </div>
    </div>
  );
}
