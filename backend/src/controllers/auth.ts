import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { Error as MongooseError } from 'mongoose'
import sanitizeHtml from 'sanitize-html'
import { REFRESH_TOKEN } from '../config'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import UnauthorizedError from '../errors/unauthorized-error'
import User, { IUser } from '../models/user'

function sanitizeUser(user: IUser) {
    return {
        _id: user._id,
        email: sanitizeHtml(user.email || ''),
        name: sanitizeHtml(user.name || ''),
        roles: user.roles,
    }
}

// POST /auth/login
const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body

        if (typeof email !== 'string' || typeof password !== 'string') {
            return next(new BadRequestError('Некорректные данные'))
        }
        const cleanEmail = sanitizeHtml(email).toLowerCase().trim()

        const user = await User.findUserByCredentials(cleanEmail, password)
        const accessToken = user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        )

        const safeUser = sanitizeUser(user)

        return res.json({
            success: true,
            user: safeUser,
            accessToken,
        })
    } catch (err) {
        return next(err)
    }
}

// POST /auth/register
const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, name } = req.body

        const cleanEmail = sanitizeHtml(email).toLowerCase().trim()
        const cleanName = sanitizeHtml(name)

        if (!cleanEmail || !password) {
            return next(new BadRequestError('Некорректные данные'))
        }

        const newUser = new User({
            email: cleanEmail,
            password,
            name: cleanName,
        })
        await newUser.save()

        const accessToken = newUser.generateAccessToken()
        const refreshToken = await newUser.generateRefreshToken()

        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        )

        const safeUser = sanitizeUser(newUser)

        return res.status(constants.HTTP_STATUS_CREATED).json({
            success: true,
            user: safeUser,
            accessToken,
        })
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Пользователь с таким email уже существует')
            )
        }
        return next(error)
    }
}

// GET /auth/user
const getCurrentUser = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const user = await User.findById(userId).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )

        const safeUser = sanitizeUser(user)

        res.json({ user: safeUser, success: true })
    } catch (error) {
        next(error)
    }
}

const deleteRefreshTokenInUser = async (req: Request) => {
    const rfTkn = req.cookies[REFRESH_TOKEN.cookie.name]

    if (!rfTkn) {
        throw new UnauthorizedError('Не валидный токен')
    }

    const decoded = jwt.verify(rfTkn, REFRESH_TOKEN.secret) as JwtPayload

    const user = await User.findById(decoded._id).orFail(
        () => new UnauthorizedError('Пользователь не найден')
    )

    const tokenHash = crypto
        .createHmac('sha256', REFRESH_TOKEN.secret)
        .update(rfTkn)
        .digest('hex')

    user.tokens = user.tokens.filter((t) => t.token !== tokenHash)

    await user.save()

    return user
}

// POST  /auth/logout
const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await deleteRefreshTokenInUser(req)

        res.cookie(REFRESH_TOKEN.cookie.name, '', {
            ...REFRESH_TOKEN.cookie.options,
            maxAge: 0,
        })

        return res.status(200).json({ success: true })
    } catch (error) {
        return next(error)
    }
}

// GET  /auth/token
const refreshAccessToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await deleteRefreshTokenInUser(req)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        )

        const safeUser = sanitizeUser(user)

        return res.json({
            success: true,
            user: safeUser,
            accessToken,
        })
    } catch (error) {
        return next(error)
    }
}

const getCurrentUserRoles = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await User.findById(res.locals.user._id).orFail(
            () => new NotFoundError('Пользователь по заданному id отсутствует')
        )

        return res.status(200).json(user.roles)
    } catch (error) {
        return next(error)
    }
}

const updateCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const { name, email, phone } = req.body

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                ...(name && { name: sanitizeHtml(name) }),
                ...(email && {
                    email: sanitizeHtml(email).toLowerCase().trim(),
                }),
                ...(phone && { phone: sanitizeHtml(phone) }),
            },
            { new: true, runValidators: true }
        ).orFail(
            () => new NotFoundError('Пользователь по заданному id отсутствует')
        )

        const safeUser = sanitizeUser(updatedUser)

        return res.status(200).json(safeUser)
    } catch (error) {
        return next(error)
    }
}

export {
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
}
