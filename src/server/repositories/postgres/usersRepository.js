function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role
  };
}

export function createPostgresUsersRepository(pool) {
  return {
    async findByEmail(email) {
      const result = await pool.query(
        `SELECT id, email, password_hash, role
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
      );
      return result.rows[0] ? mapUser(result.rows[0]) : null;
    },

    async findById(id) {
      const result = await pool.query(
        `SELECT id, email, password_hash, role
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [id]
      );
      return result.rows[0] ? mapUser(result.rows[0]) : null;
    },

    async findByOAuth(provider, providerUserId) {
      const result = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.role
         FROM user_oauth_accounts oa
         INNER JOIN users u ON u.id = oa.user_id
         WHERE oa.provider = $1 AND oa.provider_user_id = $2
         LIMIT 1`,
        [provider, providerUserId]
      );
      return result.rows[0] ? mapUser(result.rows[0]) : null;
    },

    async create(payload) {
      const firstName = payload.firstName ?? payload.email.split("@")[0];
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, role, first_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, password_hash, role`,
        [payload.email, payload.passwordHash ?? null, payload.role ?? "user", firstName]
      );
      return mapUser(result.rows[0]);
    },

    async linkOAuthAccount(userId, provider, providerUserId) {
      await pool.query(
        `INSERT INTO user_oauth_accounts (user_id, provider, provider_user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (provider, provider_user_id) DO NOTHING`,
        [userId, provider, providerUserId]
      );
    },

    async createFromOAuth(payload) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const firstName = payload.firstName ?? payload.email.split("@")[0];
        const userResult = await client.query(
          `INSERT INTO users (email, password_hash, role, first_name)
           VALUES ($1, NULL, $2, $3)
           RETURNING id, email, password_hash, role`,
          [payload.email, payload.role ?? "user", firstName]
        );

        const user = mapUser(userResult.rows[0]);

        await client.query(
          `INSERT INTO user_oauth_accounts (user_id, provider, provider_user_id)
           VALUES ($1, $2, $3)`,
          [user.id, payload.provider, payload.providerUserId]
        );

        await client.query("COMMIT");
        return user;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
