import crypto from 'crypto'
import { Request, Express } from 'express'
import multer, { FileFilterCallback } from 'multer'
import path from 'path'
import { MAX_FILE_SIZE } from '../config'
import BadRequestError from '../errors/bad-request-error'

const allowedTypes = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
]

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dest = path.join(
            __dirname,
            '../public',
            process.env.UPLOAD_PATH_TEMP || ''
        )
        cb(null, dest)
    },
    filename: (_req, file, cb) => {
        // Генерируем уникальное имя с сохранением расширения
        const ext = path.extname(file.originalname)
        const uniqueName = `${crypto.randomUUID()}${ext}`
        cb(null, uniqueName)
    },
})

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new BadRequestError('Недопустимый тип файла'))
    }
    cb(null, true)
}

export default multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})
