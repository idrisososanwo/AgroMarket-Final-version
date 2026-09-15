/**
 * Cart Domain Types
 */

export interface CartItemDetail {
  id: string;
  cartId: string;
  listingId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  title: string;
  productName: string;
  categoryName: string;
  unit: string;
  pricePerUnit: number;
  minimumOrderQuantity: number;
  quantityAvailable: number;
  sellerId: string;
  sellerName: string;
  sellerState: string;
  sellerLga: string;
  subtotal: number;
}

export interface BuyerCart {
  id: string;
  userId: string;
  items: CartItemDetail[];
  subtotal: number;
  total: number;
  currency: string;
  sellerCount: number;
  itemCount: number;
}

export interface AddToCartInput {
  listingId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  cartItemId: string;
  quantity: number;
}
