import { prisma, hasValidDatabaseUrl } from '../db/prisma';
import {
  MOCK_PRODUCTS,
  CATEGORIES,
  BRANDS,
  Product,
  Category,
  ProductAttribute
} from '../data/mockProducts';

export interface CatalogFilterOptions {
  query?: string;
  selectedCat?: string;
  selectedBrand?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}

// Convert a Prisma product with relations to the frontend Product shape
function mapPrismaProductToFrontend(raw: any): Product {
  const images = raw.images ? raw.images.map((img: any) => img.url) : [];
  const attributes: ProductAttribute[] = raw.attributes
    ? raw.attributes.map((attr: any) => ({
        name: attr.name,
        value: attr.value,
        unit: attr.unit || undefined,
      }))
    : [];

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    brand: raw.brand,
    categoryId: raw.categoryId,
    categoryName: raw.category?.name || raw.categoryId,
    description: raw.description,
    priceUzs: raw.priceUzs,
    oldPriceUzs: raw.oldPriceUzs ?? undefined,
    stock: raw.stock,
    rating: raw.rating,
    reviewsCount: raw.reviewsCount,
    isFeatured: raw.isFeatured,
    isNew: raw.isNew,
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80'],
    attributes,
  };
}

/**
 * Get all categories (from Neon DB or mock data)
 */
export async function getCategories(): Promise<Category[]> {
  if (hasValidDatabaseUrl) {
    try {
      const dbCategories = await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      if (dbCategories.length > 0) {
        return dbCategories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon || '📦',
          description: c.description || '',
          itemCount: c._count.products,
        }));
      }
    } catch (err) {
      console.warn('[CatalogService] Fallback to mock categories:', (err as Error).message);
    }
  }

  return CATEGORIES;
}

/**
 * Get available brands
 */
export async function getBrands(): Promise<string[]> {
  if (hasValidDatabaseUrl) {
    try {
      const brands = await prisma.product.findMany({
        select: { brand: true },
        distinct: ['brand'],
        where: { isActive: true },
      });
      if (brands.length > 0) {
        return brands.map((b) => b.brand).sort();
      }
    } catch (err) {
      console.warn('[CatalogService] Fallback to mock brands:', (err as Error).message);
    }
  }

  return BRANDS;
}

/**
 * Get catalog products with full filtering, searching, and sorting
 */
export async function getCatalogProducts(filters: CatalogFilterOptions): Promise<Product[]> {
  const {
    query = '',
    selectedCat = '',
    selectedBrand = '',
    sort = 'recommended',
    minPrice,
    maxPrice,
    inStockOnly = false,
  } = filters;

  if (hasValidDatabaseUrl) {
    try {
      const where: any = { isActive: true };

      // 1. Text Search
      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { name: { contains: query, mode: 'insensitive' } } },
        ];
      }

      // 2. Category Filter
      if (selectedCat) {
        where.OR = [
          ...(where.OR ? where.OR : []),
          { categoryId: selectedCat },
          { category: { slug: selectedCat } },
        ];
      }

      // 3. Brand Filter
      if (selectedBrand) {
        where.brand = { equals: selectedBrand, mode: 'insensitive' };
      }

      // 4. In Stock Filter
      if (inStockOnly) {
        where.stock = { gt: 0 };
      }

      // 5. Price Filter
      if ((minPrice && !isNaN(minPrice)) || (maxPrice && !isNaN(maxPrice))) {
        where.priceUzs = {};
        if (minPrice && !isNaN(minPrice)) where.priceUzs.gte = minPrice;
        if (maxPrice && !isNaN(maxPrice)) where.priceUzs.lte = maxPrice;
      }

      // 6. Sorting
      let orderBy: any = [{ isFeatured: 'desc' }, { rating: 'desc' }];
      if (sort === 'cheaper') {
        orderBy = { priceUzs: 'asc' };
      } else if (sort === 'expensive') {
        orderBy = { priceUzs: 'desc' };
      } else if (sort === 'new') {
        orderBy = { createdAt: 'desc' };
      }

      const dbProducts = await prisma.product.findMany({
        where,
        orderBy,
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          attributes: { orderBy: { sortOrder: 'asc' } },
        },
      });

      return dbProducts.map(mapPrismaProductToFrontend);
    } catch (err) {
      console.warn('[CatalogService] Neon DB query failed, falling back to mock data:', (err as Error).message);
    }
  }

  // Fallback to Mock Data
  let products: Product[] = [...MOCK_PRODUCTS];

  if (query) {
    const qLower = query.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(qLower) ||
        p.brand.toLowerCase().includes(qLower) ||
        p.description.toLowerCase().includes(qLower) ||
        p.categoryName.toLowerCase().includes(qLower)
    );
  }

  if (selectedCat) {
    products = products.filter((p) => p.categoryId === selectedCat);
  }

  if (selectedBrand) {
    products = products.filter((p) => p.brand.toLowerCase() === selectedBrand.toLowerCase());
  }

  if (inStockOnly) {
    products = products.filter((p) => p.stock > 0);
  }

  if (minPrice && !isNaN(minPrice)) {
    products = products.filter((p) => p.priceUzs >= minPrice);
  }
  if (maxPrice && !isNaN(maxPrice)) {
    products = products.filter((p) => p.priceUzs <= maxPrice);
  }

  if (sort === 'cheaper') {
    products.sort((a, b) => a.priceUzs - b.priceUzs);
  } else if (sort === 'expensive') {
    products.sort((a, b) => b.priceUzs - a.priceUzs);
  } else if (sort === 'new') {
    products.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
  } else {
    products.sort(
      (a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || b.rating - a.rating
    );
  }

  return products;
}

/**
 * Get single product by slug
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (hasValidDatabaseUrl) {
    try {
      const dbProduct = await prisma.product.findUnique({
        where: { slug },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          attributes: { orderBy: { sortOrder: 'asc' } },
        },
      });

      if (dbProduct) {
        return mapPrismaProductToFrontend(dbProduct);
      }
    } catch (err) {
      console.warn('[CatalogService] DB getProductBySlug failed:', (err as Error).message);
    }
  }

  const mockProduct = MOCK_PRODUCTS.find((p) => p.slug === slug);
  return mockProduct || null;
}

/**
 * Get related products from the same category
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  if (hasValidDatabaseUrl) {
    try {
      const related = await prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: product.id },
          isActive: true,
        },
        take: limit,
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          attributes: { orderBy: { sortOrder: 'asc' } },
        },
      });

      if (related.length > 0) {
        return related.map(mapPrismaProductToFrontend);
      }
    } catch (err) {
      console.warn('[CatalogService] DB getRelatedProducts failed:', (err as Error).message);
    }
  }

  return MOCK_PRODUCTS.filter(
    (p) => p.categoryId === product.categoryId && p.id !== product.id
  ).slice(0, limit);
}

/**
 * Get featured products for homepage
 */
export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  if (hasValidDatabaseUrl) {
    try {
      const featured = await prisma.product.findMany({
        where: { isFeatured: true, isActive: true },
        take: limit,
        orderBy: { rating: 'desc' },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          attributes: { orderBy: { sortOrder: 'asc' } },
        },
      });

      if (featured.length > 0) {
        return featured.map(mapPrismaProductToFrontend);
      }
    } catch (err) {
      console.warn('[CatalogService] DB getFeaturedProducts failed:', (err as Error).message);
    }
  }

  return MOCK_PRODUCTS.filter((p) => p.isFeatured).slice(0, limit);
}

/**
 * Get new arrival products for homepage
 */
export async function getNewArrivals(limit = 4): Promise<Product[]> {
  if (hasValidDatabaseUrl) {
    try {
      const news = await prisma.product.findMany({
        where: { isNew: true, isActive: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          attributes: { orderBy: { sortOrder: 'asc' } },
        },
      });

      if (news.length > 0) {
        return news.map(mapPrismaProductToFrontend);
      }
    } catch (err) {
      console.warn('[CatalogService] DB getNewArrivals failed:', (err as Error).message);
    }
  }

  return MOCK_PRODUCTS.filter((p) => p.isNew).slice(0, limit);
}

/**
 * Get total count of active products
 */
export async function getTotalProductsCount(): Promise<number> {
  if (hasValidDatabaseUrl) {
    try {
      return await prisma.product.count({ where: { isActive: true } });
    } catch (err) {
      console.warn('[CatalogService] DB count failed:', (err as Error).message);
    }
  }

  return MOCK_PRODUCTS.length;
}
