import { PrismaClient } from '@prisma/client';
import { CATEGORIES, MOCK_PRODUCTS } from '../src/data/mockProducts';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Categories
  console.log(`📦 Seeding ${CATEGORIES.length} categories...`);
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        sortOrder: 0,
      },
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        sortOrder: 0,
      },
    });
  }

  // 2. Seed Products
  console.log(`📱 Seeding ${MOCK_PRODUCTS.length} products with images and attributes...`);
  for (const prod of MOCK_PRODUCTS) {
    // Delete existing child images and attributes before recreating to ensure clean state
    await prisma.productImage.deleteMany({ where: { productId: prod.id } });
    await prisma.productAttribute.deleteMany({ where: { productId: prod.id } });

    await prisma.product.upsert({
      where: { id: prod.id },
      update: {
        name: prod.name,
        slug: prod.slug,
        brand: prod.brand,
        categoryId: prod.categoryId,
        description: prod.description,
        priceUzs: prod.priceUzs,
        oldPriceUzs: prod.oldPriceUzs ?? null,
        stock: prod.stock,
        rating: prod.rating,
        reviewsCount: prod.reviewsCount,
        isActive: true,
        isFeatured: prod.isFeatured,
        isNew: prod.isNew,
      },
      create: {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        brand: prod.brand,
        categoryId: prod.categoryId,
        description: prod.description,
        priceUzs: prod.priceUzs,
        oldPriceUzs: prod.oldPriceUzs ?? null,
        stock: prod.stock,
        rating: prod.rating,
        reviewsCount: prod.reviewsCount,
        isActive: true,
        isFeatured: prod.isFeatured,
        isNew: prod.isNew,
      },
    });

    // Create Images
    if (prod.images && prod.images.length > 0) {
      for (let i = 0; i < prod.images.length; i++) {
        await prisma.productImage.create({
          data: {
            productId: prod.id,
            url: prod.images[i],
            sortOrder: i,
          },
        });
      }
    }

    // Create Attributes
    if (prod.attributes && prod.attributes.length > 0) {
      for (let i = 0; i < prod.attributes.length; i++) {
        const attr = prod.attributes[i];
        await prisma.productAttribute.create({
          data: {
            productId: prod.id,
            name: attr.name,
            value: attr.value,
            unit: attr.unit ?? null,
            sortOrder: i,
          },
        });
      }
    }
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
