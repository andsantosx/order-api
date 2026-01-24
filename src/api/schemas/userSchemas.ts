import { z } from 'zod';

export const registerUserSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(6, 'Password must be at least 6 characters long'),
    }),
});

export const loginUserSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string(),
    }),
});
