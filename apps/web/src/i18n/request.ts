import { getRequestConfig } from 'next-intl/server';

export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'vi';

export default getRequestConfig(async ({ locale }) => ({
    locale: locale || defaultLocale,
    messages: (await import(`./messages/${locale}.json`)).default,
}));
