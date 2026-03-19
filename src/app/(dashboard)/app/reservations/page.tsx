import { getDashboardContext } from '@/lib/get-dashboard-context';
import { ReservationsManager } from '@/components/dashboard/ReservationsManager';

export default async function ReservationsPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const today = new Date().toISOString().split('T')[0];

  const [{ data: reservations }, { data: restaurant }] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, customer_name, customer_phone, customer_email, party_size, reserved_date, reserved_time, notes, status, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('reserved_date', today)
      .order('reserved_date', { ascending: true })
      .order('reserved_time', { ascending: true })
      .limit(200),
    supabase
      .from('restaurants')
      .select('reservations_enabled, reservation_slot_minutes, reservation_max_party_size, reservation_open_days, reservation_open_time, reservation_close_time')
      .eq('id', restaurantId)
      .maybeSingle(),
  ]);

  return (
    <div>
      <ReservationsManager
        restaurantId={restaurantId}
        initialReservations={reservations ?? []}
        settings={restaurant ?? {}}
      />
    </div>
  );
}
