'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { getPostLoginRedirect } from '@/lib/route-permissions';
// ─── Primitives matching the editor UI ─────────────────────────────────────

const XLogo = () => (
  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-xl ring-2 ring-blue-500/20 shrink-0">
    X
  </div>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-[0.25em]">
    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
    {children}
  </div>
);

const Divider = () => <div className="h-px bg-zinc-800 w-full" />;

// ─── Value Cards — same style as editor inspector panels ───────────────────

interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}
const ValueCard = ({ icon, title, desc }: ValueCardProps) => (
  <div className="group p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-blue-500/40 hover:bg-zinc-800/60 transition-all duration-200">
    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400 group-hover:bg-blue-600/20 transition-colors">
      {icon}
    </div>
    <h3 className="text-sm font-black uppercase tracking-wider text-white mb-2">{title}</h3>
    <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

// ─── Step Row — mirrors the editor toolbar section dividers ────────────────

interface StepProps {
  n: string;
  title: string;
  desc: string;
}
const Step = ({ n, title, desc }: StepProps) => (
  <div className="flex gap-6 items-start">
    <div className="shrink-0 w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-black text-zinc-400 tracking-widest">
      {n}
    </div>
    <div>
      <p className="text-sm font-black uppercase tracking-wider text-white mb-1">{title}</p>
      <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

// ─── Use Case Pill ─────────────────────────────────────────────────────────

const UsePill = ({ children }: { children: React.ReactNode }) => (
  <div className="px-5 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-black uppercase tracking-widest text-zinc-300 hover:border-blue-500/40 hover:text-white transition-all cursor-default">
    {children}
  </div>
);

// ─── Editor Mock — inline SVG-based abstract layout preview ───────────────

const EditorMock = () => (
  <div className="relative w-full aspect-[16/9] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
    {/* Topbar mock */}
    <div className="flex items-center h-10 px-4 bg-white border-b border-zinc-200 gap-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700" />
      <div className="h-2 w-20 bg-zinc-200 rounded-full" />
      <div className="flex gap-2 ml-auto">
        <div className="h-2 w-12 bg-zinc-200 rounded-full" />
        <div className="h-2 w-12 bg-zinc-200 rounded-full" />
        <div className="h-6 w-16 bg-blue-600 rounded-lg" />
      </div>
    </div>
    {/* Canvas area */}
    <div className="flex h-[calc(100%-40px)]">
      {/* Left toolbar */}
      <div className="w-10 bg-white border-r border-zinc-200 flex flex-col items-center gap-2 pt-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-6 h-6 rounded-md bg-zinc-100 border border-zinc-200" />
        ))}
      </div>
      {/* Canvas */}
      <div className="flex-1 bg-zinc-100 relative overflow-hidden">
        {/* Grid dots */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Room outline */}
        <div className="absolute top-8 left-10 w-48 h-36 border-2 border-zinc-400 bg-white/60 rounded-sm" />
        {/* Furniture blocks */}
        <div className="absolute top-12 left-14 w-14 h-10 bg-blue-400/60 border border-blue-500 rounded-sm" />
        <div className="absolute top-12 left-30 w-10 h-10 bg-blue-300/60 border border-blue-400 rounded-sm" style={{ left: '7rem' }} />
        <div className="absolute top-26 left-14 w-20 h-8 bg-indigo-400/50 border border-indigo-400 rounded-sm" style={{ top: '6.5rem' }} />
        <div className="absolute top-26 left-36 w-14 h-10 bg-zinc-300/80 border border-zinc-400 rounded-sm" style={{ top: '6rem', left: '9rem' }} />
        {/* Dimension labels */}
        <div className="absolute top-6 left-10 text-[8px] text-zinc-500 font-mono">6.00m</div>
        <div className="absolute top-8 left-2 text-[8px] text-zinc-500 font-mono">4.50m</div>
        {/* Selection highlight */}
        <div className="absolute top-12 left-14 w-14 h-10 border-2 border-blue-600 rounded-sm">
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-600 rounded-sm" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-sm" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-600 rounded-sm" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-600 rounded-sm" />
        </div>
      </div>
      {/* Right inspector */}
      <div className="w-36 bg-white border-l border-zinc-200 p-2 flex flex-col gap-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400 px-1">Propiedades</div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center px-1">
            <div className="h-1.5 w-10 bg-zinc-200 rounded-full" />
            <div className="h-1.5 w-8 bg-zinc-300 rounded-full" />
          </div>
        ))}
        <Divider />
        <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400 px-1">Producto</div>
        <div className="h-10 bg-blue-50 border border-blue-200 rounded-lg p-1">
          <div className="h-1.5 w-12 bg-blue-300 rounded-full mb-1" />
          <div className="h-1.5 w-8 bg-blue-200 rounded-full" />
        </div>
        <div className="h-5 bg-blue-600 rounded-md flex items-center justify-center">
          <div className="h-1.5 w-12 bg-white/60 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Landing Page ─────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const getUserType = useAuthStore(s => s.getUserType);

  useEffect(() => {
    if (token) {
      // Redirigir a la ruta correcta según el tipo de usuario
      const redirect = getPostLoginRedirect(getUserType() || undefined);
      router.replace(redirect);
    }
  }, [token, router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <XLogo />
            <div className="flex flex-col leading-none">
              <span className="font-black tracking-tighter text-white text-sm italic">XLAYOUT</span>
              <span className="text-[8px] font-black tracking-[0.4em] text-zinc-500">PRO</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {['Producto', 'Beneficios', 'Flujo', 'Acceso'].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>

          <Link
            href="/login"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/30 active:scale-95"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section id="producto" className="relative pt-32 pb-20 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-indigo-700/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="max-w-3xl mb-12">
            <Label>Plataforma SaaS · Mobiliario comercial</Label>

            <h1 className="mt-6 text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.08]">
              Diseña, configura y{' '}
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                cotiza espacios
              </span>
              {' '}con precisión profesional.
            </h1>

            <p className="mt-6 text-base md:text-lg text-zinc-400 leading-relaxed max-w-2xl">
              XLayout conecta catálogo, diseño y operación comercial en una sola plataforma para distribuidores, arquitectos y marcas de mobiliario.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/30 transition-all active:scale-95 flex items-center gap-2"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" /></svg>
                Entrar al editor
              </Link>
              <a
                href="#acceso"
                className="px-7 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                Solicitar demo
              </a>
            </div>
          </div>

          {/* Editor mock */}
          <div className="relative max-w-5xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/10 rounded-3xl blur-xl" />
            <EditorMock />
          </div>

          {/* Trusted by */}
          <div className="mt-16 pt-8 border-t border-zinc-800/50">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-6">
              Utilizado por referentes del sector
            </p>
            <div className="flex flex-wrap gap-x-10 gap-y-4 items-center opacity-30">
              {['MOYAL', 'OFI-QUICK', 'MODULA', 'DESIGN-CO', 'STEELCASE MX'].map(b => (
                <span key={b} className="font-black text-lg tracking-tighter text-zinc-300">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── VALUE PROPS ─────────────────────────────────────────────────── */}
      <section id="beneficios" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <Label>Beneficios</Label>
            <h2 className="mt-4 text-2xl md:text-3xl font-black tracking-tight text-white">
              Todo lo que necesitas en un solo sistema.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ValueCard
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" /></svg>}
              title="Diseño técnico intuitivo"
              desc="Editor CAD en 2D y 3D con snapping magnético, grillas y herramientas de precisión milimétrica."
            />
            <ValueCard
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" /><path d="M12 12h.01" /></svg>}
              title="Catálogo conectado"
              desc="Accede a catálogos técnicos multi-marca con precios, modelos 3D y condiciones comerciales en tiempo real."
            />
            <ValueCard
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>}
              title="Configuración modular"
              desc="Ajusta opciones, materiales y variantes directamente en el canvas. Cada objeto lleva su spec comercial."
            />
            <ValueCard
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>}
              title="Cotización y operación"
              desc="Exporta layouts como cotizaciones en PDF con desglose por producto, precios y condiciones de venta."
            />
          </div>
        </div>
      </section>

      <Divider />

      {/* ── WORKFLOW ─────────────────────────────────────────────────────── */}
      <section id="flujo" className="py-20 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <Label>Flujo de trabajo</Label>
              <h2 className="mt-4 text-2xl md:text-3xl font-black tracking-tight text-white mb-10">
                De la idea a la propuesta en minutos.
              </h2>

              <div className="flex flex-col gap-8">
                <Step n="01" title="Selecciona productos del catálogo" desc="Navega el catálogo multi-marca, filtra por línea o categoría y arrastra piezas directamente al canvas." />
                <Step n="02" title="Diseña el layout" desc="Organiza con precisión usando snapping, alineación automática y herramientas de medición en tiempo real." />
                <Step n="03" title="Ajusta módulos y configuraciones" desc="Define materiales, colores, variantes y condiciones especiales por objeto dentro del diseño." />
                <Step n="04" title="Genera propuesta comercial" desc="Exporta en PDF con cotización detallada, especificaciones técnicas e imágenes del layout." />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-900/20 to-transparent rounded-3xl blur-2xl" />
              <div className="relative space-y-3">
                {[
                  { label: 'Catálogo cargado', sub: '248 productos · 4 líneas', color: 'bg-emerald-500' },
                  { label: 'Layout activo', sub: 'Oficina 120m² · 18 objetos', color: 'bg-blue-500' },
                  { label: 'Cotización lista', sub: 'MXN $284,600 · PDF generado', color: 'bg-indigo-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-lg`} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-white">{item.label}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{item.sub}</p>
                    </div>
                  </div>
                ))}

                <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">En progreso</p>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2 font-mono">Renderizando preview 3D...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── USE CASES ─────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <Label>Casos de uso</Label>
            <h2 className="mt-4 text-2xl md:text-3xl font-black tracking-tight text-white">
              Construido para toda la cadena de valor.
            </h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <UsePill>Distribuidores de mobiliario</UsePill>
            <UsePill>Arquitectos y diseñadores</UsePill>
            <UsePill>Equipamiento comercial</UsePill>
            <UsePill>Marcas con catálogo técnico</UsePill>
            <UsePill>Integración de espacios</UsePill>
            <UsePill>Proyectos corporativos</UsePill>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              {
                role: 'Distribuidor',
                quote: 'Pasamos de presentar catálogos en PDF a entregar layouts completos con cotización. El tiempo de cierre bajó 40%.',
              },
              {
                role: 'Diseñador de interiores',
                quote: 'El snapping magnético y el catálogo en tiempo real me permite trabajar como en un BIM pero pensado para mobiliario.',
              },
              {
                role: 'Gerente comercial',
                quote: 'Ahora todos los vendedores cotizan con las mismas condiciones y en el mismo sistema. Cero errores de precio.',
              },
            ].map(item => (
              <div key={item.role} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400 mb-3">{item.role}</p>
                <p className="text-zinc-300 text-sm leading-relaxed italic">"{item.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── PRODUCT VISUAL ─────────────────────────────────────────────── */}
      <section className="py-20 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Label>La plataforma</Label>
            <h2 className="mt-4 text-2xl md:text-3xl font-black tracking-tight text-white">
              Una sola plataforma para pasar de idea a propuesta.
            </h2>
            <p className="mt-4 text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
              El editor, el catálogo, las configuraciones y la operación comercial viven en el mismo sistema. Sin integraciones externas. Sin fricción.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/15 to-indigo-600/10 rounded-3xl blur-2xl" />
            <EditorMock />
          </div>
        </div>
      </section>

      <Divider />

      {/* ── CTA FINAL ─────────────────────────────────────────────────── */}
      <section id="acceso" className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Label>Acceso</Label>
          <h2 className="mt-6 text-3xl md:text-5xl font-black tracking-tight text-white">
            Empieza con{' '}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              XLayout
            </span>
          </h2>
          <p className="mt-4 text-zinc-400 text-base leading-relaxed max-w-lg mx-auto">
            Solicita acceso a la plataforma o inicia sesión si ya tienes una cuenta.
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/30 transition-all active:scale-95 flex items-center gap-2"
            >
              Iniciar sesión
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" /></svg>
            </Link>
            <a
              href="mailto:demo@xlayout.io"
              className="px-8 py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Solicitar demo
            </a>
          </div>

          <p className="mt-8 text-[10px] font-mono text-zinc-600 tracking-wider">
            XLayout Opera bajo NDA durante beta privada. Contacta a tu distribuidor autorizado.
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-black text-xs">X</div>
              <span className="font-black tracking-tighter text-zinc-300 italic text-sm">XLAYOUT</span>
            </div>

            <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <a href="#producto" className="hover:text-zinc-400 transition-colors">Producto</a>
              <a href="#beneficios" className="hover:text-zinc-400 transition-colors">Beneficios</a>
              <Link href="/login" className="hover:text-zinc-400 transition-colors">Acceso</Link>
            </div>

            <div className="text-[10px] font-mono text-zinc-700">
              © 2026 XLayout México · Todos los derechos reservados
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
