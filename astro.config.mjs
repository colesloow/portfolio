// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkShader from "./src/remark/remarkShader.js";

export default defineConfig({
    integrations: [mdx()],

    markdown: {
        remarkPlugins: [remarkMath, remarkShader],
        rehypePlugins: [rehypeKatex],
    },
});
