import { Link, NavLink, Outlet } from "react-router-dom";
import { LayoutGrid, Archive, ShoppingBag, Settings, Bell, HelpCircle, Plus, Store } from "lucide-react";

const NAV = [
  { to: "/vendor", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/vendor/inventory", label: "Inventory", icon: Archive },
  { to: "/vendor/orders", label: "Orders", icon: ShoppingBag },
  { to: "/vendor/settings", label: "Settings", icon: Settings },
];

export default function VendorLayout() {
  return (
    <div className="min-h-screen flex bg-surface">
      {/* Sidebar */}
      <aside className="w-[300px] shrink-0 bg-surface-container-low border-r border-outline-variant/20 flex flex-col p-lg hidden md:flex">
        <div className="flex items-center gap-sm mb-2xl">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden shrink-0">
            <Store size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-display text-headline-sm font-bold text-primary leading-tight">Vendor Hub</p>
            <p className="font-body text-body-sm text-on-surface-variant leading-tight">Manage your shop</p>
          </div>
        </div>

        <nav className="flex flex-col gap-xs flex-grow">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-md px-md py-3 rounded-md font-label text-label-md transition-colors ${
                  isActive
                    ? "bg-secondary-container text-on-secondary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-md pt-lg border-t border-outline-variant/20">
          <Link
            to="/vendor/inventory?add=1"
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-label text-label-md py-3 rounded-full shadow-sm hover:bg-primary-container transition-colors"
          >
            <Plus size={18} />
            Add New Product
          </Link>
          <button
            disabled
            title="Coming soon"
            className="w-full flex items-center gap-2 text-on-surface-variant font-body text-body-sm opacity-40 cursor-not-allowed"
          >
            <HelpCircle size={18} />
            Help Center
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-grow flex flex-col min-w-0">
        <header className="h-16 border-b border-outline-variant/20 bg-surface flex items-center justify-between px-lg shrink-0">
          <p className="font-display text-headline-sm font-bold text-on-surface">Shop Manager</p>
          <div className="flex items-center gap-md">
            <span className="flex items-center gap-1 font-label text-label-md text-primary">
              <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
              Online
            </span>
            <button
              disabled
              title="Notifications coming soon"
              aria-label="Notifications"
              className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant opacity-40 cursor-not-allowed"
            >
              <Bell size={20} />
            </button>
            <Link
              to="/vendor/settings"
              aria-label="Shop settings"
              className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <Settings size={20} />
            </Link>
            <Link
              to="/"
              className="px-4 py-1.5 border border-outline-variant rounded-full font-label text-label-md text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Back to NearBasket
            </Link>
          </div>
        </header>
        <main className="flex-grow p-lg md:p-xl overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
