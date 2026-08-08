# Supabase Realtime Setup & Architecture

Realtime event streaming guide for **Trippy's Mehfill**.

---

## Enabled Realtime Publications

In Supabase Dashboard $\rightarrow$ **Database** $\rightarrow$ **Publications**, enable `postgres_changes` for the following tables:
- `orders`
- `inventory`
- `notifications`

---

## Client Service Implementation

Realtime channels are managed centrally in [`src/services/supabase/realtime.ts`](../src/services/supabase/realtime.ts):

### 1. Kitchen & Live Orders Queue (`orders`)

```typescript
const ordersChannel = realtimeService.subscribeToOrders((payload) => {
  console.log('Order table event received:', payload.eventType);
  ordersService.fetchOrders().then(setOrders);
});
```

- **Kitchen View**: Plays an audio chime alert when a new order (`INSERT`) arrives.
- **Customer Tracker**: Updates order status badge (`cooking`, `out_for_delivery`, `delivered`) live without refreshing the page.
- **Driver Portal**: Shows new delivery assignment notifications instantaneously.

### 2. Stock Level Inventory Alert (`inventory`)

```typescript
const inventoryChannel = realtimeService.subscribeToInventory((payload) => {
  inventoryService.fetchInventory().then(setInventory);
});
```

- Automatically updates inventory counters in the Admin ERP view whenever items are restocked or deducted.

---

## Channel Teardown Lifecycle

All Realtime subscriptions automatically unsubscribe upon React component unmount (`useEffect` cleanup return function) to prevent memory leaks and redundant websocket connections.
