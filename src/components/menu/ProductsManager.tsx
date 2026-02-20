'use client';

import { useState, useEffect, useTransition, useRef, lazy, Suspense } from 'react';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ImagePlus, X, Sparkles,
  Loader2, Camera, Wand2, Package, Layers, ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import {
  createProduct, updateProduct, deleteProduct,
  createModifierGroup, updateModifierGroup, deleteModifierGroup,
  createModifierOption, updateModifierOption, deleteModifierOption,
} from '@/lib/actions/restaurant';
import { formatPrice, cn } from '@/lib/utils';
import type { Product, Category, ModifierGroup, ModifierOption } from '@/types';

const MenuImportLazy = lazy(() => import('./MenuImport').then(m => ({ default: m.MenuImport })));

const AI_STYLES = [
  { id: 'professional', label: 'Profesional', desc: 'Fondo neutro, iluminacion suave' },
  { id: 'rustic', label: 'Rustico', desc: 'Mesa de madera, ambiente calido' },
  { id: 'modern', label: 'Moderno', desc: 'Minimalista, colores limpios' },
  { id: 'vibrant', label: 'Vibrante', desc: 'Colores saturados, dinamico' },
];

// ============================================================
// MODIFIER GROUPS EDITOR
// ============================================================

function ModifierGroupsEditor({ groups, productId, onUpdate }: {
  groups: ModifierGroup[];
  productId: string;
  onUpdate: (groups: ModifierGroup[]) => void;
}) {
  const [items, setItems] = useState(groups);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', selection_type: 'single' as 'single' | 'multi', min_select: '0', max_select: '1', is_required: false });
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(groups[0]?.id ?? null);
  const [addingOptionFor, setAddingOptionFor] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState({ name: '', price_delta: '' });
  const [editOptionId, setEditOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setItems(newItems);
      onUpdate(newItems);
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
    const newItems = items.map(i => i.id === g.id ? {
      ...i,
      name: groupForm.name || i.name,
      selection_type: groupForm.selection_type,
      min_select: parseInt(groupForm.min_select) || 0,
      max_select: parseInt(groupForm.max_select) || 1,
      is_required: groupForm.is_required,
    } : i);
    setItems(newItems);
    onUpdate(newItems);
    setEditGroupId(null);
    setLoading(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Eliminar este grupo y todas sus opciones?')) return;
    setLoading(true);
    await deleteModifierGroup(id);
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    onUpdate(newItems);
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
      const newItems = items.map(g => g.id === groupId
        ? { ...g, options: [...g.options, result.option as ModifierOption] }
        : g);
      setItems(newItems);
      onUpdate(newItems);
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
    const newItems = items.map(g => g.id === groupId
      ? { ...g, options: g.options.map(o => o.id === opt.id ? { ...o, name: optionForm.name || o.name, price_delta: parseFloat(optionForm.price_delta) || 0 } : o) }
      : g);
    setItems(newItems);
    onUpdate(newItems);
    setEditOptionId(null);
    setOptionForm({ name: '', price_delta: '' });
    setLoading(false);
  };

  const handleDeleteOption = async (optionId: string, groupId: string) => {
    setLoading(true);
    await deleteModifierOption(optionId);
    const newItems = items.map(g => g.id === groupId
      ? { ...g, options: g.options.filter(o => o.id !== optionId) }
      : g);
    setItems(newItems);
    onUpdate(newItems);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
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
        <div className="text-center py-6 text-gray-400">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs text-gray-500">Sin grupos de opciones.</p>
          <p className="text-xs text-gray-400 mt-1">Crea grupos como &quot;Tamano&quot;, &quot;Extras&quot;, &quot;Salsas&quot;, etc.</p>
        </div>
      )}

      {/* Add group form */}
      {addingGroup && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Nuevo grupo</p>
          <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} placeholder='Ej: Tamano, Proteina, Salsas...' autoFocus className="w-full text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">Tipo de seleccion</label>
              <select value={groupForm.selection_type} onChange={e => {
                const st = e.target.value as 'single' | 'multi';
                setGroupForm({ ...groupForm, selection_type: st, max_select: st === 'single' ? '1' : groupForm.max_select });
              }} className="w-full text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                <option value="single">Unica (elige 1)</option>
                <option value="multi">Multiple (elige varias)</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 mt-6 cursor-pointer">
                <input type="checkbox" checked={groupForm.is_required} onChange={e => setGroupForm({ ...groupForm, is_required: e.target.checked, min_select: e.target.checked ? '1' : '0' })} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30" />
                <span className="text-sm text-gray-700 font-medium">Requerido</span>
              </label>
            </div>
          </div>
          {groupForm.selection_type === 'multi' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Minimo</label>
                <input type="number" min="0" value={groupForm.min_select} onChange={e => setGroupForm({ ...groupForm, min_select: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Maximo</label>
                <input type="number" min="1" value={groupForm.max_select} onChange={e => setGroupForm({ ...groupForm, max_select: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={handleAddGroup} disabled={loading || !groupForm.name.trim()} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {loading ? 'Creando...' : 'Crear grupo'}
            </button>
            <button onClick={() => { setAddingGroup(false); setGroupForm({ name: '', selection_type: 'single', min_select: '0', max_select: '1', is_required: false }); }} className="px-4 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100">Cancelar</button>
          </div>
        </div>
      )}

      {/* Groups list */}
      {items.map((group) => {
        const isExpanded = expandedGroup === group.id;
        const isEditing = editGroupId === group.id;
        const ruleLabel = group.selection_type === 'single'
          ? (group.is_required ? 'Elige 1 (requerido)' : 'Elige 1 (opcional)')
          : group.is_required
            ? `Elige ${group.min_select}-${group.max_select} (requerido)`
            : `Hasta ${group.max_select} (opcional)`;

        return (
          <div key={group.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Group header */}
            {isEditing ? (
              <div className="p-4 space-y-3 bg-gray-50">
                <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={groupForm.selection_type} onChange={e => setGroupForm({ ...groupForm, selection_type: e.target.value as 'single' | 'multi' })} className="text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                    <option value="single">Unica</option>
                    <option value="multi">Multiple</option>
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
                      <input type="number" min="0" value={groupForm.min_select} onChange={e => setGroupForm({ ...groupForm, min_select: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Max</label>
                      <input type="number" min="1" value={groupForm.max_select} onChange={e => setGroupForm({ ...groupForm, max_select: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateGroup(group)} disabled={loading} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50">Guardar</button>
                  <button onClick={() => { setEditGroupId(null); }} className="text-xs text-gray-500">Cancelar</button>
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

            {/* Options list */}
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
                    <Plus className="w-3.5 h-3.5" /> Agregar opcion
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

// ============================================================
// EXPANDED PRODUCT EDITOR (DRAWER)
// ============================================================

function ProductEditor({ product, categories, onClose, onSave }: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const isEditing = !!product;
  const [tab, setTab] = useState<'info' | 'modifiers'>('info');
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    category_id: product?.category_id ?? categories[0]?.id ?? '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiStyle, setAiStyle] = useState('professional');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [localModifierGroups, setLocalModifierGroups] = useState<ModifierGroup[]>(product?.modifier_groups ?? []);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imagenes'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Maximo 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      const res = await fetch('/api/tenant/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.url;
    } catch (err: any) {
      setError(err.message ?? 'Error subiendo imagen');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const generateAIImage = async () => {
    if (!form.name.trim()) { setError('Escribe el nombre del producto primero'); return; }
    setGeneratingAI(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: form.name, description: form.description, style: aiStyle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImagePreview(data.url);
      setImageFile(null);
    } catch (err: any) {
      setError(err.message ?? 'Error generando imagen con IA');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Nombre requerido'); return; }
    if (!form.category_id) { setError('Selecciona una categoria'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setError('Precio invalido'); return; }

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage();
      if (imageUrl === null && imageFile) return;
    } else if (imagePreview && imagePreview.startsWith('http')) {
      if (!isEditing || product?.image_url !== imagePreview) {
        imageUrl = imagePreview;
      }
    }

    startTransition(async () => {
      if (isEditing && product) {
        const updateData: any = {
          name: form.name, description: form.description, price, category_id: form.category_id,
        };
        if (imageUrl) updateData.image_url = imageUrl;
        const result = await updateProduct(product.id, updateData);
        if (result.error) { setError(result.error); return; }
        onSave({
          ...product, name: form.name, description: form.description, price,
          category_id: form.category_id, modifier_groups: localModifierGroups,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        });
      } else {
        const result = await createProduct({
          name: form.name, description: form.description, price, category_id: form.category_id, is_active: true,
        });
        if (result.error) { setError(result.error); return; }
        onSave({
          id: `temp-${Date.now()}`, restaurant_id: '', category_id: form.category_id,
          name: form.name, description: form.description, price, image_url: imageUrl ?? '',
          is_active: true, sort_order: 0, created_at: new Date().toISOString(),
          modifier_groups: [],
        });
      }
    });
  };

  const totalOptions = localModifierGroups.reduce((sum, g) => sum + g.options.length, 0);
  const tabs = [
    { id: 'info' as const, label: 'Informacion', icon: Package },
    ...(isEditing ? [
      { id: 'modifiers' as const, label: `Opciones (${localModifierGroups.length}g / ${totalOptions}o)`, icon: Layers },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-base text-gray-900">
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="sticky top-[65px] z-10 bg-white border-b border-gray-200 px-5 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-500'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/[0.15] text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* INFO TAB */}
          {tab === 'info' && (
            <div className="space-y-5">
              {/* Image */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Imagen</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

                {imagePreview ? (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-50 group">
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="500px" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2">
                      <button onClick={() => fileRef.current?.click()} className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-white/90 text-gray-700 hover:bg-white transition-all"><Camera className="w-4 h-4" /></button>
                      <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-white/90 text-red-600 hover:bg-white transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {generatingAI && (
                      <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-600">Generando con IA...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => fileRef.current?.click()} disabled={generatingAI} className="h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-400 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-emerald-600 transition-all disabled:opacity-50">
                      <Camera className="w-5 h-5" /><span className="text-xs font-medium">Subir foto</span>
                    </button>
                    <button onClick={() => { if (!form.name.trim()) { setError('Escribe el nombre primero'); return; } setShowStylePicker(true); }} disabled={generatingAI} className="h-28 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 hover:border-emerald-400 flex flex-col items-center justify-center gap-2 text-emerald-600 hover:text-emerald-700 transition-all disabled:opacity-50">
                      {generatingAI ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs font-medium">Generando...</span></> : <><Sparkles className="w-5 h-5" /><span className="text-xs font-medium">Generar con IA</span></>}
                    </button>
                  </div>
                )}

                {showStylePicker && !imagePreview && (
                  <div className="mt-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Wand2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">Estilo de imagen IA</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {AI_STYLES.map((s) => (
                        <button key={s.id} onClick={() => setAiStyle(s.id)} className={cn('px-3 py-2 rounded-lg text-left transition-all text-xs', aiStyle === s.id ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200')}>
                          <p className="font-medium">{s.label}</p>
                          <p className={cn('mt-0.5', aiStyle === s.id ? 'text-emerald-100' : 'text-gray-500')}>{s.desc}</p>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={generateAIImage} disabled={generatingAI} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                        {generatingAI ? <><Loader2 className="w-4 h-4 animate-spin" />Generando...</> : <><Sparkles className="w-4 h-4" />Generar</>}
                      </button>
                      <button onClick={() => setShowStylePicker(false)} className="px-4 py-2.5 rounded-xl bg-gray-50 text-gray-500 text-sm hover:bg-gray-100 border border-gray-200">Cancelar</button>
                    </div>
                  </div>
                )}

                {imagePreview && !generatingAI && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => { setImagePreview(null); setImageFile(null); setShowStylePicker(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium hover:bg-emerald-100 border border-emerald-200"><Sparkles className="w-3.5 h-3.5" />Regenerar con IA</button>
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 text-xs font-medium hover:bg-gray-100"><Camera className="w-3.5 h-3.5" />Subir otra</button>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Hamburguesa clasica" autoFocus className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Descripcion</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe el producto..." rows={3} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 resize-none" />
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Precio base *</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" min="0" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Categoria *</label>
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {!isEditing && (
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <p className="text-xs text-emerald-700">
                    <strong>Tip:</strong> Despues de crear el producto podras agregar grupos de opciones (tamanos, extras, salsas, etc.) desde la pestana &quot;Opciones&quot;.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MODIFIERS TAB */}
          {tab === 'modifiers' && isEditing && product && (
            <ModifierGroupsEditor
              groups={localModifierGroups}
              productId={product.id}
              onUpdate={setLocalModifierGroups}
            />
          )}
        </div>

        {/* Footer */}
        {tab === 'info' && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-4 flex gap-2">
            <button onClick={handleSubmit} disabled={isPending || uploading || generatingAI} className="flex-1 px-5 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              {uploading ? 'Subiendo imagen...' : isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-xl bg-gray-50 text-gray-500 text-sm font-medium hover:bg-gray-100">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PRODUCTS MANAGER
// ============================================================

export function ProductsManager({ initialProducts, categories, restaurantId, currency }: { initialProducts: Product[]; categories: Category[]; restaurantId?: string; currency?: string }) {
  const [products, setProducts] = useState(initialProducts);
  const [editorProduct, setEditorProduct] = useState<Product | null | 'new'>(null);
  const [isPending, startTransition] = useTransition();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
      const product = initialProducts.find(p => p.id === editId);
      if (product) setEditorProduct(product);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [initialProducts]);

  const handleSave = (saved: Product) => {
    if (products.find(p => p.id === saved.id)) {
      setProducts(prev => prev.map(p => p.id === saved.id ? saved : p));
    } else {
      setProducts(prev => [...prev, saved]);
    }
    setEditorProduct(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Eliminar este producto?')) return;
    startTransition(async () => {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    });
  };

  const handleToggle = (p: Product) => {
    startTransition(async () => {
      await updateProduct(p.id, { is_active: !p.is_active });
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
    });
  };

  const getCategoryName = (catId: string) => categories.find(c => c.id === catId)?.name ?? '';

  const filteredProducts = filterCategory === 'all' ? products : products.filter(p => p.category_id === filterCategory);
  const activeCount = products.filter(p => p.is_active).length;

  return (
    <div>
      {categories.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-gray-500">Primero crea una categoria</p>
          <p className="text-sm mt-1.5">Necesitas al menos una categoria antes de agregar productos</p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditorProduct('new')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-4 h-4" /> Nuevo producto
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors border border-emerald-200"
              >
                <Sparkles className="w-4 h-4" /> Importar con IA
              </button>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-xs text-gray-500">{activeCount} activos de {products.length}</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Todas las categorias</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Product List */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-gray-500">Sin productos</p>
              <p className="text-sm mt-1.5">Agrega productos a tu menu</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 transition-all hover: group cursor-pointer',
                    p.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
                  )}
                  onClick={() => setEditorProduct(p)}
                >
                  {p.image_url ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                      <Image src={p.image_url} alt={p.name} fill sizes="56px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-200">
                      <ImagePlus className="w-5 h-5 text-gray-700" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn('text-sm font-semibold truncate', p.is_active ? 'text-gray-900' : 'line-through text-gray-500')}>{p.name}</span>
                      {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 font-medium flex-shrink-0">Oculto</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-600">{formatPrice(Number(p.price))}</span>
                      <span className="text-xs bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">{getCategoryName(p.category_id)}</span>
                      {(p.modifier_groups?.length ?? 0) > 0 && (
                        <span className="text-[10px] bg-emerald-500/[0.1] text-emerald-600 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                          {p.modifier_groups!.length} grupo{p.modifier_groups!.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(p); }}
                      className={cn('p-2 rounded-lg transition-colors', p.is_active ? 'text-gray-500 hover:bg-gray-50' : 'text-gray-700 hover:bg-gray-50')}
                      title={p.is_active ? 'Ocultar' : 'Mostrar'}
                    >
                      {p.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="p-2 rounded-lg text-gray-500 hover:bg-red-500/[0.08] hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Editor Drawer */}
          {editorProduct !== null && (
            <ProductEditor
              product={editorProduct === 'new' ? null : editorProduct}
              categories={categories}
              onClose={() => setEditorProduct(null)}
              onSave={handleSave}
            />
          )}

          {/* AI Import Modal */}
          {showImport && (
            <MenuImportLazy
              existingCategories={categories.map(c => ({ id: c.id, name: c.name }))}
              restaurantId={restaurantId || ''}
              currency={currency || 'USD'}
              onComplete={() => window.location.reload()}
              onClose={() => setShowImport(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
