'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Layers, ChevronRight } from 'lucide-react';
import {
  createModifierGroup, updateModifierGroup, deleteModifierGroup,
  createModifierOption, updateModifierOption, deleteModifierOption,
} from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import type { ModifierGroup, ModifierOption } from '@/types';

interface ModifierGroupsEditorProps {
  groups: ModifierGroup[];
  productId: string;
  onUpdate?: (groups: ModifierGroup[]) => void;
}

export function ModifierGroupsEditor({ groups, productId, onUpdate }: ModifierGroupsEditorProps) {
  const [items, setItems] = useState(groups);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', selection_type: 'single' as 'single' | 'multi', min_select: '0', max_select: '1', is_required: false });
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(groups[0]?.id ?? null);
  const [addingOptionFor, setAddingOptionFor] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState({ name: '', price_delta: '' });
  const [editOptionId, setEditOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sync = (updated: ModifierGroup[]) => {
    setItems(updated);
    onUpdate?.(updated);
  };

  const handleAddGroup = async () => {
    if (!groupForm.name.trim()) return;
    setLoading(true);
    const result = await createModifierGroup(productId, {
      name: groupForm.name,
      selection_type: groupForm.selection_type,
      min_select: parseInt(groupForm.min_select) || 0,
      max_select: parseInt(groupForm.max_select) || 1,
      is_required: groupForm.is_required,
      sort_order: items.length,
    });
    if (result.group) {
      const newItems = [...items, result.group as ModifierGroup];
      sync(newItems);
      setExpandedGroup(result.group.id);
    }
    setGroupForm({ name: '', selection_type: 'single', min_select: '0', max_select: '1', is_required: false });
    setAddingGroup(false);
    setLoading(false);
  };

  const handleUpdateGroup = async (g: ModifierGroup) => {
    setLoading(true);
    await updateModifierGroup(g.id, {
      name: groupForm.name || g.name,
      selection_type: groupForm.selection_type,
      min_select: parseInt(groupForm.min_select) || 0,
      max_select: parseInt(groupForm.max_select) || 1,
      is_required: groupForm.is_required,
      sort_order: g.sort_order,
    });
    sync(items.map(i => i.id === g.id ? {
      ...i,
      name: groupForm.name || i.name,
      selection_type: groupForm.selection_type,
      min_select: parseInt(groupForm.min_select) || 0,
      max_select: parseInt(groupForm.max_select) || 1,
      is_required: groupForm.is_required,
    } : i));
    setEditGroupId(null);
    setLoading(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Eliminar este grupo y todas sus opciones?')) return;
    setLoading(true);
    await deleteModifierGroup(id);
    sync(items.filter(i => i.id !== id));
    setLoading(false);
  };

  const handleAddOption = async (groupId: string) => {
    if (!optionForm.name.trim()) return;
    setLoading(true);
    const group = items.find(g => g.id === groupId);
    const result = await createModifierOption(groupId, {
      name: optionForm.name,
      price_delta: parseFloat(optionForm.price_delta) || 0,
      is_default: false,
      sort_order: (group?.options.length ?? 0),
    });
    if (result.option) {
      sync(items.map(g => g.id === groupId
        ? { ...g, options: [...g.options, result.option as ModifierOption] }
        : g));
    }
    setOptionForm({ name: '', price_delta: '' });
    setAddingOptionFor(null);
    setLoading(false);
  };

  const handleUpdateOption = async (opt: ModifierOption, groupId: string) => {
    setLoading(true);
    await updateModifierOption(opt.id, {
      name: optionForm.name || opt.name,
      price_delta: parseFloat(optionForm.price_delta) || 0,
      is_default: opt.is_default,
      sort_order: opt.sort_order,
    });
    sync(items.map(g => g.id === groupId
      ? { ...g, options: g.options.map(o => o.id === opt.id ? { ...o, name: optionForm.name || o.name, price_delta: parseFloat(optionForm.price_delta) || 0 } : o) }
      : g));
    setEditOptionId(null);
    setOptionForm({ name: '', price_delta: '' });
    setLoading(false);
  };

  const handleDeleteOption = async (optionId: string, groupId: string) => {
    setLoading(true);
    await deleteModifierOption(optionId);
    sync(items.map(g => g.id === groupId
      ? { ...g, options: g.options.filter(o => o.id !== optionId) }
      : g));
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-gray-700">Grupos de opciones</span>
        </div>
        {!addingGroup && (
          <button onClick={() => setAddingGroup(true)} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
            <Plus className="w-3.5 h-3.5" /> Nuevo grupo
          </button>
        )}
      </div>

      {items.length === 0 && !addingGroup && (
        <div className="text-center py-8 text-gray-400">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-gray-500">Sin grupos de opciones</p>
          <p className="text-xs text-gray-400 mt-1">Agrega opciones como Tamaño, Extras, Salsas...</p>
        </div>
      )}

      {addingGroup && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Nuevo grupo</p>
          <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="Ej: Tamaño, Proteína, Salsas..." autoFocus className="dash-input" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">Tipo</label>
              <select value={groupForm.selection_type} onChange={e => {
                const st = e.target.value as 'single' | 'multi';
                setGroupForm({ ...groupForm, selection_type: st, max_select: st === 'single' ? '1' : groupForm.max_select });
              }} className="dash-select text-sm">
                <option value="single">Única (elige 1)</option>
                <option value="multi">Múltiple</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 mt-5 cursor-pointer">
                <input type="checkbox" checked={groupForm.is_required} onChange={e => setGroupForm({ ...groupForm, is_required: e.target.checked, min_select: e.target.checked ? '1' : '0' })} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30" />
                <span className="text-sm text-gray-700 font-medium">Requerido</span>
              </label>
            </div>
          </div>
          {groupForm.selection_type === 'multi' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Mínimo</label>
                <input type="number" min="0" value={groupForm.min_select} onChange={e => setGroupForm({ ...groupForm, min_select: e.target.value })} className="dash-input text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Máximo</label>
                <input type="number" min="1" value={groupForm.max_select} onChange={e => setGroupForm({ ...groupForm, max_select: e.target.value })} className="dash-input text-sm" />
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={handleAddGroup} disabled={loading || !groupForm.name.trim()} className="dash-btn-primary text-xs py-2">
              {loading ? 'Creando...' : 'Crear grupo'}
            </button>
            <button onClick={() => { setAddingGroup(false); setGroupForm({ name: '', selection_type: 'single', min_select: '0', max_select: '1', is_required: false }); }} className="dash-btn-secondary text-xs py-2">Cancelar</button>
          </div>
        </div>
      )}

      {items.map((group) => {
        const isExpanded = expandedGroup === group.id;
        const isEditing = editGroupId === group.id;
        const ruleLabel = group.selection_type === 'single'
          ? (group.is_required ? 'Elige 1 (requerido)' : 'Elige 1 (opcional)')
          : group.is_required
            ? `Elige ${group.min_select}-${group.max_select} (requerido)`
            : `Hasta ${group.max_select} (opcional)`;

        return (
          <div key={group.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            {isEditing ? (
              <div className="p-4 space-y-3 bg-gray-50">
                <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="dash-input text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={groupForm.selection_type} onChange={e => setGroupForm({ ...groupForm, selection_type: e.target.value as 'single' | 'multi' })} className="dash-select text-sm">
                    <option value="single">Única</option>
                    <option value="multi">Múltiple</option>
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={groupForm.is_required} onChange={e => setGroupForm({ ...groupForm, is_required: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30" />
                    <span className="text-sm text-gray-700">Requerido</span>
                  </label>
                </div>
                {groupForm.selection_type === 'multi' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Min</label>
                      <input type="number" min="0" value={groupForm.min_select} onChange={e => setGroupForm({ ...groupForm, min_select: e.target.value })} className="dash-input text-sm" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Max</label>
                      <input type="number" min="1" value={groupForm.max_select} onChange={e => setGroupForm({ ...groupForm, max_select: e.target.value })} className="dash-input text-sm" />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateGroup(group)} disabled={loading} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50">Guardar</button>
                  <button onClick={() => setEditGroupId(null)} className="text-xs text-gray-500">Cancelar</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', isExpanded && 'rotate-90')} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900">{group.name}</span>
                  <span className="ml-2 text-[11px] text-gray-400">{group.options.length} opciones</span>
                </div>
                <span className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full',
                  group.is_required ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'
                )}>
                  {ruleLabel}
                </span>
                <button onClick={(e) => { e.stopPropagation(); setEditGroupId(group.id); setGroupForm({ name: group.name, selection_type: group.selection_type, min_select: String(group.min_select), max_select: String(group.max_select), is_required: group.is_required }); }} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </button>
            )}

            {isExpanded && !isEditing && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-1.5">
                {group.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    {editOptionId === opt.id ? (
                      <>
                        <input value={optionForm.name} onChange={e => setOptionForm({ ...optionForm, name: e.target.value })} placeholder="Nombre" className="flex-1 text-sm px-2 py-1 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                        <input value={optionForm.price_delta} onChange={e => setOptionForm({ ...optionForm, price_delta: e.target.value })} placeholder="+0.00" type="number" step="0.01" className="w-20 text-sm px-2 py-1 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                        <button onClick={() => handleUpdateOption(opt, group.id)} disabled={loading} className="text-xs font-medium text-emerald-600 disabled:opacity-50">Guardar</button>
                        <button onClick={() => { setEditOptionId(null); setOptionForm({ name: '', price_delta: '' }); }} className="text-xs text-gray-500">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700 font-medium">{opt.name}</span>
                        <span className="text-sm text-gray-500 font-mono">
                          {Number(opt.price_delta) > 0 ? `+$${Number(opt.price_delta).toFixed(2)}` : Number(opt.price_delta) < 0 ? `-$${Math.abs(Number(opt.price_delta)).toFixed(2)}` : 'Base'}
                        </span>
                        <button onClick={() => { setEditOptionId(opt.id); setOptionForm({ name: opt.name, price_delta: String(opt.price_delta) }); }} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteOption(opt.id, group.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                ))}

                {addingOptionFor === group.id ? (
                  <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                    <input value={optionForm.name} onChange={e => setOptionForm({ ...optionForm, name: e.target.value })} placeholder="Ej: Grande, Queso extra..." autoFocus className="flex-1 text-sm px-2 py-1 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                    <input value={optionForm.price_delta} onChange={e => setOptionForm({ ...optionForm, price_delta: e.target.value })} placeholder="+0.00" type="number" step="0.01" className="w-20 text-sm px-2 py-1 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                    <button onClick={() => handleAddOption(group.id)} disabled={loading || !optionForm.name.trim()} className="text-xs font-bold text-emerald-600 disabled:opacity-50">{loading ? '...' : 'Agregar'}</button>
                    <button onClick={() => { setAddingOptionFor(null); setOptionForm({ name: '', price_delta: '' }); }} className="text-xs text-gray-500">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => { setAddingOptionFor(group.id); setOptionForm({ name: '', price_delta: '' }); }} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 mt-1">
                    <Plus className="w-3.5 h-3.5" /> Agregar opción
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
