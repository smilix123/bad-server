import { Router } from 'express'
import {
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
} from '../controllers/auth'
import auth from '../middlewares/auth'
import {
    validateAuthentication, // нужен для логина
    validateUserBody,
    validateUserUpdate,
} from '../middlewares/validations'

const authRouter = Router()

authRouter.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken?.() })
})

authRouter.get('/user', auth, getCurrentUser)
authRouter.patch('/me', auth, validateUserUpdate, updateCurrentUser)
authRouter.get('/user/roles', auth, getCurrentUserRoles)
authRouter.post('/login', validateAuthentication, login)
authRouter.post('/register', validateUserBody, register)
authRouter.get('/token', refreshAccessToken)
authRouter.get('/logout', logout)

export default authRouter
