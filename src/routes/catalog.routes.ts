import { Router, Request, Response } from 'express';
import {
  getCatalogProducts,
  getProductBySlug,
  getCategories,
  getBrands,
  getRelatedProducts
} from '../services/catalog.service';
import { formatUzs } from '../data/mockProducts';

export const catalogRouter = Router();

// GET /catalog
catalogRouter.get('/catalog', async (req: Request, res: Response, next) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const selectedCat = typeof req.query.cat === 'string' ? req.query.cat.trim() : '';
    const selectedBrand = typeof req.query.brand === 'string' ? req.query.brand.trim() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'recommended';
    const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string, 10) : undefined;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string, 10) : undefined;
    const inStockOnly = req.query.inStock === '1' || req.query.inStock === 'true';

    const [categories, brands, products] = await Promise.all([
      getCategories(),
      getBrands(),
      getCatalogProducts({
        query,
        selectedCat,
        selectedBrand,
        sort,
        minPrice,
        maxPrice,
        inStockOnly,
      }),
    ]);

    const currentCategory = categories.find((c) => c.slug === selectedCat || c.id === selectedCat);

    res.render('pages/catalog', {
      title: currentCategory ? `${currentCategory.name} — Каталог TashTech` : 'Каталог техники в Ташкенте | TashTech',
      products,
      categories,
      brands,
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
  } catch (error) {
    next(error);
  }
});

// GET /product/:slug
catalogRouter.get('/product/:slug', async (req: Request, res: Response, next) => {
  try {
    const slug = req.params.slug;
    const product = await getProductBySlug(slug);

    if (!product) {
      return res.status(404).render('pages/404', {
        title: '404 — Товар не найден | TashTech',
        url: req.originalUrl,
        activeNav: 'catalog'
      });
    }

    const relatedProducts = await getRelatedProducts(product, 4);

    res.render('pages/product', {
      title: `${product.name} — Купить в Ташкенте по выгодной цене | TashTech`,
      product,
      relatedProducts,
      formatUzs,
      activeNav: 'catalog'
    });
  } catch (error) {
    next(error);
  }
});
