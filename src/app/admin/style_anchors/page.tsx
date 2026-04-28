import { createAdminClient } from '@/lib/supabase/admin';
import { MasterAnchorsClient } from './MasterAnchorsClient';
import type { MasterAnchor } from '@/lib/anchors/master-anchors';

export const dynamic = 'force-dynamic';

export default async function MasterStyleAnchorsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('master_style_anchors')
    .select('*')
    .order('display_name', { ascending: true });

  const anchors: MasterAnchor[] = data ?? [];

  return (
    <main className="min-h-screen bg-[#050505] text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400 font-semibold mb-2">
            Admin · Internal
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Master Style Anchors</h1>
          <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
            Visual reference images shared across all restaurants. When a
            restaurant generates a product image, the system falls back to
            these anchors when the restaurant has no own anchor for the
            category. Match by alias against the category name.
          </p>
        </header>

        <MasterAnchorsClient initialAnchors={anchors} />
      </div>
    </main>
  );
}
