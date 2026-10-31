const SETTINGS_STORAGE_KEY = "nearbasket_vendor_settings_v1";

export const DEFAULT_SETTINGS = {
  shopName: "Sharma General Store",
  shopType: "Kirana / Grocery",
  phone: "+91 98765 43210",
  description:
    "Your friendly neighborhood store for daily groceries, fresh dairy, and household essentials. Serving the community since 2015.",
  street: "45 HAL 2nd Stage",
  city: "Bengaluru",
  pincode: "560038",
  weekdayOpen: "08:00",
  weekdayClose: "22:00",
  sundayOpen: "08:00",
  sundayClose: "14:00",
};

export function loadVendorSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Returns false when storage is unavailable (private mode)
export function saveVendorSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
