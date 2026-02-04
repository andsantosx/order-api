import { z } from 'zod';

/**
 * Validates if a URL is a valid HTTPS image URL
 */
export const validateImageUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);

        // Must be HTTPS
        if (parsed.protocol !== 'https:') {
            return false;
        }

        // Optional: Whitelist trusted domains
        const allowedDomains = [
            'res.cloudinary.com',
            'i.imgur.com',
            'images.unsplash.com',
            'cdn.shopify.com',
            'storage.googleapis.com',
            'postimages.org',
            'postimg.cc',
            'i.postimg.cc',
            // Add your trusted domains here
        ];

        // If whitelist is defined, check domain
        const hostname = parsed.hostname;
        const isAllowed = allowedDomains.some(domain => hostname.endsWith(domain));
        if (!isAllowed) return false;

        return true;
    } catch {
        return false;
    }
};

/**
 * Zod schema for image URL validation
 */
export const imageUrlSchema = z
    .string()
    .url('URL inválida')
    .startsWith('https://', 'URL deve usar HTTPS')
    .refine(validateImageUrl, {
        message: 'URL de imagem inválida ou domínio não permitido'
    });

/**
 * Validates multiple image URLs
 */
export const imageUrlsArraySchema = z.array(imageUrlSchema).min(1, 'Pelo menos uma imagem é obrigatória');
