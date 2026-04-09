import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

export default function serveStatic(baseDir: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const resolvedBase = path.resolve(baseDir)
        // Безопасное объединение: удаляем ведущий слеш у req.path
        const safePath = req.path.replace(/^\/+/, '')
        const resolvedPath = path.resolve(resolvedBase, safePath)

        // Защита от path traversal
        if (!resolvedPath.startsWith(resolvedBase)) {
            return res.status(403).send('Доступ запрещен')
        }

        // Проверяем, существует ли файл и не является ли директорией
        fs.stat(resolvedPath, (statErr, stats) => {
            if (statErr || !stats.isFile()) {
                // Нет файла или это директория → передаём дальше
                return next()
            }

            // Отправляем файл
            res.sendFile(resolvedPath, (sendErr) => {
                if (sendErr) next(sendErr)
            })
        })
    }
}
