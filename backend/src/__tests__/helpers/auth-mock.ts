import type { Mock } from "vitest";

type AsyncMock = Mock<(...args: any[]) => Promise<any>>;

/**
 * Better Auth context shape used by the invite activation flow.
 */
export interface AuthContextMock {
  password: {
    hash: AsyncMock;
  };
}

/**
 * Minimal Better Auth module shape required by the backend auth service tests.
 */
export interface AuthModuleMock {
  auth: {
    $context: Promise<AuthContextMock>;
  };
  context: AuthContextMock;
}

/**
 * Restores the auth mock to a clean state between tests.
 *
 * @param mock The hoisted auth module mock backing `auth.service.ts`.
 */
export function resetAuthMock(mock: AuthModuleMock) {
  mock.context.password.hash.mockReset();
  mock.auth.$context = Promise.resolve(mock.context);
}
