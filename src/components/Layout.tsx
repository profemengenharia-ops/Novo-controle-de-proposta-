import React from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  FileText,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Sparkles,
  FilePlus,
  ClipboardList,
  PieChart as PieChartIcon,
  Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import { Logo } from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [newMenuOpen, setNewMenuOpen] = React.useState(false);

  // Navega e, em telas pequenas, fecha o drawer para revelar o conteúdo.
  const go = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const menuItems = [
    { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
    { id: 'comercial',  label: 'Comercial',         icon: Briefcase },
    { id: 'proposals',  label: 'Propostas',         icon: FileText },
    { id: 'estimates',  label: 'Orçamentos',        icon: ClipboardList },
    { id: 'norms',      label: 'Normas & Blocos',   icon: BookOpen },
    { id: 'reports',    label: 'Relatórios',        icon: PieChartIcon },
  ];

  return (
    <div className="flex h-screen bg-[var(--color-brand-light)] font-sans">
      {/* Backdrop (mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className={cn(
          "bg-[var(--color-brand-dark)] text-white flex flex-col transition-transform duration-300 fixed md:relative inset-y-0 left-0 z-30 md:z-20",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Logo variant="dark" />
            </motion.div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--color-brand-primary)]" />
          )}
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={cn(
                "w-full flex items-center p-3 rounded-lg transition-colors group",
                activeTab === item.id 
                  ? "bg-[var(--color-brand-primary)] text-white" 
                  : "hover:bg-white/10 text-white/70"
              )}
            >
              <item.icon size={20} className={cn(activeTab === item.id ? "text-white" : "text-white/50 group-hover:text-white")} />
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-3 font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center p-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
               <span className="text-xs uppercase">{user?.email?.charAt(0)}</span>
            </div>
            {isSidebarOpen && (
              <div className="ml-3 flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <button onClick={() => logout()} className="text-[10px] uppercase tracking-wider text-white/50 hover:text-white flex items-center">
                  Sair <LogOut size={10} className="ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label={isSidebarOpen ? 'Recolher menu' : 'Expandir menu'}
              className="p-2 hover:bg-black/5 rounded-md"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-lg font-semibold tracking-tight">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative">
               <button
                onClick={() => setNewMenuOpen(o => !o)}
                aria-haspopup="true"
                aria-expanded={newMenuOpen}
                className="bg-[var(--color-brand-primary)] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 shadow-lg shadow-[var(--color-brand-primary)]/20 transition-all font-mono text-sm"
               >
                 <PlusCircle size={18} />
                 Nova Proposta
               </button>

               {newMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-[90]" onClick={() => setNewMenuOpen(false)} aria-hidden="true" />
                   <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-black/5 shadow-2xl rounded-xl py-2 z-[100] animate-in fade-in zoom-in-95">
                      <button
                        onClick={() => { setActiveTab('new-proposal'); setNewMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 text-left transition-colors"
                      >
                        <div className="bg-[var(--color-brand-primary)]/10 p-2 rounded-lg text-[var(--color-brand-primary)]">
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-tight">Gerar com IA</p>
                          <p className="text-[10px] opacity-40 uppercase font-medium">Fluxo Passo a Passo</p>
                        </div>
                      </button>
                      <button
                        onClick={() => { setActiveTab('manual-proposal'); setNewMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 text-left transition-colors"
                      >
                        <div className="bg-black/5 p-2 rounded-lg text-black/60">
                          <FilePlus size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-tight">Registro Manual</p>
                          <p className="text-[10px] opacity-40 uppercase font-medium">Formulário Rápido</p>
                        </div>
                      </button>
                   </div>
                 </>
               )}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
           <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
           </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
