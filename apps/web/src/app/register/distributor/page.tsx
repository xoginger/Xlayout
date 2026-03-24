/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useState } from 'react';
import { api } from '@/lib/api';

// Página pública de registro de distribuidores — no requiere autenticación
export default function DistributorRegisterPage() {
  const [form, setForm] = useState({
    name: '',
    contactEmail: '',
    phone: '',
    country: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contactEmail) return;
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/distributors/register', form);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Error al registrar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pantalla de éxito
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">¡Solicitud Enviada!</h2>
          <p className="text-sm text-slate-600 mb-6">
            Tu solicitud de registro como distribuidor ha sido recibida.
            Un administrador revisará tu solicitud y te notificará por email
            cuando tu cuenta esté activa.
          </p>
          <a
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Ir al Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-8 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">XL</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Registro de Distribuidor</h1>
          <p className="text-emerald-100 text-sm mt-2">
            Regístrate como empresa distribuidora para acceder a los catálogos de fabricantes.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de la Empresa *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
              placeholder="Distribuidora Ejemplo SA de CV"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email de Contacto *
            </label>
            <input
              type="email"
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
              placeholder="contacto@empresa.com"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                placeholder="+52 55 1234 5678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
              <select
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                <option value="MX">México</option>
                <option value="US">Estados Unidos</option>
                <option value="CO">Colombia</option>
                <option value="AR">Argentina</option>
                <option value="ES">España</option>
                <option value="CL">Chile</option>
                <option value="PE">Perú</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Enviando...
              </span>
            ) : 'Enviar Solicitud'}
          </button>

          <p className="text-xs text-slate-400 text-center mt-4">
            Al enviar esta solicitud, un administrador revisará tus datos y activará tu cuenta.
            Recibirás un email cuando tu acceso esté listo.
          </p>

          <div className="text-center pt-2">
            <a href="/login" className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
              ¿Ya tienes cuenta? Inicia sesión
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
