import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Search, ShoppingCart, MessageCircle, UserCircle, LogOut, Package, Plus, Minus, X, Send } from 'lucide-react';

const ProductsPage = ({
	user,
	products,
	cart,
	searchQuery,
	setSearchQuery,
	setCurrentPage,
	handleLogout,
	addToCart,
	error,
	setError
}) => {
	const [chatOpen, setChatOpen] = useState(false);
	const [chatMessages, setChatMessages] = useState([]);
	const [currentMessage, setCurrentMessage] = useState('');
	const [isTyping, setIsTyping] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const chatEndRef = useRef(null);

	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chatMessages]);

	// Filter products based on search query
	const filteredProducts = (products || []).filter(product =>
		product && (
			(typeof product.name === 'string' && product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
			(typeof product.brand === 'string' && product.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
			(typeof product.category === 'string' && product.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
			(typeof product.categoryId === 'string' && product.categoryId.toLowerCase().includes(searchQuery.toLowerCase())) ||
			(typeof product.description === 'string' && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	// Generate suggestions based on search query
	const suggestions = searchQuery.trim() 
		? filteredProducts.slice(0, 8)
		: [];

	const uniqueCategories = Array.from(new Set((products || []).map(p => p.categoryName || p.category || 'Uncategorized'))).slice(0, 20);

	const handleSort = (value) => {
		// Sorting handled at parent level if needed
	};

	const applyCategory = (cat) => {
		setSearchQuery(cat === '' ? '' : cat);
	};

	const quickView = (p) => {
		alert(`${p.name}\n\n${p.brand || ''}\n\n₹${p.price}\n\n${p.description || ''}`);
	};

	const sendMessageToAgent = async (message) => {
		setIsTyping(true);
		
		const userMsg = { role: 'user', content: message };
		setChatMessages(prev => [...prev, userMsg]);
		setCurrentMessage('');

		setTimeout(() => {
			let agentResponse = '';
			const lowerMsg = message.toLowerCase();

			if (lowerMsg.includes('hi') || lowerMsg.includes('hello')) {
				agentResponse = "Hello! I'm your AI shopping assistant. I can help you find products, add items to cart, or answer questions about your orders. What are you looking for today?";
			} else if (lowerMsg.includes('smartphone') || lowerMsg.includes('phone')) {
				const phones = products.filter(p => p.category === 'Electronics');
				if (lowerMsg.includes('under') || lowerMsg.includes('below')) {
					agentResponse = "I found some great smartphones under ₹10,000! Here's the best option:\n\n📱 Premium Smartphone X1 by TechBrand\nPrice: ₹9,999\nRating: 4.5/5 (1,250 reviews)\nFeatures: 6GB RAM, 128GB Storage, 48MP Camera\n\nWould you like me to add this to your cart?";
				} else {
					agentResponse = `I found ${phones.length} smartphones for you! The Premium Smartphone X1 is our top pick with excellent camera and battery life. Would you like more details?`;
				}
			} else if (lowerMsg.includes('add') && lowerMsg.includes('cart')) {
				if (products.length > 0) {
					addToCart(products[0], setError);
					agentResponse = `Great choice! I've added ${products[0].name} to your cart. Your cart now has ${cart.length + 1} items. Would you like to continue shopping or proceed to checkout?`;
				}
			} else if (lowerMsg.includes('cart') || lowerMsg.includes('show')) {
				if (cart.length === 0) {
					agentResponse = "Your cart is currently empty. Would you like me to help you find some products?";
				} else {
					const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
					agentResponse = `You have ${cart.length} items in your cart:\n\n${cart.map(item => `• ${item.productName || item.name} - ₹${item.price} x ${item.quantity}`).join('\n')}\n\nTotal: ₹${total}\n\nReady to checkout?`;
				}
			} else if (lowerMsg.includes('recommend') || lowerMsg.includes('suggest')) {
				agentResponse = "Based on popular choices, I recommend:\n\n1. Premium Smartphone X1 - Best value for money\n2. Wireless Earbuds Pro - Great audio quality\n3. Smart Watch Ultra - Perfect for fitness tracking\n\nWhich category interests you most?";
			} else if (lowerMsg.includes('checkout') || lowerMsg.includes('buy')) {
				agentResponse = "Perfect! To proceed with checkout, I'll need to confirm your shipping address. You have saved addresses. Would you like to use them, or add a new one?";
			} else {
				agentResponse = "I can help you with:\n• Finding products by category or budget\n• Adding items to your cart\n• Checking order status\n• Product recommendations\n\nWhat would you like to do?";
			}

			const assistantMsg = { role: 'assistant', content: agentResponse };
			setChatMessages(prev => [...prev, assistantMsg]);
			setIsTyping(false);
		}, 1000 + Math.random() * 1000);
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
			{/* Header */}
			<header className="bg-white shadow-md sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
				<div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
					<div className="flex items-center gap-3">
						<div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
							<ShoppingBag className="w-7 h-7 text-white" />
						</div>
						<div>
							<h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ShopAI</h1>
							<p className="text-xs text-gray-500">AI-Powered Shopping Assistant</p>
						</div>
					</div>

					<div className="relative hidden sm:flex flex-1 max-w-md">
						<div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full px-4 py-2.5 border border-gray-200 w-full">
							<Search className="w-5 h-5 text-gray-400" />
							<input
								aria-label="Search products"
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setShowSuggestions(true);
								}}
								onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
								onFocus={() => setShowSuggestions(true)}
								placeholder="Search products, brands, categories..."
								className="bg-transparent outline-none text-sm w-full"
							/>
						</div>

						{/* Suggestions Dropdown */}
						{showSuggestions && searchQuery.trim() && suggestions.length > 0 && (
							<div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
								<div className="p-2 bg-gray-50 border-b border-gray-100">
									<p className="text-xs font-semibold text-gray-600 px-2">
										{suggestions.length} Result{suggestions.length !== 1 ? 's' : ''} Found
									</p>
								</div>
								<div className="max-h-96 overflow-y-auto">
									{suggestions.map((item, idx) => (
										<div
											key={item.id || idx}
											onMouseDown={() => {
												setSearchQuery(item.name);
												setShowSuggestions(false);
											}}
											className="px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors flex justify-between items-center border-b border-gray-100 last:border-b-0"
										>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-semibold text-gray-900 truncate">
													{item.name}
												</p>
												<p className="text-xs text-gray-500 truncate">
													{item.brand || item.category || 'Product'}
												</p>
											</div>
											<span className="text-xs text-blue-600 font-bold ml-2 flex-shrink-0">
												₹{item.price?.toLocaleString() || '0'}
											</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					<div className="flex items-center gap-2 sm:gap-3">
						<button 
							onClick={() => setCurrentPage('cart')} 
							className="relative p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-300 group"
						>
							<ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
							{cart.length > 0 && (
								<span className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
									{cart.length}
								</span>
							)}
						</button>

						<button 
							onClick={() => setChatOpen(!chatOpen)} 
							className="p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-300 group"
						>
							<MessageCircle className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
						</button>

						<button 
							onClick={() => setCurrentPage('profile')} 
							className="p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-300 group"
						>
							<UserCircle className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
						</button>

						<button 
							onClick={handleLogout} 
							className="p-3 hover:bg-gradient-to-br hover:from-red-50 hover:to-orange-50 rounded-xl transition-all duration-300 group"
						>
							<LogOut className="w-6 h-6 text-gray-700 group-hover:text-red-600 transition-colors" />
						</button>
					</div>
				</div>
			</header>

			<div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
				{error && (
					<div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-md flex items-start gap-4 animate-in fade-in slide-in-from-top">
						<div className="w-1 h-1 bg-red-500 rounded-full mt-2"></div>
						<p className="text-sm font-medium">{error}</p>
					</div>
				)}

				{/* BANNER CAROUSEL */}
				<div className="relative h-80 rounded-3xl overflow-hidden shadow-2xl group">
					<div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 opacity-90"></div>
					
					<div className="absolute inset-0 opacity-10">
						<div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
						<div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse"></div>
					</div>

					<div className="relative h-full flex items-center justify-between px-12 z-10">
						<div className="max-w-xl">
							<div className="inline-block mb-4 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
								<span className="text-white text-sm font-bold">🎉 LIMITED TIME OFFER</span>
							</div>
							<h2 className="text-5xl font-extrabold text-white mb-4 leading-tight">
								Summer Sale 2026
							</h2>
							<p className="text-white/90 text-lg mb-6 max-w-md">
								Get up to <span className="text-4xl font-bold">50% OFF</span> on all electronics and gadgets. Free shipping on orders above ₹999!
							</p>
							<button
								onClick={() => setSearchQuery('')}
								className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 active:scale-95"
							>
								Shop Now →
							</button>
						</div>

						<div className="hidden lg:flex items-center justify-center">
							<div className="relative w-64 h-64">
								<div className="absolute inset-0 bg-white/10 rounded-3xl blur-2xl animate-pulse"></div>
								<div className="absolute inset-0 flex items-center justify-center">
									<ShoppingBag className="w-40 h-40 text-white/30 animate-bounce" />
								</div>
								<div className="absolute -top-8 -right-8 bg-yellow-400 text-gray-900 px-6 py-2 rounded-full font-bold text-lg transform rotate-12 shadow-lg">
									-50%
								</div>
							</div>
						</div>
					</div>

					<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-transparent to-transparent"></div>
				</div>

				{/* OFFER CARDS */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="relative h-48 rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
						<div className="absolute inset-0 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600"></div>
						<div className="absolute inset-0 opacity-20">
							<div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
						</div>
						
						<div className="relative h-full flex flex-col justify-between p-6 z-10">
							<div>
								<span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold mb-2">
									🎁 EXCLUSIVE
								</span>
								<h3 className="text-2xl font-bold text-white">Electronics</h3>
								<p className="text-white/80 text-sm mt-1">Up to 40% off</p>
							</div>
							<button className="self-start px-4 py-2 bg-white text-green-600 rounded-lg font-bold text-sm hover:shadow-lg transition-all">
								Explore
							</button>
						</div>
					</div>

					<div className="relative h-48 rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
						<div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-500 to-red-600"></div>
						<div className="absolute inset-0 opacity-20">
							<div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
						</div>
						
						<div className="relative h-full flex flex-col justify-between p-6 z-10">
							<div>
								<span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold mb-2">
									⭐ TRENDING
								</span>
								<h3 className="text-2xl font-bold text-white">Audio & Wearables</h3>
								<p className="text-white/80 text-sm mt-1">Flat ₹1,500 off</p>
							</div>
							<button className="self-start px-4 py-2 bg-white text-pink-600 rounded-lg font-bold text-sm hover:shadow-lg transition-all">
								Explore
							</button>
						</div>
					</div>

					<div className="relative h-48 rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
						<div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-600"></div>
						<div className="absolute inset-0 opacity-20">
							<div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
						</div>
						
						<div className="relative h-full flex flex-col justify-between p-6 z-10">
							<div>
								<span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold mb-2">
									🚀 NEW LAUNCH
								</span>
								<h3 className="text-2xl font-bold text-white">Computers & Tablets</h3>
								<p className="text-white/80 text-sm mt-1">Starting ₹24,999</p>
							</div>
							<button className="self-start px-4 py-2 bg-white text-orange-600 rounded-lg font-bold text-sm hover:shadow-lg transition-all">
								Explore
							</button>
						</div>
					</div>
				</div>

				{/* Controls Section */}
				<div className="space-y-6">
					{/* Search Bar for Mobile */}
					<div className="sm:hidden">
						<div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full px-4 py-3 border border-gray-200 shadow-sm">
							<Search className="w-5 h-5 text-gray-400" />
							<input
								aria-label="Search products"
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search..."
								className="bg-transparent outline-none text-sm w-full"
							/>
						</div>
					</div>

					{/* Sort and Filter Controls */}
					<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
						<div className="flex gap-3 items-center flex-wrap">
							<span className="text-sm font-semibold text-gray-600">Sort by:</span>
							<select 
								onChange={(e) => handleSort(e.target.value)} 
								className="text-sm border-2 border-gray-200 rounded-xl px-4 py-2.5 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer font-medium"
							>
								<option value="">Most Relevant</option>
								<option value="price-asc">Price: Low to High</option>
								<option value="price-desc">Price: High to Low</option>
								<option value="rating-desc">⭐ Top Rated</option>
							</select>
						</div>

						<div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-2.5 rounded-xl border border-blue-200">
							<Package className="w-5 h-5 text-blue-600" />
							<span className="text-sm font-semibold text-gray-900">{filteredProducts.length} Products Found</span>
						</div>
					</div>

					{/* Category Pills */}
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
						<p className="text-sm font-semibold text-gray-600 mb-4">Browse by Category</p>
						<div className="flex gap-3 flex-wrap">
							<button 
								onClick={() => applyCategory('')} 
								className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
									searchQuery === '' 
										? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105' 
										: 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
								}`}
							>
								All Products
							</button>
							{uniqueCategories.map((catName, i) => (
								<button 
									key={i} 
									onClick={() => applyCategory(catName)} 
									className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
										searchQuery === catName 
											? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105' 
											: 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
									}`}
								>
									{catName}
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Products Grid */}
				<div>
					{filteredProducts.length === 0 ? (
						<div className="bg-white rounded-3xl shadow-lg p-16 text-center border border-gray-100">
							<div className="mb-6">
								<Search className="w-20 h-20 mx-auto text-gray-300 mb-4" />
							</div>
							<h3 className="text-2xl font-bold text-gray-900 mb-3">No Products Found</h3>
							<p className="text-gray-600 mb-8 text-lg">Try different keywords or explore other categories.</p>
							<button 
								onClick={() => { setSearchQuery(''); }} 
								className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold"
							>
								Clear Search & Browse All
							</button>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{filteredProducts.map(product => (
								<div 
									key={product.id} 
									className="bg-white rounded-2xl shadow-md hover:shadow-2xl overflow-hidden transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 group flex flex-col"
								>
									{/* Product Image */}
									<div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
										<img
											src={
												product.imageUrl
													? `/images/${product.imageUrl}`
													: 'https://via.placeholder.com/600x400/e5e7eb/9ca3af?text=Product+Image'
											}
											alt={product.name}
											className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
											onError={(e) => {
												e.currentTarget.src = 'https://via.placeholder.com/600x400/e5e7eb/9ca3af?text=Product+Image';
											}}
										/>

										<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

										{/* Brand Badge */}
										<div className="absolute left-4 top-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-gray-900 shadow-lg">
											{product.brand || product.category || 'Product'}
										</div>

										{/* Price Badge */}
										<div className="absolute right-4 top-4 bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg group-hover:scale-110 transition-transform">
											₹{product.price.toLocaleString()}
										</div>

										{/* Stock Badge */}
										{product.stockQuantity !== undefined && (
											<div
												className={`absolute left-4 bottom-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all ${
													product.stockQuantity > 20
														? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
														: product.stockQuantity > 5
														? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
														: 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
												}`}
											>
												{product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of Stock'}
											</div>
										)}
									</div>

									{/* Product Info */}
									<div className="p-5 flex flex-col flex-grow">
										<div className="mb-3">
											<h3 className="font-bold text-gray-900 text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
												{product.name}
											</h3>
											<p className="text-sm text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
												{product.description || 'Premium quality product'}
											</p>
										</div>

										{/* Rating */}
										{product.rating && (
											<div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
												<div className="flex items-center gap-1">
													{[...Array(5)].map((_, i) => (
														<span key={i} className="text-lg">
															{i < Math.floor(product.rating) ? '⭐' : '☆'}
														</span>
													))}
												</div>
												<span className="text-xs font-semibold text-gray-600">
													{product.rating.toFixed(1)} ({product.reviewCount || 0})
												</span>
											</div>
										)}

										{/* Specs */}
										{product.specs && (
											<div className="mb-4 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-xs text-gray-700 border border-blue-100">
												<p className="font-semibold text-gray-900 mb-1">Key Features</p>
												{product.specs}
											</div>
										)}

										{/* Action Buttons */}
										<div className="flex items-center gap-2 mt-auto pt-3">
											<button
												onClick={() => addToCart(product, setError)}
												disabled={product.stockQuantity === 0}
												className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn"
											>
												<ShoppingCart className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
												Add to Cart
											</button>
											<button 
												onClick={() => quickView(product)} 
												className="px-4 py-3 bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all text-sm font-bold text-gray-700 hover:text-blue-600"
											>
												👁️
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Chat Widget */}
			{chatOpen && (
				<div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
					{/* Chat Header */}
					<div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white p-4 flex justify-between items-center shadow-md">
						<div className="flex items-center gap-3">
							<div className="relative">
								<div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
									<span className="text-lg">🤖</span>
								</div>
								<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
							</div>
							<div>
								<h3 className="font-bold text-base leading-tight">ShopAI Assistant</h3>
								<p className="text-xs text-blue-100 flex items-center gap-1">
									<span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
									Online & Ready
								</p>
							</div>
						</div>
						<button 
							aria-label="Close chat" 
							onClick={() => setChatOpen(false)} 
							className="hover:bg-white/20 p-2 rounded-lg transition-all hover:scale-110 active:scale-95"
						>
							<X className="w-6 h-6" />
						</button>
					</div>

					{/* Chat Messages Area */}
					<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white via-blue-50/30 to-white h-96">
						{chatMessages.length === 0 && (
							<div className="text-center text-gray-500 mt-16 flex flex-col items-center justify-center h-full">
								<div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4 animate-bounce">
									<MessageCircle className="w-8 h-8 text-blue-600" />
								</div>
								<p className="font-bold text-lg text-gray-700">Hi there! 👋</p>
								<p className="text-sm text-gray-600 mt-2 max-w-xs">
									I'm your AI shopping assistant. Ask me anything about our products!
								</p>
								<div className="mt-4 flex flex-wrap gap-2 justify-center">
									<button 
										onClick={() => sendMessageToAgent('Show me smartphones')}
										className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-all border border-blue-200"
									>
										📱 Smartphones
									</button>
									<button 
										onClick={() => sendMessageToAgent('Best budget products')}
										className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-100 transition-all border border-green-200"
									>
										💰 Budget
									</button>
									<button 
										onClick={() => sendMessageToAgent('Top rated items')}
										className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-all border border-orange-200"
									>
										⭐ Top Rated
									</button>
								</div>
							</div>
						)}

						{chatMessages.map((msg, idx) => (
							<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
								<div className={`max-w-xs px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm border ${
									msg.role === 'user' 
										? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-none border-blue-600' 
										: 'bg-gray-50 text-gray-900 rounded-bl-none border-gray-200 shadow-sm'
								}`}>
									{msg.content}
								</div>
							</div>
						))}

						{isTyping && (
							<div className="flex items-center gap-3 text-gray-600 animate-in fade-in duration-300">
								<div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
									<div className="flex gap-1">
										<div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
										<div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
										<div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
									</div>
								</div>
								<span className="text-xs text-gray-500 italic">Assistant is typing...</span>
							</div>
						)}

						<div ref={chatEndRef} />
					</div>

					{/* Chat Input Area */}
					<div className="border-t border-gray-100 p-4 bg-gradient-to-r from-white to-blue-50/50 flex gap-2">
						<input
							type="text"
							value={currentMessage}
							onChange={(e) => setCurrentMessage(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && currentMessage.trim() && !isTyping) {
									sendMessageToAgent(currentMessage.trim());
								}
							}}
							placeholder="Ask about products, discounts..."
							disabled={isTyping}
							className="flex-1 border-2 border-gray-200 rounded-full px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all bg-white text-gray-900 placeholder-gray-500 disabled:opacity-50"
						/>
						<button 
							onClick={() => {
								if (currentMessage.trim() && !isTyping) {
									sendMessageToAgent(currentMessage.trim());
								}
							}}
							disabled={!currentMessage.trim() || isTyping}
							className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-full hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
						>
							<Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
						</button>
					</div>

					{/* Chat Footer Info */}
					<div className="bg-blue-50/50 px-4 py-2 text-center text-xs text-gray-600 border-t border-gray-100">
						<p>💡 Tip: Ask about specific products or categories</p>
					</div>
				</div>
			)}

			{/* Floating Chat Button */}
			{!chatOpen && (
				<button
					onClick={() => setChatOpen(true)}
					className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all flex items-center justify-center z-40 animate-bounce group border-4 border-white active:scale-95"
				>
					<div className="absolute inset-0 bg-blue-400 rounded-full opacity-75 animate-pulse"></div>
					<MessageCircle className="w-7 h-7 relative z-10 group-hover:rotate-12 transition-transform" />
					{chatMessages.length > 0 && (
						<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
							{Math.min(chatMessages.length, 9)}
						</span>
					)}
				</button>
			)}
		</div>
	);
};

export default ProductsPage;