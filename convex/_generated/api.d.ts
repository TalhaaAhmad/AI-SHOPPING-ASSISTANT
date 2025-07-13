/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as chats from "../chats.js";
import type * as complaints from "../complaints.js";
import type * as messages from "../messages.js";
import type * as order from "../order.js";
import type * as orders from "../orders.js";
import type * as products_seedProducts from "../products/seedProducts.js";
import type * as products from "../products.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  chats: typeof chats;
  complaints: typeof complaints;
  messages: typeof messages;
  order: typeof order;
  orders: typeof orders;
  "products/seedProducts": typeof products_seedProducts;
  products: typeof products;
  seed: typeof seed;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
