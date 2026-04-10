import { Joi, celebrate } from 'celebrate'
import { Types } from 'mongoose'

// eslint-disable-next-line no-useless-escape
export const phoneRegExp = /^\+7\s?\(?\d{3}\)?\s?\d{3}\s?\d{2}\s?\d{2}$/

export enum PaymentType {
    Card = 'card',
    Online = 'online',
}

// валидация id
export const validateOrderBody = celebrate({
    body: Joi.object().keys({
        items: Joi.array()
            .items(
                Joi.string().custom((value, helpers) => {
                    if (Types.ObjectId.isValid(value)) {
                        return value
                    }
                    return helpers.message({ custom: 'Невалидный id' })
                })
            )
            .min(1)
            .messages({
                'array.empty': 'Не указаны товары',
                'any.required': 'Поле "items" обязательно',
                'array.min': 'Заказ должен содержать хотя бы один товар',
            }),
        payment: Joi.string()
            .valid(...Object.values(PaymentType))
            .required()
            .messages({
                'string.valid': 'Недопустимый способ оплаты (card | online)',
                'string.empty': 'Не указан способ оплаты',
                'any.required': 'Поле "payment" обязательно',
            }),
        email: Joi.string().email().required().messages({
            'string.empty': 'Не указан email',
            'string.email': 'Некорректный email',
            'any.required': 'Поле "email" обязательно',
        }),
        phone: Joi.string().required().max(20).pattern(phoneRegExp).messages({
            'string.empty': 'Не указан телефон',
            'string.pattern.base': 'Некорректный формат телефона',
            'string.max': 'Телефон не может быть длиннее 20 символов',
            'any.required': 'Поле "phone" обязательно',
        }),
        address: Joi.string().required().max(200).messages({
            'string.empty': 'Не указан адрес',
            'string.max': 'Адрес не может быть длиннее 200 символов',
            'any.required': 'Поле "address" обязательно',
        }),
        total: Joi.number().required().min(1).messages({
            'number.min': 'Сумма заказа должна быть больше 0',
            'any.required': 'Поле "total" обязательно',
        }),
        comment: Joi.string().optional().allow('').max(500).messages({
            'string.max': 'Комментарий не может быть длиннее 500 символов',
        }),
    }),
})

export const validateOrderNumberParam = celebrate({
    params: Joi.object().keys({
        orderNumber: Joi.number().integer().required().messages({
            'number.base': 'orderNumber должен быть числом',
            'any.required': 'orderNumber обязателен',
        }),
    }),
})

// валидация товара.
// name и link - обязательные поля, name - от 2 до 30 символов, link - валидный url
export const validateProductBody = celebrate({
    body: Joi.object().keys({
        title: Joi.string().required().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
            'string.empty': 'Поле "title" должно быть заполнено',
        }),
        image: Joi.object().keys({
            fileName: Joi.string().required(),
            originalName: Joi.string().required(),
        }),
        category: Joi.string().required().messages({
            'string.empty': 'Поле "category" должно быть заполнено',
        }),
        description: Joi.string().required().messages({
            'string.empty': 'Поле "description" должно быть заполнено',
        }),
        price: Joi.number().allow(null),
    }),
})

export const validateProductUpdateBody = celebrate({
    body: Joi.object().keys({
        title: Joi.string().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
        }),
        image: Joi.object().keys({
            fileName: Joi.string().required(),
            originalName: Joi.string().required(),
        }),
        category: Joi.string(),
        description: Joi.string(),
        price: Joi.number().allow(null),
    }),
})

export const validateUserBody = celebrate({
    body: Joi.object().keys({
        name: Joi.string().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
        }),
        password: Joi.string().min(6).required().messages({
            'string.empty': 'Поле "password" должно быть заполнено',
        }),
        email: Joi.string()
            .required()
            .email()
            .message('Поле "email" должно быть валидным email-адресом')
            .messages({
                'string.empty': 'Поле "email" должно быть заполнено',
            }),
    }),
})

export const validateUserUpdate = celebrate({
    body: Joi.object().keys({
        name: Joi.string().min(2).max(30).messages({
            'string.min': 'Минимальная длина имени - 2',
            'string.max': 'Максимальная длина имени - 30',
        }),

        email: Joi.string().email().max(254).messages({
            'string.email': 'Некорректный email',
            'string.max': 'Email слишком длинный',
        }),

        phone: Joi.string().max(25).pattern(phoneRegExp).messages({
            'string.pattern.base': 'Некорректный телефон',
            'string.max': 'Телефон слишком длинный',
        }),
    }),
})

export const validateObjectIdParam = (paramName: string) =>
    celebrate({
        params: Joi.object().keys({
            [paramName]: Joi.string()
                .required()
                .custom((value, helpers) => {
                    if (Types.ObjectId.isValid(value)) {
                        return value
                    }
                    return helpers.message({
                        custom: `Невалидный параметр ${paramName}`,
                    })
                }),
        }),
    })

export const validateSearchQuery = celebrate({
    query: Joi.object().keys({
        search: Joi.string().max(100).optional().messages({
            'string.max': 'Поисковый запрос не может быть длиннее 100 символов',
        }),
        page: Joi.number()
            .min(0)
            .optional()
            .default(1)
            .custom((value) => (value === 0 ? 1 : value)),
        limit: Joi.number().min(1).max(1000).optional().default(10),
    }),
})

export const validateAuthentication = celebrate({
    body: Joi.object().keys({
        email: Joi.string()
            .required()
            .email()
            .message('Поле "email" должно быть валидным email-адресом')
            .messages({
                'string.required': 'Поле "email" должно быть заполнено',
            }),
        password: Joi.string().required().messages({
            'string.empty': 'Поле "password" должно быть заполнено',
        }),
    }),
})
