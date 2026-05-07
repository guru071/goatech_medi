import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Home, Calendar, MessageSquare, Star, Settings, LogOut,
  Menu, X, Stethoscope, LayoutDashboard, Users, BarChart3,
  AlertCircle, ClipboardList, UserCheck, Activity, CreditCard
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/" && location.startsWith(href));
  return (
    <Link href={href} onClick={onClick}>
      <span className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}>
        {children}
      </span>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const patientLinks = [
    { href: "/", icon: <Home size={16} />, label: "Home" },
    { href: "/clinics", icon: <Stethoscope size={16} />, label: "Find Clinics" },
    { href: "/appointments", icon: <Calendar size={16} />, label: "Appointments" },
    { href: "/chat", icon: <MessageSquare size={16} />, label: "Messages" },
    { href: "/subscriptions", icon: <CreditCard size={16} />, label: "Plans" },
    { href: "/medical-3d", icon: <Activity size={16} />, label: "3D Atlas" },
  ];

  const clinicLinks = [
    { href: "/clinic/dashboard", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
    { href: "/clinic/doctors", icon: <UserCheck size={16} />, label: "Doctors" },
    { href: "/clinic/appointments", icon: <Calendar size={16} />, label: "Appointments" },
    { href: "/clinic/queue", icon: <ClipboardList size={16} />, label: "Queue" },
    { href: "/clinic/revenue", icon: <BarChart3 size={16} />, label: "Revenue" },
    { href: "/clinic/chat", icon: <MessageSquare size={16} />, label: "Messages" },
  ];

  const adminLinks = [
    { href: "/admin", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
    { href: "/admin/clinics", icon: <Stethoscope size={16} />, label: "Clinics" },
    { href: "/admin/users", icon: <Users size={16} />, label: "Users" },
    { href: "/admin/revenue", icon: <BarChart3 size={16} />, label: "Revenue" },
    { href: "/admin/complaints", icon: <AlertCircle size={16} />, label: "Complaints" },
    { href: "/admin/analytics", icon: <Activity size={16} />, label: "Analytics" },
  ];

  const links = user?.role === "admin" ? adminLinks : user?.role === "clinic_owner" ? clinicLinks : patientLinks;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/">
              <span className="flex items-center gap-2 font-bold text-lg text-primary">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Stethoscope size={18} className="text-white" />
                </div>
                MediBook Pro
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {links.map(l => (
                <NavLink key={l.href} href={l.href}>
                  {l.icon}{l.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {user.name?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/profile"><span className="flex items-center gap-2 w-full cursor-pointer"><Settings size={14} />Profile</span></Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                    <LogOut size={14} className="mr-2" />Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
                <Link href="/register"><Button size="sm" className="hidden sm:flex">Get Started</Button></Link>
              </div>
            )}
            <button
              className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-card px-4 py-3 flex flex-col gap-1 animate-slide-up">
            {links.map(l => (
              <NavLink key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>
                {l.icon}{l.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card py-6 text-center text-sm text-muted-foreground">
        <p>MediBook Pro &copy; {new Date().getFullYear()} — India's trusted clinic booking platform</p>
      </footer>
    </div>
  );
}
