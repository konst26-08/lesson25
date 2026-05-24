export function createPostgresSportsRepository(pool) {
  return {
    async list() {
      const result = await pool.query(
        `SELECT code AS id, name AS label
         FROM sports
         ORDER BY id`
      );
      return result.rows;
    }
  };
}
