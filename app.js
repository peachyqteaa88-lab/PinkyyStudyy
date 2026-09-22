/* ============================================================
   PINKYSTUDY - Website Jualan Online
   Database: LocalStorage
   ============================================================ */

// ========== DATABASE ==========
const DB = {
  get(key, def = null) {
    const v = localStorage.getItem('pinky_' + key);
    return v ? JSON.parse(v) : def;
  },
  set(key, val) {
    localStorage.setItem('pinky_' + key, JSON.stringify(val));
  }
};

function seedData() {
  if (!DB.get('users')) {
    DB.set('users', [
      { id: 'u_admin', name: 'Admin PinkyStudy', email: 'admin@pinky.com', wa: '6281234567890', password: 'admin123', role: 'admin' }
    ]);
  }
  if (!DB.get('products')) {
    DB.set('products', [
      { id: 'p1', name: 'Bolpoin', price: 3000, unit: '1 biji', step: 1, minQty: 1,
        desc: 'Bolpoin tinta hitam halus, nyaman untuk mencatat. Cocok untuk tugas sekolah & kuliah.',
        emoji: '🖊️', stock: 25, category: 'Alat Tulis', active: true, isService: false },
      { id: 'p2', name: 'Margin Biologi', price: 13000, unit: '1 biji', step: 1, minQty: 1,
        desc: 'Buku margin bergaris untuk catatan biologi. Kertas tebal, sampul lucu, cocok untuk praktikum & catatan rapi.',
        emoji: '📗', stock: 15, category: 'Alat Tulis', active: true, isService: false },
      { id: 'p3', name: 'Kertas Fisika', price: 3000, unit: '10 lembar', step: 10, minQty: 10,
        desc: 'Kertas folio bergaris untuk catatan fisika. Dijual per 10 lembar.',
        emoji: '📄', stock: 50, category: 'Alat Tulis', active: true, isService: false },
      { id: 'p4', name: 'Jasa Pembuatan Daftar Pustaka', price: 7000, unit: '10 daftar pustaka', step: 10, minQty: 10,
        desc: 'Jasa pembuatan daftar pustaka rapi & sesuai format. Upload file, kami kerjakan. Hasil dikirim via email. Maksimal pemesanan H-1.',
        emoji: '📚', stock: 999, category: 'Jasa', active: true, isService: true, dailyCapacity: 5 }
    ]);
  }
  if (!DB.get('cart')) DB.set('cart', {});
  if (!DB.get('orders')) DB.set('orders', []);
  if (!DB.get('notifications')) DB.set('notifications', []);
  if (!DB.get('ratings')) DB.set('ratings', []);
  if (!DB.get('session')) DB.set('session', null);
  if (!DB.get('orderCounter')) DB.set('orderCounter', 0);
  if (!DB.get('queueCounter')) DB.set('queueCounter', 0);
  if (!DB.get('serviceBookings')) DB.set('serviceBookings', {}); // { 'YYYY-MM-DD': { '08.00-09.00': 3 } }
  if (!DB.get('settings')) {
    DB.set('settings', {
      storeName: 'PinkyStudy',
      tagline: 'Teman kecil untuk kebutuhan belajar dan tugasmu 💗',
      quote: 'Sedikit demi sedikit, tugas selesai satu per satu.',
      whatsapp: '6281234567890',
      instagram: 'https://instagram.com/pinkystudy',
      tiktok: 'https://tiktok.com/@pinkystudy',
      email: 'hello@pinkystudy.com',
      qris: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PinkyStudy-Payment',
      bank: { name: 'BCA', number: '1234567890', holder: 'PinkyStudy Store' },
      va: { bank: 'BNI', number: '8808123456789' },
      gopay: '081234567890', ovo: '081234567890', dana: '081234567890',
      shopeepay: '081234567890', linkaja: '081234567890',
      mobileBanking: 'BCA Mobile - 1234567890',
      other: 'Hubungi admin via WhatsApp untuk info pembayaran.',
      enabledMethods: ['Bank Transfer','Virtual Account','QRIS','GoPay','OVO','DANA','ShopeePay','LinkAja','Mobile Banking','Lainnya'],
      serviceHours: [
        '08.00–09.00','09.00–10.00','10.00–11.00','11.00–12.00',
        '13.00–14.00','14.00–15.00','15.00–16.00','16.00–17.00',
        '19.00–20.00','20.00–21.00'
      ],
      hourlyCapacity: 3
    });
  }
}
seedData();

// ========== STATE ==========
let currentPage = 'home';
let currentDetailId = null;
let currentAdminTab = 'dashboard';
let selectedPaymentMethod = null;
let currentOrderDraft = null;
let detailQty = 0;
let ratingValue = 0;
let uploadFiles = []; // file yang sedang di-upload di form checkout

// ========== HELPERS ==========
const rupiah = n => 'Rp' + Number(n).toLocaleString('id-ID');
const $ = id => document.getElementById(id);
const session = () => DB.get('session');
const getUser = () => {
  const s = session();
  if (!s) return null;
  return DB.get('users', []).find(u => u.id === s.userId) || null;
};
const isAdmin = () => { const u = getUser(); return u && u.role === 'admin'; };
const isBuyer = () => { const u = getUser(); return u && u.role === 'buyer'; };

function toast(msg, type = 'info') {
  const c = $('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2800);
}

function confirmDialog(title, msg, onOk) {
  $('confirm-title').textContent = title;
  $('confirm-message').textContent = msg;
  $('confirm-modal').classList.remove('hidden');
  const ok = $('confirm-ok'), cancel = $('confirm-cancel');
  const newOk = ok.cloneNode(true);
  ok.parentNode.replaceChild(newOk, ok);
  newOk.addEventListener('click', () => {
    $('confirm-modal').classList.add('hidden');
    onOk && onOk();
  });
  cancel.onclick = () => $('confirm-modal').classList.add('hidden');
}

function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) + ' • ' +
         d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

// ========== CART ==========
function cartKey(productId) {
  const u = getUser();
  return u ? u.id + '_' + productId : 'guest_' + productId;
}
function getCart() {
  const cart = DB.get('cart', {});
  const u = getUser();
  const prefix = u ? u.id + '_' : 'guest_';
  const mine = {};
  Object.keys(cart).forEach(k => { if (k.startsWith(prefix)) mine[k] = cart[k]; });
  return mine;
}
function setCartItem(productId, qty) {
  const cart = DB.get('cart', {});
  const k = cartKey(productId);
  if (qty <= 0) delete cart[k]; else cart[k] = qty;
  DB.set('cart', cart);
  updateCartBadge();
}
function cartTotalItems() {
  return Object.values(getCart()).reduce((a, b) => a + b, 0);
}
function updateCartBadge() {
  const n = cartTotalItems();
  ['cart-badge', 'cart-badge-m'].forEach(id => { const el = $(id); if (el) el.textContent = n; });
}

// ========== NAVIGATION ==========
function navigate(page, opts = {}) {
  if (page === 'admin' && !isAdmin()) {
    toast('Akses ditolak. Halaman admin hanya untuk admin.', 'error');
    return navigate('home');
  }
  currentPage = page;
  if (opts.detailId) currentDetailId = opts.detailId;
  if (opts.tab) currentAdminTab = opts.tab;
  // Reset file draft saat masuk checkout (jika dari cart)
  if (page === 'checkout' && opts.reset) uploadFiles = [];
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== RENDER ROUTER ==========
function render() {
  const app = $('app');
  let html = '';
  switch (currentPage) {
    case 'home': html = renderHome(); break;
    case 'shop': html = renderShop(); break;
    case 'detail': html = renderDetail(currentDetailId); break;
    case 'cart': html = renderCart(); break;
    case 'checkout': html = renderCheckout(); break;
    case 'confirm': html = renderConfirm(); break;
    case 'payment': html = renderPayment(); break;
    case 'success': html = renderSuccess(); break;
    case 'orders': html = renderOrders(); break;
    case 'order-detail': html = renderOrderDetail(currentDetailId); break;
    case 'profile': html = renderProfile(); break;
    case 'admin': html = renderAdmin(currentAdminTab); break;
    case 'rating': html = renderRating(currentDetailId); break;
    default: html = renderHome();
  }
  app.innerHTML = `<div class="page">${html}</div>`;
  updateNavHighlight();
  updateCartBadge();
  renderFooter();
}

function updateNavHighlight() {
  document.querySelectorAll('[data-page]').forEach(a => {
    a.classList.toggle('active',
      a.dataset.page === currentPage ||
      (currentPage === 'detail' && a.dataset.page === 'shop') ||
      (currentPage === 'order-detail' && a.dataset.page === 'orders'));
  });
}

// ========== HOME ==========
function renderHome() {
  const prods = DB.get('products', []).filter(p => p.active);
  const s = DB.get('settings');
  const ratings = DB.get('ratings', []);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b.rating, 0) / ratings.length).toFixed(1) : '—';

  return `
    <section class="hero">
      <div class="hero-text">
        <h1>Selamat Datang di <span style="color:var(--pink-dark)">Toko Kita</span> 💗</h1>
        <div class="quote">${s.quote}</div>
        <p class="desc">${s.tagline}<br>Alat tulis lengkap + jasa pembuatan daftar pustaka. Belanja mudah, harga bersahabat, hasil rapi!</p>
        <div class="hero-actions">
          <button class="btn btn-primary" onclick="navigate('shop')">🛍️ Lihat Jualan</button>
          <button class="btn btn-outline" onclick="navigate('detail',{detailId:'p4'})">📚 Pesan Jasa Daftar Pustaka</button>
        </div>
      </div>
      <div class="hero-art">
        <div class="hero-art-card">
          <span class="emoji">📚✏️</span>
          <b>Rapi, Cepat, Terpercaya</b>
          <small>★★★★★ ${avgRating} dari pembeli</small>
        </div>
      </div>
    </section>

    <div class="info-pills">
      <span class="pill">💗 Harga berdasarkan kelipatan</span>
      <span class="pill">📚 10 referensi = Rp7.000</span>
      <span class="pill">📎 File wajib untuk jasa</span>
      <span class="pill">⏰ Maksimal H-1</span>
      <span class="pill">📦 Lacak status pesanan</span>
      <span class="pill">💌 Hasil via email</span>
      <span class="pill">📱 Bantuan WhatsApp</span>
    </div>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Produk <span class="accent">Pilihan</span> ✨</h2>
          <p class="sub">Alat tulis & jasa untuk menemani harimu</p>
        </div>
        <button class="btn btn-outline btn-sm" onclick="navigate('shop')">Lihat Semua →</button>
      </div>
      <div class="product-grid">
        ${prods.map(p => productCardHTML(p)).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Cara <span class="accent">Pemesanan</span></h2>
          <p class="sub">Alur mudah dari pilih sampai selesai</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;">
        ${[
          ['1','🛍️ Pilih Produk','Pilih produk atau jasa yang kamu butuhkan'],
          ['2','🛒 Masukkan Keranjang','Atur jumlah sesuai kebutuhan'],
          ['3','💳 Checkout & Bayar','Isi data & pilih metode pembayaran'],
          ['4','📦 Lacak Pesanan','Pantau status hingga selesai']
        ].map(([n, t, d]) => `
          <div class="admin-panel text-center" style="border-style:dashed;">
            <div style="font-family:Fredoka;font-size:2rem;color:var(--pink-deep);font-weight:700;">${n}</div>
            <h4 style="margin:8px 0 4px;">${t}</h4>
            <p class="muted" style="font-size:.85rem;">${d}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Rating & <span class="accent">Review</span> 💕</h2>
          <p class="sub">Pendapat jujur dari pembeli kami</p>
        </div>
      </div>
      ${ratings.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">
          ${ratings.slice(-6).reverse().map(r => {
            const u = DB.get('users', []).find(x => x.id === r.userId);
            return `
              <div class="review-card">
                <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                <p style="margin:8px 0;font-size:.9rem;line-height:1.6;">${r.review || '(tanpa review)'}</p>
                <small class="muted">— ${u ? u.name : 'Pembeli'}</small>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <span class="big">⭐</span>
          <h3>Belum ada rating</h3>
          <p>Jadilah yang pertama memberi review setelah pesanan selesai!</p>
        </div>
      `}
    </section>
  `;
}

// ========== PRODUCT CARD ==========
function stockStatus(p) {
  if (p.isService) return { cls: 'stock-ok', text: 'Kapasitas tersedia' };
  if (p.stock <= 0) return { cls: 'stock-out', text: 'Stok habis' };
  if (p.stock <= 5) return { cls: 'stock-warn', text: 'Stok hampir habis' };
  return { cls: 'stock-ok', text: `Stok tersedia: ${p.stock}` };
}

function productCardHTML(p) {
  const st = stockStatus(p);
  const out = !p.isService && p.stock <= 0;
  const admin = isAdmin();
  let actions = '';
  if (admin) {
    actions = `
      <button class="btn btn-outline btn-sm" onclick="navigate('detail',{detailId:'${p.id}'})">👁️ Detail</button>
      <button class="btn btn-primary btn-sm" onclick="editProductForm('${p.id}')">✏️ Edit</button>
    `;
  } else {
    actions = `
      <button class="btn btn-outline btn-sm" onclick="navigate('detail',{detailId:'${p.id}'})">Lihat Detail</button>
      <button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}')" ${out ? 'disabled' : ''}>
        ${out ? 'Stok Habis' : (p.isService ? 'Pesan Jasa' : 'Tambah 🛒')}
      </button>
    `;
  }
  return `
    <div class="product-card ${p.isService ? 'service' : ''}">
      <div class="product-thumb" onclick="navigate('detail',{detailId:'${p.id}'})">
        <span class="emoji">${p.emoji}</span>
      </div>
      <div class="product-info">
        <h3 onclick="navigate('detail',{detailId:'${p.id}'})">${p.name}</h3>
        <div class="price">${rupiah(p.price)} <small>/ ${p.unit}</small></div>
        <span class="stock-tag ${st.cls}">${st.text}</span>
      </div>
      <div class="card-actions">${actions}</div>
    </div>
  `;
}

// ========== SHOP ==========
function renderShop() {
  const prods = DB.get('products', []).filter(p => p.active);
  const cats = [...new Set(prods.map(p => p.category))];
  const admin = isAdmin();
  return `
    <div class="section-head">
      <div>
        <h2>🛍️ Jualan <span class="accent">PinkyStudy</span></h2>
        <p class="sub">${prods.length} produk tersedia${admin ? ' — Mode Admin: kelola produk di sini' : ''}</p>
      </div>
      ${admin ? `<button class="btn btn-primary btn-sm" onclick="addProductForm()">➕ Tambah Produk</button>` : ''}
    </div>

    <div class="admin-panel mb-16" style="padding:14px 18px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <span class="muted" style="font-weight:700;">Filter:</span>
        <button class="pay-option selected" style="padding:6px 14px;font-size:.8rem;border-radius:99px;" onclick="filterCat(this,'all')">Semua</button>
        ${cats.map(c => `<button class="pay-option" style="padding:6px 14px;font-size:.8rem;border-radius:99px;" onclick="filterCat(this,'${c}')">${c}</button>`).join('')}
      </div>
    </div>

    <div class="product-grid" id="shop-grid">
      ${prods.map(p => productCardHTML(p)).join('')}
    </div>
  `;
}

function filterCat(el, cat) {
  document.querySelectorAll('#app .admin-panel .pay-option').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const prods = DB.get('products', []).filter(p => p.active && (cat === 'all' || p.category === cat));
  $('shop-grid').innerHTML = prods.map(p => productCardHTML(p)).join('');
}

// ========== DETAIL PRODUK ==========
function renderDetail(id) {
  const p = DB.get('products', []).find(x => x.id === id);
  if (!p) return `<div class="empty-state"><h3>Produk tidak ditemukan</h3><button class="btn btn-primary" onclick="navigate('shop')">Kembali</button></div>`;
  if (detailQty < p.minQty) detailQty = p.minQty;
  const st = stockStatus(p);
  const out = !p.isService && p.stock <= 0;
  const admin = isAdmin();
  const maxQty = p.isService ? 999 : p.stock;

  let actions = '';
  if (admin) {
    actions = `
      <button class="btn btn-outline" onclick="editProductForm('${p.id}')">✏️ Edit Produk</button>
      <button class="btn btn-outline" onclick="stockForm('${p.id}')">📦 Kelola Stok</button>
      <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">🗑️ Hapus</button>
    `;
  } else {
    actions = `
      <button class="btn btn-outline" onclick="addToCartDetail('${p.id}')" ${out ? 'disabled' : ''}>🛒 Tambah ke Keranjang</button>
      <button class="btn btn-primary" onclick="buyNow('${p.id}')" ${out ? 'disabled' : ''}>💳 ${out ? 'Stok Habis' : 'Beli Sekarang'}</button>
    `;
  }

  return `
    <button class="btn btn-ghost btn-sm mb-16" onclick="navigate('shop')">← Kembali ke Jualan</button>
    <div class="detail-wrap">
      <div><div class="detail-image">${p.emoji}</div></div>
      <div class="detail-info">
        <span class="tag-soft">${p.category}</span>
        ${p.isService ? '<span class="tag-soft" style="background:var(--blue-soft);color:#1160A8;">Jasa</span>' : ''}
        <h2>${p.name}</h2>
        <div class="price">${rupiah(p.price)} <small>/ ${p.unit}</small></div>
        <span class="stock-tag ${st.cls}">${st.text}</span>
        <p class="desc">${p.desc}</p>

        <div class="qty-row">
          <span style="font-weight:700;">Jumlah:</span>
          <button class="qty-btn" onclick="changeDetailQty('${p.id}',-${p.step})" ${detailQty <= p.minQty ? 'disabled' : ''}>−</button>
          <span class="qty-num" id="detail-qty">${detailQty}</span>
          <button class="qty-btn" onclick="changeDetailQty('${p.id}',${p.step})" ${detailQty >= maxQty ? 'disabled' : ''}>+</button>
          <span class="muted" style="margin-left:auto;">${p.unit}</span>
        </div>

        <div class="total-line">
          <span style="font-weight:700;align-self:center;">Total</span>
          <b id="detail-total">${rupiah(p.price * detailQty)}</b>
        </div>

        ${p.isService ? `
          <div class="info-pills mt-16">
            <span class="pill">📎 Wajib upload file</span>
            <span class="pill">⏰ Maksimal H-1</span>
            <span class="pill">💌 Hasil via email</span>
          </div>
        ` : ''}

        <div class="detail-actions">${actions}</div>
      </div>
    </div>
  `;
}

function changeDetailQty(id, delta) {
  const p = DB.get('products', []).find(x => x.id === id);
  const max = p.isService ? 999 : p.stock;
  detailQty += delta;
  if (detailQty < p.minQty) detailQty = p.minQty;
  if (detailQty > max) detailQty = max;
  $('detail-qty').textContent = detailQty;
  $('detail-total').textContent = rupiah(p.price * detailQty);
  render();
}

// ========== CART ACTIONS ==========
function addToCart(id) {
  if (!isBuyer()) { toast('Login dulu yuk untuk belanja 💗', 'info'); return openAuth(); }
  const p = DB.get('products', []).find(x => x.id === id);
  if (!p) return;
  if (!p.isService && p.stock <= 0) return toast('Stok habis 😢', 'error');
  const cur = getCart()[cartKey(id)] || 0;
  const next = cur + p.minQty;
  if (!p.isService && next > p.stock) return toast('Melebihi stok tersedia', 'error');
  setCartItem(id, next);
  toast(`✨ ${p.name} masuk keranjang!`, 'success');
}

function addToCartDetail(id) {
  if (!isBuyer()) { toast('Login dulu yuk untuk belanja 💗', 'info'); return openAuth(); }
  const p = DB.get('products', []).find(x => x.id === id);
  setCartItem(id, detailQty);
  toast(`✨ ${p.name} ×${detailQty} masuk keranjang!`, 'success');
}

function buyNow(id) {
  if (!isBuyer()) { toast('Login dulu yuk 💗', 'info'); return openAuth(); }
  const p = DB.get('products', []).find(x => x.id === id);
  setCartItem(id, detailQty);
  uploadFiles = [];
  navigate('checkout');
}

// ========== CART PAGE ==========
function renderCart() {
  if (isAdmin()) {
    return `
      <div class="empty-state">
        <span class="big">🛒</span>
        <h3>Keranjang khusus pembeli</h3>
        <p>Kamu login sebagai Admin. Admin mengelola toko, bukan berbelanja.</p>
        <button class="btn btn-primary" onclick="navigate('shop')">Lihat Produk</button>
      </div>
    `;
  }
  const cart = getCart();
  const keys = Object.keys(cart);
  if (!keys.length) {
    return `
      <div class="empty-state">
        <span class="big">🛒💗</span>
        <h3>Keranjang kamu masih kosong 💗</h3>
        <p>Yuk, pilih barang yang kamu butuhkan!</p>
        <button class="btn btn-primary" onclick="navigate('shop')">🛍️ Mulai Belanja</button>
      </div>
    `;
  }
  const prods = DB.get('products', []);
  let total = 0;
  const items = keys.map(k => {
    const pid = k.split('_').slice(1).join('_');
    const p = prods.find(x => x.id === pid);
    if (!p) return '';
    const qty = cart[k];
    const sub = p.price * qty;
    total += sub;
    return `
      <div class="cart-item">
        <div class="cart-thumb" onclick="navigate('detail',{detailId:'${p.id}'})" style="cursor:pointer;">${p.emoji}</div>
        <div class="cart-mid">
          <h4>${p.name}</h4>
          <div class="sub">${rupiah(p.price)} / ${p.unit}</div>
          <div class="sub">Subtotal: <b style="color:var(--pink-dark)">${rupiah(sub)}</b></div>
        </div>
        <div class="cart-right">
          <div class="qty-mini">
            <button onclick="changeCartQty('${p.id}',-${p.step})">−</button>
            <span style="font-weight:700;min-width:32px;text-align:center;">${qty}</span>
            <button onclick="changeCartQty('${p.id}',${p.step})">+</button>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="removeCart('${p.id}')">🗑️ Hapus</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="section-head">
      <div><h2>🛒 Keranjang <span class="accent">Kamu</span></h2><p class="sub">${keys.length} produk dipilih</p></div>
      <button class="btn btn-ghost btn-sm" onclick="clearCart()">Kosongkan</button>
    </div>
    <div class="cart-list">${items}</div>
    <div class="summary-box">
      <div class="summary-row"><span>Total Item</span><span>${cartTotalItems()} item</span></div>
      <div class="summary-total"><span>Total</span><span>${rupiah(total)}</span></div>
      <button class="btn btn-primary btn-full mt-16" onclick="goCheckout()">💳 Checkout</button>
    </div>
  `;
}

function changeCartQty(id, delta) {
  const p = DB.get('products', []).find(x => x.id === id);
  const cur = getCart()[cartKey(id)] || 0;
  let next = cur + delta;
  const max = p.isService ? 999 : p.stock;
  if (next < p.minQty) next = 0;
  if (next > max) { toast('Melebihi stok', 'error'); return; }
  setCartItem(id, next);
  render();
}

function removeCart(id) {
  confirmDialog('Hapus Produk', 'Apakah kamu yakin ingin menghapus produk ini dari keranjang?', () => {
    setCartItem(id, 0);
    toast('Produk dihapus dari keranjang', 'info');
    render();
  });
}

function clearCart() {
  confirmDialog('Kosongkan Keranjang', 'Yakin ingin mengosongkan seluruh keranjang?', () => {
    const cart = DB.get('cart', {});
    const u = getUser();
    const prefix = u ? u.id + '_' : 'guest_';
    Object.keys(cart).forEach(k => { if (k.startsWith(prefix)) delete cart[k]; });
    DB.set('cart', cart);
    updateCartBadge();
    render();
  });
}

function goCheckout() {
  if (!isBuyer()) return openAuth();
  const cart = getCart();
  if (!Object.keys(cart).length) return toast('Keranjang kosong', 'error');
  uploadFiles = [];
  navigate('checkout');
}

// ========== CHECKOUT ==========
function renderCheckout() {
  if (!isBuyer()) return `<div class="empty-state"><h3>Login dulu yuk 💗</h3><button class="btn btn-primary" onclick="openAuth()">Login / Daftar</button></div>`;
  const u = getUser();
  const cart = getCart();
  const prods = DB.get('products', []);
  const items = Object.keys(cart).map(k => {
    const pid = k.split('_').slice(1).join('_');
    const p = prods.find(x => x.id === pid);
    return p ? { p, qty: cart[k], sub: p.price * cart[k] } : null;
  }).filter(Boolean);
  if (!items.length) return `<div class="empty-state"><h3>Keranjang kosong</h3><button class="btn btn-primary" onclick="navigate('shop')">Belanja</button></div>`;

  const total = items.reduce((a, b) => a + b.sub, 0);
  const hasService = items.some(x => x.p.isService);
  const methods = DB.get('settings').enabledMethods;
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const s = DB.get('settings');

  // Generate jam pengerjaan
  let jamHTML = '';
  if (hasService) {
    const dateVal = window._selectedServiceDate || minDate;
    const bookings = DB.get('serviceBookings', {});
    const dateBookings = bookings[dateVal] || {};
    jamHTML = s.serviceHours.map(h => {
      const used = dateBookings[h] || 0;
      const full = used >= s.hourlyCapacity;
      const selected = window._selectedServiceHour === h;
      return `
        <button type="button" class="pay-option ${full ? '' : (selected ? 'selected' : '')}"
          style="padding:10px 8px;font-size:.78rem;${full ? 'opacity:.4;cursor:not-allowed;' : ''}"
          ${full ? 'disabled' : ''}
          onclick="${full ? '' : `selectServiceHour(this,'${h}')`}">
          ${h}${full ? '<br><small>Tidak tersedia</small>' : ''}
        </button>
      `;
    }).join('');
  }

  return `
    <div class="section-head">
      <div><h2>📝 <span class="accent">Checkout</span></h2><p class="sub">Lengkapi data pesanan kamu</p></div>
      <button class="btn btn-ghost btn-sm" onclick="navigate('cart')">← Keranjang</button>
    </div>

    <div class="admin-panel">
      <h3 style="margin-bottom:14px;">👤 Data Pembeli</h3>
      <div class="form-grid">
        <div class="field"><label>Nama</label><input id="co-name" value="${u.name}"></div>
        <div class="field"><label>Email</label><input id="co-email" value="${u.email}" type="email"></div>
        <div class="field full"><label>No. WhatsApp</label><input id="co-wa" value="${u.wa || ''}" placeholder="62812xxxx"></div>
      </div>
    </div>

    <div class="admin-panel">
      <h3 style="margin-bottom:14px;">🛍️ Detail Pesanan</h3>
      ${items.map(x => `
        <div class="pay-info-row">
          <span>${x.p.emoji} ${x.p.name} ×${x.qty} <small class="muted">(${rupiah(x.p.price)}/${x.p.unit})</small></span>
          <b>${rupiah(x.sub)}</b>
        </div>
      `).join('')}
      <div class="summary-total"><span>Total</span><span>${rupiah(total)}</span></div>
    </div>

    ${hasService ? `
      <div class="admin-panel" style="border-color:var(--blue-pastel);">
        <h3 style="margin-bottom:14px;">📚 Detail Jasa Daftar Pustaka</h3>

        <div class="file-upload-box mb-16" onclick="document.getElementById('co-file').click()">
          <input type="file" id="co-file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple onchange="onFilesPick(this)">
          <span class="icon">📎</span>
          <b>Upload file yang ingin dibuatkan daftar pustakanya</b>
          <p class="muted mt-16" style="font-size:.8rem;">Format: PDF, DOC, DOCX, JPG, PNG — bisa pilih lebih dari satu file</p>
        </div>
        <div class="file-list" id="co-file-list">${renderUploadFiles()}</div>

        <div class="form-grid mt-16">
          <div class="field">
            <label>Permintaan Selesai — Tanggal</label>
            <input type="date" id="co-deadline-date" min="${minDate}" value="${dateVal}" onchange="onServiceDateChange()">
          </div>
        </div>
        <div class="field mt-16">
          <label>Pilih Jam Pengerjaan</label>
          <div class="pay-grid" id="co-jam-grid">${jamHTML}</div>
        </div>
        <p class="muted mt-16" style="font-size:.82rem;">⏰ Pemesanan jasa daftar pustaka maksimal H-1. Jam yang penuh ditandai "Tidak tersedia".</p>
      </div>
    ` : ''}

    <div class="admin-panel">
      <h3 style="margin-bottom:14px;">💳 Metode Pembayaran</h3>
      <div class="pay-grid" id="co-pay-grid">
        ${methods.map(m => `
          <div class="pay-option" onclick="selectPay(this,'${m}')">
            <span class="ic">${payIcon(m)}</span>${m}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="admin-panel">
      <div class="field">
        <label>📝 Catatan (opsional)</label>
        <textarea id="co-notes" placeholder="Contoh: tolong dikerjakan dengan format APA style..."></textarea>
      </div>
    </div>

    <button class="btn btn-primary btn-full" onclick="proceedToConfirm()">Lanjut ke Konfirmasi →</button>
  `;
}

let _selectedServiceDate = '';
let _selectedServiceHour = '';
window._selectedServiceDate = '';
window._selectedServiceHour = '';

function renderUploadFiles() {
  if (!uploadFiles.length) return `<p class="muted text-center" style="font-size:.85rem;">Belum ada file yang ditambahkan.</p>`;
  return uploadFiles.map((f, i) => `
    <div class="file-item">
      <span>📎</span>
      <div class="name">
        <div>${f.name}</div>
        <div class="meta">${(f.size / 1024).toFixed(0)} KB • ${f.type || 'file'}</div>
      </div>
      <button onclick="viewUploadFile(${i})">Lihat</button>
      <button onclick="removeUploadFile(${i})">Hapus</button>
    </div>
  `).join('');
}

function onFilesPick(input) {
  const files = Array.from(input.files || []);
  const ok = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
  let added = 0;
  files.forEach(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ok.includes(ext)) { toast(`Format ${f.name} tidak didukung`, 'error'); return; }
    uploadFiles.push({
      name: f.name,
      size: f.size,
      type: f.type,
      data: null,
      _file: f
    });
    added++;
  });
  // baca isi file untuk preview
  uploadFiles.forEach((uf, i) => {
    if (uf._file && !uf.data) {
      const reader = new FileReader();
      reader.onload = e => { uploadFiles[i].data = e.target.result; };
      reader.readAsDataURL(uf._file);
    }
  });
  input.value = '';
  if (added) toast(`${added} file ditambahkan 💗`, 'success');
  document.getElementById('co-file-list').innerHTML = renderUploadFiles();
}

function viewUploadFile(i) {
  const f = uploadFiles[i];
  if (!f.data) return toast('File sedang dibaca...', 'info');
  const w = window.open();
  w.document.write(`<title>${f.name}</title><iframe src="${f.data}" style="width:100%;height:100vh;border:none;"></iframe>`);
}

function removeUploadFile(i) {
  confirmDialog('Hapus File', 'Yakin ingin menghapus file ini?', () => {
    uploadFiles.splice(i, 1);
    document.getElementById('co-file-list').innerHTML = renderUploadFiles();
    toast('File dihapus', 'info');
  });
}

function onServiceDateChange() {
  _selectedServiceDate = document.getElementById('co-deadline-date').value;
  window._selectedServiceDate = _selectedServiceDate;
  window._selectedServiceHour = '';
  _selectedServiceHour = '';
  render();
}

function selectServiceHour(el, hour) {
  document.querySelectorAll('#co-jam-grid .pay-option').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
  _selectedServiceHour = hour;
  window._selectedServiceHour = hour;
}

function payIcon(m) {
  const map = {
    'Bank Transfer': '🏦', 'Virtual Account': '🔢', 'QRIS': '📱', 'GoPay': '💚', 'OVO': '💜',
    'DANA': '💙', 'ShopeePay': '🧡', 'LinkAja': '❤️', 'Mobile Banking': '📲', 'Lainnya': '💳'
  };
  return map[m] || '💳';
}

function selectPay(el, method) {
  document.querySelectorAll('#co-pay-grid .pay-option').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
  selectedPaymentMethod = method;
}

// ========== PROCEED TO CONFIRM ==========
function proceedToConfirm() {
  const name = $('co-name').value.trim();
  const email = $('co-email').value.trim();
  const wa = $('co-wa').value.trim();
  if (!name || !email || !wa) return toast('Lengkapi data pembeli', 'error');
  if (!selectedPaymentMethod) return toast('Pilih metode pembayaran', 'error');

  const cart = getCart();
  const prods = DB.get('products', []);
  const items = Object.keys(cart).map(k => {
    const pid = k.split('_').slice(1).join('_');
    const p = prods.find(x => x.id === pid);
    return p ? { id: p.id, name: p.name, price: p.price, qty: cart[k], sub: p.price * cart[k], isService: p.isService, unit: p.unit, emoji: p.emoji } : null;
  }).filter(Boolean);
  const total = items.reduce((a, b) => a + b.sub, 0);
  const hasService = items.some(x => x.isService);

  let deadline = '';
  if (hasService) {
    if (!uploadFiles.length) return toast('Upload minimal 1 file untuk jasa daftar pustaka', 'error');
    const d = $('co-deadline-date').value;
    if (!d) return toast('Pilih tanggal permintaan selesai', 'error');
    if (!_selectedServiceHour) return toast('Pilih jam pengerjaan', 'error');
    const dt = new Date(d + 'T00:00:00');
    if (dt - Date.now() < 86400000 * 0.9) return toast('Pemesanan jasa maksimal H-1. Pilih tanggal lain.', 'error');
    deadline = d + ' • ' + _selectedServiceHour;
  }

  currentOrderDraft = {
    name, email, wa,
    items, total,
    paymentMethod: selectedPaymentMethod,
    notes: $('co-notes').value.trim(),
    deadline,
    serviceDate: _selectedServiceDate || '',
    serviceHour: _selectedServiceHour || '',
    files: uploadFiles.map(f => ({ name: f.name, size: f.size, type: f.type, data: f.data })),
    hasService,
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5)
  };

  navigate('confirm');
}

// ========== CONFIRM ==========
function renderConfirm() {
  if (!currentOrderDraft) return `<div class="empty-state"><h3>Tidak ada pesanan</h3><button class="btn btn-primary" onclick="navigate('cart')">Ke Keranjang</button></div>`;
  const d = currentOrderDraft;
  return `
    <div class="section-head">
      <div><h2>🔍 Konfirmasi <span class="accent">Pesanan</span></h2><p class="sub">Periksa kembali sebelum lanjut pembayaran</p></div>
      <button class="btn btn-ghost btn-sm" onclick="navigate('checkout')">← Edit</button>
    </div>
    <div class="admin-panel">
      <h3 style="margin-bottom:14px;">👤 Data Pembeli</h3>
      <div class="pay-info-row"><span>Nama</span><b>${d.name}</b></div>
      <div class="pay-info-row"><span>Email</span><b>${d.email}</b></div>
      <div class="pay-info-row"><span>WhatsApp</span><b>${d.wa}</b></div>
    </div>
    <div class="admin-panel">
      <h3 style="margin-bottom:14px;">🛍️ Produk Dipesan</h3>
      ${d.items.map(x => `
        <div class="pay-info-row">
          <span>${x.emoji} ${x.name} ×${x.qty} <small class="muted">(${rupiah(x.price)}/${x.unit})</small></span>
          <b>${rupiah(x.sub)}</b>
        </div>
      `).join('')}
      <div class="summary-total"><span>Total Bayar</span><span>${rupiah(d.total)}</span></div>
    </div>
    <div class="admin-panel">
      <h3 style="margin-bottom:14px;">ℹ️ Informasi Pesanan</h3>
      <div class="pay-info-row"><span>Tanggal</span><b>${d.date}</b></div>
      <div class="pay-info-row"><span>Waktu</span><b>${d.time}</b></div>
      <div class="pay-info-row"><span>Metode Pembayaran</span><b>${d.paymentMethod}</b></div>
      <div class="pay-info-row"><span>Catatan</span><b>${d.notes || '-'}</b></div>
      ${d.deadline ? `<div class="pay-info-row"><span>Permintaan Selesai</span><b>${d.deadline}</b></div>` : ''}
    </div>
    ${d.files.length ? `
      <div class="admin-panel">
        <h3 style="margin-bottom:14px;">📎 File Jasa (${d.files.length})</h3>
        <div class="file-list">
          ${d.files.map(f => `
            <div class="file-item">
              <span>📎</span>
              <div class="name">${f.name}</div>
              <div class="meta">${(f.size/1024).toFixed(0)} KB</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div class="check-box mb-16">
      <input type="checkbox" id="confirm-check" onchange="document.getElementById('btn-to-pay').disabled=!this.checked">
      <label for="confirm-check" style="cursor:pointer;">Saya sudah memeriksa dan memastikan data pesanan saya sudah benar.</label>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <button class="btn btn-outline" style="flex:1;" onclick="navigate('checkout')">← Kembali dan Edit</button>
      <button class="btn btn-primary" id="btn-to-pay" style="flex:1;" disabled onclick="createOrder()">Lanjutkan ke Pembayaran →</button>
    </div>
  `;
}

// ========== CREATE ORDER ==========
function createOrder() {
  const d = currentOrderDraft;
  if (!d) return;
  const counter = (DB.get('orderCounter', 0) + 1);
  DB.set('orderCounter', counter);
  const queue = (DB.get('queueCounter', 0) + 1);
  DB.set('queueCounter', queue);

  const orderId = 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(counter).padStart(3, '0');

  const order = {
    id: 'o_' + Date.now(),
    orderId,
    userId: getUser().id,
    buyerName: d.name,
    buyerEmail: d.email,
    buyerWa: d.wa,
    items: d.items,
    total: d.total,
    date: d.date,
    time: d.time,
    paymentMethod: d.paymentMethod,
    paymentStatus: 'Menunggu Pembayaran',
    orderStatus: 'Menunggu Pembayaran',
    queueNumber: queue,
    deadline: d.deadline,
    serviceDate: d.serviceDate,
    serviceHour: d.serviceHour,
    notes: d.notes,
    files: d.files || [],
    resultFile: null,
    resultData: null,
    createdAt: Date.now(),
    statusHistory: [{ status: 'Menunggu Pembayaran', at: Date.now() }]
  };
  const orders = DB.get('orders', []);
  orders.push(order);
  DB.set('orders', orders);

  // Update booking jam jasa
  if (d.hasService && d.serviceDate && d.serviceHour) {
    const bookings = DB.get('serviceBookings', {});
    if (!bookings[d.serviceDate]) bookings[d.serviceDate] = {};
    bookings[d.serviceDate][d.serviceHour] = (bookings[d.serviceDate][d.serviceHour] || 0) + 1;
    DB.set('serviceBookings', bookings);
  }

  // Kurangi stok produk fisik
  const prods = DB.get('products', []);
  order.items.forEach(it => {
    if (!it.isService) {
      const p = prods.find(x => x.id === it.id);
      if (p) p.stock -= it.qty;
    }
  });
  DB.set('products', prods);

  // Hapus cart
  const cart = DB.get('cart', {});
  const prefix = getUser().id + '_';
  Object.keys(cart).forEach(k => { if (k.startsWith(prefix)) delete cart[k]; });
  DB.set('cart', cart);

  // Notifikasi
  addNotification('admin', 'new_order', `📦 Pesanan baru ${orderId} dari ${d.name} — Total ${rupiah(d.total)}`);
  if (d.files.length) addNotification('admin', 'new_files', `📎 ${d.files.length} file jasa baru untuk ${orderId}`);
  addNotification(getUser().id, 'order_created', `✅ Pesanan ${orderId} berhasil dibuat. Selesaikan pembayaran.`);

  currentOrderDraft = null;
  detailQty = 0;
  selectedPaymentMethod = null;
  uploadFiles = [];
  _selectedServiceDate = '';
  _selectedServiceHour = '';
  window._selectedServiceDate = '';
  window._selectedServiceHour = '';
  currentDetailId = order.id;
  navigate('payment', { detailId: order.id });
}

// ========== PAYMENT ==========
function renderPayment() {
  const order = DB.get('orders', []).find(o => o.id === currentDetailId);
  if (!order) return `<div class="empty-state"><h3>Pesanan tidak ditemukan</h3></div>`;
  const s = DB.get('settings');
  const m = order.paymentMethod;
  let detailHTML = '';

  if (m === 'Bank Transfer') {
    detailHTML = `
      <h3>🏦 Transfer Bank</h3>
      <div class="pay-info-row"><span>Bank</span><b>${s.bank.name}</b></div>
      <div class="pay-info-row"><span>No. Rekening</span><b>${s.bank.number} <button class="copy-btn" onclick="copyText('${s.bank.number}')">Salin</button></b></div>
      <div class="pay-info-row"><span>Atas Nama</span><b>${s.bank.holder}</b></div>
      <div class="pay-info-row"><span>Nominal</span><b>${rupiah(order.total)}</b></div>
      <p class="mt-16 muted" style="font-size:.85rem;">Transfer sesuai nominal tepat, lalu tekan tombol "Saya Sudah Membayar".</p>
    `;
  } else if (m === 'Virtual Account') {
    detailHTML = `
      <h3>🔢 Virtual Account</h3>
      <div class="pay-info-row"><span>Bank</span><b>${s.va.bank}</b></div>
      <div class="va-number">${s.va.number}</div>
      <button class="btn btn-outline btn-full mb-16" onclick="copyText('${s.va.number}')">📋 Salin Nomor VA</button>
      <div class="pay-info-row"><span>Nominal</span><b>${rupiah(order.total)}</b></div>
      <div class="pay-info-row"><span>Batas Waktu</span><b>24 jam</b></div>
    `;
  } else if (m === 'QRIS') {
    detailHTML = `
      <h3>📱 Scan QRIS</h3>
      <div class="qr-wrap">
        <img src="${s.qris}" alt="QRIS">
        <b style="font-family:Fredoka;color:var(--pink-dark);font-size:1.2rem;">${rupiah(order.total)}</b>
        <small class="muted">Scan dengan aplikasi pembayaran apapun</small>
      </div>
    `;
  } else if (m === 'GoPay') {
    detailHTML = `
      <h3>💚 GoPay</h3>
      <div class="pay-info-row"><span>Nomor GoPay</span><b>${s.gopay} <button class="copy-btn" onclick="copyText('${s.gopay}')">Salin</button></b></div>
      <div class="pay-info-row"><span>Nominal</span><b>${rupiah(order.total)}</b></div>
      <p class="mt-16 muted" style="font-size:.85rem;">Buka aplikasi Gojek → GoPay → Transfer ke nomor di atas.</p>
    `;
  } else if (m === 'OVO') {
    detailHTML = `
      <h3>💜 OVO</h3>
      <div class="pay-info-row"><span>Nomor OVO</span><b>${s.ovo} <button class="copy-btn" onclick="copyText('${s.ovo}')">Salin</button></b></div>
      <div class="pay-info-row"><span>Nominal</span><b>${rupiah(order.total)}</b></div>
      <p class="mt-16 muted" style="font-size:.85rem;">Buka aplikasi OVO → Transfer → masukkan nomor tujuan.</p>
    `;
  } else if (m === 'DANA') {
    detailHTML = `
      <h3>💙 DANA</h3>
      <div class="pay-info-row"><span>Nomor DANA</span><b>${s.dana} <button class="copy-btn" onclick="copyText('${s.dana}')">Salin</button></b></div>
      <div class="pay-info-row"><span>Nominal</span><b>${rupiah(order.total)}</b></div>
      <p class="mt-16 muted" style="font-size:.85rem;">Buka DANA → Kirim → masukkan nomor tujuan.</p>
    `;
  } else if (m === 'ShopeePay') {
    detailHTML = `
      <h3>🧡 ShopeePay</h3>
      <div class="pay-info-row"><span>Nomor ShopeePay</span><b>${s.shopeepay} <button class="copy-btn" onclick="copyText('${s.shopeepay}')">Salin</button></b></div>
      <div class="pay-info-row"><span>Nominal</span><b>${rupiah(order.total)}</b></div>
      <p class="mt-16 muted" style="font-size:.85rem;">Buka Shopee → ShopeePay → Transfer ke nomor di atas.</p>
    `;
  } else if (m === 'LinkAja') {
    detailHTML = `
      <h3>❤️ LinkAja</h3>
      <div class="pay-info-row"><span>Nomor LinkAja</span><b>${s.linkaja} <button class="copy-btn" onclick="copyText('${s.linkaja}')">Salin</button></b></div>
      <div class="pay-info-row"><span>Nominal</span><b>${rupiah(order.total)}</b></div>
    `;
  } else if (m === 'Mobile Banking') {
    detailHTML = `
      <h3>📲 Mobile Banking</h3>
      <div class="pay-info-row"><span>Instruksi</span><b>${s.mobileBanking}</b></div>
      <div class="pay-info-row"><span>Nominal</span><b>${rupiah(order.total)}</b></div>
    `;
  } else {
    detailHTML = `
      <h3>💳 Metode Lainnya</h3>
      <p class="muted">${s.other}</p>
      <div class="pay-info-row"><span>Nominal</span><b>${rupiah(order.total)}</b></div>
    `;
  }

  return `
    <div class="section-head">
      <div><h2>💳 <span class="accent">Pembayaran</span></h2><p class="sub">Selesaikan pembayaran pesanan kamu</p></div>
    </div>
    <div class="admin-panel" style="background:linear-gradient(135deg,var(--pink-soft),var(--blue-soft));">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
        <div><small class="muted">Order ID</small><div style="font-family:Fredoka;font-weight:700;color:var(--pink-dark);">${order.orderId}</div></div>
        <div><small class="muted">Total</small><div style="font-family:Fredoka;font-weight:700;color:var(--pink-dark);">${rupiah(order.total)}</div></div>
        <div><small class="muted">Metode</small><div style="font-weight:700;">${order.paymentMethod}</div></div>
        <div><small class="muted">Tanggal</small><div style="font-weight:700;">${order.date}</div></div>
        <div><small class="muted">Waktu</small><div style="font-weight:700;">${order.time}</div></div>
      </div>
    </div>

    <div class="pay-detail">${detailHTML}</div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px;">
      <button class="btn btn-outline" style="flex:1;" onclick="navigate('orders')">Kembali</button>
      ${order.paymentStatus === 'Menunggu Pembayaran'
        ? `<button class="btn btn-primary" style="flex:1;" onclick="markPaid()">✅ Saya Sudah Membayar</button>`
        : `<button class="btn btn-primary" style="flex:1;" onclick="navigate('order-detail',{detailId:'${order.id}'})">Lihat Pesanan</button>`}
    </div>
  `;
}

function copyText(txt) {
  navigator.clipboard.writeText(txt).then(() => toast('Berhasil disalin! 📋', 'success'))
    .catch(() => toast('Gagal menyalin', 'error'));
}

function markPaid() {
  const order = DB.get('orders', []).find(o => o.id === currentDetailId);
  if (!order) return;
  confirmDialog('Konfirmasi Pembayaran', 'Kamu yakin sudah melakukan pembayaran?', () => {
    order.paymentStatus = 'Menunggu Verifikasi';
    order.orderStatus = 'Menunggu Verifikasi Pembayaran';
    order.statusHistory.push({ status: 'Menunggu Verifikasi Pembayaran', at: Date.now() });
    const orders = DB.get('orders', []);
    const idx = orders.findIndex(o => o.id === order.id);
    orders[idx] = order;
    DB.set('orders', orders);
    addNotification('admin', 'payment_verify', `💰 Pembayaran ${order.orderId} menunggu verifikasi (${rupiah(order.total)})`);
    addNotification(order.userId, 'payment_sent', `⏳ Pembayaran ${order.orderId} sedang menunggu verifikasi admin.`);
    toast('Terima kasih! Pembayaran akan diverifikasi admin. 💗', 'success');
    navigate('success', { detailId: order.id });
  });
}

// ========== SUCCESS ==========
function renderSuccess() {
  const order = DB.get('orders', []).find(o => o.id === currentDetailId);
  if (!order) return '';
  return `
    <div class="empty-state" style="border-style:solid;background:linear-gradient(135deg,var(--pink-soft),var(--blue-soft));">
      <span class="big">🎉💗</span>
      <h3>Pesanan Berhasil Dibuat!</h3>
      <p>Terima kasih sudah berbelanja di PinkyStudy</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:20px 0;text-align:left;">
        <div><small class="muted">Order ID</small><div style="font-family:Fredoka;font-weight:700;color:var(--pink-dark);">${order.orderId}</div></div>
        <div><small class="muted">Nomor Antrian</small><div style="font-family:Fredoka;font-weight:700;color:var(--pink-dark);">#${String(order.queueNumber).padStart(2, '0')}</div></div>
        <div><small class="muted">Total</small><div style="font-family:Fredoka;font-weight:700;color:var(--pink-dark);">${rupiah(order.total)}</div></div>
        <div><small class="muted">Metode</small><div style="font-weight:700;">${order.paymentMethod}</div></div>
        <div><small class="muted">Status Bayar</small><div style="font-weight:700;">${order.paymentStatus}</div></div>
        <div><small class="muted">Status Pesanan</small><div style="font-weight:700;">${order.orderStatus}</div></div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="navigate('order-detail',{detailId:'${order.id}'})">📦 Lihat Pesanan</button>
        <button class="btn btn-outline" onclick="navigate('shop')">🛍️ Kembali Belanja</button>
      </div>
    </div>
  `;
}

// ========== ORDERS ==========
function payStatusChip(s) {
  const map = {
    'Menunggu Pembayaran': { cls: 'st-wait', text: 'Menunggu Pembayaran' },
    'Menunggu Verifikasi': { cls: 'st-verify', text: 'Menunggu Verifikasi' },
    'Pembayaran Diterima': { cls: 'st-paid', text: 'Pembayaran Diterima' },
    'Pembayaran Gagal': { cls: 'st-cancel', text: 'Pembayaran Gagal' }
  };
  return map[s] || { cls: 'st-wait', text: s };
}

function orderStatusChip(s) {
  const map = {
    'Menunggu Pembayaran': { cls: 'st-wait', text: 'Menunggu Pembayaran' },
    'Menunggu Verifikasi Pembayaran': { cls: 'st-verify', text: 'Verifikasi Pembayaran' },
    'Pembayaran Diterima': { cls: 'st-paid', text: 'Pembayaran Diterima' },
    'Menunggu Diproses': { cls: 'st-wait', text: 'Menunggu Diproses' },
    'Proses': { cls: 'st-process', text: 'Sedang Diproses' },
    'Selesai': { cls: 'st-done', text: 'Selesai' }
  };
  return map[s] || { cls: 'st-wait', text: s };
}

function renderOrders() {
  const u = getUser();
  if (!u) return `<div class="empty-state"><h3>Login dulu yuk 💗</h3><button class="btn btn-primary" onclick="openAuth()">Login</button></div>`;
  let orders = DB.get('orders', []);
  if (!isAdmin()) orders = orders.filter(o => o.userId === u.id);
  orders = orders.slice().reverse();

  if (!orders.length) {
    return `<div class="empty-state">
      <span class="big">📦💗</span>
      <h3>Belum ada pesanan 💗</h3>
      <p>Yuk mulai belanja atau pesan jasa daftar pustaka!</p>
      <button class="btn btn-primary" onclick="navigate('shop')">🛍️ Mulai Belanja</button>
    </div>`;
  }

  return `
    <div class="section-head">
      <div><h2>📦 <span class="accent">${isAdmin() ? 'Semua Pesanan' : 'Pesanan Saya'}</span></h2><p class="sub">${orders.length} pesanan</p></div>
    </div>
    ${orders.map(o => {
      const pay = payStatusChip(o.paymentStatus);
      const st = orderStatusChip(o.orderStatus);
      return `
        <div class="order-card">
          <div class="order-head">
            <div>
              <div class="order-id">${o.orderId}</div>
              <small class="muted">${o.date} • ${o.time} • Antrian #${String(o.queueNumber).padStart(2, '0')}</small>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <span class="status-chip ${pay.cls}">${pay.text}</span>
              <span class="status-chip ${st.cls}">${st.text}</span>
            </div>
          </div>
          ${isAdmin() ? `<div class="muted" style="font-size:.85rem;margin-bottom:8px;">👤 ${o.buyerName} • 📧 ${o.buyerEmail} • 📱 ${o.buyerWa}</div>` : ''}
          <div style="font-size:.9rem;">
            ${o.items.slice(0, 2).map(it => `<div>${it.emoji || ''} ${it.name} ×${it.qty}</div>`).join('')}
            ${o.items.length > 2 ? `<div class="muted">+${o.items.length - 2} produk lainnya</div>` : ''}
          </div>
          <div class="summary-total" style="padding-top:12px;margin-top:12px;">
            <span>Total</span><span>${rupiah(o.total)}</span>
          </div>
          <button class="btn btn-primary btn-sm mt-16" onclick="navigate('order-detail',{detailId:'${o.id}'})">Lihat Detail →</button>
        </div>
      `;
    }).join('')}
  `;
}

// ========== ORDER DETAIL ==========
function renderOrderDetail(id) {
  const o = DB.get('orders', []).find(x => x.id === id);
  if (!o) return `<div class="empty-state"><h3>Pesanan tidak ditemukan</h3></div>`;
  const u = getUser();
  if (!isAdmin() && o.userId !== u.id) {
    return `<div class="empty-state"><h3>Akses ditolak</h3><p>Ini bukan pesanan kamu.</p></div>`;
  }
  const steps = ['Menunggu Pembayaran', 'Pembayaran Diterima', 'Proses', 'Selesai'];
  let curStep = 0;
  if (o.orderStatus === 'Menunggu Verifikasi Pembayaran') curStep = 0;
  else if (o.orderStatus === 'Pembayaran Diterima' || o.orderStatus === 'Menunggu Diproses') curStep = 1;
  else if (o.orderStatus === 'Proses') curStep = 2;
  else if (o.orderStatus === 'Selesai') curStep = 3;

  const pay = payStatusChip(o.paymentStatus);
  const st = orderStatusChip(o.orderStatus);

  let adminActions = '';
  if (isAdmin()) {
    adminActions = `
      <div class="admin-panel" style="background:var(--pink-soft);border-color:var(--pink-med);">
        <h3 style="margin-bottom:12px;">⚙️ Kelola Pesanan (Admin)</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${o.paymentStatus === 'Menunggu Verifikasi' ? `<button class="btn btn-primary btn-sm" onclick="verifyPayment('${o.id}')">✅ Verifikasi Pembayaran</button>` : ''}
          ${o.paymentStatus === 'Menunggu Pembayaran' ? `<button class="btn btn-outline btn-sm" onclick="confirmPaymentReceived('${o.id}')">💰 Tandai Dibayar</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="updateOrderStatus('${o.id}','Menunggu Diproses')">📋 Menunggu Diproses</button>
          <button class="btn btn-outline btn-sm" onclick="updateOrderStatus('${o.id}','Proses')">⚙️ Proses</button>
          <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${o.id}','Selesai')">🎉 Selesai</button>
          <button class="btn btn-outline btn-sm" onclick="editQueue('${o.id}')">🔢 Ubah Antrian</button>
        </div>
        ${o.items.some(x => x.isService) ? `
          <div class="divider"></div>
          <h4 style="margin-bottom:8px;">📚 Kelola Hasil Jasa</h4>
          <div class="mb-16" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <label class="btn btn-outline btn-sm" style="cursor:pointer;">
              📤 Upload Hasil Jasa
              <input type="file" style="display:none;" onchange="uploadResult('${o.id}', this)">
            </label>
            ${o.resultFile ? `<span class="tag-soft">✅ Hasil: ${o.resultFile}</span>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Rating
  const existingRating = DB.get('ratings', []).find(r => r.orderId === o.orderId);
  let ratingBlock = '';
  if (o.orderStatus === 'Selesai' && !isAdmin()) {
    if (existingRating) {
      ratingBlock = `
        <div class="admin-panel" style="background:var(--pink-soft);">
          <h3 style="margin-bottom:8px;">⭐ Rating Kamu</h3>
          <div class="stars">${'★'.repeat(existingRating.rating)}${'☆'.repeat(5 - existingRating.rating)}</div>
          <p class="mt-16">${existingRating.review || '(tanpa review)'}</p>
        </div>
      `;
    } else {
      ratingBlock = `<button class="btn btn-primary btn-full mb-16" onclick="navigate('rating',{detailId:'${o.id}'})">⭐ Berikan Rating</button>`;
    }
  }

  // Hasil jasa
  let resultBlock = '';
  if (o.items.some(x => x.isService) && o.resultFile && !isAdmin()) {
    resultBlock = `
      <div class="admin-panel" style="background:linear-gradient(135deg,var(--pink-soft),var(--blue-soft));">
        <h3 style="margin-bottom:10px;">🎉 Hasil Jasa Selesai</h3>
        <p class="muted mb-16">Pesanan daftar pustaka kamu sudah selesai. Hasil telah dikirim ke email.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="viewResult('${o.id}')">👁️ Lihat Hasil</button>
          ${o.resultData ? `<a class="btn btn-outline btn-sm" download="${o.resultFile}" href="${o.resultData}">📥 Download Hasil</a>` : ''}
        </div>
      </div>
    `;
  }

  // File yang di-upload buyer
  let filesBlock = '';
  if (o.files && o.files.length) {
    filesBlock = `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">📎 File Jasa (${o.files.length})</h3>
        <div class="file-list">
          ${o.files.map((f, i) => `
            <div class="file-item">
              <span>📎</span>
              <div class="name">
                <div>${f.name}</div>
                <div class="meta">${(f.size / 1024).toFixed(0)} KB • ${f.type || 'file'}</div>
              </div>
              ${f.data ? `<button onclick="viewOrderFile('${o.id}',${i})">Lihat</button>
              <a class="btn btn-ghost btn-sm" style="padding:4px 8px;font-size:.78rem;" download="${f.name}" href="${f.data}">Download</a>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <button class="btn btn-ghost btn-sm mb-16" onclick="navigate('orders')">← Pesanan</button>
    <div class="admin-panel">
      <div class="order-head">
        <div>
          <div class="order-id">${o.orderId}</div>
          <small class="muted">${o.date} • ${o.time}</small>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <span class="status-chip ${pay.cls}">${pay.text}</span>
          <span class="status-chip ${st.cls}">${st.text}</span>
        </div>
      </div>
      <div class="progress-track">
        ${steps.map((s, i) => `
          <div class="progress-step ${i < curStep ? 'done' : i === curStep ? 'active' : ''}">
            <div class="dot">${i < curStep ? '✓' : i + 1}</div>
            <small>${s}</small>
          </div>
        `).join('')}
      </div>
      ${o.paymentStatus === 'Menunggu Verifikasi' ? `
        <p class="muted text-center" style="font-size:.85rem;">⏳ Menunggu verifikasi pembayaran oleh admin.</p>
      ` : ''}
      ${o.paymentStatus === 'Pembayaran Diterima' ? `
        <p class="muted text-center" style="font-size:.85rem;">✅ Pembayaran berhasil diterima. Pesanan kamu sedang diproses.</p>
      ` : ''}
    </div>

    <div class="admin-panel">
      <h3 style="margin-bottom:12px;">👤 Data Pembeli</h3>
      <div class="pay-info-row"><span>Nama</span><b>${o.buyerName}</b></div>
      <div class="pay-info-row"><span>Email</span><b>${o.buyerEmail}</b></div>
      <div class="pay-info-row"><span>WhatsApp</span><b>${o.buyerWa}</b></div>
      <div class="pay-info-row"><span>Nomor Antrian</span><b>#${String(o.queueNumber).padStart(2, '0')}</b></div>
    </div>

    <div class="admin-panel">
      <h3 style="margin-bottom:12px;">🛍️ Produk</h3>
      ${o.items.map(x => `
        <div class="pay-info-row">
          <span>${x.emoji || ''} ${x.name} ×${x.qty}</span>
          <b>${rupiah(x.sub)}</b>
        </div>
      `).join('')}
      <div class="summary-total"><span>Total</span><span>${rupiah(o.total)}</span></div>
    </div>

    <div class="admin-panel">
      <h3 style="margin-bottom:12px;">💳 Info Pembayaran</h3>
      <div class="pay-info-row"><span>Metode</span><b>${o.paymentMethod}</b></div>
      <div class="pay-info-row"><span>Status Pembayaran</span><b>${o.paymentStatus}</b></div>
      <div class="pay-info-row"><span>Status Pesanan</span><b>${o.orderStatus}</b></div>
      ${o.deadline ? `<div class="pay-info-row"><span>Permintaan Selesai</span><b>${o.deadline}</b></div>` : ''}
      ${o.notes ? `<div class="pay-info-row"><span>Catatan</span><b>${o.notes}</b></div>` : ''}
    </div>

    ${filesBlock}
    ${resultBlock}
    ${ratingBlock}
    ${adminActions}

    ${o.statusHistory && o.statusHistory.length ? `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">📜 Riwayat Status</h3>
        ${o.statusHistory.map(h => `
          <div class="pay-info-row">
            <span>${h.status}</span>
            <small class="muted">${new Date(h.at).toLocaleString('id-ID')}</small>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${o.orderStatus === 'Selesai' ? `
      <div class="empty-state" style="border-style:solid;background:var(--pink-soft);">
        <span class="big">🎉</span>
        <h3>Pesanan Selesai 💗</h3>
        <p>Selesai — Pesanan sudah diberikan kepada pemesan.</p>
      </div>
    ` : ''}
  `;
}

function viewOrderFile(orderId, idx) {
  const o = DB.get('orders', []).find(x => x.id === orderId);
  const f = o.files[idx];
  if (f.data) {
    const w = window.open();
    w.document.write(`<title>${f.name}</title><iframe src="${f.data}" style="width:100%;height:100vh;border:none;"></iframe>`);
  } else toast('File tidak tersedia', 'error');
}

function viewResult(orderId) {
  const o = DB.get('orders', []).find(x => x.id === orderId);
  if (!o) return;
  if (o.resultData) {
    const w = window.open();
    w.document.write(`<title>${o.resultFile}</title><iframe src="${o.resultData}" style="width:100%;height:100vh;border:none;"></iframe>`);
  } else {
    toast('Hasil jasa: ' + (o.resultFile || 'belum tersedia'), 'info');
  }
}

// ========== ADMIN ACTIONS ==========
function verifyPayment(id) {
  confirmDialog('Verifikasi Pembayaran', 'Tandai pembayaran ini sebagai Diterima?', () => {
    const orders = DB.get('orders', []);
    const o = orders.find(x => x.id === id);
    o.paymentStatus = 'Pembayaran Diterima';
    o.orderStatus = 'Pembayaran Diterima';
    o.statusHistory.push({ status: 'Pembayaran Diterima', at: Date.now() });
    DB.set('orders', orders);
    addNotification(o.userId, 'payment_ok', `✅ Pembayaran berhasil diterima. Pesanan kamu sedang diproses.`);
    addNotification('admin', 'payment_ok_admin', `💰 Pembayaran pesanan ${o.orderId} telah diterima.`);
    toast('Pembayaran diverifikasi 💗', 'success');
    render();
  });
}

function confirmPaymentReceived(id) {
  const orders = DB.get('orders', []);
  const o = orders.find(x => x.id === id);
  o.paymentStatus = 'Pembayaran Diterima';
  o.orderStatus = 'Pembayaran Diterima';
  o.statusHistory.push({ status: 'Pembayaran Diterima', at: Date.now() });
  DB.set('orders', orders);
  addNotification(o.userId, 'payment_ok', `✅ Pembayaran berhasil diterima. Pesanan kamu sedang diproses.`);
  toast('Ditandai sudah dibayar', 'success');
  render();
}

function updateOrderStatus(id, status) {
  const orders = DB.get('orders', []);
  const o = orders.find(x => x.id === id);
  o.orderStatus = status;
  o.statusHistory.push({ status, at: Date.now() });
  if (status === 'Selesai') o.completedAt = Date.now();
  DB.set('orders', orders);
  addNotification(o.userId, 'status_update', `📢 Pesanan ${o.orderId} sekarang: ${status}`);
  toast(`Status diubah ke "${status}"`, 'success');
  render();
}

function editQueue(id) {
  const orders = DB.get('orders', []);
  const o = orders.find(x => x.id === id);
  const n = prompt('Masukkan nomor antrian baru:', o.queueNumber);
  if (n && !isNaN(n)) {
    o.queueNumber = Number(n);
    DB.set('orders', orders);
    toast('Nomor antrian diubah', 'success');
    render();
  }
}

function uploadResult(id, input) {
  const f = input.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    const orders = DB.get('orders', []);
    const o = orders.find(x => x.id === id);
    o.resultFile = f.name;
    o.resultData = e.target.result;
    o.orderStatus = 'Selesai';
    o.completedAt = Date.now();
    o.statusHistory.push({ status: 'Selesai', at: Date.now() });
    DB.set('orders', orders);
    addNotification(o.userId, 'result_uploaded', `🎉 Pesanan daftar pustaka kamu sudah selesai. Hasil telah dikirim ke email.`);
    toast('Hasil jasa diupload & pesanan selesai 💗', 'success');
    render();
  };
  reader.readAsDataURL(f);
}

// ========== RATING ==========
function renderRating(id) {
  const o = DB.get('orders', []).find(x => x.id === id);
  if (!o) return '';
  if (o.orderStatus !== 'Selesai') return `<div class="empty-state"><h3>Rating tersedia setelah pesanan selesai</h3></div>`;
  return `
    <div class="section-head"><div><h2>⭐ Berikan <span class="accent">Rating</span></h2><p class="sub">${o.orderId}</p></div></div>
    <div class="admin-panel text-center">
      <p class="mb-16">Seberapa puas dengan pesanan kamu?</p>
      <div class="stars" id="rating-stars" style="font-size:2.4rem;justify-content:center;display:flex;">
        ${[1, 2, 3, 4, 5].map(i => `<span data-v="${i}" onclick="setRating(${i})">☆</span>`).join('')}
      </div>
      <div class="field mt-16" style="text-align:left;">
        <label>Review (opsional)</label>
        <textarea id="rating-review" placeholder="Tulis pengalaman kamu..."></textarea>
      </div>
      <button class="btn btn-primary btn-full mt-16" onclick="submitRating('${o.id}')">Kirim Rating 💗</button>
    </div>
  `;
}

function setRating(v) {
  ratingValue = v;
  document.querySelectorAll('#rating-stars span').forEach(s => {
    s.textContent = Number(s.dataset.v) <= v ? '★' : '☆';
    s.classList.toggle('on', Number(s.dataset.v) <= v);
  });
}

function submitRating(orderId) {
  if (!ratingValue) return toast('Pilih bintang dulu', 'error');
  const o = DB.get('orders', []).find(x => x.id === orderId);
  const ratings = DB.get('ratings', []);
  ratings.push({
    id: 'r_' + Date.now(),
    orderId: o.orderId,
    userId: o.userId,
    rating: ratingValue,
    review: $('rating-review').value.trim(),
    date: Date.now()
  });
  DB.set('ratings', ratings);
  addNotification('admin', 'new_rating', `⭐ Rating baru ${ratingValue}★ dari ${o.buyerName}`);
  toast('Terima kasih atas ratingnya! 💗', 'success');
  navigate('order-detail', { detailId: orderId });
}

// ========== PROFILE ==========
function renderProfile() {
  const u = getUser();
  if (!u) {
    return `
      <div class="empty-state">
        <span class="big">👤💗</span>
        <h3>Belum Login</h3>
        <p>Login atau daftar untuk mulai berbelanja & melacak pesanan</p>
        <button class="btn btn-primary" onclick="openAuth()">Login / Daftar</button>
      </div>
    `;
  }
  const orders = DB.get('orders', []).filter(o => o.userId === u.id);
  const running = orders.filter(o => o.orderStatus !== 'Selesai').length;
  const done = orders.filter(o => o.orderStatus === 'Selesai').length;
  const myRatings = DB.get('ratings', []).filter(r => r.userId === u.id);

  return `
    <div class="section-head"><div><h2>👤 <span class="accent">Profil</span></h2><p class="sub">Informasi akun kamu</p></div></div>
    <div class="admin-panel">
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
        <div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,var(--pink-med),var(--pink-deep));display:flex;align-items:center;justify-content:center;font-size:2rem;color:#fff;font-family:Fredoka;font-weight:700;">
          ${u.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3>${u.name}</h3>
          <p class="muted">${u.email}</p>
          <span class="tag-soft">${u.role === 'admin' ? '👑 Admin' : '💗 Buyer'}</span>
        </div>
      </div>
      <div class="divider"></div>
      <div class="pay-info-row"><span>WhatsApp</span><b>${u.wa || '-'}</b></div>
      <div class="pay-info-row"><span>Role</span><b>${u.role}</b></div>
    </div>

    ${u.role === 'buyer' ? `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">📊 Statistik Pesanan</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;">
          <div><div style="font-family:Fredoka;font-size:1.6rem;color:var(--pink-dark);font-weight:700;">${orders.length}</div><small class="muted">Total</small></div>
          <div><div style="font-family:Fredoka;font-size:1.6rem;color:var(--pink-dark);font-weight:700;">${running}</div><small class="muted">Berjalan</small></div>
          <div><div style="font-family:Fredoka;font-size:1.6rem;color:var(--pink-dark);font-weight:700;">${done}</div><small class="muted">Selesai</small></div>
        </div>
      </div>
      <button class="btn btn-primary btn-full mb-16" onclick="navigate('orders')">📦 Lihat Riwayat Pesanan</button>

      ${myRatings.length ? `
        <div class="admin-panel">
          <h3 style="margin-bottom:12px;">⭐ Rating yang Pernah Diberikan</h3>
          ${myRatings.map(r => `
            <div class="review-card mb-16">
              <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
              <p style="margin:8px 0;font-size:.9rem;">${r.review || '(tanpa review)'}</p>
              <small class="muted">Order ${r.orderId}</small>
            </div>
          `).join('')}
        </div>
      ` : ''}
    ` : `
      <div class="admin-panel" style="background:var(--pink-soft);">
        <h3 style="margin-bottom:12px;">⚙️ Menu Admin</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="navigate('admin')">📊 Dashboard</button>
          <button class="btn btn-outline btn-sm" onclick="navigate('admin',{tab:'orders'})">📦 Pesanan</button>
          <button class="btn btn-outline btn-sm" onclick="navigate('admin',{tab:'products'})">🛍️ Produk</button>
          <button class="btn btn-outline btn-sm" onclick="navigate('admin',{tab:'payments'})">💳 Pembayaran</button>
          <button class="btn btn-outline btn-sm" onclick="navigate('admin',{tab:'files'})">📁 File Jasa</button>
          <button class="btn btn-outline btn-sm" onclick="navigate('admin',{tab:'settings'})">⚙️ Pengaturan</button>
        </div>
      </div>
    `}

    <button class="btn btn-outline btn-full" onclick="doLogout()">🚪 Logout</button>
  `;
}

// ========== ADMIN ==========
function renderAdmin(tab) {
  currentAdminTab = tab;
  const tabs = [
    ['dashboard', '📊 Dashboard'], ['orders', '📦 Pesanan'], ['products', '🛍️ Produk'],
    ['stocks', '📦 Stok'], ['payments', '💳 Pembayaran'], ['files', '📁 File Jasa'],
    ['queue', '🔢 Antrian'], ['ratings', '⭐ Rating'], ['notifications', '🔔 Notifikasi'],
    ['users', '👥 Pengguna'], ['settings', '⚙️ Pengaturan']
  ];
  return `
    <div class="section-head">
      <div><h2>👑 <span class="accent">Dashboard Admin</span></h2><p class="sub">Kelola PinkyStudy</p></div>
    </div>
    <div class="admin-tabs">
      ${tabs.map(([k, l]) => `<button class="${tab === k ? 'active' : ''}" onclick="navigate('admin',{tab:'${k}'})">${l}</button>`).join('')}
    </div>
    <div id="admin-content">${renderAdminTab(tab)}</div>
  `;
}

function renderAdminTab(tab) {
  const orders = DB.get('orders', []);
  const products = DB.get('products', []);
  const users = DB.get('users', []);
  const ratings = DB.get('ratings', []);
  const s = DB.get('settings');

  if (tab === 'dashboard') {
    const baru = orders.filter(o => o.paymentStatus === 'Menunggu Verifikasi').length;
    const belum = orders.filter(o => o.paymentStatus === 'Menunggu Pembayaran').length;
    const paid = orders.filter(o => o.paymentStatus === 'Pembayaran Diterima').length;
    const process = orders.filter(o => o.orderStatus === 'Proses').length;
    const done = orders.filter(o => o.orderStatus === 'Selesai').length;
    const lowStock = products.filter(p => !p.isService && p.stock <= 5).length;
    const outStock = products.filter(p => !p.isService && p.stock <= 0).length;
    const totalRevenue = orders.filter(o => o.paymentStatus === 'Pembayaran Diterima').reduce((a, b) => a + b.total, 0);
    const serviceFiles = orders.filter(o => o.files && o.files.length).reduce((a, b) => a + b.files.length, 0);
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
        ${[
          ['📦', 'Total Pesanan', orders.length],
          ['⏳', 'Menunggu Verifikasi', baru],
          ['💰', 'Belum Bayar', belum],
          ['✅', 'Pembayaran Diterima', paid],
          ['⚙️', 'Proses', process],
          ['🎉', 'Selesai', done],
          ['⚠️', 'Stok Hampir Habis', lowStock],
          ['🚫', 'Stok Habis', outStock],
          ['📎', 'File Jasa', serviceFiles],
          ['⭐', 'Total Rating', ratings.length],
          ['💵', 'Total Pendapatan', rupiah(totalRevenue)]
        ].map(([ic, l, v]) => `
          <div class="admin-panel text-center" style="padding:14px;">
            <div style="font-size:1.5rem;">${ic}</div>
            <div style="font-family:Fredoka;font-size:1.15rem;color:var(--pink-dark);font-weight:700;margin:4px 0;">${v}</div>
            <small class="muted">${l}</small>
          </div>
        `).join('')}
      </div>
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">🔔 Notifikasi Admin</h3>
        ${DB.get('notifications', []).filter(n => n.userId === 'admin').slice(-10).reverse().map(n => `
          <div class="pay-info-row"><span>${n.message}</span><small class="muted">${new Date(n.date).toLocaleString('id-ID')}</small></div>
        `).join('') || '<p class="muted">Belum ada notifikasi.</p>'}
      </div>
    `;
  }

  if (tab === 'orders') {
    return `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">📦 Semua Pesanan (${orders.length})</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order ID</th><th>Pembeli</th><th>Total</th><th>Bayar</th><th>Status</th><th>Antrian</th><th></th></tr></thead>
            <tbody>
              ${orders.slice().reverse().map(o => `
                <tr>
                  <td>${o.orderId}</td>
                  <td>${o.buyerName}<br><small class="muted">${o.buyerWa}</small></td>
                  <td>${rupiah(o.total)}</td>
                  <td><span class="status-chip ${payStatusChip(o.paymentStatus).cls}">${o.paymentStatus}</span></td>
                  <td><span class="status-chip ${orderStatusChip(o.orderStatus).cls}">${o.orderStatus}</span></td>
                  <td>#${String(o.queueNumber).padStart(2, '0')}</td>
                  <td><button class="btn btn-outline btn-sm" onclick="navigate('order-detail',{detailId:'${o.id}'})">Detail</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${!orders.length ? '<p class="muted text-center mt-16">Belum ada pesanan 💗</p>' : ''}
      </div>
    `;
  }

  if (tab === 'products') {
    return `
      <button class="btn btn-primary mb-16" onclick="addProductForm()">➕ Tambah Produk</button>
      <div class="admin-panel">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Produk</th><th>Harga</th><th>Satuan</th><th>Stok</th><th>Kategori</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>${p.emoji} ${p.name}</td>
                  <td>${rupiah(p.price)}</td>
                  <td>${p.unit}</td>
                  <td>${p.isService ? '∞ (jasa)' : p.stock}</td>
                  <td>${p.category}</td>
                  <td>${p.active ? '<span class="status-chip st-paid">Aktif</span>' : '<span class="status-chip st-cancel">Nonaktif</span>'}</td>
                  <td style="display:flex;gap:6px;">
                    <button class="btn btn-outline btn-sm" onclick="editProductForm('${p.id}')">✏️</button>
                    <button class="btn btn-outline btn-sm" onclick="stockForm('${p.id}')">📦</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (tab === 'stocks') {
    return `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">📦 Manajemen Stok</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Produk</th><th>Stok</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${products.map(p => {
                const st = stockStatus(p);
                return `
                  <tr>
                    <td>${p.emoji} ${p.name}</td>
                    <td>${p.isService ? '∞ (jasa)' : p.stock}</td>
                    <td><span class="stock-tag ${st.cls}">${st.text}</span></td>
                    <td>
                      ${p.isService ? '<span class="muted">Jasa tidak pakai stok fisik</span>' : `
                        <button class="btn btn-outline btn-sm" onclick="adjustStock('${p.id}',-1)">−</button>
                        <button class="btn btn-primary btn-sm" onclick="adjustStock('${p.id}',1)">+</button>
                        <button class="btn btn-outline btn-sm" onclick="stockForm('${p.id}')">Edit</button>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (tab === 'payments') {
    return `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">💳 Verifikasi Pembayaran</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order ID</th><th>Pembeli</th><th>Metode</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${orders.slice().reverse().map(o => `
                <tr>
                  <td>${o.orderId}</td>
                  <td>${o.buyerName}</td>
                  <td>${o.paymentMethod}</td>
                  <td>${rupiah(o.total)}</td>
                  <td><span class="status-chip ${payStatusChip(o.paymentStatus).cls}">${o.paymentStatus}</span></td>
                  <td>
                    ${o.paymentStatus === 'Menunggu Verifikasi' ? `<button class="btn btn-primary btn-sm" onclick="verifyPayment('${o.id}')">✅ Verifikasi</button>` : `<button class="btn btn-outline btn-sm" onclick="navigate('order-detail',{detailId:'${o.id}'})">Detail</button>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (tab === 'files') {
    const fileOrders = orders.filter(o => o.files && o.files.length);
    return `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">📁 File Jasa Daftar Pustaka</h3>
        ${fileOrders.length ? fileOrders.slice().reverse().map(o => `
          <div class="admin-panel" style="border-style:dashed;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
              <div>
                <b style="color:var(--pink-dark);">${o.orderId}</b>
                <div class="muted" style="font-size:.85rem;">${o.buyerName} • ${o.buyerWa}</div>
                ${o.deadline ? `<div class="muted" style="font-size:.82rem;">Deadline: ${o.deadline}</div>` : ''}
              </div>
              <button class="btn btn-outline btn-sm" onclick="navigate('order-detail',{detailId:'${o.id}'})">Kelola Pesanan</button>
            </div>
            <div class="file-list">
              ${o.files.map((f, i) => `
                <div class="file-item">
                  <span>📎</span>
                  <div class="name">
                    <div>${f.name}</div>
                    <div class="meta">${(f.size / 1024).toFixed(0)} KB</div>
                  </div>
                  ${f.data ? `<button onclick="viewOrderFile('${o.id}',${i})">Lihat</button>
                  <a class="btn btn-ghost btn-sm" style="padding:4px 8px;font-size:.78rem;" download="${f.name}" href="${f.data}">Download</a>` : ''}
                </div>
              `).join('')}
            </div>
            ${o.resultFile ? `<div class="mt-16"><span class="tag-soft">✅ Hasil: ${o.resultFile}</span></div>` : ''}
          </div>
        `).join('') : '<p class="muted text-center">Belum ada file yang di-upload.</p>'}
      </div>
    `;
  }

  if (tab === 'queue') {
    return `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">🔢 Antrian Pesanan</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order ID</th><th>Pembeli</th><th>Antrian</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${orders.slice().sort((a, b) => a.queueNumber - b.queueNumber).map(o => `
                <tr>
                  <td>${o.orderId}</td>
                  <td>${o.buyerName}</td>
                  <td><b>#${String(o.queueNumber).padStart(2, '0')}</b></td>
                  <td><span class="status-chip ${orderStatusChip(o.orderStatus).cls}">${o.orderStatus}</span></td>
                  <td><button class="btn btn-outline btn-sm" onclick="editQueue('${o.id}')">Ubah</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (tab === 'ratings') {
    return `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">⭐ Rating & Review (${ratings.length})</h3>
        ${ratings.length ? ratings.slice().reverse().map(r => {
          const u = users.find(x => x.id === r.userId);
          return `
            <div class="review-card mb-16">
              <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
              <p style="margin:8px 0;">${r.review || '(tanpa review)'}</p>
              <small class="muted">— ${u ? u.name : 'User'} • Order ${r.orderId} • ${new Date(r.date).toLocaleDateString('id-ID')}</small>
            </div>
          `;
        }).join('') : '<p class="muted text-center">Belum ada rating.</p>'}
      </div>
    `;
  }

  if (tab === 'notifications') {
    const all = DB.get('notifications', []).filter(n => n.userId === 'admin');
    return `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">🔔 Notifikasi Admin</h3>
        ${all.length ? all.slice().reverse().map(n => `
          <div class="pay-info-row">
            <span>${n.message}</span>
            <small class="muted">${new Date(n.date).toLocaleString('id-ID')}</small>
          </div>
        `).join('') : '<p class="muted text-center">Belum ada notifikasi.</p>'}
      </div>
    `;
  }

  if (tab === 'users') {
    return `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">👥 Pengguna (${users.length})</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nama</th><th>Email</th><th>WhatsApp</th><th>Role</th><th>Pesanan</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>${u.name}</td>
                  <td>${u.email}</td>
                  <td>${u.wa || '-'}</td>
                  <td><span class="tag-soft">${u.role}</span></td>
                  <td>${orders.filter(o => o.userId === u.id).length}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (tab === 'settings') {
    return `
      <div class="admin-panel">
        <h3 style="margin-bottom:12px;">⚙️ Pengaturan Toko</h3>
        <div class="form-grid">
          <div class="field"><label>Nama Toko</label><input id="set-name" value="${s.storeName}"></div>
          <div class="field"><label>Quote</label><input id="set-quote" value="${s.quote}"></div>
          <div class="field full"><label>Tagline</label><input id="set-tag" value="${s.tagline}"></div>
          <div class="field"><label>WhatsApp Admin</label><input id="set-wa" value="${s.whatsapp}"></div>
          <div class="field"><label>Email</label><input id="set-email" value="${s.email}"></div>
          <div class="field"><label>Instagram</label><input id="set-ig" value="${s.instagram}"></div>
          <div class="field"><label>TikTok</label><input id="set-tt" value="${s.tiktok}"></div>
          <div class="field full"><label>URL QRIS</label><input id="set-qris" value="${s.qris}"></div>
        </div>
        <div class="divider"></div>
        <h3 style="margin-bottom:12px;">🏦 Bank Transfer</h3>
        <div class="form-grid">
          <div class="field"><label>Nama Bank</label><input id="set-bank" value="${s.bank.name}"></div>
          <div class="field"><label>No. Rekening</label><input id="set-bank-num" value="${s.bank.number}"></div>
          <div class="field full"><label>Atas Nama</label><input id="set-bank-holder" value="${s.bank.holder}"></div>
        </div>
        <div class="divider"></div>
        <h3 style="margin-bottom:12px;">🔢 Virtual Account</h3>
        <div class="form-grid">
          <div class="field"><label>Bank VA</label><input id="set-va-bank" value="${s.va.bank}"></div>
          <div class="field"><label>Nomor VA</label><input id="set-va-num" value="${s.va.number}"></div>
        </div>
        <div class="divider"></div>
        <h3 style="margin-bottom:12px;">📱 E-Wallet</h3>
        <div class="form-grid">
          <div class="field"><label>GoPay</label><input id="set-gopay" value="${s.gopay}"></div>
          <div class="field"><label>OVO</label><input id="set-ovo" value="${s.ovo}"></div>
          <div class="field"><label>DANA</label><input id="set-dana" value="${s.dana}"></div>
          <div class="field"><label>ShopeePay</label><input id="set-sp" value="${s.shopeepay}"></div>
          <div class="field"><label>LinkAja</label><input id="set-la" value="${s.linkaja}"></div>
          <div class="field"><label>Mobile Banking</label><input id="set-mb" value="${s.mobileBanking}"></div>
          <div class="field full"><label>Lainnya</label><input id="set-other" value="${s.other}"></div>
        </div>
        <div class="divider"></div>
        <h3 style="margin-bottom:12px;">⏰ Kapasitas Jasa per Jam</h3>
        <div class="field"><label>Kapasitas per jam slot</label><input id="set-capacity" type="number" value="${s.hourlyCapacity}"></div>
        <button class="btn btn-primary btn-full mt-16" onclick="saveSettings()">💾 Simpan Pengaturan</button>
      </div>
    `;
  }

  return '<p>Tab tidak ditemukan</p>';
}

function adjustStock(id, delta) {
  const products = DB.get('products', []);
  const p = products.find(x => x.id === id);
  if (!p || p.isService) return;
  const next = p.stock + delta;
  if (next < 0) return toast('Stok tidak bisa negatif', 'error');
  p.stock = next;
  DB.set('products', products);
  if (p.stock <= 5 && p.stock > 0) addNotification('admin', 'low_stock', `⚠️ Stok ${p.name} hampir habis (${p.stock})`);
  if (p.stock <= 0) addNotification('admin', 'out_stock', `🚫 Stok ${p.name} habis!`);
  toast(`Stok ${p.name}: ${p.stock}`, 'success');
  render();
}

function saveSettings() {
  const s = DB.get('settings');
  s.storeName = $('set-name').value;
  s.quote = $('set-quote').value;
  s.tagline = $('set-tag').value;
  s.whatsapp = $('set-wa').value;
  s.email = $('set-email').value;
  s.instagram = $('set-ig').value;
  s.tiktok = $('set-tt').value;
  s.qris = $('set-qris').value;
  s.bank = { name: $('set-bank').value, number: $('set-bank-num').value, holder: $('set-bank-holder').value };
  s.va = { bank: $('set-va-bank').value, number: $('set-va-num').value };
  s.gopay = $('set-gopay').value;
  s.ovo = $('set-ovo').value;
  s.dana = $('set-dana').value;
  s.shopeepay = $('set-sp').value;
  s.linkaja = $('set-la').value;
  s.mobileBanking = $('set-mb').value;
  s.other = $('set-other').value;
  s.hourlyCapacity = Number($('set-capacity').value) || 3;
  DB.set('settings', s);
  toast('Pengaturan disimpan 💗', 'success');
}

// ========== PRODUCT CRUD ==========
function addProductForm() {
  const html = `
    <div class="modal" id="prod-modal">
      <div class="modal-box">
        <button class="close-x" onclick="closeModal('prod-modal')">✕</button>
        <h3>➕ Tambah Produk</h3>
        <div class="form-grid">
          <div class="field"><label>Nama</label><input id="p-name"></div>
          <div class="field"><label>Emoji</label><input id="p-emoji" value="📦"></div>
          <div class="field"><label>Harga</label><input id="p-price" type="number" value="3000"></div>
          <div class="field"><label>Satuan</label><input id="p-unit" value="1 biji"></div>
          <div class="field"><label>Kelipatan</label><input id="p-step" type="number" value="1"></div>
          <div class="field"><label>Stok</label><input id="p-stock" type="number" value="10"></div>
          <div class="field"><label>Kategori</label><input id="p-cat" value="Alat Tulis"></div>
          <div class="field full"><label>Deskripsi</label><textarea id="p-desc"></textarea></div>
        </div>
        <button class="btn btn-primary btn-full mt-16" onclick="saveNewProduct()">Simpan</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveNewProduct() {
  const products = DB.get('products', []);
  products.push({
    id: 'p_' + Date.now(),
    name: $('p-name').value || 'Produk Baru',
    emoji: $('p-emoji').value || '📦',
    price: Number($('p-price').value) || 0,
    unit: $('p-unit').value || '1 biji',
    step: Number($('p-step').value) || 1,
    minQty: Number($('p-step').value) || 1,
    stock: Number($('p-stock').value) || 0,
    category: $('p-cat').value || 'Lainnya',
    desc: $('p-desc').value || '',
    active: true,
    isService: false
  });
  DB.set('products', products);
  closeModal('prod-modal');
  toast('Produk ditambahkan 💗', 'success');
  render();
}

function editProductForm(id) {
  const p = DB.get('products', []).find(x => x.id === id);
  const html = `
    <div class="modal" id="prod-modal">
      <div class="modal-box">
        <button class="close-x" onclick="closeModal('prod-modal')">✕</button>
        <h3>✏️ Edit Produk</h3>
        <div class="form-grid">
          <div class="field"><label>Nama</label><input id="ep-name" value="${p.name}"></div>
          <div class="field"><label>Emoji</label><input id="ep-emoji" value="${p.emoji}"></div>
          <div class="field"><label>Harga</label><input id="ep-price" type="number" value="${p.price}"></div>
          <div class="field"><label>Satuan</label><input id="ep-unit" value="${p.unit}"></div>
          <div class="field"><label>Kelipatan</label><input id="ep-step" type="number" value="${p.step}"></div>
          <div class="field"><label>Stok</label><input id="ep-stock" type="number" value="${p.stock}"></div>
          <div class="field"><label>Kategori</label><input id="ep-cat" value="${p.category}"></div>
          <div class="field full"><label>Deskripsi</label><textarea id="ep-desc">${p.desc}</textarea></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button class="btn btn-outline" style="flex:1;" onclick="closeModal('prod-modal')">Batal</button>
          <button class="btn btn-primary" style="flex:1;" onclick="saveEditProduct('${id}')">Simpan</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveEditProduct(id) {
  const products = DB.get('products', []);
  const p = products.find(x => x.id === id);
  p.name = $('ep-name').value;
  p.emoji = $('ep-emoji').value;
  p.price = Number($('ep-price').value);
  p.unit = $('ep-unit').value;
  p.step = Number($('ep-step').value);
  p.minQty = Number($('ep-step').value);
  p.stock = Number($('ep-stock').value);
  p.category = $('ep-cat').value;
  p.desc = $('ep-desc').value;
  DB.set('products', products);
  closeModal('prod-modal');
  toast('Produk diperbarui ✨', 'success');
  render();
}

function stockForm(id) {
  const p = DB.get('products', []).find(x => x.id === id);
  const html = `
    <div class="modal" id="prod-modal">
      <div class="modal-box">
        <button class="close-x" onclick="closeModal('prod-modal')">✕</button>
        <h3>📦 Kelola Stok</h3>
        <p class="muted mb-16">${p.emoji} ${p.name}</p>
        <div class="field"><label>Stok Saat Ini</label><input id="sk-val" type="number" value="${p.stock}"></div>
        <button class="btn btn-primary btn-full mt-16" onclick="saveStock('${id}')">Simpan</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveStock(id) {
  const products = DB.get('products', []);
  const p = products.find(x => x.id === id);
  p.stock = Number($('sk-val').value) || 0;
  DB.set('products', products);
  closeModal('prod-modal');
  toast('Stok diperbarui 📦', 'success');
  render();
}

function deleteProduct(id) {
  confirmDialog('Hapus Produk', 'Apakah kamu yakin ingin menghapus produk ini?', () => {
    const products = DB.get('products', []).filter(x => x.id !== id);
    DB.set('products', products);
    toast('Produk dihapus', 'info');
    render();
  });
}

function closeModal(id) {
  const m = $(id);
  if (m) m.remove();
}

// ========== NOTIF ==========
function addNotification(userId, type, message) {
  const n = DB.get('notifications', []);
  n.push({ id: 'n_' + Date.now() + Math.random(), userId, type, message, read: false, date: Date.now() });
  DB.set('notifications', n);
}

// ========== AUTH ==========
function openAuth() {
  $('auth-modal').classList.remove('hidden');
  switchAuthTab('login');
}
function closeAuth() { $('auth-modal').classList.add('hidden'); }
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  $('login-form').classList.toggle('hidden', tab !== 'login');
  $('register-form').classList.toggle('hidden', tab !== 'register');
}

function doLogin() {
  const email = $('login-email').value.trim();
  const pass = $('login-password').value;
  const users = DB.get('users', []);
  const u = users.find(x => x.email === email && x.password === pass);
  if (!u) return toast('Email atau password salah', 'error');
  DB.set('session', { userId: u.id, at: Date.now() });
  closeAuth();
  toast(`Selamat datang, ${u.name}! 💗`, 'success');
  updateAuthUI();
  if (u.role === 'admin') navigate('admin');
  else navigate('home');
}

function doRegister() {
  const name = $('reg-name').value.trim();
  const email = $('reg-email').value.trim();
  const wa = $('reg-wa').value.trim();
  const pass = $('reg-password').value;
  const pass2 = $('reg-password2').value;
  if (!name || !email || !wa || !pass) return toast('Lengkapi semua data', 'error');
  if (pass !== pass2) return toast('Konfirmasi password tidak cocok', 'error');
  if (pass.length < 4) return toast('Password minimal 4 karakter', 'error');
  const users = DB.get('users', []);
  if (users.find(x => x.email === email)) return toast('Email sudah terdaftar', 'error');
  const u = { id: 'u_' + Date.now(), name, email, wa, password: pass, role: 'buyer' };
  users.push(u);
  DB.set('users', users);
  DB.set('session', { userId: u.id, at: Date.now() });
  closeAuth();
  toast(`Akun berhasil dibuat! Selamat datang ${name} 💗`, 'success');
  updateAuthUI();
  navigate('home');
}

function doLogout() {
  confirmDialog('Logout', 'Apakah kamu yakin ingin keluar?', () => {
    DB.set('session', null);
    updateAuthUI();
    navigate('home');
    toast('Kamu sudah logout 👋', 'info');
  });
}

function updateAuthUI() {
  const u = getUser();
  const loginBtn = $('login-btn');
  const userBtn = $('user-btn');
  if (u) {
    loginBtn.classList.add('hidden');
    userBtn.classList.remove('hidden');
    userBtn.textContent = (u.role === 'admin' ? '👑 ' : '👤 ') + u.name.split(' ')[0];
  } else {
    loginBtn.classList.remove('hidden');
    userBtn.classList.add('hidden');
  }
}

// ========== FOOTER ==========
function renderFooter() {
  const s = DB.get('settings');
  $('footer').innerHTML = `
    <div class="footer-inner">
      <div>
        <h4>💗 ${s.storeName}</h4>
        <p>${s.tagline}</p>
        <p style="margin-top:10px;font-style:italic;">"Belajar sedikit demi sedikit, selesai satu per satu. 💗"</p>
      </div>
      <div>
        <h4>Menu</h4>
        <a onclick="navigate('home')">🏠 Beranda</a>
        <a onclick="navigate('shop')">🛍️ Jualan</a>
        <a onclick="navigate('cart')">🛒 Keranjang</a>
        <a onclick="navigate('orders')">📦 Pesanan</a>
        <a onclick="navigate('profile')">👤 Profil</a>
      </div>
      <div>
        <h4>Bantuan</h4>
        <a onclick="chatWA()">📱 WhatsApp Admin</a>
        <a onclick="navigate('detail',{detailId:'p4'})">📚 Info Jasa Daftar Pustaka</a>
        <a onclick="alert('Cara pesan:\\n1. Pilih produk\\n2. Tambah ke keranjang\\n3. Checkout\\n4. Bayar\\n5. Lacak pesanan')">ℹ️ Cara Pemesanan</a>
      </div>
      <div>
        <h4>Ikuti Kami</h4>
        <a onclick="openLink('${s.instagram}')">📷 Instagram</a>
        <a onclick="openLink('${s.tiktok}')">🎵 TikTok</a>
        <a onclick="chatWA()">💬 WhatsApp</a>
        <a onclick="openLink('mailto:${s.email}')">✉️ ${s.email}</a>
      </div>
    </div>
    <div class="footer-copy">
      © ${new Date().getFullYear()} ${s.storeName} 💗 Dibuat dengan cinta untuk pembelajar Indonesia.
    </div>
  `;
}

function openLink(url) {
  if (!url) return toast('Link belum diatur', 'error');
  if (url.startsWith('mailto:')) window.location.href = url;
  else window.open(url, '_blank');
}

function chatWA() {
  const s = DB.get('settings');
  const msg = encodeURIComponent('Halo Admin PinkyStudy 💗, saya butuh bantuan.');
  window.open(`https://wa.me/${s.whatsapp}?text=${msg}`, '_blank');
}

// ========== INIT ==========
window.addEventListener('DOMContentLoaded', () => {
  const gs = $('global-search');
  if (gs) {
    gs.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        const q = gs.value.trim().toLowerCase();
        if (!q) return;
        const prods = DB.get('products', []).filter(p => p.active && (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
        navigate('shop');
        setTimeout(() => {
          const grid = $('shop-grid');
          if (grid) grid.innerHTML = prods.length ? prods.map(p => productCardHTML(p)).join('') : `<div class="empty-state" style="grid-column:1/-1;"><span class="big">🔍</span><h3>Tidak ditemukan</h3><p>Coba kata kunci lain ya 💗</p></div>`;
        }, 50);
      }
    });
  }
  updateAuthUI();
  render();
  renderFooter();
  updateCartBadge();
});
