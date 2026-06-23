"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { OrderValues } from "@/lib/schemas";
import {
  createOrder,
  getOrderReceipt,
  getSupplierBuyingPrice,
  listOrders,
  updateOrderPayment,
} from "@/server/actions/orders";
import { getItemPricingForCustomer } from "@/server/actions/customers";
import type { OrderPaymentValues } from "@/lib/schemas";

export function useOrders(search = "") {
  return useQuery({
    queryKey: queryKeys.orders(search),
    queryFn: async () => listOrders(await getAccessToken(), search),
  });
}

export function useOrderReceipt(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.order(orderId ?? ""),
    queryFn: async () => getOrderReceipt(await getAccessToken(), orderId as string),
    enabled: Boolean(orderId),
  });
}

/** Pricing context for this customer + item (last sold price, cost then, current cost). */
export function useItemPricing(customerId: string | null, itemId: string | null) {
  return useQuery({
    queryKey: queryKeys.itemPricing(customerId ?? "", itemId ?? ""),
    queryFn: async () => getItemPricingForCustomer(await getAccessToken(), customerId as string, itemId as string),
    enabled: Boolean(customerId && itemId),
  });
}

/** Latest buying price for an item from a supplier (read-only order-line hint). */
export function useSupplierBuyingPrice(itemId: string | null, supplierId: string | null) {
  return useQuery({
    queryKey: ["supplier-buying-price", itemId, supplierId],
    queryFn: async () => getSupplierBuyingPrice(await getAccessToken(), itemId as string, supplierId as string),
    enabled: Boolean(itemId && supplierId),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: OrderValues) => createOrder(await getAccessToken(), values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["orders"] });
      void qc.invalidateQueries({ queryKey: ["khatas"] });
    },
  });
}

export function useUpdateOrderPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; values: OrderPaymentValues }) =>
      updateOrderPayment(await getAccessToken(), args.id, args.values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["orders"] });
      void qc.invalidateQueries({ queryKey: ["khatas"] });
    },
  });
}
