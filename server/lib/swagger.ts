/**
 * OpenAPI 3.0 — EGX Pro API Documentation
 * جميع الاستجابات الناجحة تُغلّف في { data }؛ الأخطاء تُرجع كـ { error: "CODE" }.
 */
export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'EGX Pro API',
    version: '1.0.0',
    description: `
واجهة برمجة التطبيقات لمنصة **EGX Pro** — منصة ذكية لمتابعة البورصة المصرية والاستثمار.

## تنسيق الاستجابة الموحّد
- **مورد واحد**: \`{ "data": { ... } }\`
- **قائمة مع ترقيم**: \`{ "items": [...], "pagination": { "page", "limit", "total", "totalPages" } }\`
- **إجراء بسيط**: \`{ "success": true }\` أو \`204 No Content\`
- **خطأ**: \`{ "error": "CODE" }\` — راجع أكواد الأخطاء أدناه.

## المصادقة
معظم المسارات تتطلب رأس \`Authorization: Bearer <accessToken>\`. استخدم \`POST /auth/login\` أو \`POST /auth/register\` للحصول على الـ token، و\`POST /auth/refresh\` (مع cookie) لتجديده.
    `.trim(),
    contact: {
      name: 'EGX Pro',
      url: 'https://egxpro.run.app',
    },
    license: { name: 'Proprietary' },
  },
  servers: [
    { url: '/api', description: 'Base URL (استخدم نفس الـ origin للتطبيق)' },
    { url: 'http://localhost:3000/api', description: 'Local development' },
  ],
  tags: [
    { name: 'Auth', description: 'تسجيل الدخول، التسجيل، 2FA، الجلسات' },
    { name: 'User', description: 'الملف الشخصي، الإنجازات، الإحالة، الأمان' },
    { name: 'Profile', description: 'إكمال الملف والبيانات المرتبطة' },
    { name: 'Portfolio', description: 'محفظة الأسهم والمقتنيات' },
    { name: 'Watchlist', description: 'قائمة المتابعة وأسعار المستهدف' },
    { name: 'Goals', description: 'الأهداف المالية' },
    { name: 'Stocks', description: 'أسعار الأسهم والمؤشرات والسوق' },
    { name: 'Analysis', description: 'التحليل الذكي بالذكاء الاصطناعي' },
    { name: 'Notifications', description: 'الإشعارات' },
    { name: 'Billing', description: 'الاشتراك والخطة والترقية' },
    { name: 'News', description: 'أخبار السوق والشركات' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token من تسجيل الدخول أو التجديد',
      },
      cookieRefresh: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'يُستخدم تلقائياً مع POST /auth/refresh',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'string',
            description: 'كود الخطأ',
            example: 'UNAUTHORIZED',
            enum: [
              'UNAUTHORIZED',
              'NOT_FOUND',
              'VALIDATION_ERROR',
              'INTERNAL_ERROR',
              'RATE_LIMIT_EXCEEDED',
              'WATCHLIST_LIMIT_REACHED',
              'ALREADY_IN_WATCHLIST',
              'PRICE_ALERTS_PRO',
              'GOAL_LIMIT_REACHED',
              'PORTFOLIO_LIMIT_REACHED',
              'ANALYSIS_LIMIT_REACHED',
              'SERVICE_UNAVAILABLE',
              'NEWS_API_MISSING',
              'DISCOUNT_INVALID',
              'INVALID_REQUEST',
              'UPGRADE_DOWNGRADE_BLOCKED',
              'EMAIL_ALREADY_EXISTS',
              'USERNAME_TAKEN',
              'WRONG_PASSWORD',
              'INVALID_CONFIRM',
              'already_registered',
              'account_not_found',
              'invalid_code',
            ],
          },
          message: { type: 'string', description: 'رسالة اختيارية من الخادم' },
        },
      },
      DataResponse: {
        type: 'object',
        properties: {
          data: { description: 'البيانات الفعلية (مورد واحد أو كائن)' },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', description: 'عناصر القائمة' },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          fullName: { type: 'string', nullable: true },
          username: { type: 'string', nullable: true },
          plan: { type: 'string', enum: ['free', 'pro', 'yearly'] },
          avatarUrl: { type: 'string', nullable: true },
          isEmailVerified: { type: 'boolean' },
          onboardingCompleted: { type: 'boolean' },
          language: { type: 'string' },
          theme: { type: 'string' },
        },
      },
      PortfolioHolding: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          ticker: { type: 'string' },
          shares: { type: 'number' },
          avgPrice: { type: 'number' },
          buyDate: { type: 'string', format: 'date-time' },
          currentPrice: { type: 'number' },
          currentValue: { type: 'number' },
          gainLoss: { type: 'number' },
          gainLossPercent: { type: 'number' },
        },
      },
      WatchlistItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          ticker: { type: 'string' },
          targetPrice: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Goal: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          category: { type: 'string' },
          targetAmount: { type: 'number' },
          currentAmount: { type: 'number' },
          currency: { type: 'string' },
          deadline: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['active', 'completed'] },
          achievedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          route: { type: 'string', nullable: true },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      StockPrice: {
        type: 'object',
        properties: {
          ticker: { type: 'string' },
          price: { type: 'number' },
          change: { type: 'number' },
          changePercent: { type: 'number' },
          volume: { type: 'number', nullable: true },
        },
      },
      MarketOverview: {
        type: 'object',
        properties: {
          usdEgp: { type: 'object', properties: { value: { type: 'number' }, changePercent: { type: 'number' } } },
          egx30: { type: 'object', properties: { value: { type: 'number' }, changePercent: { type: 'number' } } },
          egx70: { type: 'object' },
          egx100: { type: 'object' },
          gold: { type: 'object' },
          silver: { type: 'object' },
          lastUpdated: { type: 'number' },
        },
      },
      NewsArticle: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          source: { type: 'string' },
          publishedAt: { type: 'string' },
          url: { type: 'string' },
          sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
        },
      },
      PlanInfo: {
        type: 'object',
        properties: {
          plan: { type: 'string', enum: ['free', 'pro', 'annual'] },
          planExpiresAt: { type: 'string', format: 'date-time', nullable: true },
          analysis: {
            type: 'object',
            properties: { month: { type: 'string' }, used: { type: 'integer' }, quota: { type: 'integer' } },
          },
          referralPro: {
            type: 'object',
            properties: { daysRemaining: { type: 'integer' }, expiresAt: { type: 'string', nullable: true } },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'غير مصرح — مطلوب تسجيل الدخول أو الـ token منتهي',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'UNAUTHORIZED' },
          },
        },
      },
      NotFound: {
        description: 'المورد غير موجود',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'NOT_FOUND' },
          },
        },
      },
      RateLimit: {
        description: 'تجاوز حد الطلبات',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'RATE_LIMIT_EXCEEDED' },
          },
        },
      },
      InternalError: {
        description: 'خطأ داخلي في الخادم',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'INTERNAL_ERROR' },
          },
        },
      },
    },
  },
  paths: {
    // ——— Auth ———
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'تسجيل حساب جديد',
        description: 'إنشاء حساب بالبريد أو رقم الموبايل وكلمة المرور. يُرجع accessToken و user داخل { data }.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['emailOrPhone', 'password'],
                properties: {
                  emailOrPhone: { type: 'string', description: 'البريد الإلكتروني أو رقم الموبايل' },
                  password: { type: 'string', format: 'password' },
                  fullName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'تم إنشاء الحساب',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'بيانات غير صالحة أو البريد/الموبايل مستخدم', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'تجاوز حد المحاولات', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'تسجيل الدخول',
        description: 'إما يُرجع { data: { accessToken, user } } أو عند تفعيل 2FA يُرجع { data: { requires2FA: true, tempToken } }.',
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
          200: { description: 'نجاح أو طلب 2FA' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimit' },
        },
      },
    },
    '/auth/2fa/authenticate': {
      post: {
        tags: ['Auth'],
        summary: 'إكمال تسجيل الدخول بعد إدخال رمز 2FA',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tempToken: { type: 'string' },
                  code: { type: 'string', description: 'رمز 6 أرقام' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ data: { accessToken, user } }' },
          400: { description: 'رمز خاطئ أو منتهي', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'تجديد الـ access token',
        description: 'يستخدم cookie refreshToken. يُرجع { data: { accessToken } }.',
        responses: {
          200: { description: 'Token جديد' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'تسجيل الخروج من الجلسة الحالية',
        responses: { 200: { description: 'تم تسجيل الخروج' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'التحقق من الجلسة والحصول على المستخدم الحالي',
        description: 'يُستخدم مع credentials (cookie). يُرجع { data: { accessToken, user } }.',
        responses: {
          200: { description: 'جلسة صالحة ومعلومات المستخدم' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'تغيير كلمة المرور',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ data: { success: true } }' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/sessions': {
      get: {
        tags: ['Auth'],
        summary: 'قائمة جلسات المستخدم',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: '{ data: [ { id, deviceInfo, createdAt, ... } ] }' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/2fa/setup': {
      post: {
        tags: ['Auth'],
        summary: 'بدء إعداد المصادقة الثنائية',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: '{ data: { qrCodeUrl, manualCode } }' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/2fa/verify': {
      post: {
        tags: ['Auth'],
        summary: 'تفعيل 2FA بعد إدخال الرمز',
        security: [{ bearerAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' } } } } } },
        responses: { 200: { description: '{ data: { success: true } }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/auth/2fa/disable': {
      post: {
        tags: ['Auth'],
        summary: 'تعطيل المصادقة الثنائية',
        security: [{ bearerAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { 200: { description: '{ data: { success: true } }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/auth/google/url': {
      get: {
        tags: ['Auth'],
        summary: 'الحصول على رابط تسجيل الدخول بـ Google',
        responses: { 200: { description: '{ data: { url } }' } },
      },
    },
    '/auth/verify-email/send': {
      post: {
        tags: ['Auth'],
        summary: 'إرسال رمز التحقق للبريد',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ data: { success: true } }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/auth/verify-email/confirm': {
      post: {
        tags: ['Auth'],
        summary: 'تأكيد البريد برمز التحقق',
        security: [{ bearerAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' } } } } } },
        responses: { 200: { description: '{ data: { success: true } }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },

    // ——— User ———
    '/user/profile': {
      get: {
        tags: ['User'],
        summary: 'الملف الشخصي',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ data: User }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
      put: {
        tags: ['User'],
        summary: 'تحديث الملف الشخصي',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  username: { type: 'string' },
                  language: { type: 'string' },
                  theme: { type: 'string' },
                  riskTolerance: { type: 'string' },
                  investmentHorizon: { type: 'integer' },
                  monthlyBudget: { type: 'number' },
                  shariaMode: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '{ data: User }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/user/profile/stats': {
      get: {
        tags: ['User'],
        summary: 'إحصائيات الملف (عدد الأهداف، قائمة المتابعة، إلخ)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ data: { ... } }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/user/username/check': {
      get: {
        tags: ['User'],
        summary: 'التحقق من توفر اسم المستخدم',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'query', name: 'username', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '{ data: { available: boolean } }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/user/achievements': {
      get: {
        tags: ['User'],
        summary: 'قائمة الإنجازات',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ data: [ ... ] }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/user/unseen-achievements': {
      get: {
        tags: ['User'],
        summary: 'الإنجازات غير المُعرّف عليها بعد',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ data: [ ids ] }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/user/referral': {
      get: {
        tags: ['User'],
        summary: 'بيانات الإحالة (كود الإحالة، عدد المُحالين)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ data: { referralCode, totalReferrals, ... } }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/user/referral/use': {
      post: {
        tags: ['User'],
        summary: 'استخدام كود إحالة',
        security: [{ bearerAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' } } } } } },
        responses: { 200: { description: '{ data: { referrerName } } أو success' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/user/security': {
      get: {
        tags: ['User'],
        summary: 'بيانات الأمان (2FA، آخر تغيير كلمة مرور)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ data: { twoFactorEnabled, lastPasswordChangeAt, ... } }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/user/sessions': {
      get: {
        tags: ['User'],
        summary: 'جلسات المستخدم (لإدارة الأجهزة)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ data: [ Session ] }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/user/avatar': {
      post: {
        tags: ['User'],
        summary: 'رفع صورة الملف الشخصي',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
            },
          },
        },
        responses: { 200: { description: '{ data: { avatarUrl } }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/user/account': {
      delete: {
        tags: ['User'],
        summary: 'حذف الحساب نهائياً',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password', 'confirmText'],
                properties: {
                  password: { type: 'string' },
                  confirmText: { type: 'string', description: 'نص التأكيد (مثل حذف الحساب)' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'تم حذف الحساب' },
          401: { $ref: '#/components/responses/Unauthorized' },
          400: { description: 'كلمة مرور خاطئة أو تأكيد غير صحيح', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ——— Profile ———
    '/profile/completion': {
      get: {
        tags: ['Profile'],
        summary: 'نسبة إكمال الملف والعناصر الناقصة',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: '{ data: { percentage, missing: [ { field, route } ] } }',
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ——— Portfolio ———
    '/portfolio': {
      get: {
        tags: ['Portfolio'],
        summary: 'محفظة المستخدم (الأسهم والملخص)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' }, description: 'رقم الصفحة' },
          { in: 'query', name: 'limit', schema: { type: 'integer' }, description: 'عدد العناصر في الصفحة' },
        ],
        responses: {
          200: {
            description: '{ data: { holdings, summary: { totalValue, totalCost, totalGainLoss, totalGainLossPercent }, pagination? } }',
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/portfolio/add': {
      post: {
        tags: ['Portfolio'],
        summary: 'إضافة سهم للمحفظة',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ticker', 'shares', 'purchasePrice', 'purchaseDate'],
                properties: {
                  ticker: { type: 'string' },
                  shares: { type: 'number' },
                  purchasePrice: { type: 'number' },
                  purchaseDate: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '{ data: { ...holding, newUnseenAchievements } }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { description: 'تجاوز حد المحفظة (خطة مجانية)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { error: 'PORTFOLIO_LIMIT_REACHED' } } } },
        },
      },
    },
    '/portfolio/{id}': {
      put: {
        tags: ['Portfolio'],
        summary: 'تحديث مقتنى',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  shares: { type: 'number' },
                  purchasePrice: { type: 'number' },
                  purchaseDate: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '{ success: true }' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      delete: {
        tags: ['Portfolio'],
        summary: 'حذف مقتنى',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'تم الحذف' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },

    // ——— Watchlist ———
    '/watchlist': {
      get: {
        tags: ['Watchlist'],
        summary: 'قائمة المتابعة',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: '{ items: WatchlistItem[], pagination: { total } }' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Watchlist'],
        summary: 'إضافة سهم لقائمة المتابعة',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ticker'],
                properties: {
                  ticker: { type: 'string' },
                  targetPrice: { type: 'number', nullable: true, description: 'متاح في خطة Pro' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '{ data: { ...item, newUnseenAchievements } }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { description: 'حد القائمة أو تنبيهات السعر (Pro)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          400: { description: 'السهم موجود مسبقاً', content: { 'application/json': { example: { error: 'ALREADY_IN_WATCHLIST' } } } },
        },
      },
    },
    '/watchlist/check-targets': {
      post: {
        tags: ['Watchlist'],
        summary: 'التحقق من وصول أسعار المستهدف (يُستدعى من الخادم أو العميل)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { ticker: { type: 'string' }, targetPrice: { type: 'number' }, currentPrice: { type: 'number' } },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'تم المعالجة' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/watchlist/{ticker}': {
      patch: {
        tags: ['Watchlist'],
        summary: 'تحديث سعر المستهدف أو إزالته',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'ticker', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { targetPrice: { type: 'number', nullable: true } } } } } },
        responses: { 200: { description: '{ success: true }' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { description: 'تنبيهات السعر Pro فقط' } },
      },
      delete: {
        tags: ['Watchlist'],
        summary: 'إزالة سهم من قائمة المتابعة',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'ticker', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'تم الحذف' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },

    // ——— Goals ———
    '/goals': {
      get: {
        tags: ['Goals'],
        summary: 'قائمة الأهداف المالية',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: '{ items: Goal[], pagination }' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Goals'],
        summary: 'إنشاء هدف مالي',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'targetAmount'],
                properties: {
                  title: { type: 'string' },
                  category: { type: 'string' },
                  targetAmount: { type: 'number' },
                  currentAmount: { type: 'number' },
                  currency: { type: 'string' },
                  deadline: { type: 'string', format: 'date', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '{ data: { ...goal, newUnseenAchievements } }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { description: 'تجاوز حد الأهداف', content: { 'application/json': { example: { error: 'GOAL_LIMIT_REACHED' } } } },
        },
      },
    },
    '/goals/{id}': {
      put: {
        tags: ['Goals'],
        summary: 'تحديث هدف',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, targetAmount: { type: 'number' }, deadline: { type: 'string' }, category: { type: 'string' } } } } } },
        responses: { 200: { description: '{ data: Goal }' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      delete: {
        tags: ['Goals'],
        summary: 'حذف هدف',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'تم الحذف' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/goals/{id}/amount': {
      patch: {
        tags: ['Goals'],
        summary: 'تحديث المبلغ الحالي للهدف',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['currentAmount'], properties: { currentAmount: { type: 'number' } } } } } },
        responses: { 200: { description: '{ data: Goal }' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/goals/{id}/complete': {
      patch: {
        tags: ['Goals'],
        summary: 'تعليم الهدف كمُنجز',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '{ data: { ...goal, newUnseenAchievements } }' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },

    // ——— Stocks ———
    '/stocks': {
      get: {
        tags: ['Stocks'],
        summary: 'جذر واجهة الأسهم',
        responses: { 200: { description: '{ data: { message } }' } },
      },
    },
    '/stocks/prices': {
      get: {
        tags: ['Stocks'],
        summary: 'أسعار جميع الأسهم (قد تكون متأخرة لغير Pro)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ data: StockPrice[] }' }, 500: { $ref: '#/components/responses/InternalError' } },
      },
    },
    '/stocks/search': {
      get: {
        tags: ['Stocks'],
        summary: 'بحث عن أسهم',
        parameters: [{ in: 'query', name: 'q', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '{ data: [ ... ] }' } },
      },
    },
    '/stocks/market/status': {
      get: {
        tags: ['Stocks'],
        summary: 'حالة السوق (مفتوح/مغلق)',
        responses: { 200: { description: '{ data: { egx: { status, label } } }' } },
      },
    },
    '/stocks/market/overview': {
      get: {
        tags: ['Stocks'],
        summary: 'نظرة عامة على المؤشرات والعملات والسلع',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ data: MarketOverview }' } },
      },
    },
    '/stocks/{ticker}/price': {
      get: {
        tags: ['Stocks'],
        summary: 'سعر سهم واحد',
        parameters: [{ in: 'path', name: 'ticker', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '{ data: StockPrice }' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/stocks/{ticker}/history': {
      get: {
        tags: ['Stocks'],
        summary: 'التاريخ السعري للسهم',
        parameters: [
          { in: 'path', name: 'ticker', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'range', schema: { type: 'string' }, description: 'مثل 1d, 5d, 1mo, 3mo' },
        ],
        responses: { 200: { description: '{ data: [ ... ] }' } },
      },
    },
    '/stocks/{ticker}/financials': {
      get: {
        tags: ['Stocks'],
        summary: 'البيانات المالية (P/E, ROE, إلخ)',
        parameters: [{ in: 'path', name: 'ticker', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '{ data: { pe, roe, profitMargin, revenue, ... } }' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/stocks/{ticker}/news': {
      get: {
        tags: ['Stocks'],
        summary: 'أخبار السهم',
        parameters: [{ in: 'path', name: 'ticker', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '{ data: NewsArticle[] }' } },
      },
    },

    // ——— Analysis ———
    '/analysis/{ticker}': {
      post: {
        tags: ['Analysis'],
        summary: 'توليد تحليل ذكي بالذكاء الاصطناعي للسهم',
        description: 'محدود بعدد معين شهرياً في الخطة المجانية. يُرجع التحليل والإنجازات الجديدة.',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'ticker', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: '{ data: { analysis: { summary, fundamental, technical, verdict, priceTarget, ... }, id, newUnseenAchievements } }',
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          402: {
            description: 'تجاوز حد التحليلات الشهرية',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { error: 'ANALYSIS_LIMIT_REACHED' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
          429: { $ref: '#/components/responses/RateLimit' },
          503: {
            description: 'خدمة التحليل غير متوفرة',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { error: 'SERVICE_UNAVAILABLE' } } },
          },
        },
      },
    },

    // ——— Notifications ———
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'قائمة الإشعارات',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: '{ notifications, unreadCount, pagination }',
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/notifications/mark-read': {
      post: {
        tags: ['Notifications'],
        summary: 'تحديد الكل كمقروء',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ success: true }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'تحديد جميع الإشعارات كمقروءة',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ success: true }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/notifications/clear-all': {
      delete: {
        tags: ['Notifications'],
        summary: 'حذف جميع الإشعارات',
        security: [{ bearerAuth: [] }],
        responses: { 204: { description: 'تم الحذف' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/notifications/{id}': {
      patch: {
        tags: ['Notifications'],
        summary: 'تحديد إشعار كمقروء',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '{ success: true }' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
      delete: {
        tags: ['Notifications'],
        summary: 'حذف إشعار',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'تم الحذف' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },

    // ——— Billing ———
    '/billing/plan': {
      get: {
        tags: ['Billing'],
        summary: 'الخطة الحالية واستخدام التحليل',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: '{ data: PlanInfo }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/billing/discount/validate': {
      post: {
        tags: ['Billing'],
        summary: 'التحقق من صحة كود الخصم',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'plan'],
                properties: {
                  code: { type: 'string' },
                  plan: { type: 'string', enum: ['pro', 'annual'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ data: { valid, code, type, value, basePrice, finalPrice, discountAmount } }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          400: { description: 'كود غير صالح', content: { 'application/json': { example: { error: 'DISCOUNT_INVALID' } } } },
        },
      },
    },
    '/billing/upgrade': {
      post: {
        tags: ['Billing'],
        summary: 'ترقية الخطة (شهري أو سنوي)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['plan'],
                properties: {
                  plan: { type: 'string', enum: ['pro', 'annual'] },
                  discountCode: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ data: { plan, planExpiresAt, discountApplied } }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          400: {
            description: 'خطة غير صالحة أو لا يمكن التبديل',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    // ——— News ———
    '/news/market': {
      get: {
        tags: ['News'],
        summary: 'أخبار السوق (البورصة المصرية)',
        responses: {
          200: { description: '{ data: NewsArticle[] }' },
          503: {
            description: 'مفتاح News API غير متوفر',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { error: 'NEWS_API_MISSING' } } },
          },
        },
      },
    },
    '/news/{ticker}': {
      get: {
        tags: ['News'],
        summary: 'أخبار شركة حسب الرمز',
        parameters: [{ in: 'path', name: 'ticker', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ data: NewsArticle[] }' },
          503: { description: 'NEWS_API_MISSING', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
};
