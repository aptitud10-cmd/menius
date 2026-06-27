import { getDashboardContext } from "@/lib/get-dashboard-context";
import { ReviewsManager } from "@/components/dashboard/ReviewsManager";
import { checkPlanAccess } from "@/lib/plan-access";
import { PlanUpgradeWall } from "@/components/dashboard/PlanUpgradeWall";

export default async function ReviewsPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const hasAccess = await checkPlanAccess("pro");
  if (!hasAccess) {
    const { data: rest } = await supabase
      .from("restaurants")
      .select("locale")
      .eq("id", restaurantId)
      .maybeSingle();
    const locale = rest?.locale === "en" ? "en" : "es";
    return (
      <PlanUpgradeWall
        requiredPlan="pro"
        locale={locale}
        featureEs="Reseñas de clientes"
        featureEn="Customer Reviews"
      />
    );
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "id, customer_name, rating, comment, is_visible, created_at, order_id, owner_response, ai_suggested_response",
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, locale")
    .eq("id", restaurantId)
    .maybeSingle();

  return (
    <div>
      <ReviewsManager
        restaurantId={restaurantId}
        initialReviews={reviews ?? []}
        restaurantName={restaurant?.name ?? ""}
        locale={restaurant?.locale ?? "es"}
      />
    </div>
  );
}
