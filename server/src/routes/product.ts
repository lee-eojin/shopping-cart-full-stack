import express, { Request, Response } from 'express';
import { Database } from '../database';
import { Validator } from '../validation';

export function createProductRouter(db: Database) {
  const productRouter = express.Router();
  productRouter.use(express.json());

  productRouter.get('/', (req: Request, res: Response) => {
    if (!db.Products) {
      return res.status(500).json({ errorMessage: '서버에 일시적인 오류가 발생했습니다.' });
    }
    res.status(200).json(db.Products);
  });

  productRouter.post('/', (req: Request, res: Response) => {
    if (!db.Products) {
      return res.status(500).json({ errorMessage: '서버에 일시적인 오류가 발생했습니다.' });
    }

    const { imageUrl, name, price, quantity } = req.body;
    const newProduct = {
      id: db.Products.length + 1,
      imageUrl,
      name,
      price,
      quantity,
    };

    try {
      Validator.validateRequestBody(req.body);
      db.Products.push(newProduct);
      res.status(201).json({ message: '상품이 성공적으로 생성되었습니다.' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ errorMessage: error.message });
      }
    }
  });

  productRouter.delete('/:id', (req: Request, res: Response) => {
    const requestedId = Number(req.params.id);
    if (!db.Products) {
      return res.status(500).json({ errorMessage: '서버에 일시적인 오류가 발생했습니다.' });
    }
    const isIdExist = db.Products.find((product) => product.id === requestedId);
    if (!isIdExist) {
      return res.status(404).send({ errorMessage: '상품을 찾을 수 없습니다.' });
    }
    db.Products = db.Products.filter((product) => product.id !== requestedId);
    db.Cart = db.Cart!.filter((product) => product.id !== requestedId);

    res.status(204).send();
  });

  return productRouter;
}
