// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveEnvBanner, DevBanner } from "./DevBanner";

const DEV_PREVIEW_TEXT =
  "This is a Development Preview. Do NOT upload any PII or other sensitive information.";
const NEXT_PREVIEW_TEXT =
  "NEXT (staging). Unstable build. Do NOT upload any PII or other sensitive information.";
const VERSION_RE = /v\d+\.\d+\.\d+/;

describe("resolveEnvBanner", () => {
  it("returns the local banner in vivid red when DEV is true", () => {
    expect(resolveEnvBanner({ DEV: true })).toEqual({
      text: "Local Development",
      className: "bg-destructive",
    });
  });

  it("local takes precedence over the dev-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: true, VITE_APP_ENV: "dev-preview" }),
    ).toEqual({ text: "Local Development", className: "bg-destructive" });
  });

  it("local takes precedence over the next-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: true, VITE_APP_ENV: "next-preview" }),
    ).toEqual({ text: "Local Development", className: "bg-destructive" });
  });

  it("returns the amber dev banner for the dev-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: false, VITE_APP_ENV: "dev-preview" }),
    ).toEqual({ text: DEV_PREVIEW_TEXT, className: "bg-warning" });
  });

  it("returns the blue NEXT banner for the next-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: false, VITE_APP_ENV: "next-preview" }),
    ).toEqual({ text: NEXT_PREVIEW_TEXT, className: "bg-info" });
  });

  it("gives the three environments clearly distinct colors", () => {
    const local = resolveEnvBanner({ DEV: true })!.className;
    const dev = resolveEnvBanner({ DEV: false, VITE_APP_ENV: "dev-preview" })!.className;
    const next = resolveEnvBanner({ DEV: false, VITE_APP_ENV: "next-preview" })!.className;
    expect(new Set([local, dev, next]).size).toBe(3);
    expect([local, dev, next]).toEqual(["bg-destructive", "bg-warning", "bg-info"]);
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

  it("renders the local banner in red with the version when DEV is stubbed true", () => {
    vi.stubEnv("DEV", true);
    render(<DevBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Local Development");
    expect(banner).toHaveClass("bg-destructive");
    expect(banner).toHaveTextContent(VERSION_RE);
  });

  it("renders the amber dev banner with the version when VITE_APP_ENV=dev-preview", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "dev-preview");
    render(<DevBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/Do NOT upload any PII or other sensitive information/);
    expect(banner).toHaveClass("bg-warning");
    expect(banner).not.toHaveClass("bg-info");
    expect(banner).toHaveTextContent(VERSION_RE);
  });

  it("renders the blue NEXT banner with the version when VITE_APP_ENV=next-preview", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "next-preview");
    render(<DevBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("NEXT (staging)");
    expect(banner).toHaveClass("bg-info");
    expect(banner).toHaveTextContent(VERSION_RE);
  });

  it("renders nothing in production", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "");
    const { container } = render(<DevBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
