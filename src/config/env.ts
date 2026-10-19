import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  siteName: process.env.SITE_NAME || 'TashTech — Магазин техники в Ташкенте',
  currency: 'UZS',
  deliveryCity: 'Ташкент'
};
