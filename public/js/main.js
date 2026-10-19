/**
 * TashTech Main Client Script
 * Handles LocalStorage state for Cart, Favorites, Compare, Header Badges and Toasts
 */

(function () {
  'use strict';

  // Storage Keys
  const CART_KEY = 'tashtech_cart';
  const FAV_KEY = 'tashtech_favorites';
  const COMPARE_KEY = 'tashtech_compare';

  // State Helpers
  function getStored(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading localStorage for', key, e);
      return [];
    }
  }

  function saveStored(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving localStorage for', key, e);
    }
  }

  // Update Header Badges
  function updateBadges() {
    const cart = getStored(CART_KEY);
    const favs = getStored(FAV_KEY);
    const comps = getStored(COMPARE_KEY);

    const totalCartItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

    const cartBadge = document.getElementById('badge-cart');
    const favBadge = document.getElementById('badge-fav');
    const compBadge = document.getElementById('badge-compare');

    if (cartBadge) {
      cartBadge.textContent = totalCartItems;
      cartBadge.style.display = totalCartItems > 0 ? 'flex' : 'none';
    }

    if (favBadge) {
      favBadge.textContent = favs.length;
      favBadge.style.display = favs.length > 0 ? 'flex' : 'none';
    }

    if (compBadge) {
      compBadge.textContent = comps.length;
      compBadge.style.display = comps.length > 0 ? 'flex' : 'none';
    }

    // Update active states on cards if present
    document.querySelectorAll('[data-action="favorite"]').forEach(btn => {
      const id = btn.getAttribute('data-id');
      if (favs.includes(id)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('[data-action="compare"]').forEach(btn => {
      const id = btn.getAttribute('data-id');
      if (comps.includes(id)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Toast Notification
  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '⚡';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Actions
  function addToCart(productId, title, price, image) {
    const cart = getStored(CART_KEY);
    const existing = cart.find(item => item.id === productId);

    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      cart.push({
        id: productId,
        title: title || 'Товар',
        price: Number(price) || 0,
        image: image || '',
        quantity: 1
      });
    }

    saveStored(CART_KEY, cart);
    updateBadges();
    showToast(`«${title || 'Товар'}» добавлен в корзину!`, 'success');
  }

  function toggleFavorite(productId, title) {
    let favs = getStored(FAV_KEY);
    const exists = favs.includes(productId);

    if (exists) {
      favs = favs.filter(id => id !== productId);
      showToast('Удалено из избранного');
    } else {
      favs.push(productId);
      showToast(`«${title || 'Товар'}» добавлен в избранное`, 'success');
    }

    saveStored(FAV_KEY, favs);
    updateBadges();
  }

  function toggleCompare(productId, title) {
    let comps = getStored(COMPARE_KEY);
    const exists = comps.includes(productId);

    if (exists) {
      comps = comps.filter(id => id !== productId);
      showToast('Удалено из сравнения');
    } else {
      if (comps.length >= 4) {
        showToast('В сравнение можно добавить не более 4 товаров', 'error');
        return;
      }
      comps.push(productId);
      showToast(`«${title || 'Товар'}» добавлен в сравнение`, 'success');
    }

    saveStored(COMPARE_KEY, comps);
    updateBadges();
  }

  // Event Delegations
  document.addEventListener('DOMContentLoaded', () => {
    updateBadges();

    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-toggle');
    const mobileNav = document.getElementById('mobile-nav-drawer');
    if (mobileBtn && mobileNav) {
      mobileBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('open');
      });
    }

    // Global click listener for product card buttons
    document.addEventListener('click', (e) => {
      // Add to cart
      const cartBtn = e.target.closest('.btn-add-cart');
      if (cartBtn) {
        e.preventDefault();
        const id = cartBtn.getAttribute('data-id');
        const title = cartBtn.getAttribute('data-title');
        const price = cartBtn.getAttribute('data-price');
        const image = cartBtn.getAttribute('data-image');
        addToCart(id, title, price, image);
        return;
      }

      // Quick favorite
      const favBtn = e.target.closest('[data-action="favorite"]');
      if (favBtn) {
        e.preventDefault();
        const id = favBtn.getAttribute('data-id');
        const title = favBtn.getAttribute('data-title');
        toggleFavorite(id, title);
        return;
      }

      // Quick compare
      const compBtn = e.target.closest('[data-action="compare"]');
      if (compBtn) {
        e.preventDefault();
        const id = compBtn.getAttribute('data-id');
        const title = compBtn.getAttribute('data-title');
        toggleCompare(id, title);
        return;
      }
    });
  });

  // Expose helpers globally
  window.TashTech = {
    addToCart,
    toggleFavorite,
    toggleCompare,
    updateBadges,
    showToast,
    getStored,
    saveStored,
    KEYS: { CART_KEY, FAV_KEY, COMPARE_KEY }
  };
})();
