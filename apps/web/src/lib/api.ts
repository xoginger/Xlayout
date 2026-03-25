/**
 * Creado y diseñado por XO
 */

"use client";

import { useAuthStore } from '../store/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

// Construir URL segura con base absoluta/relativa y query params
function buildUrl(base: string, endpoint: string, params?: Record<string, string>): string {
  const path = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (!params || Object.keys(params).length === 0) return path;
  const qs = new URLSearchParams(params).toString();
  return `${path}?${qs}`;
}

export const api = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, activeTenantId } = useAuthStore.getState();
    
    const url = buildUrl(API_BASE_URL, endpoint, options.params);

    const headers = new Headers(options.headers);

    // Token de autenticación JWT
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Contexto de tenant activo — necesario para que PLATFORM_USER
    // pueda operar sobre endpoints multi-tenant como catálogo
    if (activeTenantId) {
      headers.set('x-tenant-id', activeTenantId);
    }

    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  },

  get<T>(endpoint: string, params?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  },

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    });
  },

  patch<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { 
      method: 'PATCH', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    });
  },

  put<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    });
  },

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  },
};
