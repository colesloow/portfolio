// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkShader from "./src/remark/remarkShader.ts";
import remarkCode from "./src/remark/remarkCode.ts";

export default defineConfig({
    site: "https://coleslow.dev",
    integrations: [
        sitemap(),
        mdx({
            extendMarkdownConfig: false,
            remarkPlugins: [remarkMath, remarkShader, remarkCode],
            rehypePlugins: [rehypeKatex],
        }),
    ],

    markdown: {
        remarkPlugins: [remarkMath],
        rehypePlugins: [rehypeKatex],
    },
});
