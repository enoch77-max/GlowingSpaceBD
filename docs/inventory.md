# Product variants and inventory

Open **Admin → Products → Add product / Edit → Inventory & variants**.

## Stock sources

- **No variants:** one product, one price, one stock count.
- **Packs · shared pieces:** enter the number of loose pieces once. Each variant defines pieces per pack and a selling price. The available quantity is `floor(shared pieces / pieces per pack)`.
- **Separate variant stock:** use for different models, wattages, colours, or specifications. Each variant has its own price, stock and optional low-stock threshold. Selling one never uses another variant's stock.
- **One shared stock count:** all variants consume one item from the same pool per quantity sold. Use only when those variants really share physical inventory.

For 50 cells, 1 / 3 / 5 / 10-cell packs show **50 / 16 / 10 / 5** available. These are alternative capacities, not extra inventory. Selling two 10-cell packs leaves 30 cells and recalculates all capacities.

Quantity is independent of variant: a 10-cell pack at quantity 2 means 20 cells. Independent variants each consume one of that exact variant.

## Prices and savings

Every variant has its own selling price. In pack mode, a blank comparison price automatically compares against the current 1-piece variant's price × pieces per pack. Example: single cell ৳500, 10-cell pack ৳4,500 → **Save ৳500 · 10%**. An explicit comparison price overrides that reference. Other modes only show savings when a comparison price is explicitly entered.

## Safe management

- Variant IDs are stable and remain separate even if two options each contain one item.
- Disable a variant rather than repurposing it for a different model. Existing orders keep their original labels, IDs, quantities and charged prices.
- Shared-piece availability is calculated; do not add pack capacities together or manually enter stock for each shared pack.
- Switching stock modes requires confirmation. Counts are not automatically redistributed: review the shared pool or each variant's stock before saving.
- A default low-stock threshold applies to the product; independent variants can override it. An explicit threshold of 0 disables alerts.
- Product saves are database-backed and revision-checked. If an order changes stock while an editor is open, a stale save is rejected; reopen the editor to get current stock.
- Checkout re-reads current prices and stock under PostgreSQL row locks. An order and all of its stock deductions commit together, or none do. Reusing the same order request ID does not deduct twice.
- A server-side inventory event records the before/after product state for admin edits and accepted orders. Stock is deducted when the order is accepted, not when it is merely added to the cart.

The existing admin portal is still the project's preview role system, not production authentication. Secure admin authentication and a dedicated stock-adjustment/returns workflow are recommended before public launch. Cancelled/returned-order restocking should be an explicit, audited action rather than a silent repeatable addition.

## Checks

- `npx tsx --test tests/*.test.mjs` — calculations, pricing, legacy carts and variant identity.
- With the preview running: `npx tsx scripts/verify-inventory-api.mjs` — real database round-trips, simultaneous orders, custom pricing and edit conflicts. Temporary records are removed at the end.
