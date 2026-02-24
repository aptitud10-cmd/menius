import { getDashboardContext } from '@/lib/get-dashboard-context';
import { ReviewsManager } from '@/components/dashboard/ReviewsManager';

export default async function ReviewsPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, customer_name, rating, comment, is_visible, created_at, order_id')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="dash-heading mb-6">Reseñas</h1>
      <ReviewsManager
        restaurantId={restaurantId}
        initialReviews={reviews ?? []}
      />
    </div>
  );
}
