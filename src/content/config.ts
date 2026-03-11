import { defineCollection, z } from "astro:content";

const blog = defineCollection({
    schema: z.object({
        title: z.string(),
        date: z.date(),
        summary: z.string().optional(),
        draft: z.boolean().optional(),
    }),
});

const works = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.date(),
        thumbnail: z.string(),
        draft: z.boolean().optional(),
        tags: z.array(z.string()).optional(),

        links: z
            .object({
                github: z.string().url().optional(),
                demo: z.string().url().optional(),
                shadertoy: z.string().url().optional(),
                itch: z.string().url().optional(),
            })
            .optional(),

        gallery: z.array(z.string()).optional(),
    }),
});

export const collections = {
    blog,
    works,
};
