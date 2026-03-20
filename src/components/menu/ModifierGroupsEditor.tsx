'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Layers, ChevronRight, Ruler, UtensilsCrossed, Flame, Salad, Settings2, X, LayoutList, LayoutGrid, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  createModifierGroup, updateModifierGroup, deleteModifierGroup,
  createModifierOption, updateModifierOption, deleteModifierOption,
  reorderModifierGroups, reorderModifierOptions,
} from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { getDashboardTranslations, type DashboardLocale } from '@/lib/dashboard-translations';
import type { ModifierGroup, ModifierOption } from '@/types';

interface Template {
  icon: React.ElementType;
  nameKey: 'modifiers_templateSize' | 'modifiers_templateExtras' | 'modifiers_templatePrep' | 'modifiers_templateSides' | 'modifiers_templateCustom';
  descKey: 'modifiers_templateSizeDesc' | 'modifiers_templateExtrasDesc' | 'modifiers_templatePrepDesc' | 'modifiers_templateSidesDesc' | 'modifiers_templateCustomDesc';
  selection_type: 'single' | 'multi';
  is_required: boolean;
  max_select: number;
  display_type: 'list' | 'grid';
  optionNames?: { es: string[]; en: string[] };
}

const TEMPLATES: Template[] = [
  { icon: Ruler, nameKey: 'modifiers_templateSize', descKey: 'modifiers_templateSizeDesc', selection_type: 'single', is_required: true, max_select: 1, display_type: 'grid', optionNames: { es: ['Pequeño', 'Mediano', 'Grande'], en: ['Small', 'Medium', 'Large'] } },
  { icon: UtensilsCrossed, nameKey: 'modifiers_templateExtras', descKey: 'modifiers_templateExtrasDesc', selection_type: 'multi', is_required: false, max_select: 5, display_type: 'list', optionNames: { es: ['Tocino', 'Queso', 'Aguacate'], en: ['Bacon', 'Cheese', 'Avocado'] } },
  { icon: Flame, nameKey: 'modifiers_templatePrep', descKey: 'modifiers_templatePrepDesc', selection_type: 'single', is_required: true, max_select: 1, display_type: 'grid', optionNames: { es: ['Término medio', 'Tres cuartos', 'Bien cocido'], en: ['Medium Rare', 'Medium Well', 'Well Done'] } },
  { icon: Salad, nameKey: 'modifiers_templateSides', descKey: 'modifiers_templateSidesDesc', selection_type: 'single', is_required: false, max_select: 1, display_type: 'list', optionNames: { es: ['Papas fritas', 'Ensalada', 'Arroz'], en: ['Fries', 'Salad', 'Rice'] } },
  { icon: Settings2, nameKey: 'modifiers_templateCustom', descKey: 'modifiers_templateCustomDesc', selection_type: 'single', is_required: false, max_select: 1, display_type: 'list' },
];

interface ModifierGroupsEditorProps {
  groups: ModifierGroup[];
  productId: string;
  onUpdate?: (groups: ModifierGroup[]) => void;
  locale?: DashboardLocale;
  currency?: string;
}

// ── Sortable option row ──────────────────────────────────────────────────────
function SortableOption({
  opt,
  groupId,
  editOptionId,
  optionForm,
  loading,
  t,
  lang,
  currSymbol,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  setOptionForm,
}: {
  opt: ModifierOption;
  groupId: string;
  editOptionId: string | null;
  optionForm: { name: string; price_delta: string };
  loading: boolean;
  t: ReturnType<typeof getDashboardTranslations>;
  lang: 'es' | 'en';
  currSymbol: string;
  onEdit: (opt: ModifierOption) => void;
  onCancelEdit: () => void;
  onUpdate: (opt: ModifierOption, groupId: string) => void;
  onDelete: (optionId: string, groupId: string) => void;
  setOptionForm: (f: { name: string; price_delta: string }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opt.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isEditing = editOptionId === opt.id;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-2">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {isEditing ? (
        <>
          <input
            value={optionForm.name}
            onChange={e => setOptionForm({ ...optionForm, name: e.target.value })}
            placeholder={t.editor_name}
            className="flex-1 text-sm px-2 py-1.5 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{currSymbol}</span>
            <input
              value={optionForm.price_delta}
              onChange={e => setOptionForm({ ...optionForm, price_delta: e.target.value })}
              placeholder="0.00"
              type="number"
              step="0.01"
              className="w-full text-sm pl-6 pr-2 py-1.5 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
          <button onClick={() => onUpdate(opt, groupId)} disabled={loading} className="text-xs font-medium text-emerald-600 disabled:opacity-50">{t.modifiers_save}</button>
          <button onClick={onCancelEdit} className="text-xs text-gray-500">{t.general_cancel}</button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-gray-700 font-medium">{opt.name}</span>
          <span className={cn('text-sm font-mono px-2 py-0.5 rounded', Number(opt.price_delta) !== 0 ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-400')}>
            {Number(opt.price_delta) > 0 ? `+${currSymbol}${Number(opt.price_delta).toFixed(2)}` : Number(opt.price_delta) < 0 ? `-${currSymbol}${Math.abs(Number(opt.price_delta)).toFixed(2)}` : t.modifiers_base}
          </span>
          <button onClick={() => onEdit(opt)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(opt.id, groupId)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </>
      )}
    </div>
  );
}

// ── Sortable group row ───────────────────────────────────────────────────────
function SortableGroup({
  group,
  isExpanded,
  isEditing,
  editGroupId,
  groupForm,
  addingOptionFor,
  optionForm,
  editOptionId,
  loading,
  t,
  lang,
  currSymbol,
  onToggleExpand,
  onStartEditGroup,
  onUpdateGroup,
  onCancelEditGroup,
  onDeleteGroup,
  onToggleDisplayType,
  onAddOption,
  onStartAddOption,
  onCancelAddOption,
  onUpdateOption,
  onDeleteOption,
  onStartEditOption,
  onCancelEditOption,
  onOptionDragEnd,
  setGroupForm,
  setOptionForm,
}: {
  group: ModifierGroup;
  isExpanded: boolean;
  isEditing: boolean;
  editGroupId: string | null;
  groupForm: { name: string; selection_type: 'single' | 'multi'; min_select: string; max_select: string; is_required: boolean; display_type: 'list' | 'grid' };
  addingOptionFor: string | null;
  optionForm: { name: string; price_delta: string };
  editOptionId: string | null;
  loading: boolean;
  t: ReturnType<typeof getDashboardTranslations>;
  lang: 'es' | 'en';
  currSymbol: string;
  onToggleExpand: () => void;
  onStartEditGroup: () => void;
  onUpdateGroup: (g: ModifierGroup) => void;
  onCancelEditGroup: () => void;
  onDeleteGroup: (id: string) => void;
  onToggleDisplayType: (g: ModifierGroup) => void;
  onAddOption: (groupId: string) => void;
  onStartAddOption: (groupId: string) => void;
  onCancelAddOption: () => void;
  onUpdateOption: (opt: ModifierOption, groupId: string) => void;
  onDeleteOption: (optionId: string, groupId: string) => void;
  onStartEditOption: (opt: ModifierOption) => void;
  onCancelEditOption: () => void;
  onOptionDragEnd: (groupId: string, oldIndex: number, newIndex: number) => void;
  setGroupForm: (f: typeof groupForm) => void;
  setOptionForm: (f: { name: string; price_delta: string }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const ruleLabel = group.selection_type === 'single'
    ? (group.is_required ? t.modifiers_choose1Required : t.modifiers_choose1Optional)
    : group.is_required
      ? t.modifiers_chooseRange.replace('{min}', String(group.min_select)).replace('{max}', String(group.max_select))
      : t.modifiers_upTo.replace('{max}', String(group.max_select));

  const optionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {isEditing ? (
        <div className="p-4 space-y-3 bg-gray-50">
          <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="dash-input text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={groupForm.selection_type} onChange={e => setGroupForm({ ...groupForm, selection_type: e.target.value as 'single' | 'multi' })} className="dash-select text-sm">
              <option value="single">{t.modifiers_singleLabel}</option>
              <option value="multi">{t.modifiers_multiLabel}</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={groupForm.is_required} onChange={e => setGroupForm({ ...groupForm, is_required: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30" />
              <span className="text-sm text-gray-700">{t.modifiers_required}</span>
            </label>
          </div>
          {groupForm.selection_type === 'multi' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">{t.modifiers_minHelper}</label>
                <input type="number" min="0" value={groupForm.min_select} onChange={e => setGroupForm({ ...groupForm, min_select: e.target.value })} className="dash-input text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">{t.modifiers_maxHelper}</label>
                <input type="number" min="1" value={groupForm.max_select} onChange={e => setGroupForm({ ...groupForm, max_select: e.target.value })} className="dash-input text-sm" />
              </div>
            </div>
          )}
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">{lang === 'en' ? 'Display style' : 'Estilo de vista'}</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setGroupForm({ ...groupForm, display_type: 'list' })} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all', groupForm.display_type === 'list' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                <LayoutList className="w-3.5 h-3.5" /> {t.modifiers_displayList}
              </button>
              <button type="button" onClick={() => setGroupForm({ ...groupForm, display_type: 'grid' })} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all', groupForm.display_type === 'grid' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                <LayoutGrid className="w-3.5 h-3.5" /> {t.modifiers_displayGrid}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onUpdateGroup(group)} disabled={loading} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50">{t.modifiers_save}</button>
            <button onClick={onCancelEditGroup} className="text-xs text-gray-500">{t.general_cancel}</button>
          </div>
        </div>
      ) : (
        <div className="w-full flex items-center gap-2 px-3 py-3 hover:bg-gray-50 transition-colors">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none"
            tabIndex={-1}
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Expand/collapse */}
          <button onClick={onToggleExpand} className="flex items-center gap-2 flex-1 min-w-0 text-left">
            <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform flex-shrink-0', isExpanded && 'rotate-90')} />
            <span className="text-sm font-semibold text-gray-900 truncate">{group.name}</span>
            <span className="text-[11px] text-gray-400 flex-shrink-0">{group.options.length} {t.modifiers_options}</span>
          </button>

          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0', group.is_required ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500')}>
            {ruleLabel}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleDisplayType(group); }}
            title={group.display_type === 'grid' ? t.modifiers_displayList : t.modifiers_displayGrid}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-500 transition-colors flex-shrink-0"
          >
            {group.display_type === 'grid' ? <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" /> : <LayoutList className="w-3.5 h-3.5" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onStartEditGroup(); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {isExpanded && !isEditing && (
        <div className="border-t border-gray-100 px-3 py-3 space-y-1.5">
          <DndContext sensors={optionSensors} collisionDetection={closestCenter} onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const oldIndex = group.options.findIndex(o => o.id === active.id);
            const newIndex = group.options.findIndex(o => o.id === over.id);
            onOptionDragEnd(group.id, oldIndex, newIndex);
            reorderModifierOptions(group.id, arrayMove(group.options, oldIndex, newIndex).map(o => o.id));
          }}>
            <SortableContext items={group.options.map(o => o.id)} strategy={verticalListSortingStrategy}>
              {group.options.map((opt) => (
                <SortableOption
                  key={opt.id}
                  opt={opt}
                  groupId={group.id}
                  editOptionId={editOptionId}
                  optionForm={optionForm}
                  loading={loading}
                  t={t}
                  lang={lang}
                  currSymbol={currSymbol}
                  onEdit={onStartEditOption}
                  onCancelEdit={onCancelEditOption}
                  onUpdate={onUpdateOption}
                  onDelete={onDeleteOption}
                  setOptionForm={setOptionForm}
                />
              ))}
            </SortableContext>
          </DndContext>

          {addingOptionFor === group.id ? (
            <div className="bg-emerald-50 rounded-lg px-3 py-3 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-gray-500 mb-0.5 block">{t.editor_name}</label>
                  <input value={optionForm.name} onChange={e => setOptionForm({ ...optionForm, name: e.target.value })} placeholder={t.modifiers_optionPlaceholder} autoFocus className="w-full text-sm px-2 py-1.5 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                </div>
                <div className="w-32">
                  <label className="text-[10px] font-medium text-gray-500 mb-0.5 block">{lang === 'en' ? 'Extra price' : 'Precio extra'}</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{currSymbol}</span>
                    <input value={optionForm.price_delta} onChange={e => setOptionForm({ ...optionForm, price_delta: e.target.value })} placeholder="0.00" type="number" step="0.01" className="w-full text-sm pl-6 pr-2 py-1.5 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5">{t.modifiers_priceHint}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onAddOption(group.id)} disabled={loading || !optionForm.name.trim()} className="px-3 py-1.5 rounded-md bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors">{loading ? '...' : t.general_add}</button>
                <button onClick={onCancelAddOption} className="text-xs text-gray-500 hover:text-gray-700">{t.general_cancel}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => onStartAddOption(group.id)} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 mt-1">
              <Plus className="w-3.5 h-3.5" /> {t.modifiers_addOption}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function ModifierGroupsEditor({ groups, productId, onUpdate, locale: localeProp, currency }: ModifierGroupsEditorProps) {
  const [items, setItems] = useState(groups);
  const [showTemplates, setShowTemplates] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', selection_type: 'single' as 'single' | 'multi', min_select: '0', max_select: '1', is_required: false, display_type: 'list' as 'list' | 'grid' });
  const [pendingOptions, setPendingOptions] = useState<string[]>([]);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(groups[0]?.id ?? null);
  const [addingOptionFor, setAddingOptionFor] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState({ name: '', price_delta: '' });
  const [editOptionId, setEditOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dashboard = useDashboardLocale();
  const t = localeProp ? getDashboardTranslations(localeProp) : dashboard.t;
  const lang: 'es' | 'en' = (localeProp ?? dashboard.locale ?? 'es') as 'es' | 'en';
  const currSymbol = currency === 'EUR' ? '\u20AC' : '$';

  const groupSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sync = (updated: ModifierGroup[]) => {
    setItems(updated);
    onUpdate?.(updated);
  };

  const resetAddState = () => {
    setAddingGroup(false);
    setShowTemplates(false);
    setPendingOptions([]);
    setGroupForm({ name: '', selection_type: 'single', min_select: '0', max_select: '1', is_required: false, display_type: 'list' });
  };

  const applyTemplate = (tpl: Template) => {
    if (tpl.nameKey === 'modifiers_templateCustom') {
      setShowTemplates(false);
      setAddingGroup(true);
      return;
    }
    setGroupForm({
      name: t[tpl.nameKey],
      selection_type: tpl.selection_type,
      min_select: tpl.is_required ? '1' : '0',
      max_select: String(tpl.max_select),
      is_required: tpl.is_required,
      display_type: tpl.display_type,
    });
    setPendingOptions(tpl.optionNames?.[lang] ?? []);
    setShowTemplates(false);
    setAddingGroup(true);
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
      display_type: groupForm.display_type,
    });
    if (result.group) {
      let newGroup = result.group as ModifierGroup;
      for (let i = 0; i < pendingOptions.length; i++) {
        const optResult = await createModifierOption(newGroup.id, {
          name: pendingOptions[i],
          price_delta: 0,
          is_default: false,
          sort_order: i,
        });
        if (optResult.option) {
          newGroup = { ...newGroup, options: [...(newGroup.options ?? []), optResult.option as ModifierOption] };
        }
      }
      const newItems = [...items, newGroup];
      sync(newItems);
      setExpandedGroup(newGroup.id);
    }
    resetAddState();
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
      display_type: groupForm.display_type,
    });
    sync(items.map(i => i.id === g.id ? {
      ...i,
      name: groupForm.name || i.name,
      selection_type: groupForm.selection_type,
      min_select: parseInt(groupForm.min_select) || 0,
      max_select: parseInt(groupForm.max_select) || 1,
      is_required: groupForm.is_required,
      display_type: groupForm.display_type,
    } : i));
    setEditGroupId(null);
    setLoading(false);
  };

  const handleToggleDisplayType = async (g: ModifierGroup) => {
    const next: 'list' | 'grid' = g.display_type === 'grid' ? 'list' : 'grid';
    await updateModifierGroup(g.id, {
      name: g.name,
      selection_type: g.selection_type,
      min_select: g.min_select,
      max_select: g.max_select,
      is_required: g.is_required,
      sort_order: g.sort_order,
      display_type: next,
    });
    sync(items.map(i => i.id === g.id ? { ...i, display_type: next } : i));
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm(t.modifiers_deleteGroupConfirm)) return;
    setLoading(true);
    await deleteModifierGroup(id);
    sync(items.filter(i => i.id !== id));
    setLoading(false);
  };

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(g => g.id === active.id);
    const newIndex = items.findIndex(g => g.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    sync(reordered);
    reorderModifierGroups(productId, reordered.map(g => g.id));
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

  // Handle option reorder from inside SortableGroup (optimistic local update)
  const handleOptionDragEndLocal = (groupId: string, oldIndex: number, newIndex: number) => {
    sync(items.map(g => g.id === groupId
      ? { ...g, options: arrayMove(g.options, oldIndex, newIndex) }
      : g));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-gray-700">{t.modifiers_title}</span>
        </div>
        {!addingGroup && !showTemplates && (
          <button onClick={() => setShowTemplates(true)} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
            <Plus className="w-3.5 h-3.5" /> {t.modifiers_newGroup}
          </button>
        )}
      </div>

      {items.length === 0 && !addingGroup && !showTemplates && (
        <div className="text-center py-8 text-gray-400">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-gray-500">{t.modifiers_noGroups}</p>
          <p className="text-xs text-gray-400 mt-1">{t.modifiers_noGroupsDesc}</p>
          <button
            onClick={() => setShowTemplates(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> {t.modifiers_newGroup}
          </button>
        </div>
      )}

      {showTemplates && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{t.modifiers_pickTemplate}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TEMPLATES.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <button
                  key={tpl.nameKey}
                  onClick={() => applyTemplate(tpl)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all text-center group"
                >
                  <Icon className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                  <span className="text-xs font-semibold text-gray-800">{t[tpl.nameKey]}</span>
                  <span className="text-[10px] text-gray-400 leading-tight">{t[tpl.descKey]}</span>
                </button>
              );
            })}
          </div>
          <button onClick={resetAddState} className="text-xs text-gray-500 hover:text-gray-700">{t.general_cancel}</button>
        </div>
      )}

      {addingGroup && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{t.modifiers_newGroup}</p>
          <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} placeholder={t.modifiers_optionPlaceholder} autoFocus className="dash-input" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">{t.modifiers_type}</label>
              <select value={groupForm.selection_type} onChange={e => {
                const st = e.target.value as 'single' | 'multi';
                setGroupForm({ ...groupForm, selection_type: st, max_select: st === 'single' ? '1' : groupForm.max_select });
              }} className="dash-select text-sm">
                <option value="single">{t.modifiers_singleLabel}</option>
                <option value="multi">{t.modifiers_multiLabel}</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 mt-5 cursor-pointer">
                <input type="checkbox" checked={groupForm.is_required} onChange={e => setGroupForm({ ...groupForm, is_required: e.target.checked, min_select: e.target.checked ? '1' : '0' })} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30" />
                <span className="text-sm text-gray-700 font-medium">{t.modifiers_required}</span>
              </label>
            </div>
          </div>
          {groupForm.selection_type === 'multi' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">{t.modifiers_minHelper}</label>
                <input type="number" min="0" value={groupForm.min_select} onChange={e => setGroupForm({ ...groupForm, min_select: e.target.value })} className="dash-input text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">{t.modifiers_maxHelper}</label>
                <input type="number" min="1" value={groupForm.max_select} onChange={e => setGroupForm({ ...groupForm, max_select: e.target.value })} className="dash-input text-sm" />
              </div>
            </div>
          )}
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">{lang === 'en' ? 'Display style' : 'Estilo de vista'}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGroupForm({ ...groupForm, display_type: 'list' })}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all', groupForm.display_type === 'list' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300')}
              >
                <LayoutList className="w-3.5 h-3.5" /> {t.modifiers_displayList}
              </button>
              <button
                type="button"
                onClick={() => setGroupForm({ ...groupForm, display_type: 'grid' })}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all', groupForm.display_type === 'grid' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300')}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> {t.modifiers_displayGrid}
              </button>
            </div>
            {groupForm.display_type === 'grid' && (
              <p className="text-[10px] text-gray-400 mt-1">{t.modifiers_displayHint}</p>
            )}
          </div>
          {pendingOptions.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500 block">{t.modifiers_options}</label>
              <div className="flex flex-wrap gap-1.5">
                {pendingOptions.map((name, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700">
                    {name}
                    <button onClick={() => setPendingOptions(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">{t.modifiers_priceHint}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={handleAddGroup} disabled={loading || !groupForm.name.trim()} className="dash-btn-primary text-xs py-2">
              {loading ? t.modifiers_creating : t.modifiers_createGroup}
            </button>
            <button onClick={resetAddState} className="dash-btn-secondary text-xs py-2">{t.general_cancel}</button>
          </div>
        </div>
      )}

      <DndContext sensors={groupSensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
        <SortableContext items={items.map(g => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((group) => (
              <SortableGroup
                key={group.id}
                group={group}
                isExpanded={expandedGroup === group.id}
                isEditing={editGroupId === group.id}
                editGroupId={editGroupId}
                groupForm={groupForm}
                addingOptionFor={addingOptionFor}
                optionForm={optionForm}
                editOptionId={editOptionId}
                loading={loading}
                t={t}
                lang={lang}
                currSymbol={currSymbol}
                onToggleExpand={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                onStartEditGroup={() => {
                  setEditGroupId(group.id);
                  setGroupForm({ name: group.name, selection_type: group.selection_type, min_select: String(group.min_select), max_select: String(group.max_select), is_required: group.is_required, display_type: group.display_type ?? 'list' });
                }}
                onUpdateGroup={handleUpdateGroup}
                onCancelEditGroup={() => setEditGroupId(null)}
                onDeleteGroup={handleDeleteGroup}
                onToggleDisplayType={handleToggleDisplayType}
                onAddOption={handleAddOption}
                onStartAddOption={(gid) => { setAddingOptionFor(gid); setOptionForm({ name: '', price_delta: '' }); }}
                onCancelAddOption={() => { setAddingOptionFor(null); setOptionForm({ name: '', price_delta: '' }); }}
                onUpdateOption={handleUpdateOption}
                onDeleteOption={handleDeleteOption}
                onStartEditOption={(opt) => { setEditOptionId(opt.id); setOptionForm({ name: opt.name, price_delta: String(opt.price_delta) }); }}
                onCancelEditOption={() => { setEditOptionId(null); setOptionForm({ name: '', price_delta: '' }); }}
                onOptionDragEnd={handleOptionDragEndLocal}
                setGroupForm={setGroupForm}
                setOptionForm={setOptionForm}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
