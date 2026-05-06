import { Product } from '../types';

export interface SupplierConfig {
  baseUrl: string;
  apiKey: string;
  supplierName: string;
}

export const supplierService = {
  fetchSupplierStock: async (config: SupplierConfig): Promise<Partial<Product>[]> => {
    // In a real scenario, this would be an actual fetch call
    // const response = await fetch(`${config.baseUrl}/products`, {
    //   headers: { 'Authorization': `Bearer ${config.apiKey}` }
    // });
    // return response.json();

    // Mocking a response for demonstration, but structured for real use
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            name: 'Extintor PQS 4kg',
            price: 185.00,
            costPrice: 120.00,
            supplier: {
              name: config.supplierName,
              leadTime: '3 dias úteis'
            }
          },
          {
            name: 'Central de Alarme Endereçável',
            price: 1250.00,
            costPrice: 850.00,
            supplier: {
              name: config.supplierName,
              leadTime: '7 dias úteis'
            }
          }
        ]);
      }, 1500);
    });
  },

  syncProduct: async (productId: string, supplierProductData: Partial<Product>) => {
    // Logic to update local product with supplier data
    console.log(`Syncing product ${productId} with data:`, supplierProductData);
  }
};
