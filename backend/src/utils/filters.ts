import escapeStringRegexp from 'escape-string-regexp'
import { NextFunction } from 'express'
import BadRequestError from '../errors/bad-request-error'

const MAX_LIMIT = 10
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10

// ----------------------------------------------------------------------
// Пагинация
// ----------------------------------------------------------------------

interface PaginationResult {
    page: number
    limit: number
    skip: number
}

/**
 * Парсит и валидирует параметры пагинации из query.
 * - page и limit приводятся к целым числам (parseInt)
 * - Обрабатываются отрицательные и нечисловые значения
 * - limit ограничивается сверху MAX_LIMIT
 */
export function parsePagination(
    query: any,
    next: NextFunction
): PaginationResult | null {
    let page = parseInt(query.page, 10)
    let limit = parseInt(query.limit, 10)

    if (Number.isNaN(page) || page < 1) {
        page = DEFAULT_PAGE
    }
    if (Number.isNaN(limit) || limit < 1) {
        limit = DEFAULT_LIMIT
    }
    if (limit > MAX_LIMIT) {
        limit = MAX_LIMIT
    }

    // Дополнительная проверка, что значения — целые числа (если пришли дробные, parseInt уже отбросил дробную часть)
    if (!Number.isInteger(page) || !Number.isInteger(limit)) {
        next(new BadRequestError('page и limit должны быть целыми числами'))
        return null
    }

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    }
}

// ----------------------------------------------------------------------
// Числовые фильтры
// ----------------------------------------------------------------------

/**
 * Применяет числовой фильтр ($gte или $lte) к объекту filters.
 * Возвращает false, если произошла ошибка валидации (next уже вызван).
 */
export function applyNumberFilter(
    filters: Record<string, any>,
    fieldName: string,
    value: unknown,
    operator: '$gte' | '$lte',
    next: NextFunction
): boolean {
    if (value === undefined || value === null) return true

    const num = Number(value)
    if (Number.isNaN(num)) {
        next(new BadRequestError(`${fieldName} должен быть числом`))
        return false
    }
    // eslint-disable-next-line no-param-reassign
    if (!filters[fieldName]) filters[fieldName] = {}
    // eslint-disable-next-line no-param-reassign
    filters[fieldName][operator] = num
    return true
}

// ----------------------------------------------------------------------
// Фильтры по дате
// ----------------------------------------------------------------------

/**
 * Применяет фильтр по дате.
 * - Для $gte устанавливает начало дня (00:00:00.000)
 * - Для $lte устанавливает конец дня (23:59:59.999)
 */
export function applyDateFilter(
    filters: Record<string, any>,
    fieldName: string,
    value: unknown,
    operator: '$gte' | '$lte',
    next: NextFunction
): boolean {
    if (value === undefined || value === null) return true

    const date = new Date(value as string)
    if (Number.isNaN(date.getTime())) {
        next(new BadRequestError(`${fieldName} должен быть валидной датой`))
        return false
    }

    // eslint-disable-next-line no-param-reassign
    if (!filters[fieldName]) filters[fieldName] = {}

    if (operator === '$lte') {
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)
        // eslint-disable-next-line no-param-reassign
        filters[fieldName][operator] = endOfDay
    } else {
        // $gte: начало дня
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        // eslint-disable-next-line no-param-reassign
        filters[fieldName][operator] = startOfDay
    }
    return true
}

// ----------------------------------------------------------------------
// Поисковый regex
// ----------------------------------------------------------------------

/**
 * Создаёт case-insensitive RegExp с экранированием всех спецсимволов RegExp.
 * Использует библиотеку escape-string-regexp для надёжности.
 */
export function createSearchRegex(str: string): RegExp {
    const escaped = escapeStringRegexp(str)
    return new RegExp(escaped, 'i')
}

// ----------------------------------------------------------------------
// Сортировка с белым списком полей
// ----------------------------------------------------------------------

export interface SortOptions {
    allowedFields: string[]
    defaultField?: string
    defaultOrder?: 'asc' | 'desc'
}

/**
 * Формирует объект сортировки для Mongoose с проверкой разрешённых полей.
 * Если sortField не указан или не разрешён, используется поле по умолчанию (если задано).
 * При отсутствии валидного поля возвращает пустой объект.
 *
 * @param sortField - поле из query (например, 'createdAt')
 * @param sortOrder - направление ('asc' или 'desc')
 * @param options - { allowedFields, defaultField, defaultOrder }
 * @param next - для передачи ошибки, если поле не разрешено
 * @returns объект сортировки или null (если ошибка)
 */
export function getSortObject(
    sortField: unknown,
    sortOrder: unknown,
    options: SortOptions,
    next: NextFunction
): Record<string, 1 | -1> | null {
    const { allowedFields, defaultField, defaultOrder = 'asc' } = options

    let field = typeof sortField === 'string' ? sortField : undefined
    const order =
        typeof sortOrder === 'string' &&
        (sortOrder === 'asc' || sortOrder === 'desc')
            ? sortOrder
            : defaultOrder

    if (!field) {
        field = defaultField
    }

    if (!field || !allowedFields.includes(field)) {
        // Если поле не разрешено и нет значения по умолчанию — возвращаем пустую сортировку (или ошибку)
        if (!field) {
            return {}
        }
        next(new BadRequestError(`Недопустимое поле сортировки: ${field}`))
        return null
    }

    return { [field]: order === 'desc' ? -1 : 1 }
}

export const filterFields = (body: any, fields: string[]) => {
    const filtered: any = {}

    Object.keys(body).forEach((key) => {
        if (fields.includes(key)) {
            filtered[key] = body[key]
        }
        if (key.startsWith('$')) {
            console.warn('Попытка использовать MongoDB оператор:', key)
        }
    })
    return filtered
}
