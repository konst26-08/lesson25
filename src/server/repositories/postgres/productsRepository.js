const PRODUCT_SELECT = `
  SELECT
    p.id,
    p.name,
    p.base_price::float8 AS price,
    s.code AS sport,
    b.name AS brand,
    p.is_active AS "isActive"
  FROM products p
  INNER JOIN sports s ON s.id = p.sport_id
  INNER JOIN brands b ON b.id = p.brand_id
`;

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createPostgresProductsRepository(pool) {
  return {
    async list() {
      const result = await pool.query(
        `${PRODUCT_SELECT}
         WHERE p.is_active = TRUE
         ORDER BY p.id`
      );
      return result.rows;
    },

    async findById(id) {
      const result = await pool.query(
        `${PRODUCT_SELECT}
         WHERE p.id = $1
         LIMIT 1`,
        [id]
      );
      return result.rows[0] ?? null;
    },

    async create(payload) {
      const slug = slugify(payload.name);
      const result = await pool.query(
        `INSERT INTO products (slug, name, sport_id, brand_id, base_price, is_active)
         SELECT $1, $2, s.id, b.id, $3, COALESCE($4, TRUE)
         FROM sports s
         CROSS JOIN brands b
         WHERE s.code = $5 AND b.name = $6
         RETURNING id`,
        [slug, payload.name, payload.price, payload.isActive, payload.sport, payload.brand]
      );

      if (!result.rows[0]) {
        return null;
      }

      return this.findById(result.rows[0].id);
    },

    async update(id, payload) {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }

      const nextName = payload.name ?? existing.name;
      const nextPrice = payload.price ?? existing.price;
      const nextSport = payload.sport ?? existing.sport;
      const nextBrand = payload.brand ?? existing.brand;
      const nextActive = payload.isActive ?? existing.isActive;

      await pool.query(
        `UPDATE products
         SET
           name = $2,
           base_price = $3,
           is_active = $4,
           sport_id = (SELECT id FROM sports WHERE code = $5),
           brand_id = (SELECT id FROM brands WHERE name = $6),
           slug = $7
         WHERE id = $1`,
        [id, nextName, nextPrice, nextActive, nextSport, nextBrand, slugify(nextName)]
      );

      return this.findById(id);
    },

    async remove(id) {
      const result = await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
      return result.rowCount > 0;
    }
  };
}
