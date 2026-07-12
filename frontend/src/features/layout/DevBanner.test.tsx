// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveEnvBanner, DevBanner } from "./DevBanner";

describe("resolveEnvBanner", () => {
  it("returns the local banner when DEV is true", () => {
    expect(resolveEnvBanner({ DEV: true })).toEqual({
      text: "Local Development Preview",
    });
  });

  it("local takes precedence over the dev-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: true, VITE_APP_ENV: "dev-preview" }),
    ).toEqual({ text: "Local Development Preview" });
  });

  it("returns the Coolify banner for the dev-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: false, VITE_APP_ENV: "dev-preview" }),
    ).toEqual({
      text: "Asclepion 1.0 - This is a Development Preview. Do NOT upload any PII or other sensitive information.",
    });
  });

  it("returns null in production (no flags)", () => {
    expect(resolveEnvBanner({ DEV: false })).toBeNull();
  });
});

describe("DevBanner", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the local banner when DEV is stubbed true", () => {
    vi.stubEnv("DEV", true);
    render(<DevBanner />);
    expect(screen.getByText("Local Development Preview")).toBeInTheDocument();
  });

  it("renders the Coolify banner when VITE_APP_ENV=dev-preview", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "dev-preview");
    render(<DevBanner />);
    expect(
      screen.getByText(/Do NOT upload any PII or other sensitive information/),
    ).toBeInTheDocument();
  });

  it("renders nothing in production", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "");
    const { container } = render(<DevBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
