import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { DesignExtractor } from "./extractor.js";

const TEST_DIR = resolve(tmpdir(), "adp-extractor-test-" + Date.now());

beforeEach(async () => {
  await mkdir(resolve(TEST_DIR, "components", "ui"), { recursive: true });
  await mkdir(resolve(TEST_DIR, "components", "marketplace"), { recursive: true });
  await mkdir(resolve(TEST_DIR, "app"), { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("DesignExtractor", () => {
  it("extracts tokens from Tailwind config", async () => {
    await writeFile(resolve(TEST_DIR, "tailwind.config.ts"), `
import type { Config } from "tailwindcss";

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#2563eb',
        surface: '#f8fafc',
      },
      spacing: {
        'page': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
`, "utf-8");

    const extractor = new DesignExtractor(TEST_DIR);
    const tokens = await extractor.extractTokens();

    expect(tokens.colors.brand).toBe("#2563eb");
    expect(tokens.colors.surface).toBe("#f8fafc");
    expect(tokens.spacing.page).toBe("24px");
    expect(tokens.typography.fontFamily).toBe("Inter");
    expect(tokens.radii?.card).toBe("12px");
  });

  it("extracts tokens from CSS variables", async () => {
    await writeFile(resolve(TEST_DIR, "app", "globals.css"), `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --radius: 0.5rem;
  --font-sans: Inter, system-ui;
}
`, "utf-8");

    const extractor = new DesignExtractor(TEST_DIR);
    const tokens = await extractor.extractTokens();

    expect(tokens.colors.background).toBe("0 0% 100%");
    expect(tokens.colors.primary).toBe("221.2 83.2% 53.3%");
    expect(tokens.radii?.radius).toBe("0.5rem");
  });

  it("extracts shadcn config metadata", async () => {
    await writeFile(resolve(TEST_DIR, "components.json"), JSON.stringify({
      style: "new-york",
      rsc: true,
      tsx: true,
      tailwind: {
        config: "tailwind.config.ts",
        css: "app/globals.css",
        baseColor: "neutral",
        cssVariables: false,
      },
    }), "utf-8");

    const extractor = new DesignExtractor(TEST_DIR);
    const tokens = await extractor.extractTokens();

    expect(tokens.colors._shadcn_style).toBe("new-york");
    expect(tokens.colors._shadcn_baseColor).toBe("neutral");
  });

  it("scans component directory", async () => {
    await writeFile(resolve(TEST_DIR, "components", "ui", "button.tsx"), `
import { cva } from "class-variance-authority";

interface ButtonProps {
  variant?: string;
  size?: string;
  children: React.ReactNode;
}

const buttonVariants = cva("...", {
  variants: {
    variant: { default: "", destructive: "", outline: "" },
    size: { default: "", sm: "", lg: "" },
  },
});

export function Button({ variant, size, children }: ButtonProps) {
  return <button className={buttonVariants({ variant, size })}>{children}</button>;
}
`, "utf-8");

    await writeFile(resolve(TEST_DIR, "components", "marketplace", "RequestCard.tsx"), `
/** Service request card with status indicator */
interface RequestCardProps {
  title: string;
  status: string;
  onClick: () => void;
}

export function RequestCard({ title, status, onClick }: RequestCardProps) {
  return <div onClick={onClick}>{title} - {status}</div>;
}
`, "utf-8");

    const extractor = new DesignExtractor(TEST_DIR);
    const components = await extractor.extractComponents();

    expect(components.length).toBeGreaterThanOrEqual(2);

    const button = components.find((c) => c.name === "Button");
    expect(button).toBeDefined();
    expect(button!.props).toContain("variant?: string");
    expect(button!.variants).toContain("variant");
    expect(button!.file).toContain("ui/button.tsx");

    const card = components.find((c) => c.name === "RequestCard");
    expect(card).toBeDefined();
    expect(card!.description).toContain("Service request card");
  });

  it("full extract produces a valid bundle", async () => {
    await writeFile(resolve(TEST_DIR, "tailwind.config.ts"), `
const config = {
  content: ['./app/**/*.tsx'],
  theme: { extend: {} },
  plugins: [],
};
export default config;
`, "utf-8");

    await writeFile(resolve(TEST_DIR, "components", "ui", "badge.tsx"), `
export function Badge({ children }: { children: React.ReactNode }) {
  return <span>{children}</span>;
}
`, "utf-8");

    const extractor = new DesignExtractor(TEST_DIR);
    const bundle = await extractor.extract();

    expect(bundle.source).toBe("extracted");
    expect(bundle.timestamp).toBeTruthy();
    expect(bundle.tokens).toBeDefined();
    expect(bundle.components.length).toBeGreaterThanOrEqual(1);
    expect(bundle.components.find((c) => c.name === "Badge")).toBeDefined();
  });

  it("handles missing project files gracefully", async () => {
    const emptyDir = resolve(tmpdir(), "adp-empty-" + Date.now());
    await mkdir(emptyDir, { recursive: true });

    const extractor = new DesignExtractor(emptyDir);
    const bundle = await extractor.extract();

    expect(bundle.source).toBe("extracted");
    expect(bundle.components).toEqual([]);
    expect(Object.keys(bundle.tokens.colors)).toHaveLength(0);

    await rm(emptyDir, { recursive: true, force: true });
  });
});
