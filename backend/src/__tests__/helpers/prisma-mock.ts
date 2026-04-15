import type { Mock } from "vitest";

type AsyncMock = Mock<(...args: any[]) => Promise<any>>;

/**
 * Resets a flat collection of async mocks used by a test double.
 *
 * @param collection Mock functions keyed by the Prisma method they represent.
 */
function resetMocks(collection: Record<string, AsyncMock>) {
  for (const mock of Object.values(collection)) {
    mock.mockReset();
  }
}

/**
 * Prisma surface area used by `videos.service.ts`.
 */
export interface VideosPrismaMock {
  video: {
    findMany: AsyncMock;
    count: AsyncMock;
    findUnique: AsyncMock;
    create: AsyncMock;
    update: AsyncMock;
    delete: AsyncMock;
  };
}

/**
 * Transaction-scoped Prisma methods used by `auth.service.ts`.
 */
export interface AuthTransactionPrismaMock {
  invitation: {
    updateMany: AsyncMock;
    findFirst: AsyncMock;
  };
  user: {
    findUnique: AsyncMock;
    create: AsyncMock;
  };
  account: {
    create: AsyncMock;
  };
}

/**
 * Full Prisma surface area used by the auth service tests, including the
 * transaction entrypoint and pre-transaction invitation creation path.
 */
export interface AuthPrismaMock extends AuthTransactionPrismaMock {
  invitation: AuthTransactionPrismaMock["invitation"] & {
    create: AsyncMock;
  };
  $transaction: AsyncMock;
}

/**
 * Clears all Prisma mock state used by video service tests.
 *
 * @param mock The hoisted Prisma mock backing `videos.service.ts`.
 */
export function resetVideosPrismaMock(mock: VideosPrismaMock) {
  resetMocks(mock.video);
}

/**
 * Clears all Prisma mock state used by auth service tests.
 *
 * @param mock The hoisted Prisma mock backing `auth.service.ts`.
 */
export function resetAuthPrismaMock(mock: AuthPrismaMock) {
  resetMocks(mock.invitation);
  resetMocks(mock.user);
  resetMocks(mock.account);
  mock.$transaction.mockReset();
}
