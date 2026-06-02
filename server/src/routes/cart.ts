import express, { Request, Response } from 'express';
import { Database } from '../database';
import { Validator } from '../validation';

export function createCartRouter(db: Database) {
  const cartRouter = express.Router();
  cartRouter.use(express.json());

  cartRouter.get('/', (req: Request, res: Response) => {
    if (!db.Cart) {
      return res.status(500).json({ errorMessage: '서버에 일시적인 오류가 발생했습니다.' });
    }
    res.status(200).json(db.Cart);
  });

  cartRouter.post('/:id', function (req: Request, res: Response) {
    const requestId = Number(req.params.id);
    if (!db.Cart) {
      return res.status(500).json({ errorMessage: '서버에 일시적인 오류가 발생했습니다.' });
    }
    const pickedProduct = db.Products!.find((product) => product.id === requestId);
    if (!pickedProduct) {
      return res.status(404).json({ errorMessage: '상품을 찾을 수 없습니다.' });
    }
    db.Cart.push(pickedProduct);
    res.status(201).json({ message: '상품이 장바구니에 추가되었습니다.' });
  });

  cartRouter.patch('/:id', function (req: Request, res: Response) {
    const requestId = Number(req.params.id);
    const { quantity } = req.body;
    if (!db.Cart) {
      return res.status(500).json({ errorMessage: '서버에 일시적인 오류가 발생했습니다.' });
    }
    const toBeUpdatedIndex = db.Cart.findIndex((product) => product.id === requestId);
    if (toBeUpdatedIndex === -1) {
      return res.status(404).json({ errorMessage: '상품을 찾을 수 없습니다.' });
    }
    try {
      Validator.validateQuantity({ quantity });
      db.Cart[toBeUpdatedIndex].quantity = quantity;
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ errorMessage: error.message });
      }
    }
  });

  cartRouter.delete('/:id', (req: Request, res: Response) => {
    const requestId = Number(req.params.id);
    if (!db.Cart) {
      return res.status(500).json({ errorMessage: '서버에 일시적인 오류가 발생했습니다.' });
    }
    const isIdExist = db.Cart.find((product) => product.id === requestId);
    if (!isIdExist) {
      return res.status(404).send({ errorMessage: '상품을 찾을 수 없습니다.' });
    }
    db.Cart = db.Cart.filter((product) => product.id !== requestId);
    res.status(204).send();
  });

  return cartRouter;
}
