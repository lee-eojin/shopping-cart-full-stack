import express from 'express';
import { Database } from '../database';
import { Validator } from '../validation';
import { HttpError, ensurePresent } from '../httpError';
import { tryCatch } from './tryCatch';

export function createCartRouter(db: Database) {
  const cartRouter = express.Router();
  cartRouter.use(express.json());

  cartRouter.get(
    '/',
    tryCatch((req, res) => {
      ensurePresent(db.Cart);
      res.status(200).json(db.Cart);
    }),
  );

  cartRouter.post(
    '/:id',
    tryCatch((req, res) => {
      ensurePresent(db.Cart);

      const requestId = Number(req.params.id);
      const pickedProduct = db.Products!.find((product) => product.id === requestId);
      if (!pickedProduct) throw new HttpError(404, '상품을 찾을 수 없습니다.');

      db.Cart.push(pickedProduct);
      res.status(201).json({ message: '상품이 장바구니에 추가되었습니다.' });
    }),
  );

  cartRouter.patch(
    '/:id',
    tryCatch((req, res) => {
      ensurePresent(db.Cart);

      const requestId = Number(req.params.id);
      const { quantity } = req.body;
      const toBeUpdatedIndex = db.Cart.findIndex((product) => product.id === requestId);
      if (toBeUpdatedIndex === -1) throw new HttpError(404, '상품을 찾을 수 없습니다.');

      Validator.validateQuantity({ quantity });
      db.Cart[toBeUpdatedIndex].quantity = quantity;
      res.status(204).send();
    }),
  );

  cartRouter.delete(
    '/:id',
    tryCatch((req, res) => {
      ensurePresent(db.Cart);

      const requestId = Number(req.params.id);
      const isIdExist = db.Cart.find((product) => product.id === requestId);
      if (!isIdExist) throw new HttpError(404, '상품을 찾을 수 없습니다.');

      db.Cart = db.Cart.filter((product) => product.id !== requestId);
      res.status(204).send();
    }),
  );

  return cartRouter;
}
