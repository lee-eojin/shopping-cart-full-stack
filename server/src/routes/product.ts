import express from 'express';
import { Database } from '../database';
import { Validator } from '../validation';
import { HttpError, ensureExists } from '../httpError';
import { withErrorHandling } from './withErrorHandling';

export function createProductRouter(db: Database) {
  const productRouter = express.Router();
  productRouter.use(express.json());

  productRouter.get(
    '/',
    withErrorHandling((req, res) => {
      ensureExists(db.Products);
      res.status(200).json(db.Products);
    }),
  );

  productRouter.post(
    '/',
    withErrorHandling((req, res) => {
      ensureExists(db.Products);

      Validator.validateRequiredFields(req.body);
      Validator.validateQuantity(req.body);
      Validator.validatePrice(req.body);
      Validator.validateName(req.body);
      const { imageUrl, name, price, quantity } = req.body;
      db.Products.push({ id: db.Products.length + 1, imageUrl, name, price, quantity });
      
      res.status(201).json({ message: '상품이 성공적으로 생성되었습니다.' });
    }),
  );

  productRouter.delete(
    '/:id',
    withErrorHandling((req, res) => {
      ensureExists(db.Products);

      const requestedId = Number(req.params.id);
      const isIdExist = db.Products.find((product) => product.id === requestedId);
      if (!isIdExist) throw new HttpError(404, '상품을 찾을 수 없습니다.');
      db.Products = db.Products.filter((product) => product.id !== requestedId);
      db.Cart = db.Cart!.filter((product) => product.id !== requestedId);
      
      res.status(204).send();
    }),
  );

  return productRouter;
}
