'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Layers, ChevronRight, Ruler, UtensilsCrossed, Flame, Salad, Settings2, X, LayoutList, LayoutGrid, GripVertical, GitBranch, Copy, Link2, Unlink, Loader2, Search, AlertTriangle } from 'lucide-react';
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
  listReusableModifierGroups, attachModifierGroups, unlinkModifierGroup,
  getSharedGroupCounts,
} from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { getDashboardTranslations, type DashboardLocale } from '@/lib/dashboard-translations';
import { getLocaleFlag, getLocaleLabel } from '@/lib/i18n';
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
  /** Extra locales configured for the menu, minus the default one. Empty for
   *  single-language restaurants, which hides the translation fields entirely. */
  translatableLocales?: string[];
}

/** Group form shape, shared by the "new group" and "edit group" panels. */
type GroupFormState = {
  name: string;
  selection_type: 'single' | 'multi';
  min_select: string;
  max_select: string;
  is_required: boolean;
  display_type: 'list' | 'grid';
  depends_on_option_id: string;
  translations: Record<string, string>;
};

const EMPTY_GROUP_FORM: GroupFormState = {
  name: '',
  selection_type: 'single',
  min_select: '0',
  max_select: '1',
  is_required: false,
  display_type: 'list',
  depends_on_option_id: '',
  translations: {},
};

type OptionFormState = {
  name: string;
  price_delta: string;
  is_default: boolean;
  cost_price: string;
  translations: Record<string, string>;
};

const EMPTY_OPTION_FORM: OptionFormState = {
  name: '',
  price_delta: '',
  is_default: false,
  cost_price: '',
  translations: {},
};

/** `{ en: 'Bacon' }` → `{ en: { name: 'Bacon' } }`, dropping empties. */
function toContentTranslations(
  map: Record<string, string>,
): Record<string, { name: string }> | null {
  const out: Record<string, { name: string }> = {};
  for (const [locale, name] of Object.entries(map)) {
    if (name.trim()) out[locale] = { name: name.trim() };
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Reads a cost input.
 *
 * Empty or invalid becomes null ("not tracked") rather than 0, so an add-on
 * with no cost entered is left out of the margin math instead of being counted
 * as free profit.
 */
function parseCost(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Inverse of `toContentTranslations`, for loading a row into the form. */
function fromContentTranslations(
  translations: Record<string, { name?: string }> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [locale, value] of Object.entries(translations ?? {})) {
    if (value?.name) out[locale] = value.name;
  }
  return out;
}

/** Compact name/translation inputs, reused by the group and option forms. */
function TranslationFields({
  locales,
  values,
  onChange,
  placeholder,
  label,
}: {
  locales: string[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  placeholder: string;
  label: string;
}) {
  if (locales.length === 0) return null;
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-500 mb-1 block">{label}</label>
      <div className="space-y-1.5">
        {locales.map(locale => (
          <div key={locale} className="flex items-center gap-2">
            <span className="text-sm w-6 text-center flex-shrink-0" title={getLocaleLabel(locale)}>
              {getLocaleFlag(locale)}
            </span>
            <input
              value={values[locale] ?? ''}
              onChange={e => onChange({ ...values, [locale]: e.target.value })}
              placeholder={placeholder}
              className="flex-1 text-sm px-2 py-1.5 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Picks the option this group hangs off (`depends_on_option_id`).
 *
 * The backing column and the ordering rules have existed since
 * 20260805_modifier_groups_conditional.sql — this is the control that finally
 * exposes them. Buccaneer's case: "Choice of Side" should only appear once the
 * customer picks "Deluxe", because a Regular burger comes with no side.
 *
 * Renders nothing when the product has no other options to depend on, which is
 * the case for the first group of every product.
 */
function ConditionalSelect({
  value,
  choices,
  onChange,
  t,
}: {
  value: string;
  choices: { groupName: string; options: ModifierOption[] }[];
  onChange: (v: string) => void;
  t: ReturnType<typeof getDashboardTranslations>;
}) {
  const hasChoices = choices.some(c => c.options.length > 0);
  if (!hasChoices) return null;

  return (
    <div>
      <label className="text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1">
        <GitBranch className="w-3 h-3" />
        {t.modifiers_conditionalLabel}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="dash-select text-sm"
      >
        <option value="">{t.modifiers_conditionalAlways}</option>
        {choices
          .filter(c => c.options.length > 0)
          .map(c => (
            <optgroup key={c.groupName} label={c.groupName}>
              {c.options.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </optgroup>
          ))}
      </select>
      <p className="text-[10px] text-gray-400 mt-1">{t.modifiers_conditionalHint}</p>
    </div>
  );
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
  translatableLocales,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  setOptionForm,
}: {
  opt: ModifierOption;
  groupId: string;
  editOptionId: string | null;
  optionForm: OptionFormState;
  loading: boolean;
  t: ReturnType<typeof getDashboardTranslations>;
  lang: 'es' | 'en';
  currSymbol: string;
  translatableLocales: string[];
  onEdit: (opt: ModifierOption) => void;
  onCancelEdit: () => void;
  onUpdate: (opt: ModifierOption, groupId: string) => void;
  onDelete: (optionId: string, groupId: string) => void;
  setOptionForm: (f: OptionFormState) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opt.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isEditing = editOptionId === opt.id;

  // Editing expands into a panel: name, price, cost and one field per extra
  // locale no longer fit on a single inline row.
  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="bg-emerald-50 rounded-lg px-3 py-3 border border-emerald-200 space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-medium text-gray-500 mb-0.5 block">{t.editor_name}</label>
            <input
              value={optionForm.name}
              onChange={e => setOptionForm({ ...optionForm, name: e.target.value })}
              placeholder={t.editor_name}
              className="w-full text-sm px-2 py-1.5 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
          <div className="w-28">
            <label className="text-[10px] font-medium text-gray-500 mb-0.5 block">
              {lang === 'en' ? 'Extra price' : 'Precio extra'}
            </label>
            <div className="relative">
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
          </div>
          <div className="w-28">
            <label className="text-[10px] font-medium text-gray-500 mb-0.5 block" title={t.modifiers_optionCostHint}>
              {t.modifiers_optionCost}
            </label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{currSymbol}</span>
              <input
                value={optionForm.cost_price}
                onChange={e => setOptionForm({ ...optionForm, cost_price: e.target.value })}
                placeholder="—"
                type="number"
                step="0.01"
                min="0"
                className="w-full text-sm pl-6 pr-2 py-1.5 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>

        <TranslationFields
          locales={translatableLocales}
          values={optionForm.translations}
          onChange={next => setOptionForm({ ...optionForm, translations: next })}
          placeholder={optionForm.name || t.editor_name}
          label={t.modifiers_translations}
        />

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none" title={t.modifiers_isDefaultHint}>
            <input
              type="checkbox"
              checked={optionForm.is_default}
              onChange={e => setOptionForm({ ...optionForm, is_default: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
            />
            <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">{t.modifiers_isDefaultShort}</span>
          </label>
          <button onClick={() => onUpdate(opt, groupId)} disabled={loading} className="text-xs font-bold text-emerald-600 disabled:opacity-50">{t.modifiers_save}</button>
          <button onClick={onCancelEdit} className="text-xs text-gray-500">{t.general_cancel}</button>
        </div>
      </div>
    );
  }

  const cost = opt.cost_price;
  const price = Number(opt.price_delta);
  // Margin only means something for a paid add-on with a known cost; a free or
  // untracked option would otherwise render a misleading -100%.
  const margin =
    cost != null && price > 0 ? ((price - cost) / price) * 100 : null;

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

      <span className="flex-1 text-sm text-gray-700 font-medium min-w-0 truncate">
        {opt.name}
        {opt.is_default && (
          <span className="ml-2 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 align-middle">
            {t.modifiers_isDefaultShort}
          </span>
        )}
      </span>
      {margin != null && (
        <span
          className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 hidden sm:inline',
            margin >= 60 ? 'bg-emerald-50 text-emerald-600' : margin >= 30 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500',
          )}
          title={t.modifiers_optionCostHint}
        >
          {margin.toFixed(0)}%
        </span>
      )}
      <span className={cn('text-sm font-mono px-2 py-0.5 rounded flex-shrink-0', price !== 0 ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-400')}>
        {price > 0 ? `+${currSymbol}${price.toFixed(2)}` : price < 0 ? `-${currSymbol}${Math.abs(price).toFixed(2)}` : t.modifiers_base}
      </span>
      <button onClick={() => onEdit(opt)} className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0"><Pencil className="w-3.5 h-3.5" /></button>
      <button onClick={() => onDelete(opt.id, groupId)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
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
  translatableLocales,
  dependencyChoices,
  sharedCount,
  onUnlink,
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
  groupForm: GroupFormState;
  addingOptionFor: string | null;
  optionForm: OptionFormState;
  editOptionId: string | null;
  loading: boolean;
  t: ReturnType<typeof getDashboardTranslations>;
  lang: 'es' | 'en';
  currSymbol: string;
  translatableLocales: string[];
  /** Options of the OTHER groups on this product, offered as dependencies. */
  dependencyChoices: { groupName: string; options: ModifierOption[] }[];
  /** How many products share this group's content, including this one. */
  sharedCount: number;
  onUnlink: (id: string) => void;
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
  setGroupForm: (f: GroupFormState) => void;
  setOptionForm: (f: OptionFormState) => void;
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

          <ConditionalSelect
            value={groupForm.depends_on_option_id}
            choices={dependencyChoices}
            onChange={v => setGroupForm({ ...groupForm, depends_on_option_id: v })}
            t={t}
          />

          <TranslationFields
            locales={translatableLocales}
            values={groupForm.translations}
            onChange={next => setGroupForm({ ...groupForm, translations: next })}
            placeholder={groupForm.name || t.editor_name}
            label={t.modifiers_translations}
          />

          {sharedCount > 1 && (
            <p className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
              {t.modifiers_sharedWarning.replace('{n}', String(sharedCount))}
            </p>
          )}

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

          {group.depends_on_option_id && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 bg-purple-50 text-purple-600 items-center gap-1 hidden sm:inline-flex"
              title={t.modifiers_conditionalHint}
            >
              <GitBranch className="w-2.5 h-2.5" />
              {t.modifiers_conditionalBadge}
            </span>
          )}
          {sharedCount > 1 && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 bg-blue-50 text-blue-600 items-center gap-1 hidden sm:inline-flex"
              title={t.modifiers_sharedWarning.replace('{n}', String(sharedCount))}
            >
              <Link2 className="w-2.5 h-2.5" />
              {t.modifiers_sharedBadge}
            </span>
          )}
          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0', group.is_required ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500')}>
            {ruleLabel}
          </span>
          {sharedCount > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnlink(group.id); }}
              title={t.modifiers_unlink}
              className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          )}
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
                  translatableLocales={translatableLocales}
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
                <div className="w-28">
                  <label className="text-[10px] font-medium text-gray-500 mb-0.5 block">{lang === 'en' ? 'Extra price' : 'Precio extra'}</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{currSymbol}</span>
                    <input value={optionForm.price_delta} onChange={e => setOptionForm({ ...optionForm, price_delta: e.target.value })} placeholder="0.00" type="number" step="0.01" className="w-full text-sm pl-6 pr-2 py-1.5 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5">{t.modifiers_priceHint}</p>
                </div>
                <div className="w-28">
                  <label className="text-[10px] font-medium text-gray-500 mb-0.5 block" title={t.modifiers_optionCostHint}>{t.modifiers_optionCost}</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{currSymbol}</span>
                    <input value={optionForm.cost_price} onChange={e => setOptionForm({ ...optionForm, cost_price: e.target.value })} placeholder="—" type="number" step="0.01" min="0" className="w-full text-sm pl-6 pr-2 py-1.5 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                  </div>
                </div>
              </div>

              <TranslationFields
                locales={translatableLocales}
                values={optionForm.translations}
                onChange={next => setOptionForm({ ...optionForm, translations: next })}
                placeholder={optionForm.name || t.editor_name}
                label={t.modifiers_translations}
              />
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={optionForm.is_default}
                  onChange={e => setOptionForm({ ...optionForm, is_default: e.target.checked })}
                  className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
                />
                <span>
                  <span className="text-[11px] font-medium text-gray-700 block">{t.modifiers_isDefault}</span>
                  <span className="text-[9px] text-gray-400 block">{t.modifiers_isDefaultHint}</span>
                </span>
              </label>
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

type ReusableGroup = {
  id: string;
  name: string;
  product_id: string;
  product_name: string;
  selection_type: 'single' | 'multi';
  is_required: boolean;
  option_count: number;
};

/**
 * Picks modifier groups from other dishes, either linked or copied.
 *
 * The two verbs mirror how Toast splits this ("Add existing" vs "Copy
 * existing"), because the distinction matters operationally: Buccaneer carries
 * "Término de la carne" on a dozen dishes and wants one edit to reach all of
 * them, while a one-off tweak for a single dish must not leak everywhere else.
 */
function LibraryPicker({
  productId,
  onAttached,
  onClose,
  t,
  lang,
}: {
  productId: string;
  onAttached: () => void;
  onClose: () => void;
  t: ReturnType<typeof getDashboardTranslations>;
  lang: 'es' | 'en';
}) {
  const [available, setAvailable] = useState<ReusableGroup[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // Deliberately null until chosen. The first screen is the decision itself —
  // copy or link — because it is the only thing here with consequences beyond
  // this dish, and a preselected mode invites picking groups without reading it.
  const [mode, setMode] = useState<'link' | 'copy' | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listReusableModifierGroups(productId).then(res => {
      if (alive) setAvailable(res.groups ?? []);
    });
    return () => { alive = false; };
  }, [productId]);

  const filtered = (available ?? []).filter(g => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return g.name.toLowerCase().includes(q) || g.product_name.toLowerCase().includes(q);
  });

  // Grouped by dish so the same group name coming from different dishes stays
  // distinguishable.
  const byProduct: Map<string, ReusableGroup[]> = new Map();
  for (const g of filtered) {
    const list = byProduct.get(g.product_name) ?? [];
    list.push(g);
    byProduct.set(g.product_name, list);
  }

  const toggle = (id: string) => {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAttach = async () => {
    if (picked.size === 0 || !mode) return;
    // Linking is the only irreversible-feeling action here: from this point on,
    // an edit made on this dish silently changes others. Spelled out once,
    // naming the count, before it happens.
    if (mode === 'link') {
      const ok = confirm(
        t.modifiers_linkConfirm.replace('{n}', String(picked.size)),
      );
      if (!ok) return;
    }
    setBusy(true);
    const res = await attachModifierGroups(productId, Array.from(picked), mode);
    setBusy(false);
    if (!res.error) onAttached();
  };

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
          {t.modifiers_addExisting}
        </p>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step 1 — the decision, on its own screen. Each option states its
          consequence before it is picked, instead of a footnote underneath. */}
      {mode === null ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900">{t.modifiers_modeQuestion}</p>

          <button
            type="button"
            onClick={() => setMode('copy')}
            className="w-full text-left p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 focus:outline-none focus:border-emerald-400 transition-colors group"
          >
            <span className="flex items-center gap-2 mb-1">
              <Copy className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-sm font-bold text-gray-900">{t.modifiers_copyModeTitle}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                {t.modifiers_copyModeSafe}
              </span>
            </span>
            <span className="block text-xs text-gray-600 leading-relaxed pl-6">
              {t.modifiers_copyModeBody}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode('link')}
            className="w-full text-left p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 focus:outline-none focus:border-blue-400 transition-colors"
          >
            <span className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-bold text-gray-900">{t.modifiers_linkModeTitle}</span>
            </span>
            <span className="block text-xs text-gray-600 leading-relaxed pl-6">
              {t.modifiers_linkModeBody}
            </span>
            <span className="flex items-center gap-1.5 mt-2 pl-6 text-[11px] font-semibold text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {t.modifiers_linkModeCaution}
            </span>
          </button>
        </div>
      ) : (
        <>
          {/* Step 2 — the chosen mode stays visible and reversible, so the
              decision never scrolls out of sight while picking groups. */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border',
            mode === 'link' ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200',
          )}>
            {mode === 'link'
              ? <Link2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              : <Copy className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
            <span className={cn(
              'text-xs font-bold flex-1 min-w-0',
              mode === 'link' ? 'text-blue-800' : 'text-emerald-800',
            )}>
              {mode === 'link' ? t.modifiers_linkModeTitle : t.modifiers_copyModeTitle}
            </span>
            <button
              onClick={() => { setMode(null); setPicked(new Set()); }}
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 underline flex-shrink-0"
            >
              {t.modifiers_changeMode}
            </button>
          </div>

      {available === null ? (
        <div className="flex items-center justify-center py-6 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : available.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-6">{t.modifiers_libraryEmpty}</p>
      ) : (
        <>
          <p className="text-xs font-semibold text-gray-700">{t.modifiers_pickGroups}</p>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.modifiers_copyFromSearch}
              className="w-full text-sm pl-8 pr-2 py-1.5 rounded bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
            {Array.from(byProduct.entries()).map(([productName, list]) => (
              <div key={productName}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{productName}</p>
                <div className="space-y-1">
                  {list.map(g => (
                    <label
                      key={g.id}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all',
                        picked.has(g.id)
                          ? mode === 'link'
                            ? 'bg-white border-blue-400'
                            : 'bg-white border-emerald-400'
                          : 'bg-white/60 border-gray-200 hover:border-gray-300',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={picked.has(g.id)}
                        onChange={() => toggle(g.id)}
                        className={cn(
                          'w-4 h-4 rounded border-gray-300 focus:ring-2',
                          mode === 'link'
                            ? 'text-blue-600 focus:ring-blue-400'
                            : 'text-emerald-600 focus:ring-emerald-400',
                        )}
                      />
                      <span className="flex-1 text-sm text-gray-800 font-medium truncate">{g.name}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {g.option_count} {t.modifiers_options}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* The button names the action and the count, so the last thing read
              before committing is what will actually happen. */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleAttach}
              disabled={busy || picked.size === 0}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                mode === 'link'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700',
              )}
            >
              {busy ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.modifiers_copying}</>
              ) : mode === 'link' ? (
                <><Link2 className="w-3.5 h-3.5" /> {t.modifiers_linkAction.replace('{n}', String(picked.size))}</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> {t.modifiers_copyAction.replace('{n}', String(picked.size))}</>
              )}
            </button>
            <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 ml-auto">
              {t.general_cancel}
            </button>
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function ModifierGroupsEditor({ groups, productId, onUpdate, locale: localeProp, currency, translatableLocales = [] }: ModifierGroupsEditorProps) {
  const [items, setItems] = useState(groups);
  const [showTemplates, setShowTemplates] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState<GroupFormState>(EMPTY_GROUP_FORM);
  const [pendingOptions, setPendingOptions] = useState<string[]>([]);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(groups[0]?.id ?? null);
  const [addingOptionFor, setAddingOptionFor] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState<OptionFormState>(EMPTY_OPTION_FORM);
  const [editOptionId, setEditOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const router = useRouter();
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
    setGroupForm(EMPTY_GROUP_FORM);
  };

  const applyTemplate = (tpl: Template) => {
    if (tpl.nameKey === 'modifiers_templateCustom') {
      setShowTemplates(false);
      setAddingGroup(true);
      return;
    }
    setGroupForm({
      ...EMPTY_GROUP_FORM,
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
      depends_on_option_id: groupForm.depends_on_option_id || null,
      translations: toContentTranslations(groupForm.translations),
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
      depends_on_option_id: groupForm.depends_on_option_id || null,
      translations: toContentTranslations(groupForm.translations),
    });
    sync(items.map(i => i.id === g.id ? {
      ...i,
      name: groupForm.name || i.name,
      selection_type: groupForm.selection_type,
      min_select: parseInt(groupForm.min_select) || 0,
      max_select: parseInt(groupForm.max_select) || 1,
      is_required: groupForm.is_required,
      display_type: groupForm.display_type,
      depends_on_option_id: groupForm.depends_on_option_id || null,
      translations: toContentTranslations(groupForm.translations),
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
      // Carried through explicitly: updateModifierGroup writes every field, so
      // omitting these would wipe the group's dependency and translations on a
      // simple list/grid toggle.
      depends_on_option_id: g.depends_on_option_id ?? null,
      translations: g.translations ?? null,
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

  // A single-select group can only have one "included by default" option.
  // Persist the un-marking of the others so the DB matches what the editor shows.
  const clearOtherDefaults = async (group: ModifierGroup, keepId: string) => {
    const stale = (group.options ?? []).filter(o => o.id !== keepId && o.is_default);
    await Promise.all(
      stale.map(o =>
        updateModifierOption(o.id, {
          name: o.name,
          price_delta: o.price_delta,
          is_default: false,
          sort_order: o.sort_order,
          // Preserved explicitly — the update writes every field, so leaving
          // these out would clear the option's cost and translations.
          cost_price: o.cost_price ?? null,
          translations: o.translations ?? null,
        }),
      ),
    );
  };

  const handleAddOption = async (groupId: string) => {
    if (!optionForm.name.trim()) return;
    setLoading(true);
    const group = items.find(g => g.id === groupId);
    const result = await createModifierOption(groupId, {
      name: optionForm.name,
      price_delta: parseFloat(optionForm.price_delta) || 0,
      is_default: optionForm.is_default,
      sort_order: (group?.options.length ?? 0),
      cost_price: parseCost(optionForm.cost_price),
      translations: toContentTranslations(optionForm.translations),
    });
    if (result.option) {
      const added = result.option as ModifierOption;
      sync(items.map(g => g.id === groupId
        ? {
            ...g,
            options: [
              // In a single-select group only one option can be the included one.
              ...(added.is_default && g.selection_type === 'single'
                ? g.options.map(o => ({ ...o, is_default: false }))
                : g.options),
              added,
            ],
          }
        : g));
      if (added.is_default && group?.selection_type === 'single') {
        await clearOtherDefaults(group, added.id);
      }
    }
    setOptionForm(EMPTY_OPTION_FORM);
    setAddingOptionFor(null);
    setLoading(false);
  };

  const handleUpdateOption = async (opt: ModifierOption, groupId: string) => {
    setLoading(true);
    const group = items.find(g => g.id === groupId);
    const nextDefault = optionForm.is_default;
    await updateModifierOption(opt.id, {
      name: optionForm.name || opt.name,
      price_delta: parseFloat(optionForm.price_delta) || 0,
      is_default: nextDefault,
      sort_order: opt.sort_order,
      cost_price: parseCost(optionForm.cost_price),
      translations: toContentTranslations(optionForm.translations),
    });
    if (nextDefault && group?.selection_type === 'single') {
      await clearOtherDefaults(group, opt.id);
    }
    sync(items.map(g => g.id === groupId
      ? { ...g, options: g.options.map(o => {
          const isTarget = o.id === opt.id;
          // Single-select: marking one included un-marks the rest.
          const is_default = isTarget
            ? nextDefault
            : (nextDefault && g.selection_type === 'single' ? false : o.is_default);
          return isTarget
            ? {
                ...o,
                name: optionForm.name || o.name,
                price_delta: parseFloat(optionForm.price_delta) || 0,
                is_default,
                cost_price: parseCost(optionForm.cost_price),
                translations: toContentTranslations(optionForm.translations),
              }
            : { ...o, is_default };
        }) }
      : g));
    setEditOptionId(null);
    setOptionForm(EMPTY_OPTION_FORM);
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

  /**
   * How many dishes share each group's content, keyed by origin id.
   *
   * Counted from the reusable-groups listing rather than from `items`: the
   * siblings of a shared group live on OTHER products, so this product's own
   * list can never see them. Only fetched when something here is actually
   * linked, which is the uncommon case.
   */
  const [sharedCounts, setSharedCounts] = useState<Map<string, number>>(new Map());
  // Bumped when linking/unlinking changes the sharing graph. Depending on
  // `items` instead would refetch on every keystroke of a rename.
  const [groupsRevision, setGroupsRevision] = useState(0);

  // Fetched rather than derived: the siblings live on OTHER dishes, so this
  // product's own list cannot see them. It also has to cover the ORIGIN group,
  // whose shared_origin_id is NULL — standing on the dish where the group was
  // created must still warn that edits fan out, which is exactly where an owner
  // would least expect it.
  //
  // Keyed by group id (not by origin) so both the origin and its linked copies
  // resolve directly.
  useEffect(() => {
    let alive = true;
    getSharedGroupCounts(productId).then(res => {
      if (!alive) return;
      setSharedCounts(new Map(Object.entries(res.counts ?? {})));
    });
    return () => { alive = false; };
  }, [productId, groupsRevision]);

  const handleUnlink = async (id: string) => {
    if (!confirm(t.modifiers_unlinkConfirm)) return;
    setLoading(true);
    const res = await unlinkModifierGroup(id);
    setLoading(false);
    if (!res.error) {
      sync(items.map(g => g.id === id ? { ...g, shared_origin_id: null } : g));
      setGroupsRevision(r => r + 1);
    }
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
        {!addingGroup && !showTemplates && !showLibrary && (
          <div className="flex items-center gap-3">
            <button onClick={() => setShowLibrary(true)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
              <Copy className="w-3.5 h-3.5" /> {t.modifiers_addExisting}
            </button>
            <button onClick={() => setShowTemplates(true)} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
              <Plus className="w-3.5 h-3.5" /> {t.modifiers_newGroup}
            </button>
          </div>
        )}
      </div>

      {showLibrary && (
        <LibraryPicker
          productId={productId}
          t={t}
          lang={lang}
          onClose={() => setShowLibrary(false)}
          onAttached={() => {
            setShowLibrary(false);
            // Attached rows are built server-side (ids, fan-out, sort_order), so
            // the editor refetches instead of guessing what was created.
            router.refresh();
          }}
        />
      )}

      {items.length === 0 && !addingGroup && !showTemplates && !showLibrary && (
        <div className="text-center py-8 text-gray-400">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-gray-500">{t.modifiers_noGroups}</p>
          <p className="text-xs text-gray-400 mt-1">{t.modifiers_noGroupsDesc}</p>
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setShowTemplates(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {t.modifiers_newGroup}
            </button>
            <button
              onClick={() => setShowLibrary(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> {t.modifiers_copyFrom}
            </button>
          </div>
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

          <ConditionalSelect
            value={groupForm.depends_on_option_id}
            choices={items.map(g => ({ groupName: g.name, options: g.options }))}
            onChange={v => setGroupForm({ ...groupForm, depends_on_option_id: v })}
            t={t}
          />

          <TranslationFields
            locales={translatableLocales}
            values={groupForm.translations}
            onChange={next => setGroupForm({ ...groupForm, translations: next })}
            placeholder={groupForm.name || t.editor_name}
            label={t.modifiers_translations}
          />
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
                translatableLocales={translatableLocales}
                // A group can only depend on an option of ANOTHER group —
                // depending on its own would be circular and never resolve.
                dependencyChoices={items
                  .filter(g => g.id !== group.id)
                  .map(g => ({ groupName: g.name, options: g.options }))}
                sharedCount={sharedCounts.get(group.id) ?? 1}
                onUnlink={handleUnlink}
                onToggleExpand={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                onStartEditGroup={() => {
                  setEditGroupId(group.id);
                  setGroupForm({
                    name: group.name,
                    selection_type: group.selection_type,
                    min_select: String(group.min_select),
                    max_select: String(group.max_select),
                    is_required: group.is_required,
                    display_type: group.display_type ?? 'list',
                    depends_on_option_id: group.depends_on_option_id ?? '',
                    translations: fromContentTranslations(group.translations),
                  });
                }}
                onUpdateGroup={handleUpdateGroup}
                onCancelEditGroup={() => setEditGroupId(null)}
                onDeleteGroup={handleDeleteGroup}
                onToggleDisplayType={handleToggleDisplayType}
                onAddOption={handleAddOption}
                onStartAddOption={(gid) => { setAddingOptionFor(gid); setOptionForm(EMPTY_OPTION_FORM); }}
                onCancelAddOption={() => { setAddingOptionFor(null); setOptionForm(EMPTY_OPTION_FORM); }}
                onUpdateOption={handleUpdateOption}
                onDeleteOption={handleDeleteOption}
                onStartEditOption={(opt) => {
                  setEditOptionId(opt.id);
                  setOptionForm({
                    name: opt.name,
                    price_delta: String(opt.price_delta),
                    is_default: opt.is_default ?? false,
                    cost_price: opt.cost_price != null ? String(opt.cost_price) : '',
                    translations: fromContentTranslations(opt.translations),
                  });
                }}
                onCancelEditOption={() => { setEditOptionId(null); setOptionForm(EMPTY_OPTION_FORM); }}
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
