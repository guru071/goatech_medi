import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ClinicsPage from "@/pages/clinics";
import ClinicDetailPage from "@/pages/clinic-detail";
import BookAppointmentPage from "@/pages/book-appointment";
import DoctorProfilePage from "@/pages/doctor-profile";
import AppointmentsPage from "@/pages/appointments";
import ChatPage from "@/pages/chat";
import SubscriptionsPage from "@/pages/subscriptions";
import ProfilePage from "@/pages/profile";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ClinicRegisterPage from "@/pages/clinic-register";
import Medical3DPage from "@/pages/medical-3d";
import ClinicDashboardPage from "@/pages/clinic/dashboard";
import ClinicDoctorsPage from "@/pages/clinic/doctors";
import ClinicAppointmentsPage from "@/pages/clinic/appointments";
import ClinicQueuePage from "@/pages/clinic/queue";
import ClinicRevenuePage from "@/pages/clinic/revenue";
import ClinicChatPage from "@/pages/clinic/chat";
import AdminDashboardPage from "@/pages/admin/index";
import AdminClinicsPage from "@/pages/admin/clinics";
import AdminUsersPage from "@/pages/admin/users";
import AdminRevenuePage from "@/pages/admin/revenue";
import AdminComplaintsPage from "@/pages/admin/complaints";
import AdminAnalyticsPage from "@/pages/admin/analytics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public Patient Pages */}
      <Route path="/" component={HomePage} />
      <Route path="/clinics" component={ClinicsPage} />
      <Route path="/clinics/:id/book" component={BookAppointmentPage} />
      <Route path="/clinics/:id" component={ClinicDetailPage} />
      <Route path="/doctors/:id" component={DoctorProfilePage} />
      <Route path="/appointments" component={AppointmentsPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/subscriptions" component={SubscriptionsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/medical-3d" component={Medical3DPage} />

      {/* Auth */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/clinic-register" component={ClinicRegisterPage} />

      {/* Clinic Owner */}
      <Route path="/clinic/dashboard" component={ClinicDashboardPage} />
      <Route path="/clinic/doctors" component={ClinicDoctorsPage} />
      <Route path="/clinic/appointments" component={ClinicAppointmentsPage} />
      <Route path="/clinic/queue" component={ClinicQueuePage} />
      <Route path="/clinic/revenue" component={ClinicRevenuePage} />
      <Route path="/clinic/chat" component={ClinicChatPage} />

      {/* Admin */}
      <Route path="/admin" component={AdminDashboardPage} />
      <Route path="/admin/clinics" component={AdminClinicsPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/revenue" component={AdminRevenuePage} />
      <Route path="/admin/complaints" component={AdminComplaintsPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
