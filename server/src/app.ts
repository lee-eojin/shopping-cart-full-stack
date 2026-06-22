import express, { Request, Response } from 'express';
import { createProductRouter } from './routes/product';
import { createCartRouter } from './routes/cart';
import { createCouponRouter } from './routes/coupon';
import { createOrderRouter } from './routes/order';
import { DB } from './database';

const app = express();

const allowedOrigins = ['http://localhost:3000', process.env.CLIENT_ORIGIN].filter(
  (origin): origin is string => Boolean(origin),
);

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV === 'production') return false;
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

app.use((req: Request, res: Response, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use('/products', createProductRouter(DB));
app.use('/cart', createCartRouter(DB));
app.use('/coupons', createCouponRouter(DB));
app.use('/order', createOrderRouter(DB));

export default app;
