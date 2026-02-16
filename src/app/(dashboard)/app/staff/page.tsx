'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Loader2, Mail, Shield, ChefHat, UserCheck, UserX } from 'lucide-react';

interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'staff' | 'kitchen';
  status: 'pending' | 'active' | 'inactive';
  invited_at: string;
  accepted_at: string | null;
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-700', icon: Shield },
  manager: { label: 'Gerente', color: 'bg-blue-100 text-blue-700', icon: Shield },
  staff: { label: 'Mesero', color: 'bg-green-100 text-green-700', icon: UserCheck },
  kitchen: { label: 'Cocina', color: 'bg-orange-100 text-orange-700', icon: ChefHat },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'text-amber-500' },
  active: { label: 'Activo', color: 'text-emerald-500' },
  inactive: { label: 'Inactivo', color: 'text-zinc-500' },
};

export default function StaffPage() {
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
    if (!confirm('¿Eliminar a este miembro del equipo?')) return;
    await fetch('/api/tenant/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchStaff();
  };

  const handleToggleStatus = async (member: StaffMember) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    await fetch('/api/tenant/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id, status: newStatus }),
    });
    fetchStaff();
  };

  const handleChangeRole = async (id: string, newRole: string) => {
    await fetch('/api/tenant/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role: newRole }),
    });
    fetchStaff();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-white">Equipo</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition"
        >
          <Plus className="w-4 h-4" />
          Invitar Miembro
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleInvite} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Nombre completo*</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Email*</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juan@correo.com"
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Rol*</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="staff">Mesero</option>
                <option value="kitchen">Cocina</option>
              </select>
            </div>
          </div>
          {formError && <p className="text-red-400 text-sm">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Invitar
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay miembros en el equipo.</p>
          <p className="text-sm mt-1">Invita a tu equipo para que ayuden a gestionar el restaurante.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map(m => {
            const roleInfo = ROLE_LABELS[m.role] || ROLE_LABELS.staff;
            const statusInfo = STATUS_LABELS[m.status] || STATUS_LABELS.pending;
            return (
              <div key={m.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-sm">
                    {m.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{m.full_name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleInfo.color}`}>{roleInfo.label}</span>
                      <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-sm mt-0.5">
                      <Mail className="w-3.5 h-3.5" /> {m.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={e => handleChangeRole(m.id, e.target.value)}
                    className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-300"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Gerente</option>
                    <option value="staff">Mesero</option>
                    <option value="kitchen">Cocina</option>
                  </select>
                  <button
                    onClick={() => handleToggleStatus(m)}
                    title={m.status === 'active' ? 'Desactivar' : 'Activar'}
                    className={`p-1.5 rounded-lg transition ${m.status === 'active' ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-zinc-600 hover:bg-zinc-800'}`}
                  >
                    {m.status === 'active' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
