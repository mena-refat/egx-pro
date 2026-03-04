import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string()
    .min(3, 'Full name must be at least 3 characters')
    .max(50, 'Full name must be less than 50 characters')
    .regex(/^[a-zA-Z\s\u0600-\u06FF]+$/, 'Full name can only contain letters and spaces'),
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const portfolioSchema = z.object({
  ticker: z.string().min(2, 'Ticker must be at least 2 characters').toUpperCase(),
  shares: z.number().positive('Shares must be positive'),
  avgPrice: z.number().positive('Average price must be positive'),
  buyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

export const goalSchema = z.object({
  name: z.string().min(3, 'Goal name must be at least 3 characters'),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').or(z.date()),
  type: z.string().min(1, 'Goal type is required'),
});
