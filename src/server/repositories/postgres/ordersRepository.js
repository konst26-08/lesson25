import { statusFromDb, statusToDb } from "../../db/orderStatus.js";

function mapListItem(row) {
  return {
    orderNumber: row.order_number,
    createdAt: row.created_at,
    status: statusFromDb(row.status),
    total: Number(row.total_amount)
  };
}

function mapDetail(row, items, trackingNumber) {
  return {
    orderNumber: row.order_number,
    createdAt: row.created_at,
    status: statusFromDb(row.status),
    total: Number(row.total_amount),
    trackingNumber,
    items: items.map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price)
    }))
  };
}

export function createPostgresOrdersRepository(pool) {
  return {
    async listByUserId(userId) {
      const result = await pool.query(
        `SELECT
           order_number,
           TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at,
           status,
           total_amount
         FROM orders
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      return result.rows.map(mapListItem);
    },

    async findByOrderNumber(orderNumber, userId) {
      const orderResult = await pool.query(
        `SELECT
           order_number,
           TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at,
           status,
           total_amount
         FROM orders
         WHERE order_number = $1 AND user_id = $2
         LIMIT 1`,
        [orderNumber, userId]
      );

      if (!orderResult.rows[0]) {
        return null;
      }

      const itemsResult = await pool.query(
        `SELECT product_name, quantity, unit_price
         FROM order_items
         WHERE order_id = (
           SELECT id FROM orders WHERE order_number = $1 AND user_id = $2
         )
         ORDER BY id`,
        [orderNumber, userId]
      );

      const shipmentResult = await pool.query(
        `SELECT tracking_number
         FROM shipments
         WHERE order_id = (
           SELECT id FROM orders WHERE order_number = $1 AND user_id = $2
         )
         LIMIT 1`,
        [orderNumber, userId]
      );

      return mapDetail(
        orderResult.rows[0],
        itemsResult.rows,
        shipmentResult.rows[0]?.tracking_number ?? null
      );
    },

    async create(payload) {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const subtotal = payload.items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );
        const deliveryAmount = 0;
        const totalAmount = payload.total ?? subtotal + deliveryAmount;
        const dbStatus = statusToDb(payload.status ?? "Оплачен");

        const orderResult = await client.query(
          `INSERT INTO orders (
             order_number,
             user_id,
             customer_name,
             customer_phone,
             customer_email,
             delivery_city,
             delivery_street,
             delivery_house,
             delivery_apartment,
             delivery_postal_code,
             payment_method,
             status,
             subtotal_amount,
             delivery_amount,
             total_amount
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'card', $11, $12, $13, $14)
           RETURNING
             order_number,
             TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at,
             status,
             total_amount,
             id`,
          [
            payload.orderNumber,
            payload.userId,
            payload.contacts.name,
            payload.contacts.phone,
            payload.contacts.email,
            payload.address.city,
            payload.address.street,
            payload.address.house,
            payload.address.apartment || null,
            payload.address.zip || null,
            dbStatus,
            subtotal,
            deliveryAmount,
            totalAmount
          ]
        );

        const orderRow = orderResult.rows[0];
        const orderId = orderRow.id;

        for (const item of payload.items) {
          const lineTotal = item.unitPrice * item.quantity;
          await client.query(
            `INSERT INTO order_items (
               order_id,
               product_id,
               product_name,
               quantity,
               unit_price,
               line_total
             )
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [orderId, item.productId, item.productName, item.quantity, item.unitPrice, lineTotal]
          );
        }

        await client.query(
          `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
           VALUES ($1, NULL, $2, 'api')`,
          [orderId, dbStatus]
        );

        if (payload.trackingNumber) {
          await client.query(
            `INSERT INTO shipments (order_id, tracking_number, status)
             VALUES ($1, $2, 'in_transit')`,
            [orderId, payload.trackingNumber]
          );
        }

        await client.query("COMMIT");

        return mapDetail(
          orderRow,
          payload.items.map((item) => ({
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice
          })),
          payload.trackingNumber ?? null
        );
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
