import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-surface-container w-full py-xl mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-start px-margin-mobile md:px-margin-desktop w-full max-w-content mx-auto gap-xl">
        <div className="flex flex-col gap-sm">
          <span className="font-display text-headline-sm font-bold text-on-surface">NearBasket</span>
          <p className="font-label text-label-sm text-on-surface-variant">© 2024 NearBasket. Your Helpful Neighbor.</p>
        </div>
        <nav className="flex flex-col sm:flex-row gap-lg">
          <a className="font-body text-body-md text-on-surface-variant hover:underline hover:text-primary transition-all" href="#">
            About Us
          </a>
          <Link className="font-body text-body-md text-on-surface-variant hover:underline hover:text-primary transition-all" to="/vendor">
            Sell on NearBasket
          </Link>
          <a className="font-body text-body-md text-on-surface-variant hover:underline hover:text-primary transition-all" href="#">
            Download App
          </a>
          <a className="font-body text-body-md text-on-surface-variant hover:underline hover:text-primary transition-all" href="#">
            Privacy Policy
          </a>
        </nav>
      </div>
    </footer>
  );
}
