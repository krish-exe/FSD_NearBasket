import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Camera, Mic, MicOff, ShoppingBasket, Cookie, Droplet, SprayCan, Leaf, Croissant, Sparkles, ArrowRight, MapPin } from "lucide-react";
import StoreCard from "../components/StoreCard";
import { categories } from "../data/categories";
import { useCatalog } from "../context/CatalogContext";
import { useDeliveryLocation } from "../hooks/useDeliveryLocation";
import { useCart } from "../context/CartContext";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { searchTermFromImage } from "../utils/imageSearch";
import { assetUrl } from "../api/client";

const ICONS = {
  basket: ShoppingBasket,
  cookie: Cookie,
  droplet: Droplet,
  spray: SprayCan,
  leaf: Leaf,
  croissant: Croissant,
};

export default function HomePage() {
  const { stores, products, location } = useCatalog();
  const deliveryArea = useDeliveryLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const featuredDeals = products.filter((p) => p.isDeal).slice(0, 4);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/deals?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleCategoryClick = (catId) => {
    navigate(catId === "all" ? "/deals?view=all" : `/deals?category=${catId}`);
  };

  const { isListening, isSupported, startListening, stopListening } = useVoiceSearch({
    onResult: (transcript) => {
      setSearchTerm(transcript);
      navigate(`/deals?search=${encodeURIComponent(transcript)}`);
    },
  });

  const handleVoiceSearch = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleCameraSearch = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same photo again
    if (!file) return;
    const term = searchTermFromImage(file, products);
    if (!term) return;
    setSearchTerm(term);
    navigate(`/deals?search=${encodeURIComponent(term)}`);
  };


  return (
    <main className="flex-grow w-full max-w-content mx-auto px-margin-mobile md:px-margin-desktop py-xl space-y-2xl">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Hero Banner */}
      <section className="relative rounded-xl overflow-hidden bg-surface-container-low min-h-[420px] flex items-center shadow-card">
        <div className="absolute inset-0 z-0">
          <div
            className="bg-cover bg-center w-full h-full opacity-40"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1608686207856-001b95cf60ca?q=80&w=1600&auto=format&fit=crop')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
        </div>

        <div className="relative z-10 p-xl md:p-2xl max-w-2xl space-y-md">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 text-primary font-label text-label-sm font-bold uppercase tracking-wider">
            <Sparkles size={16} /> Hyperlocal Grocery Delivery
          </div>

          <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface font-bold leading-tight">
            Your neighborhood market, online.
          </h1>

          <p className="font-body text-body-lg text-on-surface-variant">
            Fresh groceries, daily staples, and artisan bakery items delivered from stores right around the corner in 20 minutes.
          </p>

          {/* Mobile Search Input with Voice & Camera */}
          <form onSubmit={handleSearchSubmit} className="md:hidden w-full relative mb-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input
              className="w-full pl-12 pr-20 py-3 bg-surface border border-outline-variant rounded-full shadow-sm font-body text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Search products or stores..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCameraSearch}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center p-1 cursor-pointer"
                title="Search by image/photo"
              >
                <Camera size={18} />
              </button>
              <button
                type="button"
                onClick={handleVoiceSearch}
                disabled={!isSupported}
                aria-label={isListening ? "Stop voice search" : "Search by voice"}
                className={`transition-colors flex items-center p-1 rounded-full cursor-pointer ${
                  isListening ? "text-error animate-pulse bg-error/10" : "text-on-surface-variant hover:text-primary"
                } ${!isSupported ? "opacity-40 cursor-not-allowed" : ""}`}
                title={
                  !isSupported
                    ? "Voice search isn't supported in this browser"
                    : isListening
                      ? "Listening... click to stop"
                      : "Voice search"
                }
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>
          </form>

          {/* Hero Action Buttons */}
          <div className="flex flex-wrap gap-md pt-sm">
            <a
              href="#top-stores"
              className="px-8 py-3.5 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm cursor-pointer flex items-center gap-2"
            >
              <span>Find Stores Nearby</span>
              <ArrowRight size={18} />
            </a>

            <Link
              to="/deals"
              className="px-8 py-3.5 bg-surface text-primary border-2 border-primary font-label text-label-md rounded-full hover:bg-surface-container-low transition-colors cursor-pointer flex items-center gap-2"
            >
              <Sparkles size={18} className="text-secondary" />
              <span>Browse Deals</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Explore Categories */}
      <section className="space-y-lg">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-display text-headline-md text-on-surface font-bold">Explore Categories</h2>
            <p className="font-body text-body-sm text-on-surface-variant">Click any category to filter products instantly</p>
          </div>
          <Link to="/deals?view=all" className="font-label text-label-md text-primary font-bold hover:underline">
            View All Products
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-md">
          {categories.map((cat) => {
            const Icon = ICONS[cat.icon] || ShoppingBasket;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md flex flex-col items-center justify-center gap-sm aspect-square card-hover-lift shadow-card-sm cursor-pointer transition-all hover:border-primary/50 text-center"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${cat.bg} ${cat.fg}`}>
                  <Icon size={28} />
                </div>
                <span className="font-label text-label-md font-bold text-on-surface">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Deals Row */}
      {featuredDeals.length > 0 && (
        <section className="space-y-lg bg-surface-container-low p-xl rounded-xl border border-outline-variant/30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="text-secondary" size={24} />
              <h2 className="font-display text-headline-md text-on-surface font-bold">Today's Hot Deals</h2>
            </div>
            <Link to="/deals" className="font-label text-label-md text-primary font-bold hover:underline flex items-center gap-1">
              <span>See All Deals</span>
              <ArrowRight size={16} />
            </Link>
          </div>
  
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-md">
            {featuredDeals.map((product) => (
              <div
                key={product.id}
                className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/20 shadow-card flex flex-col justify-between"
              >
                <div className="relative h-36 w-full rounded-md overflow-hidden bg-surface-container-low mb-sm">
                  <img src={assetUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-secondary text-on-secondary text-xs font-bold px-2 py-0.5 rounded-full">
                    {product.dealTag}
                  </span>
                </div>
                <div>
                  <h4 className="font-body text-body-md font-bold text-on-surface line-clamp-1">{product.name}</h4>
                  <p className="font-body text-body-sm text-on-surface-variant">{product.unit}</p>
                  <div className="flex items-center justify-between mt-md">
                    <div className="font-display text-headline-sm text-primary font-bold">
                      Rs. {product.price}
                    </div>
                    <button
                      onClick={() => addToCart(product, 1)}
                      className="px-3 py-1.5 bg-primary-container text-on-primary font-label text-label-sm rounded-full hover:bg-primary transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top Stores Near You */}
      <section id="top-stores" className="space-y-lg">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-display text-headline-md text-on-surface font-bold">Top Stores Near You</h2>
            <p className="font-body text-body-sm text-on-surface-variant">Verified neighborhood grocers with quick delivery</p>
          </div>
        </div>

        {stores.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-xl text-center space-y-sm">
            <MapPin size={32} className="mx-auto text-on-surface-variant" />
            {location.found ? (
              <>
                <h3 className="font-display text-headline-sm text-on-surface">No stores deliver to {deliveryArea} yet</h3>
                <p className="font-body text-body-md text-on-surface-variant max-w-md mx-auto">
                  NearBasket stores deliver within {location.radiusKm} km. Pick a nearer area from the location menu at the top.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-display text-headline-sm text-on-surface">We couldn't find {deliveryArea} on the map</h3>
                <p className="font-body text-body-md text-on-surface-variant max-w-md mx-auto">
                  Try your 6-digit pincode or a nearby area name in the location menu at the top, or use your current location.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
