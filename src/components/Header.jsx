import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { MapPin, ChevronDown, Search, Camera, Mic, MicOff, CircleUserRound, ShoppingCart, LocateFixed, LogOut, Tag, Package, Sparkles, X, Check, Loader2, Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { saveLocationCoords, DEFAULT_LOCATION } from "../hooks/useDeliveryLocation";
import { searchTermFromImage } from "../utils/imageSearch";
import { useCatalog } from "../context/CatalogContext";
import { assetUrl } from "../api/client";

const POPULAR_LOCATIONS = [
  "Ghatkopar East, Mumbai",
  "Ghatkopar West, Mumbai",
  "Vidyavihar, Mumbai",
  "Vikhroli, Mumbai",
];

export default function Header() {
  const [locationOpen, setLocationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(() => {
    return localStorage.getItem("nearbasket_location") || DEFAULT_LOCATION;
  });
  const [locationSearch, setLocationSearch] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");

  const { user, isLoggedIn, isVendor, logout } = useAuth();
  const { itemCount, openCart } = useCart();
  const { products } = useCatalog();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const locationContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Search autocomplete results
  const searchResults = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
      if (locationContainerRef.current && !locationContainerRef.current.contains(event.target)) {
        setLocationOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setLocationOpen(false);
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // coords is the exact GPS position when known; typed or picked areas are looked up by the server
  const updateLocation = (newLoc, coords = null) => {
    if (!newLoc || !newLoc.trim()) return;
    const trimmed = newLoc.trim();
    setCurrentLocation(trimmed);
    try {
      localStorage.setItem("nearbasket_location", trimmed);
      saveLocationCoords(coords);
      window.dispatchEvent(new Event("nearbasket_location_change"));
    } catch {
      // ignore local storage errors
    }
    setLocationOpen(false);
    setLocationSearch("");
    setLocationMessage("");
  };

  const handleLocationSubmit = (e) => {
    e.preventDefault();
    if (locationSearch.trim()) {
      updateLocation(locationSearch.trim());
    }
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setLocationMessage("GPS location is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const gpsPoint = { lat: latitude, lng: longitude };
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.road || "";
            const city = data.address?.city || data.address?.town || data.address?.state_district || "Mumbai";
            const name = [suburb, city].filter(Boolean).join(", ");
            updateLocation(name || `Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`, gpsPoint);
          } else {
            updateLocation(`Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`, gpsPoint);
          }
        } catch {
          updateLocation(`Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`, gpsPoint);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setLocationMessage("Location permission denied. Please enter your area manually.");
        } else {
          setLocationMessage("Unable to detect location. Please enter manually.");
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSelectProduct = (product) => {
    setSearchQuery("");
    setIsSearchFocused(false);
    navigate(`/store/${product.storeId}?product=${product.id}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
    setIsSearchFocused(false);
      navigate(`/deals?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const { isListening, isSupported, error: voiceError, startListening, stopListening } = useVoiceSearch({
    onResult: (transcript) => {
      setSearchQuery(transcript);
      setIsSearchFocused(false);
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
    if (!term) {
      setPhotoMessage("Couldn't recognise that photo. Try typing the item name instead.");
      return;
    }
    setPhotoMessage("");
    setSearchQuery(term);
    setIsSearchFocused(false);
    navigate(`/deals?search=${encodeURIComponent(term)}`);
  };

  const mobileLinkClass = ({ isActive }) =>
    `flex-1 flex flex-col items-center gap-0.5 py-1.5 font-label text-label-sm transition-colors ${
      isActive ? "text-primary font-bold" : "text-on-surface-variant"
    }`;

  return (
    <header className="bg-surface shadow-sm w-full sticky top-0 z-40">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop w-full max-w-content mx-auto h-16 gap-md">
        {/* Left: Logo & Location */}
        <div className="flex items-center gap-lg h-full shrink-0">
          <Link to="/" className="font-display text-headline-md font-bold text-primary hover:opacity-80 transition-opacity">
            NearBasket
          </Link>

          {/* Location Selector */}
          <div className="relative" ref={locationContainerRef}>
            <button
              onClick={() => {
                setLocationOpen(!locationOpen);
                setLocationMessage("");
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer active:scale-95 border border-transparent hover:border-outline-variant/40 max-w-[130px] sm:max-w-[190px] md:max-w-[220px]"
              title={currentLocation}
              aria-label="Delivery location"
            >
              <MapPin className="text-primary shrink-0" size={17} />
              <span className="font-label text-label-xs sm:text-label-md text-on-surface truncate">
                {currentLocation}
              </span>
              <ChevronDown className="text-on-surface-variant shrink-0" size={15} />
            </button>

            {locationOpen && (
              <div className="fixed inset-x-3 top-18 sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-2 w-auto sm:w-80 md:w-96 bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 overflow-hidden z-50 p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="text-primary" size={18} />
                    <h4 className="font-label text-label-md font-bold text-on-surface">Select Delivery Location</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationOpen(false)}
                    className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-container-high transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Direct text input form - supports Enter key and button click */}
                <form onSubmit={handleLocationSubmit} className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                    <input
                      type="text"
                      placeholder="Enter locality, area or pincode..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!locationSearch.trim()}
                    className="w-full py-2 px-3 bg-primary text-on-primary font-label text-label-md font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Check size={16} />
                    <span>Set Location</span>
                  </button>
                </form>

                {/* GPS Location Button */}
                <button
                  type="button"
                  onClick={handleUseGPS}
                  disabled={isLocating}
                  className="w-full flex items-center gap-3 p-2.5 bg-surface-container-low hover:bg-surface-container rounded-lg transition-colors text-left cursor-pointer border border-outline-variant/30"
                >
                  {isLocating ? (
                    <Loader2 className="text-primary animate-spin shrink-0" size={18} />
                  ) : (
                    <LocateFixed className="text-primary shrink-0" size={18} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-label text-label-sm sm:text-label-md text-primary font-bold">
                      {isLocating ? "Detecting location..." : "Use Current Location"}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">Using GPS for local store matching</p>
                  </div>
                </button>

                {locationMessage && (
                  <p className="text-xs text-error font-body px-1">
                    {locationMessage}
                  </p>
                )}

                {/* Popular areas */}
                <div className="pt-1">
                  <p className="text-[11px] font-label font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                    Popular Areas
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {POPULAR_LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => updateLocation(loc)}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-label transition-colors truncate cursor-pointer ${
                          currentLocation === loc
                            ? "bg-primary/10 text-primary font-bold border border-primary/30"
                            : "bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/20"
                        }`}
                        title={loc}
                      >
                        {loc.split(",")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Search Bar with Autocomplete & Camera/Mic */}
        <div className="flex-1 min-w-[180px] max-w-xl hidden md:block relative mx-sm" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <Search className="absolute left-4 text-on-surface-variant pointer-events-none shrink-0" size={18} />
            <input
              className="w-full pl-12 pr-24 py-2.5 bg-surface-container-low border border-outline-variant rounded-full font-body text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant"
              placeholder="Search groceries, fruits, milk, bakery..."
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
                setPhotoMessage("");
              }}
              onFocus={() => setIsSearchFocused(true)}
            />
            <div className="absolute right-3.5 flex items-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={handleCameraSearch}
                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-95 flex items-center p-1"
                title="Search by image/photo"
              >
                <Camera size={18} />
              </button>

              <button
                type="button"
                onClick={handleVoiceSearch}
                disabled={!isSupported}
                aria-label={isListening ? "Stop voice search" : "Search by voice"}
                className={`transition-colors cursor-pointer active:scale-95 flex items-center p-1 rounded-full ${
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
          {voiceError && voiceError !== "aborted" && voiceError !== "no-speech" && (
            <p className="absolute mt-1 text-[11px] text-error font-body">
              {voiceError === "not-allowed"
                ? "Microphone access denied. Please allow mic permissions."
                : "Couldn't hear that, try again."}
            </p>
          )}
          {photoMessage && <p className="absolute mt-1 text-[11px] text-error font-body">{photoMessage}</p>}

          {/* Autocomplete Dropdown */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 w-full min-w-[320px] sm:min-w-[400px] mt-2 bg-surface-container-lowest rounded-xl shadow-lift border border-outline-variant/30 overflow-hidden z-50 divide-y divide-outline-variant/20 shadow-2xl">
              {searchResults.length > 0 ? (
                searchResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="w-full flex items-center gap-md p-md hover:bg-surface-container-low transition-colors text-left cursor-pointer"
                  >
                    <img
                      src={assetUrl(product.image)}
                      alt={product.name}
                      className="w-12 h-12 rounded-md object-cover border border-outline-variant/30 shrink-0"
                    />
                    <div className="flex-grow min-w-0">
                      <p className="font-body text-body-md font-semibold text-on-surface truncate">{product.name}</p>
                      <p className="font-body text-body-sm text-on-surface-variant">{product.category} • {product.unit}</p>
                    </div>
                    <span className="font-label text-label-md font-bold text-primary shrink-0">Rs. {product.price}</span>
                  </button>
                ))
              ) : (
                <div className="p-md text-center text-on-surface-variant text-body-sm">
                  No products found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Nav & Actions */}
        <div className="flex items-center gap-lg shrink-0">
          <nav className="hidden xl:flex items-center gap-md h-full">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `font-body text-body-md py-1 transition-all border-b-2 ${
                  isActive
                    ? "text-primary border-primary font-bold"
                    : "text-on-surface-variant border-transparent font-medium hover:text-primary"
                }`
              }
              end
            >
              Stores
            </NavLink>
            <NavLink
              to="/deals"
              className={({ isActive }) =>
                `font-body text-body-md py-1 transition-all border-b-2 flex items-center gap-1 ${
                  isActive
                    ? "text-primary border-primary font-bold"
                    : "text-on-surface-variant border-transparent font-medium hover:text-primary"
                }`
              }
            >
              <Sparkles size={16} className="text-secondary" />
              Deals
            </NavLink>
            <NavLink
              to="/offers"
              className={({ isActive }) =>
                `font-body text-body-md py-1 transition-all border-b-2 flex items-center gap-1 ${
                  isActive
                    ? "text-primary border-primary font-bold"
                    : "text-on-surface-variant border-transparent font-medium hover:text-primary"
                }`
              }
            >
              <Tag size={16} className="text-tertiary" />
              Offers
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `font-body text-body-md py-1 transition-all border-b-2 flex items-center gap-1 ${
                  isActive
                    ? "text-primary border-primary font-bold"
                    : "text-on-surface-variant border-transparent font-medium hover:text-primary"
                }`
              }
            >
              <Package size={16} />
              Orders
            </NavLink>
          </nav>

          <div className="flex items-center gap-md border-l border-outline-variant/20 pl-md">
            {/* User Account Menu */}
            {isLoggedIn ? (
              <div
                className="relative"
                onMouseEnter={() => setAccountOpen(true)}
                onMouseLeave={() => setAccountOpen(false)}
              >
                <button
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer active:scale-95"
                >
                  <CircleUserRound size={22} className="text-primary" />
                  <span className="hidden lg:inline font-label text-label-md font-semibold text-on-surface max-w-[120px] truncate">
                    {user?.name || user?.email?.split("@")[0]}
                  </span>
                </button>
                {accountOpen && (
                  <div className="absolute top-full right-0 mt-1 w-52 bg-surface-container-lowest rounded-xl shadow-lift border border-outline-variant/30 overflow-hidden z-50 py-xs">
                    <div className="px-md py-sm border-b border-outline-variant/20">
                      <p className="font-label text-label-md font-bold text-on-surface truncate">{user?.name || "Customer"}</p>
                      <p className="text-[12px] text-on-surface-variant truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/orders"
                      onClick={() => setAccountOpen(false)}
                      className="w-full flex items-center gap-md px-md py-2.5 hover:bg-surface-container-low transition-colors text-left"
                    >
                      <Package className="text-on-surface-variant" size={18} />
                      <span className="font-label text-label-md text-on-surface">My Orders</span>
                    </Link>
                    {isVendor && (
                      <Link
                        to="/vendor"
                        onClick={() => setAccountOpen(false)}
                        className="w-full flex items-center gap-md px-md py-2.5 hover:bg-surface-container-low transition-colors text-left"
                      >
                        <Store className="text-on-surface-variant" size={18} />
                        <span className="font-label text-label-md text-on-surface">Vendor Hub</span>
                      </Link>
                    )}
                    <Link
                      to="/offers"
                      onClick={() => setAccountOpen(false)}
                      className="w-full flex items-center gap-md px-md py-2.5 hover:bg-surface-container-low transition-colors text-left"
                    >
                      <Tag className="text-on-surface-variant" size={18} />
                      <span className="font-label text-label-md text-on-surface">My Coupons</span>
                    </Link>
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-md px-md py-2.5 hover:bg-surface-container-low transition-colors text-left border-t border-outline-variant/20 text-error"
                    >
                      <LogOut size={18} />
                      <span className="font-label text-label-md font-bold">Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer active:scale-95"
                title="Log In"
              >
                <CircleUserRound size={22} className="text-primary" />
                <span className="hidden sm:inline font-label text-label-md font-semibold">Log In</span>
              </Link>
            )}

            {/* Cart Button with Live Badge Count */}
            <button
              onClick={openCart}
              className="relative px-5 py-2 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-secondary text-on-secondary text-xs font-bold rounded-full animate-in zoom-in-50">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Compact nav: the inline desktop links only fit at xl and up */}
      <nav className="xl:hidden flex border-t border-outline-variant/20 px-margin-mobile">
        <NavLink to="/" end className={mobileLinkClass}>
          <MapPin size={18} />
          Stores
        </NavLink>
        <NavLink to="/deals" className={mobileLinkClass}>
          <Sparkles size={18} />
          Deals
        </NavLink>
        <NavLink to="/offers" className={mobileLinkClass}>
          <Tag size={18} />
          Offers
        </NavLink>
        <NavLink to="/orders" className={mobileLinkClass}>
          <Package size={18} />
          Orders
        </NavLink>
      </nav>
    </header>
  );
}
