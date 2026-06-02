import express, { Request, Response } from 'express';
import { createProductRouter } from './routes/product';
import { createCartRouter } from './routes/cart';
import { DB } from './database';

const app = express();

app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use('/products', createProductRouter(DB));
app.use('/cart', createCartRouter(DB));

export default app;
