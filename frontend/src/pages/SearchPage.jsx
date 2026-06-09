import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const CABINS = ['economy','premium_economy','business','first'];
const CABIN_LABELS = { economy:'Económica', premium_economy:'Económica Premium', business:'Executiva', first:'Primeira Classe' };

export function SearchPage() {
  const [tab, setTab] = useState('flight');
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { passengers: 1, cabin_class: 'economy', currency: 'MZN' },
  });

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/api/requests', data),
    onSuccess: (res) => {
      toast.success(`Solicitação ${res.data.reference} criada!`);
      navigate('/requests');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Erro ao criar solicitação'),
  });

  function onSubmit(values) {
    submitMutation.mutate({ ...values, trip_type: tab });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-xl mb-6">Nova Solicitação de Viagem</h1>

      {/* Tab switch */}
      <div className="flex gap-1 bg-surface border border-navy-border rounded-lg p-1 w-fit mb-6">
        {[['flight','✈ Voo'],['hotel','🏨 Hotel'],['package','📦 Pacote']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${tab===t ? 'bg-gold text-navy' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">

        {/* VOO */}
        {(tab === 'flight' || tab === 'package') && (
          <section>
            <h3 className="text-xs text-gold uppercase tracking-wider mb-3">Detalhes do voo</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Origem</label>
                <input {...register('origin')} className="input" placeholder="MPM – Maputo" defaultValue="MPM" />
              </div>
              <div>
                <label className="label">Destino *</label>
                <input {...register('destination', { required: 'Destino obrigatório' })}
                  className={`input ${errors.destination ? 'border-red-500' : ''}`}
                  placeholder="Ex: JNB, LIS, CDG, NBO..." />
                {errors.destination && <p className="text-red-400 text-xs mt-1">{errors.destination.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Data de partida *</label>
                <input {...register('departure_date', { required: true })} className="input" type="date" />
              </div>
              <div>
                <label className="label">Data de regresso</label>
                <input {...register('return_date')} className="input" type="date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Passageiros</label>
                <select {...register('passengers')} className="input">
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} passageiro{n>1?'s':''}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Classe</label>
                <select {...register('cabin_class')} className="input">
                  {CABINS.map(c => <option key={c} value={c}>{CABIN_LABELS[c]}</option>)}
                </select>
              </div>
            </div>
          </section>
        )}

        {/* HOTEL */}
        {(tab === 'hotel' || tab === 'package') && (
          <section>
            <h3 className="text-xs text-gold uppercase tracking-wider mb-3">Detalhes do hotel</h3>
            {tab === 'hotel' && (
              <div className="mb-3">
                <label className="label">Cidade de destino *</label>
                <input {...register('destination', { required: true })} className="input" placeholder="Ex: Johannesburg, Lisboa..." />
              </div>
            )}
            <div className="mb-3">
              <label className="label">Nome do hotel (opcional)</label>
              <input {...register('hotel_name')} className="input" placeholder="Sandton Sun, ibis..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Check-in</label>
                <input {...register('hotel_checkin')} className="input" type="date" />
              </div>
              <div>
                <label className="label">Check-out</label>
                <input {...register('hotel_checkout')} className="input" type="date" />
              </div>
            </div>
          </section>
        )}

        {/* GESTÃO */}
        <section className="border-t border-navy-border pt-5">
          <h3 className="text-xs text-gold uppercase tracking-wider mb-3">Informações de gestão</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Departamento</label>
              <input {...register('department')} className="input" placeholder={profile?.department || 'Ex: Comercial'} />
            </div>
            <div>
              <label className="label">Centro de custo</label>
              <input {...register('cost_center')} className="input" placeholder={profile?.cost_center || 'Ex: CC-001'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Valor estimado (MZN)</label>
              <input {...register('total_amount', { valueAsNumber: true })} className="input" type="number" placeholder="Ex: 45000" />
            </div>
          </div>
          <div>
            <label className="label">Motivo da viagem</label>
            <input {...register('purpose')} className="input" placeholder="Ex: Reunião com cliente, formação..." />
          </div>
          <div className="mt-3">
            <label className="label">Notas adicionais</label>
            <textarea {...register('notes')} className="input resize-none" rows={2} placeholder="Preferências, informações para a agência..." />
          </div>
        </section>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitMutation.isPending} className="btn-primary">
            {submitMutation.isPending ? 'A enviar...' : 'Enviar solicitação'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/requests')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

export default SearchPage;
