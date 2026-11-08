import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// Single source of truth for the visible app version: package.json.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version: string;
};

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
};

export default nextConfig;
