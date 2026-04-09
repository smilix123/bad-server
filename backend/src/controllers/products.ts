import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { Error as MongooseError } from 'mongoose'
import { join } from 'path'
import sanitizeHtml from 'sanitize-html'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import Product from '../models/product'
import { getSortObject, parsePagination } from '../utils/filters'
import movingFile from '../utils/movingFile'

const cache = new Map<string, any>()
const CACHE_TTL = 30 * 1000

// GET /product
const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pagination = parsePagination(req.query, next)
        if (!pagination) return

        const cacheKey = `products_${pagination.page}_${pagination.limit}`

        const cached = cache.get(cacheKey)
        if (cached && cached.expiry > Date.now()) {
            return res.send(cached.data)
        }

        const sortOptions = {
            allowedFields: [
                'title',
                'price',
                'category',
                'createdAt',
            ] as string[],
            defaultOrder: 'desc' as const,
        }

        const sort = getSortObject(
            req.query.sortField,
            req.query.sortOrder,
            sortOptions,
            next
        )

        if (sort === null) return

        const products = await Product.find({}, null, {
            sort,
            skip: pagination.skip,
            limit: pagination.limit,
        })

        const totalProducts = await Product.countDocuments({})
        const totalPages = Math.ceil(totalProducts / pagination.limit)

        const response = {
            items: products,
            pagination: {
                totalProducts,
                totalPages,
                currentPage: pagination.page,
                pageSize: pagination.limit,
            },
        }

        cache.set(cacheKey, {
            data: response,
            expiry: Date.now() + CACHE_TTL,
        })

        return res.send(response)
    } catch (err) {
        return next(err)
    }
}

// POST /product
const createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { description, category, price, title, image } = req.body

        const sanitizedTitle = title ? sanitizeHtml(title) : title
        const sanitizedDescription = description
            ? sanitizeHtml(description)
            : description
        const sanitizedCategory = category ? sanitizeHtml(category) : category

        // Переносим картинку из временной папки
        if (image?.fileName) {
            movingFile(
                image.fileName,
                join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
                join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
            )
        }

        const product = await Product.create({
            description: sanitizedDescription,
            image,
            category: sanitizedCategory,
            price,
            title: sanitizedTitle,
        })
        return res.status(constants.HTTP_STATUS_CREATED).send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

// PATCH /product
const updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const { title, description, category, price, image } = req.body

        // Переносим картинку из временной папки
        if (image?.fileName) {
            movingFile(
                image.fileName,
                join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
                join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
            )
        }

        const updateData: any = {}
        if (title !== undefined) updateData.title = sanitizeHtml(title)
        if (description !== undefined)
            updateData.description = sanitizeHtml(description)
        if (category !== undefined) updateData.category = sanitizeHtml(category)
        if (price !== undefined)
            updateData.price = price === null ? null : Number(price)
        if (image !== undefined) updateData.image = image

        const product = await Product.findByIdAndUpdate(productId, updateData, {
            runValidators: true,
            new: true,
        }).orFail(() => new NotFoundError('Нет товара по заданному id'))

        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

// DELETE /product
const deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const product = await Product.findByIdAndDelete(productId).orFail(
            () => new NotFoundError('Нет товара по заданному id')
        )
        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        return next(error)
    }
}

export { createProduct, deleteProduct, getProducts, updateProduct }
