// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkShader from "./src/remark/remarkShader.ts";
import remarkCode from "./src/remark/remarkCode.ts";

export default defineConfig({
    site: "https://coleslow-portfolio.netlify.app",
    integrations: [
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
