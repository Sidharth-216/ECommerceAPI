import React from 'react';
import { 
  ShoppingBag, TrendingUp, Package, CreditCard, 
  ArrowRight, Sparkles, ShieldCheck, Zap 
} from 'lucide-react';
import { getSampleProducts } from '../utils/helpers';

const HomePage = ({ setCurrentPage, products }) => {
  const displayProducts = (products && products.length) ? products : getSampleProducts();

  // The specific theme class you provided
  const primaryBtn = "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold transition-all shadow-md hover:shadow-cyan-200/50 active:scale-95";
  const secondaryBtn = "bg-white border-2 border-gray-100 text-gray-700 hover:border-teal-500 hover:text-teal-600 font-semibold transition-all active:scale-95";

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-teal-100 selection:text-teal-900">
      
      {/* --- Navigation --- */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-cyan-700 tracking-tight">
              ShopAI
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage('login')}
              className="hidden sm:block text-sm font-bold text-gray-500 hover:text-teal-600 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setCurrentPage('register')}
              className={`${primaryBtn} px-5 py-2.5 rounded-xl text-sm`}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          
          {/* --- Hero Section --- */}
          <section className="lg:col-span-7 space-y-8 animate-[fadeIn_0.8s_ease-out]">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-100 rounded-full text-teal-700 text-xs font-bold uppercase tracking-widest">
              <Sparkles size={14} className="animate-pulse" />
              Powered by Next-Gen AI
            </div>
            
            <h2 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
              Shop Smarter, <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-600">
                Not Harder.
              </span>
            </h2>
            
            <p className="text-xl text-slate-600 leading-relaxed max-w-xl">
              Experience a marketplace that learns your style. From high-tech gadgets to lifestyle essentials, get curated picks delivered to your door.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setCurrentPage('login')}
                className={`${primaryBtn} px-8 py-4 rounded-2xl text-lg flex items-center justify-center gap-2 group`}
              >
                Explore Collection
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setCurrentPage('login')}
                className={`${secondaryBtn} px-8 py-4 rounded-2xl text-lg`}
              >
                Watch Demo
              </button>
            </div>

            {/* Quick Stats */}
            <div className="pt-8 grid grid-cols-3 gap-8 border-t border-gray-100">
              <div>
                <p className="text-2xl font-black text-slate-900">50k+</p>
                <p className="text-sm text-slate-500 font-medium">Products</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">12h</p>
                <p className="text-sm text-slate-500 font-medium">Avg. Delivery</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">4.9/5</p>
                <p className="text-sm text-slate-500 font-medium">Rating</p>
              </div>
            </div>
          </section>

          {/* --- Featured Visual (Bento Style Preview) --- */}
          <aside className="lg:col-span-5 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
            
            <div className="relative bg-white border border-gray-100 rounded-[40px] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Trending Now</h3>
                <Zap size={20} className="text-amber-500 fill-amber-500" />
              </div>

              <div className="space-y-4">
                {displayProducts.slice(0, 3).map((p, idx) => (
                  <div 
                    key={p.id} 
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl hover:bg-white hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer border border-transparent hover:border-teal-100 group/item"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <img src={p.image} alt={p.name} className="w-20 h-20 rounded-2xl object-cover bg-white shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{p.brand}</p>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{p.name}</h4>
                      <p className="text-lg font-black text-slate-900 mt-1">₹{p.price}</p>
                    </div>
                    <button 
                       onClick={() => setCurrentPage('login')}
                       className="p-2 bg-white rounded-full text-slate-400 group-hover/item:text-teal-500 group-hover/item:bg-teal-50 shadow-sm transition-all"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                <div className="flex items-center justify-around text-slate-400">
                    <ShieldCheck size={20} />
                    <div className="h-4 w-px bg-gray-200"></div>
                    <span className="text-xs font-bold uppercase tracking-tighter">Verified Sellers Only</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* --- Value Proposition Section --- */}
      <section className="bg-slate-900 py-20 text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: <TrendingUp className="text-teal-400" />, title: "Smart Picks", desc: "Our AI analyzes millions of reviews to find you the absolute best." },
              { icon: <Package className="text-cyan-400" />, title: "Hyper-Fast", desc: "Warehouses in every major city ensuring 24-hour delivery cycles." },
              { icon: <CreditCard className="text-teal-400" />, title: "Secure Pay", desc: "Military-grade encryption for every single transaction you make." }
            ].map((feature, i) => (
              <div key={i} className="group cursor-default">
                <div className="mb-4 bg-white/5 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold mb-2">{feature.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-teal-500 p-1.5 rounded-lg">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tight">ShopAI</span>
          </div>
          
          <div className="text-slate-400 text-sm font-medium">
            © {new Date().getFullYear()} — Designed for the future of commerce.
          </div>

          <div className="flex gap-8">
            <button onClick={() => setCurrentPage('login')} className="text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors">Help</button>
            <button onClick={() => setCurrentPage('login')} className="text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors">Privacy</button>
            <button onClick={() => setCurrentPage('login')} className="text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors">Terms</button>
          </div>
        </div>
      </footer>

      {/* Basic Keyframe Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default HomePage;