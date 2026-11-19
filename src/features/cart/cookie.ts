// SAC-06: the cart survives closing the browser. The value is the cart id, which works as its secret,
// so the cookie is httpOnly and never reaches client code.
export const CART_COOKIE = "helena_cart";
export const CART_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
