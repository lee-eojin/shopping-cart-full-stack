import { Database, Product } from '../src/database';

export type BodyForTest = Product;

export const TestDB: Database = {
  Products: [
    {
      id: 1,
      imageUrl: 'https://example.com/nike.jpg',
      name: 'Nike Air Max',
      price: 1200000,
      quantity: 2,
    },
    {
      id: 2,
      imageUrl: 'https://example.com/uniqlo.jpg',
      name: 'Uniqlo Backpack',
      price: 50000,
      quantity: 1,
    },
  ],
  Cart: [
    {
      id: 1,
      imageUrl: 'https://example.com/nike.jpg',
      name: 'Nike Air Max',
      price: 1200000,
      quantity: 2,
    },
  ],
};
