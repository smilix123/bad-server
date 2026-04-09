import rateLimit from 'express-rate-limit'

// Общий лимит для всех запросов API
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 1000,
    message: {
        status: 429,
        message: 'Слишком много запросов с вашего IP, попробуйте позже',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

// Строгий лимит для авторизации (защита от брутфорса)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        status: 429,
        message: 'Слишком много попыток входа, попробуйте через 15 минут',
    },
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
})

// Лимит для создания заказов
export const createOrderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        status: 429,
        message: 'Слишком много заказов, попробуйте позже',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

// Лимит для загрузки файлов (тяжелые операции)
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        status: 429,
        message: 'Слишком много загрузок файлов, попробуйте позже',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

// Лимит для поисковых запросов (чтобы не нагружать БД)
export const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        status: 429,
        message: 'Слишком много поисковых запросов',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

// Лимит для публичных страниц (каталог товаров)
export const publicLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: {
        status: 429,
        message: 'Слишком много запросов',
    },
    standardHeaders: true,
    legacyHeaders: false,
})
