const roles = [
  { key: "customer", label: "Asiakas" },
  { key: "courier", label: "Lähetti" },
  { key: "merchant", label: "Ravintola" },
  { key: "admin", label: "Admin" },
];

const demoUsers = {
  customer: { email: "asiakas@demo.fi", password: "demo123", approved: true, name: "Demo Asiakas" },
  courier: { email: "lahetti@demo.fi", password: "demo123", approved: true, name: "Demo Lähetti" },
  merchant: { email: "ravintola@demo.fi", password: "demo123", approved: true, name: "Demo Ravintola" },
  admin: { email: "admin@demo.fi", password: "demo123", approved: true, name: "Demo Admin" },
};

const categories = ["Burgerit", "Pizza", "Salaatit", "Sushi", "Kahvilat", "Ruokakaupat", "Apteekit", "Jälkiruoat"];

const restaurants = [
  { id: 1, name: "Pizzapaja", eta: "20-30 min", rating: 4.7, fee: 2.9, min: 10, tags: ["Pizza", "Burgerit"], item: { name: "Pepperoni Pizza", price: 13.9 } },
  { id: 2, name: "Sushimo", eta: "15-25 min", rating: 4.9, fee: 0, min: 15, tags: ["Sushi"], item: { name: "Lohi Nigiri", price: 10.5 } },
  { id: 3, name: "Vihreä Kulho", eta: "10-20 min", rating: 4.5, fee: 1.9, min: 12, tags: ["Salaatit", "Vegaaninen"], item: { name: "Falafel Bowl", price: 11.2 } },
];

const state = {
  selectedRole: "customer",
  session: null,
  queue: [],
  cart: [],
  courierOnline: false,
  menu: [{ name: "Margherita", price: 11.9 }, { name: "Caesar Salaatti", price: 12.5 }],
  users: {},
  firebase: { ready: false, auth: null, db: null, fns: null, mode: "demo" },
};

const qs = (id) => document.getElementById(id);

(async function init() {
  loadDemoUsers();
  await initFirebase();
  await loadApprovals();
  renderRoleButtons();
  renderAuthPanels();
  renderCategories();
  renderRestaurants();
  renderCart();
  renderMenu();
  renderQueue();
  bindEvents();
  updateSessionUI();
})();

function loadDemoUsers() {
  const saved = JSON.parse(localStorage.getItem("registeredUsers") || "{}");
  state.users = { ...saved };

  Object.entries(demoUsers).forEach(([role, user]) => {
    if (!state.users[user.email]) {
      state.users[user.email] = {
        email: user.email,
        password: user.password,
        role,
        name: user.name,
        status: "approved",
      };
    }
  });

  localStorage.setItem("registeredUsers", JSON.stringify(state.users));
}

async function initFirebase() {
  const cfg = window.__FIREBASE_CONFIG__;
  const hasConfig = cfg && cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId;
  if (!hasConfig) return;

  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const {
      getAuth,
      signInWithEmailAndPassword,
      signInWithPopup,
      createUserWithEmailAndPassword,
      GoogleAuthProvider,
      OAuthProvider,
      signOut,
    } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const {
      getFirestore,
      addDoc,
      collection,
      getDocs,
      getDoc,
      updateDoc,
      doc,
      setDoc,
      serverTimestamp,
    } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

    const app = initializeApp(cfg);

    state.firebase = {
      ready: true,
      auth: getAuth(app),
      db: getFirestore(app),
      mode: "firebase",
      fns: {
        signInWithEmailAndPassword,
        signInWithPopup,
        createUserWithEmailAndPassword,
        GoogleAuthProvider,
        OAuthProvider,
        signOut,
        addDoc,
        collection,
        getDocs,
        getDoc,
        updateDoc,
        doc,
        setDoc,
        serverTimestamp,
      },
    };
  } catch (error) {
    console.error("Firebase init failed, fallback to demo mode", error);
  }
}

function renderRoleButtons() {
  qs("roleButtons").innerHTML = roles
    .map((role) => `<button class="role-btn ${state.selectedRole === role.key ? "active" : ""}" data-role="${role.key}">${role.label}</button>`)
    .join("");
}

function renderAuthPanels() {
  const role = roles.find((r) => r.key === state.selectedRole);
  qs("authPanels").innerHTML = `
    <div class="auth-panel">
      <h3>${role.label} kirjautuminen</h3>
      <p class="muted">Tila: ${state.firebase.mode === "firebase" ? "Firebase käytössä" : "Demo-tila (ei Firebase-configia)"}</p>
      <form id="loginForm">
        <label>Sähköposti
          <input required type="email" id="loginEmail" placeholder="nimi@demo.fi" />
        </label>
        <label>Salasana
          <input required type="password" id="loginPassword" placeholder="••••••" />
        </label>
        <button type="submit" class="primary">Kirjaudu ${role.label.toLowerCase()}na</button>
      </form>
      <div class="social-buttons">
        <button id="googleLoginBtn" type="button">Google login</button>
        <button id="appleLoginBtn" type="button">Apple login</button>
      </div>
      ${state.selectedRole !== "admin" ? `
      <details>
        <summary>Rekisteröidy ${role.label.toLowerCase()}ksi</summary>
        <form id="signupForm">
          <label>Nimi
            <input required id="signupName" />
          </label>
          <label>Sähköposti
            <input required id="signupEmail" type="email" />
          </label>
          <label>Salasana
            <input required id="signupPassword" type="password" minlength="6" />
          </label>
          <button type="submit">Luo tili</button>
        </form>
      </details>` : ""}
      <p class="muted">Demo-tunnukset: ${demoUsers[state.selectedRole].email} / demo123</p>
      <p id="authMessage" class="muted"></p>
    </div>`;

  qs("loginForm").addEventListener("submit", login);
  qs("googleLoginBtn").addEventListener("click", () => oauthLogin("google"));
  qs("appleLoginBtn").addEventListener("click", () => oauthLogin("apple"));

  const signup = qs("signupForm");
  if (signup) signup.addEventListener("submit", signupForRole);
}

async function login(event) {
  event.preventDefault();
  const email = qs("loginEmail").value.trim().toLowerCase();
  const password = qs("loginPassword").value;

  if (state.firebase.ready) {
    try {
      const { signInWithEmailAndPassword, getDoc, doc, signOut } = state.firebase.fns;
      const cred = await signInWithEmailAndPassword(state.firebase.auth, email, password);
      const profileSnap = await getDoc(doc(state.firebase.db, "profiles", cred.user.uid));

      if (!profileSnap.exists()) {
        await signOut(state.firebase.auth);
        qs("authMessage").textContent = "Profiilia ei löydy. Rekisteröidy ensin.";
        return;
      }

      const profile = profileSnap.data();
      if (profile.role !== state.selectedRole) {
        await signOut(state.firebase.auth);
        qs("authMessage").textContent = `Tämä tili kuuluu rooliin: ${profile.role}. Vaihda oikea rooli.`;
        return;
      }

      if (profile.status !== "approved") {
        await signOut(state.firebase.auth);
        qs("authMessage").textContent = "Tili odottaa adminin vahvistusta.";
        return;
      }

      state.session = { role: profile.role, email: cred.user.email, uid: cred.user.uid };
      qs("authMessage").textContent = "Firebase-kirjautuminen onnistui.";
      updateSessionUI();
      return;
    } catch (error) {
      qs("authMessage").textContent = `Firebase-kirjautuminen epäonnistui: ${error.message}`;
      return;
    }
  }

  const user = state.users[email];
  if (!user || user.password !== password || user.role !== state.selectedRole) {
    qs("authMessage").textContent = "Virheellinen tunnus/salasana tai väärä rooli.";
    return;
  }

  if (user.status !== "approved") {
    qs("authMessage").textContent = "Tili odottaa adminin vahvistusta.";
    return;
  }

  state.session = { role: user.role, email: user.email };
  qs("authMessage").textContent = "Kirjautuminen onnistui demo-tilassa.";
  updateSessionUI();
}

async function signupForRole(event) {
  event.preventDefault();
  if (state.selectedRole === "admin") {
    qs("authMessage").textContent = "Admin-tiliä ei voi rekisteröidä tästä näkymästä.";
    return;
  }

  const name = qs("signupName").value.trim();
  const email = qs("signupEmail").value.trim().toLowerCase();
  const password = qs("signupPassword").value;
  const requiresApproval = ["courier", "merchant"].includes(state.selectedRole);
  const status = requiresApproval ? "pending" : "approved";

  if (state.firebase.ready) {
    try {
      const { createUserWithEmailAndPassword, setDoc, doc, addDoc, collection, serverTimestamp } = state.firebase.fns;
      const cred = await createUserWithEmailAndPassword(state.firebase.auth, email, password);

      await setDoc(doc(state.firebase.db, "profiles", cred.user.uid), {
        uid: cred.user.uid,
        name,
        email,
        role: state.selectedRole,
        status,
        createdAt: serverTimestamp(),
      });

      if (requiresApproval) {
        await addDoc(collection(state.firebase.db, "approvals"), {
          uid: cred.user.uid,
          role: state.selectedRole,
          name,
          email,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }

      qs("authMessage").textContent = requiresApproval
        ? "Tili luotu. Odottaa adminin vahvistusta ennen kirjautumista."
        : "Asiakastili luotu. Voit kirjautua heti.";

      await state.firebase.fns.signOut(state.firebase.auth);
      await loadApprovals();
      renderQueue();
      event.target.reset();
      return;
    } catch (error) {
      qs("authMessage").textContent = `Rekisteröinti epäonnistui: ${error.message}`;
      return;
    }
  }

  if (state.users[email]) {
    qs("authMessage").textContent = "Sähköposti on jo käytössä.";
    return;
  }

  state.users[email] = {
    name,
    email,
    password,
    role: state.selectedRole,
    status,
  };
  localStorage.setItem("registeredUsers", JSON.stringify(state.users));

  if (requiresApproval) {
    state.queue.push({ id: crypto.randomUUID(), role: state.selectedRole, name, email, status: "pending" });
    localStorage.setItem("approvalQueue", JSON.stringify(state.queue));
  }

  qs("authMessage").textContent = requiresApproval
    ? "Tili luotu. Odottaa adminin vahvistusta ennen kirjautumista."
    : "Asiakastili luotu. Voit kirjautua heti.";

  await loadApprovals();
  renderQueue();
  event.target.reset();
}

async function oauthLogin(providerName) {
  if (!state.firebase.ready) {
    qs("authMessage").textContent = "OAuth vaatii Firebase-configin (firebase-config.js).";
    return;
  }

  try {
    const { signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut } = state.firebase.fns;
    const provider = providerName === "google" ? new GoogleAuthProvider() : new OAuthProvider("apple.com");
    const result = await signInWithPopup(state.firebase.auth, provider);
    const { getDoc, doc } = state.firebase.fns;
    const profileSnap = await getDoc(doc(state.firebase.db, "profiles", result.user.uid));

    if (!profileSnap.exists()) {
      await signOut(state.firebase.auth);
      qs("authMessage").textContent = "OAuth-tilille ei löytynyt profiilia. Rekisteröidy ensin.";
      return;
    }

    const profile = profileSnap.data();
    if (profile.role !== state.selectedRole || profile.status !== "approved") {
      await signOut(state.firebase.auth);
      qs("authMessage").textContent = "Rooli ei täsmää tai tili odottaa adminin vahvistusta.";
      return;
    }

    state.session = { role: profile.role, email: result.user.email || "oauth-user", uid: result.user.uid };
    qs("authMessage").textContent = `${providerName === "google" ? "Google" : "Apple"} login onnistui.`;
    updateSessionUI();
  } catch (error) {
    qs("authMessage").textContent = `${providerName} login epäonnistui: ${error.message}`;
  }
}

function updateSessionUI() {
  const status = qs("sessionStatus");
  ["customerApp", "courierApp", "merchantApp", "adminApp"].forEach((id) => qs(id).classList.add("hidden"));

  if (!state.session) {
    status.textContent = "Ei kirjautunutta käyttäjää";
    return;
  }

  status.textContent = `Kirjautunut: ${state.session.email} (${state.session.role})`;
  if (state.session.role === "customer") qs("customerApp").classList.remove("hidden");
  if (state.session.role === "courier") qs("courierApp").classList.remove("hidden");
  if (state.session.role === "merchant") qs("merchantApp").classList.remove("hidden");
  if (state.session.role === "admin") qs("adminApp").classList.remove("hidden");
}

function bindEvents() {
  qs("roleButtons").addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-role]");
    if (!btn) return;
    state.selectedRole = btn.dataset.role;
    renderRoleButtons();
    renderAuthPanels();
  });

  qs("searchInput").addEventListener("input", renderRestaurants);
  qs("placeOrderBtn").addEventListener("click", placeOrder);
  qs("toggleOnlineBtn").addEventListener("click", toggleCourierOnline);
  qs("menuForm").addEventListener("submit", addMenuItem);
}

function renderCategories() {
  qs("categoryChips").innerHTML = categories.map((c) => `<span class="chip">${c}</span>`).join("");
}

function renderRestaurants() {
  const query = (qs("searchInput")?.value || "").toLowerCase();
  const filtered = restaurants.filter((r) => [r.name, ...r.tags, r.item.name].join(" ").toLowerCase().includes(query));

  qs("restaurantList").innerHTML = filtered
    .map(
      (r) => `<article class="restaurant">
      <header>
        <strong>${r.name}</strong>
        <span>⭐ ${r.rating}</span>
      </header>
      <div class="meta">${r.eta} • Toimitus ${formatEuro(r.fee)} • Min ${formatEuro(r.min)}</div>
      <div class="meta">Suositus: ${r.item.name} (${formatEuro(r.item.price)})</div>
      <button data-add="${r.id}">Lisää koriin</button>
    </article>`,
    )
    .join("");

  qs("restaurantList").querySelectorAll("button[data-add]").forEach((button) => {
    button.addEventListener("click", () => addToCart(Number(button.dataset.add)));
  });
}

function addToCart(restaurantId) {
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  state.cart.push({ ...restaurant.item, restaurant: restaurant.name, qty: 1 });
  renderCart();
}

function renderCart() {
  const grouped = new Map();
  state.cart.forEach((item) => {
    const key = `${item.restaurant}:${item.name}`;
    if (!grouped.has(key)) grouped.set(key, { ...item, qty: 0 });
    grouped.get(key).qty += item.qty;
  });

  const rows = Array.from(grouped.values());
  qs("cartList").innerHTML = rows.length
    ? rows.map((i) => `<li><strong>${i.name}</strong> (${i.restaurant}) x ${i.qty}<br><span class="muted">${formatEuro(i.price * i.qty)}</span></li>`).join("")
    : "<li>Kori on tyhjä.</li>";

  const subtotal = rows.reduce((sum, i) => sum + i.price * i.qty, 0);
  const delivery = subtotal > 0 ? 2.9 : 0;
  const service = subtotal > 0 ? 1.5 : 0;
  const discount = subtotal >= 30 ? 3 : 0;
  const total = subtotal + delivery + service - discount;

  qs("subtotal").textContent = formatEuro(subtotal);
  qs("deliveryFee").textContent = formatEuro(delivery);
  qs("serviceFee").textContent = formatEuro(service);
  qs("discount").textContent = `-${formatEuro(discount)}`;
  qs("total").textContent = formatEuro(total);
}

async function placeOrder() {
  if (!state.session || state.session.role !== "customer") {
    qs("orderMessage").textContent = "Kirjaudu asiakkaana ennen tilausta.";
    return;
  }

  if (!state.cart.length) {
    qs("orderMessage").textContent = "Lisää vähintään yksi tuote koriin.";
    return;
  }

  const orderPayload = {
    customerEmail: state.session.email,
    address: qs("addressInput").value.trim(),
    items: state.cart,
    total: qs("total").textContent,
    status: "received",
    createdAt: new Date().toISOString(),
  };

  if (state.firebase.ready) {
    const { addDoc, collection, serverTimestamp } = state.firebase.fns;
    await addDoc(collection(state.firebase.db, "orders"), { ...orderPayload, createdAt: serverTimestamp() });
  }

  qs("orderMessage").textContent = "Tilaus vastaanotettu. Simuloidaan live-seurantaa...";
  const timeline = qs("orderTimeline");
  timeline.classList.remove("hidden");
  const steps = [
    "Ravintola vastaanotti tilauksen",
    "Valmistetaan",
    "Lähetti matkalla ravintolaan",
    "Lähetti matkalla sinulle",
    "Toimitettu",
  ];
  timeline.innerHTML = steps.map((s) => `<div class="step">${s}</div>`).join("");

  [...timeline.children].forEach((step, index) => {
    setTimeout(() => step.classList.add("done"), (index + 1) * 900);
  });

  setTimeout(() => {
    state.cart = [];
    renderCart();
    qs("orderMessage").textContent = "Valmis! Tilauksen tekeminen onnistui alle 30 sekunnissa.";
  }, 5000);
}

function toggleCourierOnline() {
  state.courierOnline = !state.courierOnline;
  qs("courierState").textContent = `Tila: ${state.courierOnline ? "online" : "offline"}`;
  qs("toggleOnlineBtn").textContent = state.courierOnline ? "Siirry offline" : "Siirry online";
  renderCourierOrders();
}

function renderCourierOrders() {
  const list = qs("courierOrders");
  if (!state.courierOnline) {
    list.innerHTML = "<li>Ei aktiivisia pyyntöjä offline-tilassa.</li>";
    return;
  }
  list.innerHTML = "<li>Pizzapaja → Esimerkkikatu 1 (20 min) <button>Hyväksy</button></li>";
}

function renderMenu() {
  qs("menuList").innerHTML = state.menu.map((item) => `<li>${item.name} — ${formatEuro(item.price)}</li>`).join("");
}

function addMenuItem(event) {
  event.preventDefault();
  const name = qs("menuName").value.trim();
  const price = Number(qs("menuPrice").value);
  state.menu.push({ name, price });
  renderMenu();
  event.target.reset();
}

async function loadApprovals() {
  if (state.firebase.ready) {
    const { getDocs, collection } = state.firebase.fns;
    const snap = await getDocs(collection(state.firebase.db, "approvals"));
    state.queue = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return;
  }

  state.queue = JSON.parse(localStorage.getItem("approvalQueue") || "[]");
}

function renderQueue() {
  const queue = qs("approvalQueue");
  if (!state.queue.length) {
    queue.innerHTML = "<li>Ei odottavia hakemuksia.</li>";
    return;
  }

  queue.innerHTML = state.queue
    .map(
      (q) => `<li>
      <strong>${q.role}</strong> — ${q.name} (${q.email})
      <div class="muted">Status: ${q.status || "pending"}</div>
      <div class="approval-actions">
        <button data-approve="${q.id}" class="approve">Hyväksy</button>
        <button data-reject="${q.id}" class="reject">Hylkää</button>
      </div>
    </li>`,
    )
    .join("");

  queue.querySelectorAll("button[data-approve]").forEach((btn) => btn.addEventListener("click", () => updateApproval(btn.dataset.approve, "approved")));
  queue.querySelectorAll("button[data-reject]").forEach((btn) => btn.addEventListener("click", () => updateApproval(btn.dataset.reject, "rejected")));
}

async function updateApproval(id, status) {
  if (!state.session || state.session.role !== "admin") {
    alert("Vain admin voi hyväksyä/hylätä hakemuksia.");
    return;
  }

  if (state.firebase.ready) {
    const { updateDoc, doc } = state.firebase.fns;
    const item = state.queue.find((q) => q.id === id);

    await updateDoc(doc(state.firebase.db, "approvals", id), { status });
    if (item?.uid) {
      await updateDoc(doc(state.firebase.db, "profiles", item.uid), { status });
    }

    await loadApprovals();
    renderQueue();
    return;
  }

  const updatedItem = state.queue.find((q) => q.id === id);
  state.queue = state.queue.map((q) => (q.id === id ? { ...q, status } : q));
  localStorage.setItem("approvalQueue", JSON.stringify(state.queue));

  if (updatedItem?.email && state.users[updatedItem.email]) {
    state.users[updatedItem.email].status = status;
    localStorage.setItem("registeredUsers", JSON.stringify(state.users));
  }

  renderQueue();
}

function formatEuro(value) {
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(value);
}
