import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import fileMiddleware from '../middlewares/file'
import { handleMulterError } from '../middlewares/handleMulterError'
import { uploadLimiter } from '../middlewares/rate-limiter'
import { Role } from '../models/user'

const uploadRouter = Router()
uploadRouter.post(
    '/',
    auth,
    uploadLimiter,
    roleGuardMiddleware(Role.Admin),
    fileMiddleware.single('file'),
    handleMulterError,
    uploadFile
)

export default uploadRouter
