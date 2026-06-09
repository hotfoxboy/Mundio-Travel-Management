// LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  async function onSubmit({ email, password }) {
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.error('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display font-bold text-gold text-2xl mb-1">✈ Mundio Travel Management</div>
          <div className="text-gray-500 text-sm">Travel Management</div>
        </div>

        <div className="card">
          <h1 className="font-display font-bold text-lg mb-6">Entrar</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input {...register('email', { required: true })}
                className="input" type="email" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="label">Senha</label>
              <input {...register('password', { required: true })}
                className="input" type="password" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/register" className="text-xs text-gray-500 hover:text-gold transition-colors">
              Criar nova conta de empresa
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Suporte: <a href="mailto:corporate@mundiotravel.com" className="text-gold">corporate@mundiotravel.com</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
