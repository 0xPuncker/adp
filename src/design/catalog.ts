/**
 * Design Catalog — fetch, cache, and search DESIGN.md files from getdesign.md
 *
 * Provides access to 72+ production-grade design system analyses that agents
 * can use as context when developing webapps.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// ─── Types ────────────────────────────────────────────────────────────────

export interface DesignEntry {
  slug: string;
  name: string;
  description: string;
  category: DesignCategory;
  url: string;
  contentUrl: string;
  isNew?: boolean;
}

export type DesignCategory =
  | "ai-llm"
  | "developer-tools"
  | "backend-devops"
  | "productivity-saas"
  | "design-creative"
  | "fintech-crypto"
  | "ecommerce-retail"
  | "media-consumer"
  | "automotive"
  | "unknown";

export interface DesignMetadata {
  slug: string;
  name: string;
  description: string;
  category: DesignCategory;
  fetchedAt: string;
  contentHash?: string;
}

export interface CatalogIndex {
  version: number;
  lastFetched: string;
  designs: DesignMetadata[];
}

// ─── Catalog URLs ───────────────────────────────────────────────────────────

const GETDESIGN_BASE = "https://getdesign.md";
const AWESOME_REPO = "https://raw.githubusercontent.com/VoltAgent/awesome-claude-design/main";

// Category mappings based on awesome-claude-design README sections
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CATEGORY_PATTERNS: Record<string, DesignCategory> = {
  "ai & llm platforms": "ai-llm",
  "developer tools & ides": "developer-tools",
  "backend, database & devops": "backend-devops",
  "productivity & saas": "productivity-saas",
  "design & creative tools": "design-creative",
  "fintech & crypto": "fintech-crypto",
  "e-commerce & retail": "ecommerce-retail",
  "media & consumer tech": "media-consumer",
  "automotive": "automotive",
};

// Known design slugs from getdesign.md
const KNOWN_DESIGNS: Array<{ slug: string; name: string; category: DesignCategory }> = [
  // AI & LLM
  { slug: "claude", name: "Claude", category: "ai-llm" },
  { slug: "cohere", name: "Cohere", category: "ai-llm" },
  { slug: "elevenlabs", name: "ElevenLabs", category: "ai-llm" },
  { slug: "minimax", name: "MiniMax", category: "ai-llm" },
  { slug: "mistral.ai", name: "Mistral AI", category: "ai-llm" },
  { slug: "ollama", name: "Ollama", category: "ai-llm" },
  { slug: "opencode.ai", name: "OpenCode AI", category: "ai-llm" },
  { slug: "replicate", name: "Replicate", category: "ai-llm" },
  { slug: "runwayml", name: "RunwayML", category: "ai-llm" },
  { slug: "together.ai", name: "Together AI", category: "ai-llm" },
  { slug: "voltagent", name: "VoltAgent", category: "ai-llm" },
  { slug: "x.ai", name: "xAI", category: "ai-llm" },

  // Developer Tools
  { slug: "cursor", name: "Cursor", category: "developer-tools" },
  { slug: "expo", name: "Expo", category: "developer-tools" },
  { slug: "lovable", name: "Lovable", category: "developer-tools" },
  { slug: "raycast", name: "Raycast", category: "developer-tools" },
  { slug: "superhuman", name: "Superhuman", category: "developer-tools" },
  { slug: "vercel", name: "Vercel", category: "developer-tools" },
  { slug: "warp", name: "Warp", category: "developer-tools" },

  // Backend/DevOps
  { slug: "clickhouse", name: "ClickHouse", category: "backend-devops" },
  { slug: "composio", name: "Composio", category: "backend-devops" },
  { slug: "hashicorp", name: "HashiCorp", category: "backend-devops" },
  { slug: "mongodb", name: "MongoDB", category: "backend-devops" },
  { slug: "posthog", name: "PostHog", category: "backend-devops" },
  { slug: "sanity", name: "Sanity", category: "backend-devops" },
  { slug: "sentry", name: "Sentry", category: "backend-devops" },
  { slug: "supabase", name: "Supabase", category: "backend-devops" },

  // Productivity/SaaS
  { slug: "cal", name: "Cal.com", category: "productivity-saas" },
  { slug: "intercom", name: "Intercom", category: "productivity-saas" },
  { slug: "linear.app", name: "Linear", category: "productivity-saas" },
  { slug: "mintlify", name: "Mintlify", category: "productivity-saas" },
  { slug: "notion", name: "Notion", category: "productivity-saas" },
  { slug: "resend", name: "Resend", category: "productivity-saas" },
  { slug: "zapier", name: "Zapier", category: "productivity-saas" },

  // Design/Creative
  { slug: "airtable", name: "Airtable", category: "design-creative" },
  { slug: "clay", name: "Clay", category: "design-creative" },
  { slug: "figma", name: "Figma", category: "design-creative" },
  { slug: "framer", name: "Framer", category: "design-creative" },
  { slug: "miro", name: "Miro", category: "design-creative" },
  { slug: "webflow", name: "Webflow", category: "design-creative" },

  // Fintech/Crypto
  { slug: "binance", name: "Binance", category: "fintech-crypto" },
  { slug: "coinbase", name: "Coinbase", category: "fintech-crypto" },
  { slug: "kraken", name: "Kraken", category: "fintech-crypto" },
  { slug: "mastercard", name: "Mastercard", category: "fintech-crypto" },
  { slug: "revolut", name: "Revolut", category: "fintech-crypto" },
  { slug: "stripe", name: "Stripe", category: "fintech-crypto" },
  { slug: "wise", name: "Wise", category: "fintech-crypto" },

  // E-commerce/Retail
  { slug: "airbnb", name: "Airbnb", category: "ecommerce-retail" },
  { slug: "meta", name: "Meta", category: "ecommerce-retail" },
  { slug: "nike", name: "Nike", category: "ecommerce-retail" },
  { slug: "shopify", name: "Shopify", category: "ecommerce-retail" },

  // Media/Consumer
  { slug: "apple", name: "Apple", category: "media-consumer" },
  { slug: "ibm", name: "IBM", category: "media-consumer" },
  { slug: "nvidia", name: "NVIDIA", category: "media-consumer" },
  { slug: "pinterest", name: "Pinterest", category: "media-consumer" },
  { slug: "playstation", name: "PlayStation", category: "media-consumer" },
  { slug: "spacex", name: "SpaceX", category: "media-consumer" },
  { slug: "spotify", name: "Spotify", category: "media-consumer" },
  { slug: "theverge", name: "The Verge", category: "media-consumer" },
  { slug: "uber", name: "Uber", category: "media-consumer" },
  { slug: "vodafone", name: "Vodafone", category: "media-consumer" },
  { slug: "wired", name: "WIRED", category: "media-consumer" },

  // Automotive
  { slug: "bmw", name: "BMW", category: "automotive" },
  { slug: "bugatti", name: "Bugatti", category: "automotive" },
  { slug: "ferrari", name: "Ferrari", category: "automotive" },
  { slug: "lamborghini", name: "Lamborghini", category: "automotive" },
  { slug: "renault", name: "Renault", category: "automotive" },
  { slug: "tesla", name: "Tesla", category: "automotive" },
];

// ─── Catalog Class ───────────────────────────────────────────────────────────

export class DesignCatalog {
  private cwd: string;
  private cacheDir: string;
  private index: CatalogIndex | null = null;

  constructor(cwd?: string) {
    this.cwd = cwd ?? process.cwd();
    this.cacheDir = resolve(this.cwd, ".adp", "design-catalog");
  }

  /**
   * Get all available design entries from the built-in catalog.
   * Returns cached index if available, otherwise builds from known designs.
   */
  async list(): Promise<DesignEntry[]> {
    const index = await this.loadIndex();
    return KNOWN_DESIGNS.map((d) => ({
      ...d,
      description: this.getDescription(d.slug),
      url: `${GETDESIGN_BASE}/${d.slug}/design-md`,
      contentUrl: `${AWESOME_REPO}/designs/${d.slug}/DESIGN.md`,
      fetchedAt: index?.designs.find((x) => x.slug === d.slug)?.fetchedAt,
    }));
  }

  /**
   * Search designs by query string.
   * Matches against name, slug, description, and category.
   */
  async search(query: string): Promise<DesignEntry[]> {
    const designs = await this.list();
    const q = query.toLowerCase();

    return designs.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }

  /**
   * Get designs by category.
   */
  async getByCategory(category: DesignCategory): Promise<DesignEntry[]> {
    const designs = await this.list();
    return designs.filter((d) => d.category === category);
  }

  /**
   * Get a single design entry by slug.
   */
  async get(slug: string): Promise<DesignEntry | null> {
    const designs = await this.list();
    return designs.find((d) => d.slug === slug.toLowerCase()) ?? null;
  }

  /**
   * Fetch the DESIGN.md content for a given slug.
   * Uses local cache if available and not stale (>7 days).
   */
  async fetchDesign(slug: string): Promise<string | null> {
    const entry = await this.get(slug);
    if (!entry) return null;

    // Check cache first
    const cached = await this.getCached(slug);
    if (cached && !this.isStale(cached.fetchedAt)) {
      return cached.content;
    }

    // Fetch from remote
    try {
      const response = await fetch(entry.contentUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const content = await response.text();

      // Cache the result
      await this.cacheDesign(slug, content);

      // Update index
      await this.updateIndex(slug);

      return content;
    } catch (error) {
      console.error(`Failed to fetch design for ${slug}:`, error);
      return null;
    }
  }

  /**
   * Get a design from local cache.
   */
  async getCached(slug: string): Promise<{ content: string; fetchedAt: string } | null> {
    const cachePath = this.cachePath(slug);
    try {
      const raw = await readFile(cachePath, "utf-8");
      const lines = raw.split("\n", 2);
      if (lines[0]?.startsWith("---fetched:")) {
        const fetchedAt = lines[0].replace("---fetched:", "").trim();
        const content = lines.slice(1).join("\n");
        return { content, fetchedAt };
      }
      // Old format without metadata
      return { content: raw, fetchedAt: new Date().toISOString() };
    } catch {
      return null;
    }
  }

  /**
   * Get summary descriptions for known designs.
   */
  private getDescription(slug: string): string {
    const descriptions: Record<string, string> = {
      claude: "Anthropic's AI assistant. Warm terracotta accent, clean editorial layout",
      stripe: "Payment infrastructure. Signature purple gradients, weight-300 elegance",
      linear: "Project management for engineers. Ultra-minimal, precise, purple accent",
      vercel: "Frontend deployment platform. Black and white precision, Geist font",
      notion: "All-in-one workspace. Warm minimalism, serif headings, soft surfaces",
      apple: "Consumer electronics. Premium white space, SF Pro, cinematic imagery",
      airbnb: "Travel marketplace. Warm coral accent, photography-driven, rounded UI",
      figma: "Collaborative design tool. Vibrant multi-color, playful yet professional",
      supabase: "Open-source Firebase alternative. Dark emerald theme, code-first",
      github: "Developer platform. Dark theme, gradient accents, code-forward",
      raycast: "Productivity launcher. Sleek dark chrome, vibrant gradient accents",
      framer: "Website builder. Bold black and blue, motion-first, design-forward",
      spotify: "Music streaming. Vibrant green on dark, bold type, album-art-driven",
      coinbase: "Crypto exchange. Clean blue identity, trust-focused, institutional feel",
      binance: "Crypto exchange. Bold yellow accent on monochrome, trading-floor urgency",
      mongodb: "Document database. Green leaf branding, developer documentation focus",
      posthog: "Product analytics. Playful hedgehog branding, developer-friendly dark UI",
      sanity: "Headless CMS. Red accent, content-first editorial layout",
      webflow: "Visual web builder. Blue-accented, polished marketing site aesthetic",
      cursor: "AI-first code editor. Sleek dark interface, gradient accents",
      warp: "Modern terminal. Dark IDE-like interface, block-based command UI",
      ollama: "Run LLMs locally. Terminal-first, monochrome simplicity",
      voltagent: "AI agent framework. Void-black canvas, emerald accent, terminal-native",
      xai: "Elon Musk's AI lab. Stark monochrome, futuristic minimalism",
      replic: "Run ML models via API. Clean white canvas, code-forward",
      runwayml: "AI video generation. Cinematic dark UI, media-rich layout",
      elevenlabs: "AI voice platform. Dark cinematic UI, audio-waveform aesthetics",
      cohere: "Enterprise AI platform. Vibrant gradients, data-rich dashboard aesthetic",
      mistral: "Open-weight LLM provider. French-engineered minimalism, purple-toned",
      together: "Open-source AI infrastructure. Technical, blueprint-style design",
      cal: "Open-source scheduling. Clean neutral UI, developer-oriented simplicity",
      intercom: "Customer messaging. Friendly blue palette, conversational UI patterns",
      mintlify: "Documentation platform. Clean, green-accented, reading-optimized",
      resend: "Email API for developers. Minimal dark theme, monospace accents",
      zapier: "Automation platform. Warm orange, friendly illustration-driven",
      clay: "Creative agency. Organic shapes, soft gradients, art-directed layout",
      miro: "Visual collaboration. Bright yellow accent, infinite canvas aesthetic",
      lovable: "AI full-stack builder. Playful gradients, friendly dev aesthetic",
      superhuman: "Fast email client. Premium dark UI, keyboard-first, purple glow",
      clickhouse: "Fast analytics database. Yellow-accented, technical documentation style",
      composio: "Tool integration platform. Modern dark with colorful integration icons",
      hashicorp: "Infrastructure automation. Enterprise-clean, black and white",
      sentry: "Error monitoring. Dark dashboard, data-dense, pink-purple accent",
      mastercard: "Global payments network. Warm cream canvas, orbital pill shapes",
      revolut: "Digital banking. Sleek dark interface, gradient cards, fintech precision",
      wise: "International money transfer. Bright green accent, friendly and clear",
      nike: "Athletic retail. Monochrome UI, massive uppercase Futura, full-bleed photography",
      shopify: "E-commerce platform. Dark-first cinematic, neon green accent, ultra-light type",
      meta: "Tech retail store. Photography-first, binary light/dark surfaces, Meta Blue CTAs",
      ibm: "Enterprise technology. Carbon design system, structured blue palette",
      nvidia: "GPU computing. Green-black energy, technical power aesthetic",
      pinterest: "Visual discovery platform. Red accent, masonry grid, image-first",
      uber: "Mobility platform. Bold black and white, tight type, urban energy",
      theverge: "Tech editorial media. Acid-mint and ultraviolet accents, Manuka display type",
      wired: "Tech magazine. Paper-white broadsheet density, custom serif, ink-blue links",
      bmw: "Luxury automotive. Dark premium surfaces, precise German engineering aesthetic",
      ferrari: "Luxury automotive. Chiaroscuro black-white editorial, Ferrari Red accents",
      lamborghini: "Supercar brand. True black cathedral, gold accent, dramatic uppercase",
      tesla: "Electric vehicles. Radical subtraction, cinematic full-viewport photography",
      bugatti: "Hypercar brand. Cinema-black canvas, monochrome austerity, monumental display",
      renault: "French automotive. Vivid aurora gradients, NouvelR proprietary typeface",
      playstation: "Gaming console retail. Three-surface channel layout, cyan hover-scale",
      vodafone: "Global telecom brand. Monumental uppercase display, Vodafone Red chapter bands",
      airtable: "Spreadsheet-database hybrid. Colorful, friendly, structured data aesthetic",
      spacex: "Space technology. Stark black and white, full-bleed imagery, futuristic",
      kraken: "Crypto trading platform. Purple-accented dark UI, data-dense dashboards",
      expo: "React Native platform. Dark theme, tight letter-spacing, code-centric",
      linear_app: "Project management. Ultra-minimal, precise, purple accent",
    };
    return descriptions[slug] ?? "Design system analysis for web development reference";
  }

  /**
   * Check if cached content is stale (>7 days old).
   */
  private isStale(fetchedAt: string): boolean {
    const cached = new Date(fetchedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return cached < weekAgo;
  }

  /**
   * Get the cache file path for a design slug.
   */
  private cachePath(slug: string): string {
    return resolve(this.cacheDir, `${slug}.md`);
  }

  /**
   * Cache a design content locally.
   */
  private async cacheDesign(slug: string, content: string): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
    const cachePath = this.cachePath(slug);
    const fetchedAt = new Date().toISOString();
    await writeFile(cachePath, `---fetched:${fetchedAt}\n${content}`, "utf-8");
  }

  /**
   * Load or create the catalog index.
   */
  private async loadIndex(): Promise<CatalogIndex> {
    if (this.index) return this.index;

    const indexPath = resolve(this.cacheDir, "index.json");
    try {
      const raw = await readFile(indexPath, "utf-8");
      this.index = JSON.parse(raw) as CatalogIndex;
    } catch {
      // Create new index
      this.index = {
        version: 1,
        lastFetched: new Date().toISOString(),
        designs: [],
      };
    }
    return this.index!;
  }

  /**
   * Update the index with a newly fetched design.
   */
  private async updateIndex(slug: string): Promise<void> {
    const index = await this.loadIndex();
    const entry = await this.get(slug);
    if (!entry) return;

    const existing = index.designs.find((d) => d.slug === slug);
    if (existing) {
      existing.fetchedAt = new Date().toISOString();
    } else {
      index.designs.push({
        slug,
        name: entry.name,
        description: entry.description,
        category: entry.category,
        fetchedAt: new Date().toISOString(),
      });
    }

    index.lastFetched = new Date().toISOString();
    this.index = index;

    // Persist
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(
      resolve(this.cacheDir, "index.json"),
      JSON.stringify(index, null, 2),
      "utf-8"
    );
  }
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Parse a DESIGN.md file into key design tokens and patterns.
 * Useful for quick preview without full bundle parsing.
 */
export function parseDesignMd(content: string): {
  theme: string;
  colors: number;
  typography: string | null;
  components: string[];
} {
  const lines = content.split("\n");

  const theme =
    lines.find((l) => l.startsWith("# "))?.replace("# ", "").trim() ?? "Unknown";

  // Count color definitions
  const colorLines = lines.filter((l) => l.match(/`?--[\w-]+`?:?\s*#[0-9a-f]{3,8}/i));
  const colors = colorLines.length;

  // Extract font family
  const fontMatch = content.match(/\*\*Sans:\*\*\s*`([^`]+)`/);
  const typography = fontMatch ? fontMatch[1] : null;

  // Extract component headers
  const componentMatches = content.matchAll(/###\s+Component:\s*(\w+)/g);
  const components = Array.from(componentMatches, (m) => m[1]);

  return { theme, colors, typography, components };
}

/**
 * Get recommended designs based on project keywords.
 */
export function getRecommendations(
  keywords: string[]
  ): Array<{ slug: string; reason: string }> {
  const recommendations: Array<{ slug: string; reason: string }> = [];
  const k = keywords.map((s) => s.toLowerCase());

  // AI/ML projects
  if (k.some((kw) => ["ai", "ml", "llm", "model", "inference", "agent"].includes(kw))) {
    recommendations.push(
      { slug: "claude", reason: "Clean AI interface with warm terracotta accents" },
      { slug: "voltagent", reason: "Terminal-native AI agent aesthetic" },
      { slug: "replicate", reason: "Code-forward canvas for ML platforms" }
    );
  }

  // Developer tools
  if (k.some((kw) => ["developer", "devtools", "ide", "code", "editor"].includes(kw))) {
    recommendations.push(
      { slug: "cursor", reason: "Sleek dark interface with gradient accents" },
      { slug: "warp", reason: "Modern terminal IDE aesthetic" },
      { slug: "raycast", reason: "Productivity launcher with vibrant accents" }
    );
  }

  // SaaS/Productivity
  if (k.some((kw) => ["saas", "productivity", "workflow", "collaboration"].includes(kw))) {
    recommendations.push(
      { slug: "linear", reason: "Ultra-minimal, precise design" },
      { slug: "notion", reason: "Warm minimalism with soft surfaces" },
      { slug: "airtable", reason: "Colorful, friendly structured data aesthetic" }
    );
  }

  // Fintech
  if (k.some((kw) => ["fintech", "finance", "payment", "crypto", "trading"].includes(kw))) {
    recommendations.push(
      { slug: "stripe", reason: "Premium payment infrastructure aesthetic" },
      { slug: "coinbase", reason: "Trust-focused institutional feel" },
      { slug: "revolut", reason: "Sleek dark interface with fintech precision" }
    );
  }

  // E-commerce
  if (k.some((kw) => ["ecommerce", "retail", "shop", "store", "marketplace"].includes(kw))) {
    recommendations.push(
      { slug: "airbnb", reason: "Photography-driven with rounded UI" },
      { slug: "shopify", reason: "Dark-first cinematic with neon accents" }
    );
  }

  // Content/Media
  if (k.some((kw) => ["content", "media", "blog", "editorial", "news"].includes(kw))) {
    recommendations.push(
      { slug: "theverge", reason: "Tech editorial with acid-mint accents" },
      { slug: "wired", reason: "Broadsheet density with custom serif" }
    );
  }

  return recommendations.slice(0, 5);
}
