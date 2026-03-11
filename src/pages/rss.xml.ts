import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
    const articles = await getCollection("blog");

    return rss({
        title: "Colin Veron",
        description: "Technical artist and CS engineering student based in France. Articles on shaders, real-time rendering, and tools.",
        site: context.site!,
        items: articles
            .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
            .map((article) => ({
                title: article.data.title,
                pubDate: article.data.date,
                description: article.data.summary,
                link: `/blog/${article.slug}/`,
            })),
    });
}
