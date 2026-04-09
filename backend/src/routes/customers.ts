import { Router } from 'express'
import {
    deleteCustomer,
    getCustomerById,
    getCustomers,
    updateCustomer,
} from '../controllers/customers'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import {
    validateObjectIdParam,
    validateSearchQuery,
    validateUserUpdate,
} from '../middlewares/validations'
import { Role } from '../models/user'

const customerRouter = Router()

customerRouter.get(
    '/',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateSearchQuery,
    getCustomers
)

customerRouter.get(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateObjectIdParam('id'),
    getCustomerById
)

customerRouter.patch(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateObjectIdParam('id'),
    validateUserUpdate,
    updateCustomer
)

customerRouter.delete(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateObjectIdParam('id'),
    deleteCustomer
)

export default customerRouter
