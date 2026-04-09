import { errors } from 'celebrate'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import morgan from 'morgan'
import path from 'path'
import { DB_ADDRESS, MAX_JSON_SIZE, ORIGIN_ALLOW } from './config'
import { generateCsrf } from './middlewares/csrf'
import errorHandler from './middlewares/error-handler'
import { globalLimiter } from './middlewares/rate-limiter'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'

const { PORT = 3000, NODE_ENV } = process.env
const app = express()

// Helmet (безопасность)
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:'],
            },
        },
        crossOriginResourcePolicy: { policy: 'same-site' },
        xssFilter: true,
        noSniff: true,
    })
)

// Логирование в dev
if (NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

app.use(compression())
app.use(cookieParser())
app.use(
    cors({
        origin: ORIGIN_ALLOW,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    })
)

// Статика без лимита
app.use(serveStatic(path.join(__dirname, 'public')))

// Rate limiter (только после статики)
app.use(globalLimiter)

app.use(urlencoded({ extended: true, limit: MAX_JSON_SIZE }))
app.use(json({ limit: MAX_JSON_SIZE }))
app.use(generateCsrf)
app.use(routes)
app.use(errors())
app.use(errorHandler)

// Trust proxy (если за reverse proxy)
app.set('trust proxy', 1)

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS, {
            serverSelectionTimeoutMS: 5000,
        })
        const server = app.listen(PORT, () => {
            console.log(
                `Server started on port ${PORT} (${NODE_ENV || 'production'} mode)`
            )
        })

        server.on('error', (err) => {
            console.error('Server failed to start:', err)
            process.exit(1)
        })

        // Graceful shutdown
        const shutdown = () => {
            console.log('Shutting down gracefully...')
            server.close(async () => {
                console.log('HTTP server closed')
                try {
                    await mongoose.connection.close()
                    console.log('MongoDB connection closed')
                    process.exit(0)
                } catch (err) {
                    console.error('Error closing MongoDB connection:', err)
                    process.exit(1)
                }
            })
        }
        process.on('SIGTERM', shutdown)
        process.on('SIGINT', shutdown)
    } catch (error) {
        console.error('Failed to connect to database:', error)
        process.exit(1)
    }
}

bootstrap()
