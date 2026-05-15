import { supabase, isMockMode } from '../lib/supabase';
import { Product } from '../types';
import { logger } from '../lib/logger';

const TABLE_NAME = 'products';

// Mapping helpers
const mapFromDb = (row: any): Product => ({
  id: row.id,
  name: row.name,
  brand: row.brand,
  category: row.category,
  description: row.description,
  unit: row.unit,
  price: Number(row.price),
  costPrice: Number(row.cost_price),
  stockLevel: row.stock_level,
  minStockLevel: row.min_stock_level,
  supplier: row.supplier,
  location: row.location,
});

const mapToDb = (product: Partial<Product>) => {
  const data: any = {};
  if (product.name !== undefined) data.name = product.name;
  if (product.brand !== undefined) data.brand = product.brand;
  if (product.category !== undefined) data.category = product.category;
  if (product.description !== undefined) data.description = product.description;
  if (product.unit !== undefined) data.unit = product.unit;
  if (product.price !== undefined) data.price = product.price;
  if (product.costPrice !== undefined) data.cost_price = product.costPrice;
  if (product.stockLevel !== undefined) data.stock_level = product.stockLevel;
  if (product.minStockLevel !== undefined) data.min_stock_level = product.minStockLevel;
  return data;
};

let MOCK_STORE: Product[] = [
  { id: '1', name: 'Tubo de Cobre 15mm', brand: 'Eluma', category: 'Tubulação', description: 'Tubo de cobre classe A', unit: 'M', price: 45.00, costPrice: 30.00, stockLevel: 100, minStockLevel: 20 },
  { id: '2', name: 'Detector de Fumaça Óptico', brand: 'Intelbras', category: 'Equipamentos', description: 'Detector de fumaça convencional', unit: 'UN', price: 120.00, costPrice: 75.00, stockLevel: 50, minStockLevel: 10 },
  { id: '3', name: 'Instalação de Sprinkler', brand: 'Serviço Interno', category: 'Serviços', description: 'Mão de obra para instalação de bico de sprinkler', unit: 'UN', price: 85.00, costPrice: 40.00, stockLevel: 999, minStockLevel: 0 },
];

export const inventoryService = {
  async getAllProducts(): Promise<Product[]> {
    if (isMockMode) return MOCK_STORE;
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      logger.error('inventoryService.getAllProducts', error);
      return [];
    }
    return data.map(mapFromDb);
  },

  async addProduct(product: Omit<Product, 'id'>): Promise<string> {
    if (isMockMode) {
      const newProduct = { ...product, id: crypto.randomUUID() };
      MOCK_STORE = [...MOCK_STORE, newProduct];
      return newProduct.id;
    }
    const data = mapToDb(product);
    const { data: inserted, error } = await supabase
      .from(TABLE_NAME)
      .insert([data])
      .select('id')
      .single();

    if (error) throw error;
    return inserted.id;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    if (isMockMode) {
      MOCK_STORE = MOCK_STORE.map(p => p.id === id ? { ...p, ...updates } : p);
      return;
    }
    const data = mapToDb(updates);
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(data)
      .eq('id', id);

    if (error) throw error;
  },

  async updateProductsBatch(updatesList: {id: string, updates: Partial<Product>}[]): Promise<void> {
    if (isMockMode) {
      updatesList.forEach(({ id, updates }) => {
        MOCK_STORE = MOCK_STORE.map(p => p.id === id ? { ...p, ...updates } : p);
      });
      return;
    }
    // For Supabase, a true bulk update requires upsert or a stored procedure. 
    // Using Promise.all concurrently is much faster than sequential await in a loop.
    const promises = updatesList.map(({id, updates}) => {
      const data = mapToDb(updates);
      return supabase.from(TABLE_NAME).update(data).eq('id', id);
    });
    
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      logger.error('inventoryService.updateProductsBatch', `${errors.length} erros`, { count: errors.length });
      throw new Error('Failed to update some products in batch');
    }
  },

  async deleteProduct(id: string): Promise<void> {
    if (isMockMode) {
      MOCK_STORE = MOCK_STORE.filter(p => p.id !== id);
      return;
    }
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
