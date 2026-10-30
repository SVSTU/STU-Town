/* Supabase persistence and best-selling product queries for the canteen. */

function createCanteenSalesService({ io, isSupabaseConfigured, supabaseRequest, persistPlayer, foodMenu }) {
  const FOOD_MENU = foodMenu;
  async function recordCanteenSale(id, sale) {
    if (!isSupabaseConfigured) return;
    const playerSocket = io.sockets.sockets.get(id);
    const tokenHash = playerSocket?.data?.playerTokenHash;
    if (!tokenHash) return;
  
    try {
      // Ensure the player profile exists before inserting a sale because
      // canteen_sales.player_token_hash references player_profiles.token_hash.
      await persistPlayer(id);
      await supabaseRequest('canteen_sales', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          player_token_hash: tokenHash,
          item_id: sale.itemId,
          quantity: sale.quantity,
          unit_price: sale.unitPrice,
          currency: sale.currency,
          total_price: sale.totalPrice
        })
      });
    } catch (error) {
      console.error('Không lưu được lịch sử mua hàng Căn tin vào Supabase:', error.message);
    }
  }
  
  async function getCanteenBestSellingProducts() {
    if (!isSupabaseConfigured) return [];
    try {
      const query = new URLSearchParams({
        select: 'item_id,total_quantity_sold,total_transactions',
        order: 'total_quantity_sold.desc',
        limit: '2'
      });
      const rows = await supabaseRequest(`canteen_product_stats?${query}`);
      return (Array.isArray(rows) ? rows : [])
        .filter((row) => Object.hasOwn(FOOD_MENU, row.item_id) && Number(row.total_quantity_sold) > 0)
        .sort((a, b) => Number(b.total_quantity_sold) - Number(a.total_quantity_sold))
        .slice(0, 2)
        .map((row) => ({
          itemId: row.item_id,
          totalQuantitySold: Number(row.total_quantity_sold) || 0,
          totalTransactions: Number(row.total_transactions) || 0
        }));
    } catch (error) {
      console.error('Không tải được top vật phẩm bán chạy Căn tin:', error.message);
      return [];
    }
  }
  
  async function emitCanteenBestSellingProducts(target = io) {
    const products = await getCanteenBestSellingProducts();
    target.emit('canteenBestSellingProducts', products);
  }

  return { recordCanteenSale, getCanteenBestSellingProducts, emitCanteenBestSellingProducts };
}

module.exports = { createCanteenSalesService };
