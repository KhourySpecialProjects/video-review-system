import { describe, it, expect, vi, beforeEach } from "vitest";

const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastErrorMock } }));

import { toastQueryError } from "./queryClient";

describe("toastQueryError", () => {
  beforeEach(() => toastErrorMock.mockReset());

  it("toasts the query's meta.errorMessage exactly once", () => {
    toastQueryError(new Error("boom"), {
      meta: { errorMessage: "Failed to fetch videos" },
    } as any);
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to fetch videos");
  });

  it("does nothing when meta.errorMessage is absent", () => {
    toastQueryError(new Error("boom"), { meta: undefined } as any);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("does nothing when meta.errorMessage is not a string", () => {
    toastQueryError(new Error("boom"), { meta: { errorMessage: 42 } } as any);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
