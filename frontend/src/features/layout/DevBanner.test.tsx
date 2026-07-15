// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveEnvBanner, DevBanner } from "./DevBanner";

const DEV_PREVIEW_TEXT =
  "Asclepion 0.1 - This is a Development Preview. Do NOT upload any PII or other sensitive information.";
const NEXT_PREVIEW_TEXT =
  "Asclepion 0.1 - NEXT (staging). Unstable build. Do NOT upload any PII or other sensitive information.";

describe("resolveEnvBanner", () => {
  it("returns the local banner when DEV is true", () => {
    expect(resolveEnvBanner({ DEV: true })).toEqual({
      text: "Local Development Preview",
      className: "bg-warning",
    });
  });

  it("local takes precedence over the dev-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: true, VITE_APP_ENV: "dev-preview" }),
    ).toEqual({ text: "Local Development Preview", className: "bg-warning" });
  });

  it("local takes precedence over the next-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: true, VITE_APP_ENV: "next-preview" }),
    ).toEqual({ text: "Local Development Preview", className: "bg-warning" });
  });

  it("returns the Coolify banner for the dev-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: false, VITE_APP_ENV: "dev-preview" }),
    ).toEqual({ text: DEV_PREVIEW_TEXT, className: "bg-warning" });
  });

  it("returns the NEXT banner for the next-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: false, VITE_APP_ENV: "next-preview" }),
    ).toEqual({ text: NEXT_PREVIEW_TEXT, className: "bg-info" });
  });

  it("returns null in production (no flags)", () => {
    expect(resolveEnvBanner({ DEV: false })).toBeNull();
  });

  it("returns null for an unknown flag value", () => {
    expect(
      resolveEnvBanner({ DEV: false, VITE_APP_ENV: "something-else" }),
    ).toBeNull();
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

  it("renders the NEXT banner with bg-info when VITE_APP_ENV=next-preview", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "next-preview");
    render(<DevBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("NEXT (staging)");
    expect(banner).toHaveClass("bg-info");
  });

  it("renders the dev banner with bg-warning, not bg-info", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "dev-preview");
    render(<DevBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveClass("bg-warning");
    expect(banner).not.toHaveClass("bg-info");
  });

  it("renders nothing in production", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "");
    const { container } = render(<DevBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
