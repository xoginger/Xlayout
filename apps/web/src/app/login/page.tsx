/**
 * Creado y diseñado por XO
 * XLayout System — Página de Login
 */

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import { AdminButton } from '@/components/admin/AdminButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);
  const fetchMe = useAuthStore(state => state.fetchMe);

  // Determina la ruta de redirección según el tipo de usuario
  const getRedirectPath = (userType: string): string => {
    switch (userType) {
      case 'PLATFORM_USER':
        return '/admin/platform/overview';
      case 'COMPANY_USER':
        return '/admin/company/dashboard';
      case 'DISTRIBUTOR_USER':
        return '/admin/distributor/dashboard';
      case 'END_USER':
      default:
        return '/editor';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post<{ access_token: string, user: any }>('/auth/login', { email, password });
      setAuth(res.access_token, res.user);

      // Hidratar el store con datos completos del usuario (/auth/me)
      await fetchMe();

      // Redirigir según el tipo de usuario retornado por el login
      const userType = res.user?.userType || 'END_USER';
      router.push(getRedirectPath(userType));
    } catch (err: any) {
      setError(err.message || 'Error de autenticación. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-blue-500/20">
          XL
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          XLayout Admin Panel
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to manage your SaaS platform or company catalog
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-md text-sm text-rose-600">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="admin@xlayout.io"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" title="Password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <AdminButton
                type="submit"
                className="w-full"
                loading={isLoading}
              >
                Sign in
              </AdminButton>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center shadow-none">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500 lowercase">
                  Or register your company
                </span>
              </div>
            </div>

            <div className="mt-6">
              <AdminButton
                variant="outline"
                className="w-full"
              >
                Start free trial
              </AdminButton>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-slate-400 font-mono">
          Module: Admin Panel | Version: admin-panel-v2-full
        </p>
      </div>
    </div>
  );
}
