// Database models

export interface MenuItem {
  category: string;
  name: string;
  description?: string;
  price: number;
  is_estimate: boolean;
  // Flexible dietary/attribute tags as chips
  chips?: string[];
}

export interface Menu {
  id: string;
  created_at: string;
  pdf_url: string | null;
  restaurant_name: string;
  location: {
    city: string;
    state: string;
  };
  tax_rate: number;
  items: MenuItem[];
}

export interface Cart {
  id: string;
  menu_id: string | null;
  created_at: string;
  tip_percentage: number;
}

export interface CartItem {
  id: string;
  cart_id: string;
  user_name: string;
  item_name: string;
  item_price: number;
  is_price_estimate: boolean;
  quantity: number;
  notes?: string;
  created_at: string;
}

// API request/response types

export interface ParseMenuRequest {
  pdfUrl: string;
}

export interface ParseMenuResponse {
  cartId: string;
  restaurantName: string;
}

export interface ClaudeMenuAnalysis {
  is_menu: boolean;
  restaurant_name?: string;
  location?: {
    city: string;
    state: string;
  };
  items?: MenuItem[];
}

export interface AddCartItemRequest {
  user_name: string;
  item_name: string;
  item_price: number;
  is_price_estimate: boolean;
  quantity: number;
  notes?: string;
}

export interface UpdateCartItemRequest {
  quantity?: number;
  notes?: string;
}

export interface UpdateTipRequest {
  tip_percentage: number;
}

export interface GetCartResponse {
  cart: Cart;
  menu: Menu;
  items: CartItem[];
}

// UI/Calculation types

export interface CartTotals {
  subtotal: number;
  tax: number;
  tip: number;
  grand_total: number;
  per_person: Record<string, number>; // user_name -> amount
}

export interface GroupedCartItems {
  [user_name: string]: CartItem[];
}

// Tip preset options
export const TIP_PRESETS = [15, 18, 20, 22] as const;
export type TipPreset = typeof TIP_PRESETS[number];
