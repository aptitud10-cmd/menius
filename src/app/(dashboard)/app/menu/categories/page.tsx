import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CategoriesManager } from '@/components/menu/CategoriesManager';

export default async function CategoriesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) redirect('/onboarding/create-restaurant');

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', profile.default_restaurant_id)
    .order('sort_order');

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Categorías</h1>
      <CategoriesManager initialCategories={categories ?? []} />
    </div>
  );
}
