// @ts-nocheck
import { useState } from 'react';
import { timeAgo } from '@/lib/utils'; // Assuming timeAgo is available

export function DeployHistoryDropdown({
  deployments,
  onRerunDeploy,
}: {
  deployments: DeployInfo[];
  onRerunDeploy: () => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(v => !v)}
        className="text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
        title="Ver historial de despliegues"
      >
        🚀 Historial ({deployments.length})
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <span className="text-xs font-bold text-gray-200">🚀 Historial de Despliegues</span>
              <button onClick={() => setShowDropdown(false)} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {deployments.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">Sin despliegues recientes</p>
              ) : deployments.map((d, i) => (
                <div key={d.id} className="px-3 py-2 border-b border-gray-800 hover:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${d.state === 'READY' ? 'bg-green-500' : d.state === 'ERROR' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-gray-300 truncate font-mono" title={d.id}>{d.id.slice(-6)}: {d.commitMessage || 'No message'}</p>
                      <p className="text-[9px] text-gray-600">{d.state} ({timeAgo(d.createdAt)})</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        // Here, we don't pass deploymentId as the re_run_vercel_build tool in AI does not take arguments
                        onRerunDeploy();
                      }}
                      className="text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex-shrink-0"
                      title="Re-ejecutar este despliegue"
                    >
                      ↺ Re-run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
