export function createInMemoryUsersRepository(initialUsers = []) {
  const users = [...initialUsers];
  const oauthAccounts = [];
  let nextId = users.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;

  return {
    findByEmail(email) {
      return users.find((item) => item.email === email) ?? null;
    },

    findById(id) {
      return users.find((item) => String(item.id) === String(id)) ?? null;
    },

    findByOAuth(provider, providerUserId) {
      const link = oauthAccounts.find(
        (item) => item.provider === provider && item.providerUserId === providerUserId
      );
      if (!link) {
        return null;
      }
      return this.findById(link.userId);
    },

    create(payload) {
      const user = {
        id: nextId++,
        email: payload.email,
        passwordHash: payload.passwordHash ?? null,
        role: payload.role ?? "user"
      };
      users.push(user);
      return user;
    },

    linkOAuthAccount(userId, provider, providerUserId) {
      const exists = oauthAccounts.some(
        (item) => item.provider === provider && item.providerUserId === providerUserId
      );
      if (!exists) {
        oauthAccounts.push({ userId, provider, providerUserId });
      }
    },

    createFromOAuth(payload) {
      const user = this.create({
        email: payload.email,
        passwordHash: null,
        role: payload.role ?? "user"
      });
      this.linkOAuthAccount(user.id, payload.provider, payload.providerUserId);
      return user;
    }
  };
}
