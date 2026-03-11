// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkShader from "./src/remark/remarkShader.ts";

export default defineConfig({
    site: "https://your-site.netlify.app", // update with your actual domain once deployed
    integrations: [mdx()],

    markdown: {
        remarkPlugins: [remarkMath, remarkShader],
        rehypePlugins: [rehypeKatex],
    },
});
