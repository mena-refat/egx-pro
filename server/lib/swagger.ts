export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'EGX Pro API',
    version: '1.0.0',
    description: 'Egyptian Stock Market Investment Platform API',
  },
  servers: [
    { url: '/api', description: 'API Base URL' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          fullName: { type: 'string' },
          plan: { type: 'string', enum: ['free', 'pro', 'yearly'] },
          isEmailVerified: { type: 'boolean' },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email/phone and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['emailOrPhone', 'password'],
                properties: {
                  emailOrPhone: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
          429: { description: 'Too many attempts' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new account',
        responses: {
          201: { description: 'Account created' },
          409: { description: 'Email/phone already exists' },
        },
      },
    },
    '/portfolio': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get user portfolio holdings',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Portfolio data' },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Portfolio'],
        summary: 'Add stock to portfolio',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Holding added' },
        },
      },
    },
    '/stocks/prices': {
      get: {
        tags: ['Stocks'],
        summary: 'Get all EGX stock prices',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of stocks with prices' },
        },
      },
    },
    '/analysis': {
      post: {
        tags: ['Analysis'],
        summary: 'Generate AI analysis for a stock',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'AI analysis result' },
          403: { description: 'Monthly limit reached (free plan)' },
        },
      },
    },
    '/billing/upgrade': {
      post: {
        tags: ['Billing'],
        summary: 'Upgrade subscription plan',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Plan upgraded' },
          400: { description: 'Invalid plan or active subscription' },
        },
      },
    },
  },
};
