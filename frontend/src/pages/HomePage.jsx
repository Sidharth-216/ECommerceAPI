import React from 'react';
import { ShoppingBag, TrendingUp, Package, CreditCard, Users, MapPin, BarChart3 } from 'lucide-react';
import { getSampleProducts } from '../utils/helpers';

const HomePage = ({ setCurrentPage, products, addToCart }) => {
  const displayProducts = (products && products.length) ? products : getSampleProducts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-10 h-10 text-blue-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">ShopAI</h1>
            <p className="text-xs text-gray-500 -mt-0.5">AI-powered shopping made simple</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage('login')}
            className="px-4 py-2 rounded-md bg-white border text-sm font-medium hover:shadow"
          >
            Sign In
          </button>
          <button
            onClick={() => setCurrentPage('register')}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Create Account
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-10 items-center">
        {/* Hero Section */}
        <section className="space-y-6">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
            Discover products you'll love — curated by AI
          </h2>
          <p className="text-gray-600 max-w-xl">
            Smart recommendations, secure checkout and express delivery — all in one place.
            Shop top gadgets, wearables and accessories handpicked to match your taste.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setCurrentPage('login')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700"
            >
              Shop Now
            </button>
            <button
              onClick={() => setCurrentPage('login')}
              className="px-6 py-3 bg-white border rounded-lg text-gray-800 hover:shadow"
            >
              Browse Categories
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
              <TrendingUp className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-semibold">Smart Picks</p>
                <p className="text-xs text-gray-500">AI recommendations</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
              <Package className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-semibold">Fast Delivery</p>
                <p className="text-xs text-gray-500">Reliable & on time</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
              <CreditCard className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-semibold">Secure Payments</p>
                <p className="text-xs text-gray-500">Encrypted checkout</p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products Preview */}
        <aside className="bg-gradient-to-tr from-white to-blue-50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Featured for you</h3>
            <button
              onClick={() => setCurrentPage('login')}
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {displayProducts.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-4 bg-white rounded-lg p-3 shadow-sm">
                <img src={p.image} alt={p.name} className="w-20 h-20 rounded-md object-cover" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">{p.brand}</p>
                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">{p.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-blue-600 font-bold">₹{p.price}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage('login')}
                        className="px-3 py-1 bg-green-600 text-white rounded-md text-xs hover:bg-green-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setCurrentPage('login')}
                        className="px-2 py-1 border rounded-md text-xs text-gray-600"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Free returns • 24/7 support • Trusted sellers</p>
          </div>
        </aside>
      </main>

      {/* Why ShopAI Section */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h4 className="text-lg font-bold mb-4">Why ShopAI?</h4>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex gap-4 items-start">
              <Users className="w-7 h-7 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold">Personalized experience</p>
                <p className="text-sm text-gray-500">Recommendations tailored to you.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <MapPin className="w-7 h-7 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold">Wide delivery network</p>
                <p className="text-sm text-gray-500">Fast shipping across regions.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <BarChart3 className="w-7 h-7 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold">Trusted insights</p>
                <p className="text-sm text-gray-500">Top picks based on real data.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-6 text-sm text-gray-500 flex justify-between">
        <div>© {new Date().getFullYear()} ShopAI — All rights reserved</div>
        <div className="flex gap-4">
          <button onClick={() => setCurrentPage('login')} className="hover:underline">Products</button>
          <button onClick={() => setCurrentPage('login')} className="hover:underline">Support</button>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;