import { NextFunction, Request, Response } from 'express'
import { FilterQuery, Types } from 'mongoose'
import NotFoundError from '../errors/not-found-error'
import Order from '../models/order'
import User, { IUser } from '../models/user'
import {
    applyDateFilter,
    applyNumberFilter,
    createSearchRegex,
    filterFields,
    getSortObject,
    parsePagination,
} from '../utils/filters'

// Get GET /customers?page=2&limit=5&sort=totalAmount&order=desc&registrationDateFrom=2023-01-01&registrationDateTo=2023-12-31&lastOrderDateFrom=2023-01-01&lastOrderDateTo=2023-12-31&totalAmountFrom=100&totalAmountTo=1000&orderCountFrom=1&orderCountTo=10
export const getCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const pagination = parsePagination(req.query, next)
        if (!pagination) return

        const {
            sortField = 'createdAt',
            sortOrder,
            registrationDateFrom,
            registrationDateTo,
            lastOrderDateFrom,
            lastOrderDateTo,
            totalAmountFrom,
            totalAmountTo,
            orderCountFrom,
            orderCountTo,
            search,
        } = req.query

        const filters: FilterQuery<Partial<IUser>> = {}

        // prettier-ignore
        if (!applyDateFilter(filters, 'createdAt', registrationDateFrom, '$gte', next)) return
        // prettier-ignore
        if (!applyDateFilter(filters, 'createdAt', registrationDateTo, '$lte', next)) return
        // prettier-ignore
        if (!applyDateFilter(filters, 'lastOrderDate', lastOrderDateFrom, '$gte', next)) return
        // prettier-ignore
        if (!applyDateFilter(filters, 'lastOrderDate', lastOrderDateTo, '$lte', next)) return

        // prettier-ignore
        if (!applyNumberFilter(filters, 'totalAmount', totalAmountFrom, '$gte', next)) return
        // prettier-ignore
        if (!applyNumberFilter(filters, 'totalAmount', totalAmountTo, '$lte', next)) return
        // prettier-ignore
        if (!applyNumberFilter(filters, 'orderCount', orderCountFrom, '$gte', next)) return
        // prettier-ignore
        if (!applyNumberFilter(filters, 'orderCount', orderCountTo, '$lte', next)) return

        if (search) {
            const searchRegex = createSearchRegex(search as string)
            const orders = await Order.find(
                { deliveryAddress: { $regex: searchRegex } },
                '_id'
            )
            const validOrderIds = orders
                .map((order) => order._id)
                .filter((id) => Types.ObjectId.isValid(id.toString()))

            filters.$or = [{ name: searchRegex }]
            if (validOrderIds.length) {
                filters.$or.push({ lastOrder: { $in: validOrderIds } })
            }
        }

        const sortOptions = {
            allowedFields: [
                'createdAt',
                'totalAmount',
                'orderCount',
                'lastOrderDate',
            ] as string[],
            defaultOrder: 'desc' as const,
        }

        const sort = getSortObject(sortField, sortOrder, sortOptions, next)

        const users = await User.find(filters, null, {
            sort,
            skip: pagination.skip,
            limit: pagination.limit,
        }).populate([
            'orders',
            {
                path: 'lastOrder',
                populate: [{ path: 'products' }, { path: 'customer' }],
            },
        ])

        const totalUsers = await User.countDocuments(filters)
        const totalPages = Math.ceil(totalUsers / pagination.limit)

        res.status(200).json({
            customers: users,
            pagination: {
                totalUsers,
                totalPages,
                currentPage: pagination.page,
                pageSize: pagination.limit,
            },
        })
    } catch (error) {
        next(error)
    }
}

// Get /customers/:id
export const getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await User.findById(req.params.id)
            .populate(['orders', 'lastOrder'])
            .orFail(() => new NotFoundError('Пользователь не найден'))
        res.status(200).json(user)
    } catch (error) {
        next(error)
    }
}

// Patch /customers/:id
export const updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const allowedFields = ['name', 'email', 'phone']
        const updateData = filterFields(req.body, allowedFields)

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .orFail(() => new NotFoundError('Пользователь не найден'))
            .populate(['orders', 'lastOrder'])

        res.status(200).json(updatedUser)
    } catch (error) {
        next(error)
    }
}

// Delete /customers/:id
export const deleteCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )
        res.status(200).json(deletedUser)
    } catch (error) {
        next(error)
    }
}
