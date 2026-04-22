import { defineCollection, z } from "astro:content";

const blog = defineCollection({
    schema: z.object({
        title: z.string(),
        date: z.date(),
        updatedDate: z.date().optional(),
        summary: z.string().optional(),
        draft: z.boolean().optional(),
    }),
});

const projects = defineCollection({
    schema: ({ image: img }) => z.object({
        title: z.string(),
        description: z.string(),
        date: z.date(),
        thumbnail: img().optional(),
        hideCover: z.boolean().optional(),
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

    }),
});

export const collections = {
    blog,
    projects,
};
