import type { MetadataRoute } from 'next';

/**
 * Crawling is allowed: without a session every personal page redirects to the sign-in page,
 * so search engines only ever see public content. The API is not for crawlers.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' } };
}
