import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, HardHat, X, Save, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { LaborRate } from '../types';
import { laborRateService } from '../services/laborRateService';
import { formatCurrency, cn } from '../lib/utils';
import { confirmAction } from '../hooks/useConfirm';

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  editing: LaborRate | null;
  onClose: () => void;
  onSave: () => void;
}

const EMPTY: Omit<LaborRate, 'id'> = {
  role: '',
  unit: 'H',
  costPerHour: 0,
  laborCharges: 0.72,
  totalCostPerHour: 0,
};

function LaborRateModal({ editing, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState<Omit<LaborRate, 'id'>>(
    editing ? { role: editing.role, unit: editing.unit, costPerHour: editing.costPerHour, laborCharges: editing.laborCharges, totalCostPerHour: editing.totalCostPerHour }
            : { ...EMPTY }
  );
  const [saving, setSaving] = useState(false);

  const total = form.costPerHour * (1 + form.laborCharges);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role.trim() || form.costPerHour <= 0) return;
    setSaving(true);
    try {
      const payload = { ...form, totalCostPerHour: total };
      if (editing) {
        await laborRateService.update(editing.id, payload);
        toast.success('Taxa atualizada!');
      } else {
        await laborRateService.create(payload);
        toast.success('Taxa adicionada!');
      }
      onSave();
      onClose();
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 bg-black text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">{editing ? 'Editar Função' : 'Nova Função / Taxa'}</h3>
            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Tabela de Mão de Obra</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Função / Cargo *</label>
            <input
              required
              autoFocus
              type="text"
              placeholder="Ex: Pedreiro, Eletricista, Encanador..."
              className="w-full p-4 bg-black/5 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Unidade</label>
              <select
                className="w-full p-4 bg-black/5 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value as 'H' | 'DIA' })}
              >
                <option value="H">Hora (H)</option>
                <option value="DIA">Dia (DIA)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                Custo Base (R$/{form.unit})
              </label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className="w-full p-4 bg-black/5 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                value={form.costPerHour}
                onChange={e => setForm({ ...form, costPerHour: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">
              Encargos Sociais (%) — CLT típico ≈ 72%
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="150"
                step="1"
                className="flex-1 accent-orange-500"
                value={form.laborCharges * 100}
                onChange={e => setForm({ ...form, laborCharges: parseFloat(e.target.value) / 100 })}
              />
              <span className="text-sm font-mono font-black w-14 text-right">
                {(form.laborCharges * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[10px] opacity-30 font-bold">
              Inclui: FGTS, INSS, férias, 13°, horas extras, etc.
            </p>
          </div>

          {/* Preview */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Custo Total / {form.unit}</p>
              <p className="text-xs text-orange-600 opacity-70 mt-0.5">
                R$ {form.costPerHour.toFixed(2)} × (1 + {(form.laborCharges * 100).toFixed(0)}%)
              </p>
            </div>
            <span className="text-2xl font-black text-orange-700">{formatCurrency(total)}</span>
          </div>

          <div className="flex gap-4 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-bold uppercase opacity-40 hover:opacity-100 transition-opacity">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all"
            >
              <Save size={16} /> {editing ? 'Salvar Alterações' : 'Adicionar Taxa'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LaborRateManager() {
  const [rates, setRates] = useState<LaborRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LaborRate | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await laborRateService.getAll();
    setRates(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    const ok = await confirmAction({
      title: 'Excluir esta taxa?',
      description: 'A taxa será removida permanentemente.',
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await laborRateService.delete(id);
      toast.success('Taxa removida.');
      load();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover.');
    }
  };

  const openEdit = (rate: LaborRate) => { setEditing(rate); setShowModal(true); };
  const openNew = () => { setEditing(null); setShowModal(true); };

  // Totals
  const avgCost = rates.length > 0 ? rates.reduce((s, r) => s + r.totalCostPerHour, 0) / rates.length : 0;
  const maxCost = rates.length > 0 ? Math.max(...rates.map(r => r.totalCostPerHour)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight">Tabela de Mão de Obra</h2>
          <p className="text-xs opacity-40 font-bold">Funções, taxas horárias e encargos sociais para composição de custos</p>
        </div>
        <button
          onClick={openNew}
          className="w-full md:w-auto bg-black text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-black/10 hover:opacity-90 transition-all"
        >
          <Plus size={18} /> Nova Função
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Funções Cadastradas</p>
          <p className="text-3xl font-black mt-1">{rates.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Custo Médio / H</p>
          <p className="text-3xl font-black mt-1 font-mono">{formatCurrency(avgCost)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Maior Custo / H</p>
          <p className="text-3xl font-black mt-1 font-mono text-orange-600">{formatCurrency(maxCost)}</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 font-medium">
          As taxas cadastradas aqui ficam disponíveis ao adicionar itens do tipo <strong>Mão de Obra</strong> em qualquer orçamento, através do botão "Do Catálogo". Encargo típico CLT ≈ 72%.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : rates.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-black/5 rounded-full flex items-center justify-center opacity-40">
              <HardHat size={22} />
            </div>
            <p className="text-sm font-bold opacity-50">Nenhuma taxa cadastrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest opacity-40 border-b border-black/5 bg-black/[0.01]">
                  <th className="px-6 py-4">Função / Cargo</th>
                  <th className="px-6 py-4 text-center">Unid.</th>
                  <th className="px-6 py-4 text-right">Custo Base</th>
                  <th className="px-6 py-4 text-right">Encargos</th>
                  <th className="px-6 py-4 text-right">Custo Total</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rates.map(rate => {
                  const chargesPct = (rate.laborCharges * 100).toFixed(0);
                  const chargeValue = rate.costPerHour * rate.laborCharges;
                  return (
                    <tr key={rate.id} className="hover:bg-black/[0.01] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
                            <HardHat size={14} />
                          </div>
                          <span className="text-sm font-bold">{rate.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[10px] font-mono font-bold bg-black/5 px-2 py-1 rounded-lg">
                          {rate.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold opacity-60">
                        {formatCurrency(rate.costPerHour)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs font-bold text-blue-600">{chargesPct}%</span>
                          <span className="text-[10px] font-mono opacity-40">+{formatCurrency(chargeValue)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-sm font-black text-orange-600">
                          {formatCurrency(rate.totalCostPerHour)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(rate)}
                            className="p-2 hover:bg-black/5 rounded-xl text-black/30 hover:text-black transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(rate.id)}
                            className="p-2 hover:bg-red-50 rounded-xl text-red-300 hover:text-red-600 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <LaborRateModal
            editing={editing}
            onClose={() => setShowModal(false)}
            onSave={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
