import { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { MAX_FILE_SIZE } from '../config'

export const handleMulterError = (
    err: any,
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                message: `Файл слишком большой (макс. ${MAX_FILE_SIZE / 1024 / 1024} МБ)`,
            })
        }
        return res.status(400).json({ message: err.message })
    }
    next(err)
}
