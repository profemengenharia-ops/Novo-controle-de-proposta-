import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Plus, Search, Edit3, Trash2, X, Save, Building2, Phone, Mail,
  MapPin, FileText, UserPlus, Star, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { Client, ClientContact } from '../types';
import { clientService } from '../services/clientService';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

interface Props {
  selectedClientId?: string | null;
  onSelectClient: (clientId: string) => void;
  onClientsChanged?: () => void;
}

const emptyContact = (): ClientContact => ({
  id: crypto.randomUUID(),
  name: '',
  role: '',
  email: '',
  phone: '',
  isPrimary: false,
});

const emptyClient = (): Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> => ({
  companyName: '',
  tradeName: '',
  cnpj: '',
  cpf: '',
  ie: '',
  segment: '',
  contacts: [],
  billingAddress: '',
  city: '',
  state: '',
  cep: '',
  notes: '',
});

export function ClientManager({ selectedClientId, onSelectClient, onClientsChanged }: Props) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Client | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await clientService.getAll();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      c.companyName.toLowerCase().includes(q) ||
      (c.tradeName ?? '').toLowerCase().includes(q) ||
      (c.cnpj ?? '').toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q),
    );
  }, [clients, search]);

  const handleNew = () => {
    setEditing({ ...(emptyClient() as Client), id: '', createdAt: '', updatedAt: '', createdBy: '' });
    setShowModal(true);
  };

  const handleEdit = (c: Client) => {
    setEditing({ ...c });
    setShowModal(true);
  };

  const handleDelete = async (c: Client) => {
    if (!confirm(`Excluir cliente "${c.companyName}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await clientService.delete(c.id);
      toast.success('Cliente excluído');
      await load();
      onClientsChanged?.();
    } catch (err) {
      toast.error('Erro ao excluir cliente');
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/10 p-2.5 rounded-xl text-orange-500">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">Clientes</h3>
            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
              {clients.length} cadastrado{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <button
          onClick={handleNew}
          className="px-4 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-800 transition-all active:scale-95 shadow-lg"
        >
          <Plus size={14} /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 shrink-0">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por razão social, CNPJ, cidade…"
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-black/5 rounded-xl text-sm font-medium focus:outline-none focus:border-black/30 transition-colors"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto -mr-2 pr-2 min-h-0">
        {loading ? (
          <div className="py-16 text-center text-xs opacity-40 font-bold uppercase tracking-widest">
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="mx-auto opacity-20 mb-3" />
            <p className="text-sm opacity-40 font-bold">
              {clients.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum cliente encontrado.'}
            </p>
            {clients.length === 0 && (
              <button
                onClick={handleNew}
                className="mt-4 text-xs font-bold text-orange-500 hover:text-orange-600 uppercase tracking-widest"
              >
                + Cadastrar o primeiro
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => {
              const isSelected = selectedClientId === c.id;
              const primaryContact = c.contacts.find(ct => ct.isPrimary) ?? c.contacts[0];
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onSelectClient(c.id)}
                  className={cn(
                    'group bg-white rounded-2xl border p-4 cursor-pointer transition-all',
                    isSelected
                      ? 'border-orange-400 ring-2 ring-orange-200 shadow-md'
                      : 'border-black/5 hover:border-black/20 hover:shadow-sm',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 size={14} className="opacity-40 shrink-0" />
                        <p className="text-sm font-black truncate">{c.companyName}</p>
                      </div>
                      {c.tradeName && (
                        <p className="text-[11px] opacity-60 font-bold truncate ml-6">{c.tradeName}</p>
                      )}
                      <div className="ml-6 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono opacity-50">
                        {c.cnpj && <span>{c.cnpj}</span>}
                        {c.city && c.state && <span>· {c.city}/{c.state}</span>}
                        {c.segment && (
                          <span className="inline-flex items-center gap-1">
                            · <Briefcase size={9} /> {c.segment}
                          </span>
                        )}
                      </div>
                      {primaryContact && (
                        <div className="ml-6 mt-2 flex items-center gap-3 text-[10px] opacity-60 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <UserPlus size={10} /> {primaryContact.name || '—'}
                          </span>
                          {primaryContact.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone size={10} /> {primaryContact.phone}
                            </span>
                          )}
                          {primaryContact.email && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <Mail size={10} /> {primaryContact.email}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleEdit(c); }}
                        className="p-1.5 hover:bg-black/5 rounded-lg"
                        title="Editar"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(c); }}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && editing && (
          <ClientFormModal
            initial={editing}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSaved={async () => {
              await load();
              onClientsChanged?.();
            }}
            userId={user?.id ?? 'mock-user'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Modal de cadastro/edição ────────────────────────────────────────────────

interface ModalProps {
  initial: Client;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
}

function ClientFormModal({ initial, onClose, onSaved, userId }: ModalProps) {
  const isNew = !initial.id;
  const [form, setForm] = useState<Client>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Client>(k: K, v: Client[K]) => setForm(f => ({ ...f, [k]: v }));

  const addContact = () => setForm(f => ({
    ...f,
    contacts: [...f.contacts, { ...emptyContact(), isPrimary: f.contacts.length === 0 }],
  }));

  const updateContact = (id: string, updates: Partial<ClientContact>) => setForm(f => ({
    ...f,
    contacts: f.contacts.map(c => c.id === id ? { ...c, ...updates } : c),
  }));

  const removeContact = (id: string) => setForm(f => ({
    ...f,
    contacts: f.contacts.filter(c => c.id !== id),
  }));

  const setPrimary = (id: string) => setForm(f => ({
    ...f,
    contacts: f.contacts.map(c => ({ ...c, isPrimary: c.id === id })),
  }));

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast.error('Informe a razão social.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        companyName: form.companyName.trim(),
        tradeName: form.tradeName?.trim() || undefined,
        cnpj: form.cnpj?.trim() || undefined,
        cpf: form.cpf?.trim() || undefined,
        ie: form.ie?.trim() || undefined,
        segment: form.segment?.trim() || undefined,
        contacts: form.contacts.filter(c => c.name.trim()),
        billingAddress: form.billingAddress?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
        cep: form.cep?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };
      if (isNew) {
        await clientService.create(payload, userId);
        toast.success('Cliente cadastrado');
      } else {
        await clientService.update(form.id, payload);
        toast.success('Cliente atualizado');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar cliente');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-black text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-xl"><Users size={18} /></div>
            <div>
              <h3 className="text-base font-black">{isNew ? 'Novo Cliente' : 'Editar Cliente'}</h3>
              <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
                Cadastro Comercial
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identificação */}
          <section className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
              <Building2 size={11} /> Identificação
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Razão Social *" col={2}>
                <input
                  value={form.companyName}
                  onChange={e => set('companyName', e.target.value)}
                  placeholder="Empresa Exemplo S.A."
                  className={inputCls}
                />
              </Field>
              <Field label="Nome Fantasia">
                <input
                  value={form.tradeName ?? ''}
                  onChange={e => set('tradeName', e.target.value)}
                  placeholder="Exemplo"
                  className={inputCls}
                />
              </Field>
              <Field label="Segmento">
                <input
                  value={form.segment ?? ''}
                  onChange={e => set('segment', e.target.value)}
                  placeholder="Construção, indústria…"
                  className={inputCls}
                />
              </Field>
              <Field label="CNPJ">
                <input
                  value={form.cnpj ?? ''}
                  onChange={e => set('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className={inputCls}
                />
              </Field>
              <Field label="CPF (se PF)">
                <input
                  value={form.cpf ?? ''}
                  onChange={e => set('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  className={inputCls}
                />
              </Field>
              <Field label="Inscrição Estadual">
                <input
                  value={form.ie ?? ''}
                  onChange={e => set('ie', e.target.value)}
                  placeholder="000.000.000.000"
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          {/* Endereço */}
          <section className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
              <MapPin size={11} /> Endereço de Cobrança
            </h4>
            <div className="grid grid-cols-6 gap-3">
              <Field label="Endereço" col={4}>
                <input
                  value={form.billingAddress ?? ''}
                  onChange={e => set('billingAddress', e.target.value)}
                  placeholder="Rua, número, complemento"
                  className={inputCls}
                />
              </Field>
              <Field label="CEP" col={2}>
                <input
                  value={form.cep ?? ''}
                  onChange={e => set('cep', e.target.value)}
                  placeholder="00000-000"
                  className={inputCls}
                />
              </Field>
              <Field label="Cidade" col={4}>
                <input
                  value={form.city ?? ''}
                  onChange={e => set('city', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="UF" col={2}>
                <input
                  value={form.state ?? ''}
                  onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          {/* Contatos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
                <UserPlus size={11} /> Contatos ({form.contacts.length})
              </h4>
              <button
                onClick={addContact}
                className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                <Plus size={11} /> Adicionar
              </button>
            </div>

            {form.contacts.length === 0 ? (
              <div className="py-8 text-center bg-black/[0.02] rounded-xl border border-dashed border-black/10">
                <p className="text-xs opacity-40 font-bold">Nenhum contato cadastrado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {form.contacts.map(ct => (
                  <div
                    key={ct.id}
                    className={cn(
                      'rounded-xl border p-3 grid grid-cols-12 gap-2',
                      ct.isPrimary ? 'bg-orange-50 border-orange-200' : 'bg-black/[0.02] border-black/5',
                    )}
                  >
                    <input
                      value={ct.name}
                      onChange={e => updateContact(ct.id, { name: e.target.value })}
                      placeholder="Nome"
                      className="col-span-3 px-2.5 py-1.5 text-xs bg-white border border-black/10 rounded-lg focus:outline-none focus:border-black/30"
                    />
                    <input
                      value={ct.role ?? ''}
                      onChange={e => updateContact(ct.id, { role: e.target.value })}
                      placeholder="Cargo"
                      className="col-span-2 px-2.5 py-1.5 text-xs bg-white border border-black/10 rounded-lg focus:outline-none focus:border-black/30"
                    />
                    <input
                      value={ct.email ?? ''}
                      onChange={e => updateContact(ct.id, { email: e.target.value })}
                      placeholder="email@empresa.com"
                      className="col-span-3 px-2.5 py-1.5 text-xs bg-white border border-black/10 rounded-lg focus:outline-none focus:border-black/30"
                    />
                    <input
                      value={ct.phone ?? ''}
                      onChange={e => updateContact(ct.id, { phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="col-span-2 px-2.5 py-1.5 text-xs bg-white border border-black/10 rounded-lg focus:outline-none focus:border-black/30"
                    />
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPrimary(ct.id)}
                        title={ct.isPrimary ? 'Contato principal' : 'Tornar principal'}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          ct.isPrimary
                            ? 'text-orange-500 bg-orange-100'
                            : 'opacity-40 hover:opacity-100 hover:bg-black/5',
                        )}
                      >
                        <Star size={12} fill={ct.isPrimary ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => removeContact(ct.id)}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg opacity-60"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notas */}
          <section className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
              <FileText size={11} /> Observações
            </h4>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Histórico, particularidades comerciais, etc."
              className="w-full px-3 py-2 text-sm bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black/30 resize-none"
            />
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/5 flex items-center justify-end gap-2 shrink-0 bg-black/[0.01]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-black/10 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black/5 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2"
          >
            <Save size={13} /> {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black/30 transition-colors';

function Field({ label, col = 1, children }: { label: string; col?: number; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', col === 2 ? 'col-span-2' : col === 4 ? 'col-span-4' : col === 6 ? 'col-span-6' : '')}>
      <label className="text-[10px] font-black uppercase tracking-widest opacity-50">{label}</label>
      {children}
    </div>
  );
}
