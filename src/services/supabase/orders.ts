import { supabase } from '../../lib/supabase';
import { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '../../types';
import { normalizePaymentStatus } from '../../lib/orderStatus';

/**
 * Line items live in the `orders.items` jsonb column.
 *
 * There is no `order_items` table on the production database and one must not
 * be introduced: `orders.items` is the single source of truth, and a second
 * home for the same data would let the two drift apart with no way to say which
 * is right. See SCHEMA_ALIGNMENT_REPORT.md.
 *
 * Parsed defensively because jsonb is schemaless -- a row written by another
 * client, or an older one, may be a JSON string rather than an array, or carry
 * differently-named fields. A malformed value yields an empty item list rather
 * than throwing, so one bad row cannot take down the whole order list.
 */
export function parseOrderItems(raw: any): OrderItem[] {
  let value = raw;

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value.map((item: any) => ({
    dish_id: item?.dish_id ?? item?.id ?? '',
    dish_name: item?.dish_name ?? item?.name ?? '',
    quantity: Number(item?.quantity ?? 0),
    price: Number(item?.price ?? 0),
    is_veg: item?.is_veg ?? undefined,
  }));
}

/**
 * One place that turns an `orders` row into an Order. Previously this mapping
 * was written out three times, so a column added to one copy silently went
 * missing from the others -- which is exactly what would have happened to the
 * Phase 3 verification columns.
 */
function mapOrderRow(row: any): Order {
  return {
    id: row.id,
    order_number: row.order_number,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    delivery_address: row.delivery_address,
    landmark: row.landmark || undefined,
    campus: row.campus || undefined,
    items: parseOrderItems(row.items),
    subtotal: Number(row.subtotal),
    tax_amount: Number(row.tax_amount),
    delivery_fee: Number(row.delivery_fee),
    total_amount: Number(row.total_amount),
    payment_method: row.payment_method as PaymentMethod,
    // Normalised on read so a row written by another client -- which settles
    // UPI payments as 'paid' -- still displays correctly here. Writes are
    // always canonical. See PAYMENT_STATUS_AUDIT.md.
    payment_status: normalizePaymentStatus(row.payment_status),
    upi_transaction_id: row.upi_transaction_id || undefined,
    payment_verified_at: row.payment_verified_at || undefined,
    payment_verified_by: row.payment_verified_by || undefined,
    payment_rejection_reason: row.payment_rejection_reason || undefined,
    status: row.status as OrderStatus,
    driver_id: row.driver_id || undefined,
    driver_name: row.driver_name || undefined,
    driver_phone: row.driver_phone || undefined,
    kitchen_notes: row.kitchen_notes || undefined,
    rating: row.rating || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const ordersService = {
  async fetchOrders(): Promise<Order[]> {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    return (ordersData || []).map(mapOrderRow);
  },

  async fetchCustomerOrders(customerId: string): Promise<Order[]> {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching customer orders:', ordersError);
      throw ordersError;
    }

    return (ordersData || []).map(mapOrderRow);
  },

  /**
   * Creates the order in a single INSERT.
   *
   * Line items go into the `orders.items` jsonb column alongside the header,
   * which removes a failure mode the previous two-step write had: an order row
   * could be inserted and its items then fail, leaving the kitchen a ticket
   * with nothing to cook. That is now impossible -- the row either exists
   * complete, or it does not exist.
   */
  async createOrder(orderInput: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    const items: OrderItem[] = (orderInput.items || []).map((item) => ({
      dish_id: item.dish_id,
      dish_name: item.dish_name,
      quantity: item.quantity,
      price: item.price,
      is_veg: item.is_veg ?? false,
    }));

    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          order_number: orderInput.order_number,
          customer_id: orderInput.customer_id || null,
          customer_name: orderInput.customer_name,
          customer_phone: orderInput.customer_phone,
          delivery_address: orderInput.delivery_address,
          landmark: orderInput.landmark || null,
          campus: orderInput.campus || null,
          items,
          subtotal: orderInput.subtotal,
          tax_amount: orderInput.tax_amount,
          delivery_fee: orderInput.delivery_fee,
          total_amount: orderInput.total_amount,
          payment_method: orderInput.payment_method,
          payment_status: orderInput.payment_status,
          upi_transaction_id: orderInput.upi_transaction_id || null,
          status: orderInput.status,
          driver_id: orderInput.driver_id || null,
          driver_name: orderInput.driver_name || null,
          driver_phone: orderInput.driver_phone || null,
          kitchen_notes: orderInput.kitchen_notes || null,
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Error inserting order:', orderError);
      throw orderError;
    }

    // The row that came back is authoritative -- it carries the database's own
    // id, created_at and any column defaults, rather than what we hoped it
    // would store.
    return mapOrderRow(insertedOrder);
  },

  /**
   * Records the customer's claim that a UPI transfer was made.
   *
   * This is a claim, not a verified settlement -- nothing here talks to a
   * payment gateway, so it must never be called with 'completed' on the
   * strength of the customer pressing a button.
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    upiTransactionId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        ...(upiTransactionId ? { upi_transaction_id: upiTransactionId } : {}),
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  /**
   * Admin: confirm that a UPI transfer actually arrived.
   *
   * This is the only path that sets payment_status = 'completed'. Nothing in
   * the customer flow may call it -- pressing "I've Paid" records a claim, and
   * a claim is not a settlement.
   *
   * `payment_verified_at` and `payment_verified_by` are deliberately NOT sent.
   * Migration 0007's BEFORE UPDATE trigger stamps them from auth.uid(), so the
   * audit trail records the actor the database saw rather than one the client
   * asserted. Sending them here would be overwritten anyway.
   *
   * Authorisation is enforced twice over, in the database, not here:
   *   - RLS ("Staff update orders" / orders_team_write) restricts UPDATE on
   *     orders to team members;
   *   - the 0007 trigger raises check_violation if a non-team member moves
   *     payment_status off 'pending'.
   * A client-side role check would be a convenience, not a control.
   *
   * The status guard is repeated in the WHERE clause: between the admin seeing
   * the row and pressing the button, a colleague may have already settled it.
   * Zero rows back means someone got there first (or RLS refused), which is
   * reported rather than swallowed.
   */
  async verifyPayment(orderId: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({ payment_status: 'completed', payment_rejection_reason: null })
      .eq('id', orderId)
      .eq('payment_status', 'pending')
      .select('*');

    if (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('This payment could not be verified — it may already have been reviewed by someone else.');
    }

    return mapOrderRow(data[0]);
  },

  /**
   * Admin: refuse a UPI payment the restaurant never received.
   *
   * Leaves `status` alone. A rejected payment is not a cancelled order -- the
   * customer may still pay by another means, and deciding to cancel is a
   * separate call the admin makes deliberately.
   *
   * See verifyPayment above for why the audit columns are not sent from here.
   */
  async rejectPayment(orderId: string, reason?: string): Promise<Order> {
    const trimmed = reason?.trim();

    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: 'rejected',
        payment_rejection_reason: trimmed ? trimmed : null,
      })
      .eq('id', orderId)
      .eq('payment_status', 'pending')
      .select('*');

    if (error) {
      console.error('Error rejecting payment:', error);
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('This payment could not be rejected — it may already have been reviewed by someone else.');
    }

    return mapOrderRow(data[0]);
  },

  /**
   * Customer-initiated cancellation.
   *
   * The `status` guard is repeated in the WHERE clause rather than trusted to
   * the UI: between the button rendering and this call, the kitchen may have
   * accepted and started cooking. `select()` returning zero rows means the
   * order moved on (or RLS refused), which is reported rather than swallowed.
   *
   * Requires migration 0006 -- customers have no UPDATE policy without it.
   */
  async cancelOrder(orderId: string): Promise<void> {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .in('status', ['pending', 'accepted'])
      .select('id');

    if (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('This order can no longer be cancelled — the kitchen has already started preparing it.');
    }
  },

  /** Single order by id, used by live tracking to poll a fresh status. */
  async fetchOrderById(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
    if (!data) return null;

    return mapOrderRow(data);
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  /**
   * Assigns a driver and sets the order status in one write.
   *
   * `status` used to be hardcoded to 'assigned', which silently overrode
   * whatever the caller asked for. The admin panel passes the selected driver
   * along with EVERY status button, so pressing "Mark Delivered" while a driver
   * was chosen wrote 'assigned' instead of 'delivered' -- the row reverted the
   * moment realtime refetched, and the button looked broken.
   */
  async assignDriver(
    orderId: string,
    driverId: string,
    driverName: string,
    driverPhone: string,
    status: OrderStatus = 'assigned'
  ): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        driver_id: driverId,
        driver_name: driverName,
        driver_phone: driverPhone,
        status,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error assigning driver:', error);
      throw error;
    }
  },
};
