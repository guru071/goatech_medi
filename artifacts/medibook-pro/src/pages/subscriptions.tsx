import { Check, Zap, Crown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useListSubscriptionPlans, useCreatePaymentOrder, useVerifyPayment, useCreateSubscription } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const planIcons: Record<string, React.ReactNode> = {
  basic: <Zap size={20} className="text-gray-500" />,
  premium: <Crown size={20} className="text-amber-500" />,
  enterprise: <Building2 size={20} className="text-purple-500" />,
};

const planGradients: Record<string, string> = {
  basic: "from-gray-50 to-gray-100/50",
  premium: "from-amber-50 to-amber-100/50 border-amber-200",
  enterprise: "from-purple-50 to-purple-100/50 border-purple-200",
};

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: plans } = useListSubscriptionPlans();
  const createOrderMutation = useCreatePaymentOrder();
  const verifyMutation = useVerifyPayment();
  const createSubMutation = useCreateSubscription();

  const handleSubscribe = async (plan: any) => {
    if (!user) {
      toast({ title: "Please sign in first", variant: "destructive" });
      return;
    }
    if (plan.price === 0) {
      toast({ title: "Contact us for Enterprise pricing", description: "enterprise@medibook.pro" });
      return;
    }

    try {
      const order = await createOrderMutation.mutateAsync({
        data: { amount: plan.price, currency: "INR", purpose: "subscription", subscriptionPlan: plan.id }
      }) as any;

      const keyId = order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!keyId || keyId === "rzp_test_mock" || order.orderId.startsWith("order_mock_")) {
        // Demo mode without real Razorpay keys
        await createSubMutation.mutateAsync({ data: { userId: user.id as any, plan: plan.id } });
        toast({ title: "Subscribed!", description: `You're now on the ${plan.name} plan (demo mode)` });
        return;
      }

      // Load Razorpay
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);
      script.onload = () => {
        const rzp = new (window as any).Razorpay({
          key: keyId, amount: plan.price * 100, currency: "INR",
          name: "MediBook Pro", description: `${plan.name} Subscription`,
          order_id: order.orderId,
          handler: async (response: any) => {
            try {
              await verifyMutation.mutateAsync({ data: { ...response, purpose: "subscription", subscriptionPlan: plan.id, userId: user.id } });
              await createSubMutation.mutateAsync({ data: { userId: user.id as any, plan: plan.id, paymentId: response.razorpay_payment_id } });
              toast({ title: "Subscription activated!", description: `You're now on ${plan.name}` });
            } catch { toast({ title: "Verification failed", variant: "destructive" }); }
          },
          prefill: { name: user.name, email: user.email, contact: user.phone },
          theme: { color: "#0d9488" },
        });
        rzp.open();
      };
    } catch {
      toast({ title: "Failed to initiate payment", variant: "destructive" });
    }
  };

  const plansList = (plans as any[]) ?? [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Unlock the full power of MediBook Pro for your clinic. From solo practitioners to hospital chains — we have a plan for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plansList.map((plan: any) => (
            <div key={plan.id} className={cn(
              "relative bg-gradient-to-b border rounded-2xl p-6 flex flex-col transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
              planGradients[plan.id] || "from-gray-50 to-white",
              plan.isFeatured && "shadow-md"
            )}>
              {plan.id === "premium" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-amber-500 text-white px-3">Most Popular</Badge>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {planIcons[plan.id]}
                  <h3 className="font-bold text-xl">{plan.name}</h3>
                </div>
                <div className="flex items-end gap-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold">Custom</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                      <span className="text-muted-foreground text-sm mb-1">/month</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features?.map((feature: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check size={14} className="text-teal-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={createOrderMutation.isPending || verifyMutation.isPending}
                variant={plan.isFeatured ? "default" : "outline"}
                className="w-full"
              >
                {plan.price === 0 ? "Contact Sales" : "Get Started"}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm">All plans include a 14-day free trial. No credit card required for Basic.</p>
        </div>
      </div>
    </Layout>
  );
}
