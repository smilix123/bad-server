import { Router } from 'express'
import {
    createOrder,
    deleteOrder,
    getOrderByNumber,
    getOrderCurrentUserByNumber,
    getOrders,
    getOrdersCurrentUser,
    updateOrder,
} from '../controllers/order'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import { verifyCsrf } from '../middlewares/csrf'
import { createOrderLimiter, searchLimiter } from '../middlewares/rate-limiter'
import {
    validateObjectIdParam,
    validateOrderBody,
    validateOrderNumberParam,
    validateSearchQuery,
} from '../middlewares/validations'
import { Role } from '../models/user'

const orderRouter = Router()

orderRouter.post(
    '/',
    auth,
    verifyCsrf,
    createOrderLimiter,
    validateOrderBody,
    createOrder
)

orderRouter.get(
    '/all',
    auth,
    roleGuardMiddleware(Role.Admin),
    searchLimiter,
    validateSearchQuery,
    getOrders
)

orderRouter.get(
    '/all/me',
    auth,
    searchLimiter,
    validateSearchQuery,
    getOrdersCurrentUser
)

orderRouter.get(
    '/:orderNumber',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateOrderNumberParam,
    getOrderByNumber
)

orderRouter.get(
    '/me/:orderNumber',
    auth,
    validateOrderNumberParam,
    getOrderCurrentUserByNumber
)

orderRouter.patch(
    '/:orderNumber',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateOrderNumberParam,
    updateOrder
)

orderRouter.delete(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateObjectIdParam('id'),
    deleteOrder
)

export default orderRouter
