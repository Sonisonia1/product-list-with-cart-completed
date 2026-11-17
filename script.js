const productGrid = document.querySelector('#product-grid');
const cartContent = document.querySelector('#cart-content');
const cartCount = document.querySelector('#cart-count');
const modalRoot = document.querySelector('#modal-root');

let products = [];
const cart = new Map();
let lastFocusedElement = null;

const money = value => `$${value.toFixed(2)}`;

async function loadProducts() {
  try {
    const response = await fetch('./data.json');
    if (!response.ok) throw new Error('Unable to load product data.');
    products = await response.json();
    renderProducts();
    renderCart();
  } catch (error) {
    productGrid.innerHTML = '<p>Sorry, the products could not be loaded.</p>';
    console.error(error);
  }
}

function renderProducts() {
  productGrid.innerHTML = products.map((product, index) => {
    const quantity = cart.get(index) || 0;
    return `
      <article class="product-card ${quantity ? 'is-selected' : ''}">
        <div class="product-image-wrap">
          <picture>
            <source media="(max-width: 520px)" srcset="${product.image.mobile}">
            <source media="(max-width: 1000px)" srcset="${product.image.tablet}">
            <img class="product-image" src="${product.image.desktop}" alt="${product.name}">
          </picture>
          ${quantity ? quantityControl(index, quantity) : addButton(index)}
        </div>
        <p class="product-category">${product.category}</p>
        <p class="product-name">${product.name}</p>
        <p class="product-price">${money(product.price)}</p>
      </article>
    `;
  }).join('');
}

function addButton(index) {
  return `
    <button class="cart-action" type="button" data-action="add" data-index="${index}" aria-label="Add ${products[index].name} to cart">
      <img src="./assets/images/icon-add-to-cart.svg" alt="" aria-hidden="true">
      Add to Cart
    </button>
  `;
}

function quantityControl(index, quantity) {
  return `
    <div class="quantity-control" aria-label="Quantity controls for ${products[index].name}">
      <button type="button" data-action="decrease" data-index="${index}" aria-label="Decrease ${products[index].name} quantity">
        <img src="./assets/images/icon-decrement-quantity.svg" alt="" aria-hidden="true">
      </button>
      <span class="quantity-number" aria-live="polite">${quantity}</span>
      <button type="button" data-action="increase" data-index="${index}" aria-label="Increase ${products[index].name} quantity">
        <img src="./assets/images/icon-increment-quantity.svg" alt="" aria-hidden="true">
      </button>
    </div>
  `;
}

function updateQuantity(index, amount) {
  const next = (cart.get(index) || 0) + amount;
  if (next <= 0) cart.delete(index);
  else cart.set(index, next);
  renderProducts();
  renderCart();
}

function cartEntries() {
  return [...cart.entries()].map(([index, quantity]) => ({
    product: products[index],
    index,
    quantity,
    total: products[index].price * quantity
  }));
}

function totalItems() {
  return [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
}

function totalPrice() {
  return cartEntries().reduce((sum, item) => sum + item.total, 0);
}

function renderCart() {
  const count = totalItems();
  cartCount.textContent = `(${count})`;
  cartCount.setAttribute('aria-label', `${count} ${count === 1 ? 'item' : 'items'}`);

  if (!count) {
    cartContent.innerHTML = `
      <div class="empty-cart">
        <img src="./assets/images/illustration-empty-cart.svg" alt="">
        <p>Your added items will appear here</p>
      </div>
    `;
    return;
  }

  const entries = cartEntries();
  cartContent.innerHTML = `
    <div class="cart-items">
      ${entries.map(item => `
        <div class="cart-item">
          <p class="cart-item-name">${item.product.name}</p>
          <div class="cart-item-meta">
            <span class="cart-item-quantity">${item.quantity}x</span>
            <span class="cart-item-unit">@ ${money(item.product.price)}</span>
            <span class="cart-item-total">${money(item.total)}</span>
          </div>
          <button class="remove-item" type="button" data-action="remove" data-index="${item.index}" aria-label="Remove ${item.product.name} from cart">
            <img src="./assets/images/icon-remove-item.svg" alt="" aria-hidden="true">
          </button>
        </div>
      `).join('')}
    </div>
    <div class="cart-summary">
      <div class="order-total"><span>Order Total</span><strong>${money(totalPrice())}</strong></div>
      <div class="carbon-neutral">
        <img src="./assets/images/icon-carbon-neutral.svg" alt="" aria-hidden="true">
        <span>This is a carbon-neutral delivery</span>
      </div>
      <button class="confirm-button" type="button" data-action="confirm">Confirm Order</button>
    </div>
  `;
}

function renderModal() {
  const entries = cartEntries();
  if (!entries.length) return;

  lastFocusedElement = document.activeElement;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="backdrop">
      <section class="order-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
        <img class="confirm-icon" src="./assets/images/icon-order-confirmed.svg" alt="">
        <h2 id="confirmation-title">Order Confirmed</h2>
        <p class="order-modal-subtitle">We hope you enjoy your food!</p>
        <div class="confirmed-items">
          ${entries.map(item => `
            <div class="confirmed-item">
              <img src="${item.product.image.thumbnail}" alt="">
              <div>
                <p class="confirmed-name">${item.product.name}</p>
                <div class="confirmed-meta">
                  <span class="confirmed-quantity">${item.quantity}x</span>
                  <span class="confirmed-price">@ ${money(item.product.price)}</span>
                </div>
              </div>
              <span class="confirmed-total">${money(item.total)}</span>
            </div>
          `).join('')}
          <div class="confirmed-order-total">
            <span>Order Total</span>
            <strong>${money(totalPrice())}</strong>
          </div>
        </div>
        <button class="new-order-button" type="button" data-action="new-order">Start New Order</button>
      </section>
    </div>
  `;

  document.body.classList.add('modal-open');
  modalRoot.querySelector('.new-order-button').focus();
}

function closeModal() {
  modalRoot.innerHTML = '';
  document.body.classList.remove('modal-open');
  if (lastFocusedElement) lastFocusedElement.focus();
}

function startNewOrder() {
  cart.clear();
  closeModal();
  renderProducts();
  renderCart();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

productGrid.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const index = Number(target.dataset.index);
  const action = target.dataset.action;
  if (action === 'add' || action === 'increase') updateQuantity(index, 1);
  if (action === 'decrease') updateQuantity(index, -1);
});

cartContent.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const index = Number(target.dataset.index);
  const action = target.dataset.action;
  if (action === 'remove') {
    cart.delete(index);
    renderProducts();
    renderCart();
  }
  if (action === 'confirm') renderModal();
});

modalRoot.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  if (target.dataset.action === 'new-order') startNewOrder();
  if (target.dataset.action === 'backdrop' && event.target === target) closeModal();
});

document.addEventListener('keydown', event => {
  if (!modalRoot.firstElementChild) return;
  if (event.key === 'Escape') closeModal();
  if (event.key !== 'Tab') return;

  const focusable = [...modalRoot.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

loadProducts();
