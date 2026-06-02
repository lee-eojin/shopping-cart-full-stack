export interface Product {
  id?: number;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Database {
  Products: Product[] | undefined;
  Cart: Product[] | undefined;
}

export const DB: Database = {
  Products: [],
  Cart: [],
};
