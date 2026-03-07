import { defineCollection, z } from "astro:content";

const blog = defineCollection({
    schema: z.object({
        title: z.string(),
        date: z.date(),
        summary: z.string().optional(),
    }),
});

const projects = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.date(),

        thumbnail: z.string(),

        tags: z.array(z.string()).optional(),

        links: z
            .object({
                github: z.string().url().optional(),
                demo: z.string().url().optional(),
                shadertoy: z.string().url().optional(),
                itch: z.string().url().optional(),
            })
            .optional(),
    }),
});

export const collections = {
    blog,
    projects,
};
