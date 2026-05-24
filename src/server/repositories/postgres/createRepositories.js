import { createPostgresUsersRepository } from "./usersRepository.js";
import { createPostgresProductsRepository } from "./productsRepository.js";
import { createPostgresSportsRepository } from "./sportsRepository.js";
import { createPostgresOrdersRepository } from "./ordersRepository.js";

export function createPostgresRepositories(pool) {
  return {
    usersRepository: createPostgresUsersRepository(pool),
    repository: createPostgresProductsRepository(pool),
    sportsRepository: createPostgresSportsRepository(pool),
    ordersRepository: createPostgresOrdersRepository(pool)
  };
}
