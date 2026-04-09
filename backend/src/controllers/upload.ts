import { NextFunction, Request, Response } from 'express'
import { promises as fs } from 'fs'
import { constants } from 'http2'
import { MAX_FILE_SIZE, MIN_FILE_SIZE } from '../config'
import BadRequestError from '../errors/bad-request-error'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }

    try {
        // Проверка минимального размера
        if (req.file.size < MIN_FILE_SIZE) {
            await fs.unlink(req.file.path) // удаляем файл
            return next(new BadRequestError(`Файл слишком маленький`))
        }

        // Проверка максимального размера (дублируем limits multer на всякий случай)
        if (req.file.size > MAX_FILE_SIZE) {
            await fs.unlink(req.file.path)
            return next(
                new BadRequestError(
                    `Файл слишком большой (макс. ${MAX_FILE_SIZE / 1024 / 1024} мегабайт)`
                )
            )
        }

        // Формируем URL для клиента
        const uploadPath = process.env.UPLOAD_PATH || 'uploads'
        // req.file.filename уже уникален (благодаря multer)
        const fileName = `/${uploadPath}/${req.file.filename}`

        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: req.file.originalname,
        })
    } catch (error) {
        // При любой ошибке пытаемся удалить загруженный файл
        if (req.file?.path) {
            await fs.unlink(req.file.path).catch(() => {})
        }
        return next(error)
    }
}

export default {}
