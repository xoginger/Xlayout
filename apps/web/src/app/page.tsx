import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-900/20 ring-1 ring-blue-400/50">X</div>
              <span className="text-xl font-bold tracking-tight text-white">XLayout</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Características</a>
              <a href="#solutions" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Soluciones</a>
              <a href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Precios</a>
            </div>

            <div className="flex items-center gap-4">
              <Link 
                href="/login" 
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link 
                href="/login" 
                className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-900/25 active:scale-95"
              >
                Solicitar acceso
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

          <div className="relative space-y-8 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-[11px] font-bold text-blue-400 uppercase tracking-widest animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Plataforma SaaS para mobiliario comercial
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Diseña, cotiza y vende <br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">mobiliario en un solo lugar</span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              XLayout es la plataforma para crear layouts profesionales y convertirlos en propuestas listas para vender. Optimiza tu flujo de trabajo de diseño hasta la entrega final.
            </p>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
              >
                Comenzar ahora
                <span className="text-xl">→</span>
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-lg hover:bg-zinc-800 transition-all">
                Ver demostración
              </button>
            </div>

            <div className="pt-20 opacity-40">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-8">Con la confianza de líderes de la industria</p>
              <div className="flex flex-wrap justify-center gap-12 grayscale opacity-50">
                <span className="font-bold text-2xl tracking-tighter">MOYAL</span>
                <span className="font-bold text-2xl tracking-tighter">OFI-QUICK</span>
                <span className="font-bold text-2xl tracking-tighter">MODULA</span>
                <span className="font-bold text-2xl tracking-tighter">DESIGN-CO</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Section Preview */}
      <section className="py-32 bg-zinc-900/30 border-y border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard 
              icon="📐" 
              title="Editor CAD Inteligente" 
              description="Diseña en 2D y visualiza en 3D en tiempo real con herramientas de snapping magnético."
            />
            <FeatureCard 
              icon="💰" 
              title="Cotización Automática" 
              description="Convierte tus layouts en cotizaciones detalladas en MXN con un solo clic."
            />
            <FeatureCard 
              icon="🏢" 
              title="Gestión de Catálogo" 
              description="Administra productos, precios y condiciones comerciales de forma centralizada."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-xs ring-1 ring-zinc-700">X</div>
              <span className="font-bold tracking-tight text-zinc-100">XLayout</span>
            </div>
            <div className="text-zinc-500 text-sm">
              © 2026 XLayout México. Todos los derechos reservados.
            </div>
            <div className="flex gap-6 text-sm text-zinc-500">
               <span>MXN</span>
               <span>ES (MX)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="space-y-4 p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-blue-500/30 transition-all hover:-translate-y-1">
      <div className="text-4xl">{icon}</div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
