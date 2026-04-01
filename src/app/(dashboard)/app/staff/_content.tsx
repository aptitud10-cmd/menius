'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Loader2, Mail, Shield, ChefHat, UserCheck, UserX, UserPlus, Bike, Phone, ToggleLeft, ToggleRight } from 'lucide-react';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface Driver {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
}

function DriversSection({ t }: { t: any }) {
  const { locale } = useDashboardLocale();
  const en = locale === 'en';
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/tenant/drivers');
    const data = await res.json();
    setDrivers(data.drivers ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/tenant/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });
    setName(''); setPhone(''); setShowForm(false); setSaving(false);
    fetch_();
  };

  const toggle = async (d: Driver) => {
    await fetch('/api/tenant/drivers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id, is_active: !d.is_active }),
    });
    fetch_();
  };

  const del = async (id: string) => {
    if (!confirm(en ? 'Delete this driver?' : '¿Eliminar este repartidor?')) return;
    await fetch('/api/tenant/drivers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetch_();
  };

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bike className="w-6 h-6 text-emerald-500" />
          <h2 className="text-lg font-bold text-gray-900">{en ? 'Delivery Drivers' : 'Repartidores'}</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          {en ? 'Add driver' : 'Agregar repartidor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{en ? 'Name' : 'Nombre'}</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder={en ? 'John Doe' : 'Juan Pérez'} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{en ? 'Phone' : 'Teléfono'}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="+1 555 123 4567" />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            {en ? 'Save' : 'Guardar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">{en ? 'Cancel' : 'Cancelar'}</button>
        </form>
      )}

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Bike className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{en ? 'No drivers yet. Add your first driver.' : 'No hay repartidores. Agrega el primero.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drivers.map(d => (
            <div key={d.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-sm">
                  {d.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                  {d.phone && (
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                      <Phone className="w-3 h-3" />{d.phone}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${d.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {d.is_active ? (en ? 'Active' : 'Activo') : (en ? 'Inactive' : 'Inactivo')}
                </span>
                <button onClick={() => toggle(d)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                  {d.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                </button>
                <button onClick={() => del(d.id)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-400 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'staff' | 'kitchen';
  status: 'pending' | 'active' | 'inactive';
  invited_at: string;
  accepted_at: string | null;
}

export default function StaffContent() {
  const { t } = useDashboardLocale();

  const ROLE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    admin: { label: t.staff_roleAdmin, color: 'bg-purple-500/[0.1] text-purple-400', icon: Shield },
    manager: { label: t.staff_roleManager, color: 'bg-blue-500/[0.1] text-blue-400', icon: Shield },
    staff: { label: t.staff_roleStaff, color: 'bg-green-500/[0.1] text-green-400', icon: UserCheck },
    kitchen: { label: t.staff_roleKitchen, color: 'bg-orange-500/[0.1] text-orange-400', icon: ChefHat },
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: t.staff_statusPending, color: 'text-amber-500' },
    active: { label: t.staff_statusActive, color: 'text-emerald-500' },
    inactive: { label: t.staff_statusInactive, color: 'text-zinc-500' },
  };
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('staff');
  const [formError, setFormError] = useState('');

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/tenant/staff');
    const data = await res.json();
    setMembers(data.staff ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const resetForm = () => {
    setEmail(''); setFullName(''); setRole('staff'); setFormError(''); setShowForm(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const res = await fetch('/api/tenant/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName, role }),
    });
    if (res.ok) { resetForm(); fetchStaff(); }
    else { const d = await res.json(); setFormError(d.error); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.staff_deleteConfirm)) return;
    await fetch('/api/tenant/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchStaff();
  };

  const handleToggleStatus = async (member: StaffMember) => {
    if (!confirm(`${member.status === 'active' ? t.staff_toggleDeactivate : t.staff_toggleActivate} ${member.full_name || member.email}?`)) return;
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    await fetch('/api/tenant/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id, status: newStatus }),
    });
    fetchStaff();
  };

  const handleChangeRole = async (id: string, newRole: string) => {
    if (!confirm(t.staff_changeRoleConfirm)) return;
    await fetch('/api/tenant/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role: newRole }),
    });
    fetchStaff();
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-blue-500" />
          <h1 className="dash-heading">{t.staff_title}</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          {t.staff_inviteMember}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleInvite} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t.staff_fullName}</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t.staff_email}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juan@correo.com"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t.staff_role}</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
              >
                <option value="admin">{t.staff_roleAdmin}</option>
                <option value="manager">{t.staff_roleManager}</option>
                <option value="staff">{t.staff_roleStaff}</option>
                <option value="kitchen">{t.staff_roleKitchen}</option>
              </select>
            </div>
          </div>
          {formError && <p className="text-red-400 text-sm">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.staff_invite}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition">
              {t.staff_cancel}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-gray-700">{t.staff_noMembers}</p>
          <p className="text-sm mt-1">{t.staff_noMembersDesc}</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {t.staff_inviteMember ?? 'Invitar miembro'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map(m => {
            const roleInfo = ROLE_LABELS[m.role] || ROLE_LABELS.staff;
            const statusInfo = STATUS_LABELS[m.status] || STATUS_LABELS.pending;
            return (
              <div key={m.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm">
                    {m.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-gray-900 font-medium">{m.full_name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleInfo.color}`}>{roleInfo.label}</span>
                      <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-0.5">
                      <Mail className="w-3.5 h-3.5" /> {m.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={e => handleChangeRole(m.id, e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700"
                  >
                    <option value="admin">{t.staff_roleAdmin}</option>
                    <option value="manager">{t.staff_roleManager}</option>
                    <option value="staff">{t.staff_roleStaff}</option>
                    <option value="kitchen">{t.staff_roleKitchen}</option>
                  </select>
                  <button
                    onClick={() => handleToggleStatus(m)}
                    title={m.status === 'active' ? t.staff_toggleDeactivate : t.staff_toggleActivate}
                    className={`p-1.5 rounded-lg transition ${m.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {m.status === 'active' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DriversSection t={t} />
    </div>
  );
}
