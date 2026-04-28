import { createAdminClient } from '@/lib/supabase/admin';
import { CalibrateClient } from './CalibrateClient';
import type { MasterAnchor } from '@/lib/anchors/master-anchors';

export const dynamic = 'force-dynamic';

export default async function CalibrateMasterAnchorsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('master_style_anchors')
    .select('*')
    .order('display_name', { ascending: true });

  const anchors: MasterAnchor[] = data ?? [];

  return (
    <main className="min-h-screen bg-[#050505] text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400 font-semibold mb-2">
            Admin · Calibration
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Calibrate master anchors</h1>
          <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
            Generate 3 candidate images per category with flux-pro/v1.1-ultra.
            Pick the best one for each category — that becomes the master
            anchor used as fallback for every restaurant.
          </p>
        </header>

        <CalibrateClient initialAnchors={anchors} />
      </div>
    </main>
  );
}
