export interface ProductAttribute {
  name: string;
  value: string;
  unit?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  description: string;
  priceUzs: number;
  oldPriceUzs?: number;
  stock: number;
  rating: number;
  reviewsCount: number;
  isFeatured: boolean;
  isNew: boolean;
  isHot?: boolean;
  images: string[];
  attributes: ProductAttribute[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  itemCount: number;
  color?: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'smartphones',
    name: 'Смартфоны и гаджеты',
    slug: 'smartphones',
    icon: '📱',
    description: 'Флагманы и новинки Apple, Samsung, Xiaomi',
    itemCount: 48,
    color: 'from-violet-500/20 to-purple-500/20'
  },
  {
    id: 'laptops',
    name: 'Ноутбуки и ПК',
    slug: 'laptops',
    icon: '💻',
    description: 'Ультрабуки для работы и мощные игровые ноутбуки',
    itemCount: 36,
    color: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    id: 'audio',
    name: 'Аудио и наушники',
    slug: 'audio',
    icon: '🎧',
    description: 'TWS-наушники, студийный звук и портативные колонки',
    itemCount: 29,
    color: 'from-emerald-500/20 to-teal-500/20'
  },
  {
    id: 'smart-home',
    name: 'Умный дом и TV',
    slug: 'smart-home',
    icon: '📺',
    description: '4K OLED телевизоры, роботы-пылесосы и климат',
    itemCount: 32,
    color: 'from-amber-500/20 to-orange-500/20'
  },
  {
    id: 'wearables',
    name: 'Смарт-часы и браслеты',
    slug: 'wearables',
    icon: '⌚',
    description: 'Apple Watch, Galaxy Watch и фитнес-трекеры',
    itemCount: 22,
    color: 'from-pink-500/20 to-rose-500/20'
  },
  {
    id: 'accessories',
    name: 'Аксессуары и зарядки',
    slug: 'accessories',
    icon: '⚡',
    description: 'GaN-зарядки, кабели, повербанки и чехлы',
    itemCount: 54,
    color: 'from-indigo-500/20 to-cyan-500/20'
  }
];

export const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Sony', 'Asus', 'Dyson', 'Anker'];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Apple iPhone 16 Pro Max 256GB Black Titanium',
    slug: 'iphone-16-pro-max-256gb',
    brand: 'Apple',
    categoryId: 'smartphones',
    categoryName: 'Смартфоны и гаджеты',
    description: 'Флагман 2025 года с титановым корпусом, процессором A18 Pro, кнопкой Camera Control и передовой тройной камерой 48 Мп с 5x оптическим зумом. Официальная гарантия в Узбекистане.',
    priceUzs: 16900000,
    oldPriceUzs: 18200000,
    stock: 7,
    rating: 4.9,
    reviewsCount: 38,
    isFeatured: true,
    isNew: true,
    isHot: true,
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80'
    ],
    attributes: [
      { name: 'Экран', value: '6.9" Super Retina XDR OLED 120Hz' },
      { name: 'Процессор', value: 'Apple A18 Pro' },
      { name: 'Встроенная память', value: '256', unit: 'ГБ' },
      { name: 'Оперативная память', value: '8', unit: 'ГБ' },
      { name: 'Основная камера', value: '48 + 48 + 12 Мп' },
      { name: 'Фронтальная камера', value: '12 Мп' },
      { name: 'Аккумулятор', value: '4685', unit: 'мАч' },
      { name: 'Вес', value: '227', unit: 'г' }
    ]
  },
  {
    id: 'prod-2',
    name: 'Samsung Galaxy S24 Ultra 12/512GB Titanium Gray',
    slug: 'samsung-galaxy-s24-ultra-512gb',
    brand: 'Samsung',
    categoryId: 'smartphones',
    categoryName: 'Смартфоны и гаджеты',
    description: 'Интеллектуальный флагман с встроенным пером S-Pen, мощными функциями Galaxy AI, камерой 200 Мп и плоским антибликовым экраном Dynamic AMOLED 2X.',
    priceUzs: 15400000,
    oldPriceUzs: 16700000,
    stock: 5,
    rating: 4.8,
    reviewsCount: 29,
    isFeatured: true,
    isNew: false,
    isHot: true,
    images: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80'
    ],
    attributes: [
      { name: 'Экран', value: '6.8" Dynamic AMOLED 2X 120Hz' },
      { name: 'Процессор', value: 'Snapdragon 8 Gen 3 for Galaxy' },
      { name: 'Встроенная память', value: '512', unit: 'ГБ' },
      { name: 'Оперативная память', value: '12', unit: 'ГБ' },
      { name: 'Основная камера', value: '200 + 50 + 12 + 10 Мп' },
      { name: 'Аккумулятор', value: '5000', unit: 'мАч' }
    ]
  },
  {
    id: 'prod-3',
    name: 'Apple MacBook Pro 14" M3 Pro 18GB/512GB Space Black',
    slug: 'macbook-pro-14-m3-pro-512gb',
    brand: 'Apple',
    categoryId: 'laptops',
    categoryName: 'Ноутбуки и ПК',
    description: 'Профессиональный ноутбук для разработчиков, дизайнеров и создателей контента. Невероятная автономность до 18 часов и эталонный дисплей Liquid Retina XDR.',
    priceUzs: 24500000,
    oldPriceUzs: 26000000,
    stock: 4,
    rating: 5.0,
    reviewsCount: 19,
    isFeatured: true,
    isNew: true,
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80'
    ],
    attributes: [
      { name: 'Экран', value: '14.2" Liquid Retina XDR 120Hz' },
      { name: 'Чип', value: 'Apple M3 Pro (11 ядер CPU / 14 ядер GPU)' },
      { name: 'Объединенная память', value: '18', unit: 'ГБ' },
      { name: 'SSD-накопитель', value: '512', unit: 'ГБ' },
      { name: 'Автономность', value: 'до 18 часов' }
    ]
  },
  {
    id: 'prod-4',
    name: 'ASUS ROG Zephyrus G16 OLED Core Ultra 9 / RTX 4080',
    slug: 'asus-rog-zephyrus-g16-rtx4080',
    brand: 'Asus',
    categoryId: 'laptops',
    categoryName: 'Ноутбуки и ПК',
    description: 'Ультратонкий алюминиевый игровой ноутбук с 2.5K 240Hz OLED дисплеем и видеокартой NVIDIA GeForce RTX 4080. Бескомпромиссная мощность в изящном корпусе.',
    priceUzs: 32900000,
    stock: 2,
    rating: 4.9,
    reviewsCount: 12,
    isFeatured: true,
    isNew: true,
    images: [
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80'
    ],
    attributes: [
      { name: 'Экран', value: '16.0" ROG Nebula OLED 240Hz' },
      { name: 'Процессор', value: 'Intel Core Ultra 9 185H' },
      { name: 'Видеокарта', value: 'NVIDIA GeForce RTX 4080 12GB' },
      { name: 'Оперативная память', value: '32', unit: 'ГБ LPDDR5X' },
      { name: 'SSD-накопитель', value: '1', unit: 'ТБ' }
    ]
  },
  {
    id: 'prod-5',
    name: 'Sony WH-1000XM5 Wireless Noise Cancelling Black',
    slug: 'sony-wh-1000xm5-black',
    brand: 'Sony',
    categoryId: 'audio',
    categoryName: 'Аудио и наушники',
    description: 'Лучшее в индустрии активное шумоподавление с двумя процессорами и 8 микрофонами, поддержка Hi-Res Audio Wireless LDAC и до 30 часов работы.',
    priceUzs: 4200000,
    oldPriceUzs: 4700000,
    stock: 11,
    rating: 4.9,
    reviewsCount: 64,
    isFeatured: true,
    isHot: true,
    isNew: false,
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
    ],
    attributes: [
      { name: 'Тип', value: 'Полноразмерные беспроводные' },
      { name: 'Шумоподавление', value: 'Активное (ANC Multi Noise)' },
      { name: 'Время работы', value: 'до 30 часов' },
      { name: 'Быстрая зарядка', value: '3 мин = 3 часа работы' }
    ]
  },
  {
    id: 'prod-6',
    name: 'Apple AirPods Pro (2nd gen) MagSafe USB-C',
    slug: 'apple-airpods-pro-2-usbc',
    brand: 'Apple',
    categoryId: 'audio',
    categoryName: 'Аудио и наушники',
    description: 'Флагманские TWS-наушники с чипом H2, адаптивным аудио, улучшенным в 2 раза шумоподавлением и разъёмом USB-C с защитой от пыли IP54.',
    priceUzs: 2950000,
    oldPriceUzs: 3200000,
    stock: 18,
    rating: 4.9,
    reviewsCount: 88,
    isFeatured: false,
    isNew: false,
    images: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80'
    ],
    attributes: [
      { name: 'Чип', value: 'Apple H2' },
      { name: 'Разъём', value: 'USB-C' },
      { name: 'Автономность', value: 'до 6 часов (до 30 с кейсом)' },
      { name: 'Защита', value: 'IP54' }
    ]
  },
  {
    id: 'prod-7',
    name: 'Sony Bravia XR 65" OLED 4K HDR Google TV',
    slug: 'sony-bravia-xr-65-oled-4k',
    brand: 'Sony',
    categoryId: 'smart-home',
    categoryName: 'Умный дом и TV',
    description: 'Премиальный OLED телевизор с когнитивным процессором XR, акустической технологией Surface Audio+ прямо из экрана и поддержкой HDMI 2.1 120Hz для PlayStation 5.',
    priceUzs: 27900000,
    stock: 3,
    rating: 5.0,
    reviewsCount: 14,
    isFeatured: true,
    isNew: true,
    images: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80'
    ],
    attributes: [
      { name: 'Диагональ', value: '65"', unit: 'дюймов' },
      { name: 'Матрица', value: 'OLED 4K UHD 120Hz' },
      { name: 'Операционная система', value: 'Google TV' },
      { name: 'Звук', value: 'Acoustic Surface Audio+ (50 Вт)' }
    ]
  },
  {
    id: 'prod-8',
    name: 'Xiaomi Robot Vacuum X20+ с базой самоочистки',
    slug: 'xiaomi-robot-vacuum-x20-plus',
    brand: 'Xiaomi',
    categoryId: 'smart-home',
    categoryName: 'Умный дом и TV',
    description: 'Флагманский робот-пылесос с автоматической мойкой и сушкой швабр, самоочисткой пылесборника и мощностью всасывания 6000 Па. Лазерная навигация LDS.',
    priceUzs: 6100000,
    oldPriceUzs: 6800000,
    stock: 8,
    rating: 4.8,
    reviewsCount: 41,
    isFeatured: false,
    isNew: true,
    images: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80'
    ],
    attributes: [
      { name: 'Сила всасывания', value: '6000', unit: 'Па' },
      { name: 'Станция', value: 'Автоочистка пыли + мытьё и сушка швабр' },
      { name: 'Навигация', value: 'LiDAR + 3D сенсоры препятствий' },
      { name: 'Управление', value: 'Mi Home / Алиса / Google Assistant' }
    ]
  },
  {
    id: 'prod-9',
    name: 'Apple Watch Series 10 GPS 46mm Jet Black',
    slug: 'apple-watch-series-10-46mm',
    brand: 'Apple',
    categoryId: 'wearables',
    categoryName: 'Смарт-часы и браслеты',
    description: 'Самые тонкие Apple Watch в истории с самым большим широкоугольным OLED-дисплеем. Глубиномер, мониторинг апноэ во сне и сверхбыстрая зарядка.',
    priceUzs: 5400000,
    stock: 9,
    rating: 4.9,
    reviewsCount: 23,
    isFeatured: false,
    isNew: true,
    images: [
      'https://images.unsplash.com/photo-1510519138161-58474ebf899a?w=800&auto=format&fit=crop&q=80'
    ],
    attributes: [
      { name: 'Размер корпуса', value: '46 мм' },
      { name: 'Дисплей', value: 'Wide-angle OLED Always-On' },
      { name: 'Водонепроницаемость', value: '50 м (WR50)' },
      { name: 'Датчики', value: 'ЭКГ, пульс, кислород, температура, апноэ' }
    ]
  },
  {
    id: 'prod-10',
    name: 'Anker Prime 20,000mAh Power Bank 200W Output',
    slug: 'anker-prime-20000mah-200w',
    brand: 'Anker',
    categoryId: 'accessories',
    categoryName: 'Аксессуары и зарядки',
    description: 'Премиальный повербанк с информативным цветным smart-экраном, поддержкой одновременной зарядки двух ноутбуков мощностью до 100W на каждый порт.',
    priceUzs: 1650000,
    stock: 14,
    rating: 5.0,
    reviewsCount: 31,
    isFeatured: false,
    isNew: false,
    images: [
      'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=800&auto=format&fit=crop&q=80'
    ],
    attributes: [
      { name: 'Ёмкость', value: '20 000', unit: 'мАч' },
      { name: 'Суммарная мощность', value: '200', unit: 'Вт' },
      { name: 'Порты', value: '2x USB-C + 1x USB-A' },
      { name: 'Дисплей', value: 'Цветной цифровой смарт-экран' }
    ]
  }
];

export function formatUzs(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум';
}

export function getAllCategories(): Category[] {
  return CATEGORIES;
}

export function getFeaturedProducts(): Product[] {
  return MOCK_PRODUCTS.filter(p => p.isFeatured);
}

export function getNewArrivals(): Product[] {
  return MOCK_PRODUCTS.filter(p => p.isNew);
}

export function getProductBySlug(slug: string): Product | undefined {
  return MOCK_PRODUCTS.find(p => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return MOCK_PRODUCTS.find(p => p.id === id);
}

export function searchProducts(query?: string, categoryId?: string, brand?: string, sort?: string): Product[] {
  let list = [...MOCK_PRODUCTS];

  if (query) {
    const q = query.toLowerCase().trim();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  if (categoryId) {
    list = list.filter(p => p.categoryId === categoryId);
  }

  if (brand) {
    list = list.filter(p => p.brand.toLowerCase() === brand.toLowerCase());
  }

  if (sort === 'cheaper') {
    list.sort((a, b) => a.priceUzs - b.priceUzs);
  } else if (sort === 'expensive') {
    list.sort((a, b) => b.priceUzs - a.priceUzs);
  } else if (sort === 'new') {
    list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
  } else {
    // recommended: featured first, then rating
    list.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || b.rating - a.rating);
  }

  return list;
}
