import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, 
  Package, 
  BookOpen, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X, 
  PlusCircle,
  Bell,
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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'commercial', label: 'Comercial', icon: Briefcase },
    { id: 'estimates', label: 'Orçamentos', icon: ClipboardList },
    { id: 'proposals', label: 'Propostas', icon: FileText },
    { id: 'norms', label: 'Normas & Blocos', icon: BookOpen },
    { id: 'reports', label: 'Relatórios', icon: PieChartIcon },
  ];

  return (
    <div className="flex h-screen bg-[var(--color-brand-light)] font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-[var(--color-brand-dark)] text-white flex flex-col transition-all duration-300 relative z-20"
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
              onClick={() => setActiveTab(item.id)}
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
               {user?.photoURL ? <img src={user.photoURL} alt="User" /> : <span className="text-xs uppercase">{user?.email?.charAt(0)}</span>}
            </div>
            {isSidebarOpen && (
              <div className="ml-3 flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.displayName || user?.email}</p>
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
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-black/5 rounded-md">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-lg font-semibold tracking-tight">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-4">
             <button className="p-2 hover:bg-black/5 rounded-full relative">
               <Bell size={20} />
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
             </button>
             
             <div className="relative group">
               <button 
                className="bg-[var(--color-brand-primary)] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 shadow-lg shadow-[var(--color-brand-primary)]/20 transition-all font-mono text-sm"
               >
                 <PlusCircle size={18} />
                 Nova Proposta
               </button>
               
               <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-black/5 shadow-2xl rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100]">
                  <button 
                    onClick={() => setActiveTab('new-proposal')}
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
                    onClick={() => setActiveTab('manual-proposal')}
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
