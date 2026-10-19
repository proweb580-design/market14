import { Router, Request, Response } from 'express';
import {
  MOCK_PRODUCTS,
  CATEGORIES,
  BRANDS,
  Product,
  formatUzs,
  getProductBySlug
} from '../data/mockProducts';

export const catalogRouter = Router();

// GET /catalog
catalogRouter.get('/catalog', (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const selectedCat = typeof req.query.cat === 'string' ? req.query.cat.trim() : '';
  const selectedBrand = typeof req.query.brand === 'string' ? req.query.brand.trim() : '';
  const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'recommended';
  const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string, 10) : undefined;
  const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string, 10) : undefined;
  const inStockOnly = req.query.inStock === '1' || req.query.inStock === 'true';

  let products: Product[] = [...MOCK_PRODUCTS];

  // 1. Text Search
  if (query) {
    const qLower = query.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(qLower) ||
      p.brand.toLowerCase().includes(qLower) ||
      p.description.toLowerCase().includes(qLower) ||
      p.categoryName.toLowerCase().includes(qLower)
    );
  }

  // 2. Category Filter
  if (selectedCat) {
    products = products.filter(p => p.categoryId === selectedCat);
  }

  // 3. Brand Filter
  if (selectedBrand) {
    products = products.filter(p => p.brand.toLowerCase() === selectedBrand.toLowerCase());
  }

  // 4. In Stock Filter
  if (inStockOnly) {
    products = products.filter(p => p.stock > 0);
  }

  // 5. Price Range
  if (minPrice && !isNaN(minPrice)) {
    products = products.filter(p => p.priceUzs >= minPrice);
  }
  if (maxPrice && !isNaN(maxPrice)) {
    products = products.filter(p => p.priceUzs <= maxPrice);
  }

  // 6. Sorting
  if (sort === 'cheaper') {
    products.sort((a, b) => a.priceUzs - b.priceUzs);
  } else if (sort === 'expensive') {
    products.sort((a, b) => b.priceUzs - a.priceUzs);
  } else if (sort === 'new') {
    products.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
  } else {
    // Default: Recommended (Featured first, then highest rating)
    products.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || b.rating - a.rating);
  }

  const currentCategory = CATEGORIES.find(c => c.slug === selectedCat);

  res.render('pages/catalog', {
    title: currentCategory ? `${currentCategory.name} — Каталог TashTech` : 'Каталог техники в Ташкенте | TashTech',
    products,
    categories: CATEGORIES,
    brands: BRANDS,
    currentCategory,
    activeCat: selectedCat,
    activeBrand: selectedBrand,
    activeSort: sort,
    searchQuery: query,
    minPrice: minPrice || '',
    maxPrice: maxPrice || '',
    inStockOnly,
    formatUzs,
    activeNav: 'catalog'
  });
});

// GET /product/:slug
catalogRouter.get('/product/:slug', (req: Request, res: Response) => {
  const slug = req.params.slug;
  const product = getProductBySlug(slug);

  if (!product) {
    return res.status(404).render('pages/404', {
      title: '404 — Товар не найден | TashTech',
      url: req.originalUrl,
      activeNav: 'catalog'
    });
  }

  // Related products from the same category
  const relatedProducts = MOCK_PRODUCTS
    .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  res.render('pages/product', {
    title: `${product.name} — Купить в Ташкенте по выгодной цене | TashTech`,
    product,
    relatedProducts,
    formatUzs,
    activeNav: 'catalog'
  });
});
