import { useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { HardDrive, Menu, Monitor, Search, UserRound, X } from "lucide-react";
import { auth, db } from "./firebase";

type Part = {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
};

const parts: Part[] = [
  { id: 1, name: "AMD Ryzen 7", category: "Процессоры", price: 28990, image: "/images/processors/10images.jpg", description: "Для игровых и рабочих сборок" },
  { id: 2, name: "Intel Core", category: "Процессоры", price: 24990, image: "/images/processors/9images.jpg", description: "Процессор для повседневных задач" },
  { id: 3, name: "Материнская плата ATX", category: "Материнские платы", price: 18990, image: "/images/motherboards/12images.jpg", description: "Формат ATX" },
  { id: 4, name: "Видеокарта GeForce", category: "Видеокарты", price: 69990, image: "/images/gpu/22images.jpg", description: "Для современных игр" },
  { id: 5, name: "Оперативная память DDR5", category: "Оперативная память", price: 11990, image: "/images/ram/1images.jpg", description: "Комплект модулей памяти" },
  { id: 6, name: "SSD M.2", category: "Накопители", price: 7990, image: "/images/storage/17images.jpg", description: "Быстрый накопитель" },
  { id: 7, name: "Корпус с боковым стеклом", category: "Корпуса", price: 9990, image: "/images/cases/18images.jpg", description: "Тёмный корпус для игровой сборки" },
  { id: 8, name: "Блок питания", category: "Блоки питания", price: 10990, image: "/images/psu/3images.jpg", description: "Питание для комплектующих" },
  { id: 9, name: "Система охлаждения", category: "Охлаждение", price: 8990, image: "/images/cooling/20images.jpg", description: "Охлаждение процессора" },
];

const categories = ["Все", ...Array.from(new Set(parts.map((part) => part.category)))];
const money = (value: number) => `${value.toLocaleString("ru-RU")} ₽`;

export default function App() {
  const [page, setPage] = useState("Главная");
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authMessage, setAuthMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedBuilds, setSavedBuilds] = useState<Array<{ id: string; partNames: string[]; total: number }>>([]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setSavedBuilds([]);
      return;
    }
    const buildsQuery = query(collection(db, "users", user.uid, "builds"), orderBy("createdAt", "desc"));
    return onSnapshot(buildsQuery, (snapshot) => {
      setSavedBuilds(snapshot.docs.map((item) => {
        const data = item.data();
        return { id: item.id, partNames: Array.isArray(data.partNames) ? data.partNames : [], total: Number(data.total) || 0 };
      }));
    }, (error) => setAuthMessage(`Не удалось загрузить сборки: ${error.message}`));
  }, [user]);

  const filteredParts = useMemo(() => parts.filter((part) => {
    const categoryOk = category === "Все" || part.category === category;
    const searchOk = part.name.toLowerCase().includes(search.toLowerCase());
    return categoryOk && searchOk;
  }), [category, search]);

  const total = parts.filter((part) => selected.includes(part.id)).reduce((sum, part) => sum + part.price, 0);

  function togglePart(id: number) {
    setSelected((old) => old.includes(id) ? old.filter((item) => item !== id) : [...old, id]);
  }

  function useBuild(ids: number[]) {
    setSelected(ids);
    setPage("Конфигуратор");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAuth() {
    setAuthMessage("");
    try {
      if (authMode === "register") await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
      setAuthMessage(authMode === "register" ? "Аккаунт создан." : "Вход выполнен.");
    } catch (error) {
      const code = (error as { code?: string }).code;
      const messages: Record<string, string> = {
        "auth/email-already-in-use": "Этот адрес уже зарегистрирован. Попробуй войти.",
        "auth/invalid-email": "Проверь адрес электронной почты.",
        "auth/weak-password": "Пароль слишком простой. Используй не менее 6 символов.",
        "auth/invalid-credential": "Неверная почта или пароль.",
        "auth/too-many-requests": "Слишком много попыток. Попробуй позже.",
        "auth/operation-not-allowed": "В Firebase Console не включён вход по Email/Password.",
      };
      setAuthMessage(messages[code || ""] || `Ошибка авторизации: ${(error as Error).message}`);
    }
  }

  async function saveBuild() {
    if (!user || selected.length === 0) return;
    setSaving(true);
    setAuthMessage("");
    try {
      const chosen = parts.filter((part) => selected.includes(part.id));
      await addDoc(collection(db, "users", user.uid, "builds"), {
        partIds: chosen.map((part) => part.id),
        partNames: chosen.map((part) => part.name),
        total,
        createdAt: serverTimestamp(),
      });
      setAuthMessage("Сборка успешно сохранена.");
    } catch (error) {
      setAuthMessage(`Не удалось сохранить сборку: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage("Главная"); }}>PCFORGE</a>
        <button className="mobile-toggle" aria-label="Открыть меню" onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={mobileMenu ? "nav nav-open" : "nav"}>
          {["Главная", "Каталог", "Конфигуратор", "Профиль"].map((item) => (
            <button key={item} className={page === item ? "nav-link active" : "nav-link"} onClick={() => { setPage(item); setMobileMenu(false); }}>
              {item}
            </button>
          ))}
        </nav>
      </header>

      <main className="main-content">
        {page === "Главная" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">КОНСТРУКТОР КОМПЬЮТЕРА</p>
                <h1>Собери свой ПК</h1>
                <p>Выбирай комплектующие, проверяй совместимость и рассчитывай стоимость своей сборки.</p>
                <button className="button button-red" onClick={() => setPage("Конфигуратор")}>Открыть конфигуратор</button>
              </div>
                <img className="hero-image" src="/images/cases/19images.jpg" alt="Игровой компьютер" />
            </section>
            <section className="section">
              <div className="section-heading">
                <div><h2>Готовые сборки</h2><p>Можно взять за основу и изменить под себя</p></div>
              </div>
              <div className="build-grid">
                {[
                  { name: "GAMER", info: "Для игр в Full HD", price: 129990, ids: [1, 3, 4, 5, 6, 7, 8, 9] },
                  { name: "PRO", info: "Для игр и работы", price: 179990, ids: [1, 3, 4, 5, 6, 7, 8, 9] },
                  { name: "ULTRA", info: "Мощная игровая сборка", price: 299990, ids: [1, 3, 4, 5, 6, 7, 8, 9] },
                ].map((build) => (
                  <article className="build-card" key={build.name}>
                    <div className="build-card-top"><span className="build-label">{build.name}</span><Monitor size={19} /></div>
                    <p>{build.info}</p>
                    <strong className="price">{money(build.price)}</strong>
                    <button className="button button-red" onClick={() => useBuild(build.ids)}>Использовать</button>
                  </article>
                ))}
              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <div><h2>Популярные комплектующие</h2><p>Несколько товаров для начала сборки</p></div>
                <button className="button button-plain" onClick={() => setPage("Каталог")}>Весь каталог</button>
              </div>
              <ProductGrid items={parts.slice(0, 4)} togglePart={togglePart} selected={selected} />
            </section>
          </>
        )}

        {page === "Каталог" && (
          <section className="section page-section">
            <div className="page-title"><div><p className="eyebrow">КОМПЛЕКТУЮЩИЕ</p><h1>Каталог</h1><p>Выбери детали для своего компьютера.</p></div><span className="catalog-count">{filteredParts.length} товаров</span></div>
            <label className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск комплектующих..." /></label>
            <div className="category-list">{categories.map((item) => <button key={item} className={category === item ? "category-chip selected" : "category-chip"} onClick={() => setCategory(item)}>{item}</button>)}</div>
            <ProductGrid items={filteredParts} togglePart={togglePart} selected={selected} />
          </section>
        )}

        {page === "Конфигуратор" && (
          <section className="section page-section">
            <div className="page-title"><div><p className="eyebrow">СБОРКА КОМПЬЮТЕРА</p><h1>Конфигуратор</h1><p>Добавляй нужные комплектующие и следи за стоимостью.</p></div></div>
            <div className="builder-layout">
              <div className="builder-parts">
                {parts.map((part) => (
                  <article className="builder-row" key={part.id}>
                    <img src={part.image} alt={part.name} />
                    <div className="builder-info"><span className="muted">{part.category}</span><strong>{part.name}</strong><span className="muted">{part.description}</span></div>
                    <strong className="price">{money(part.price)}</strong>
                    <button className={selected.includes(part.id) ? "button button-selected" : "button button-red"} onClick={() => togglePart(part.id)}>{selected.includes(part.id) ? "Убрать" : "Добавить"}</button>
                  </article>
                ))}
              </div>
              <aside className="summary-card">
                <h2>Твоя сборка</h2>
                <p>{selected.length} комплектующих выбрано</p>
                <div className="summary-total"><span>Итого</span><strong>{money(total)}</strong></div>
                <button className="button button-red full-width" onClick={() => {
                  if (!user) {
                    setPage("Профиль");
                    setAuthMessage("Сначала войди в аккаунт или зарегистрируйся.");
                    return;
                  }
                  void saveBuild();
                }} disabled={saving || selected.length === 0}>{saving ? "Сохраняем..." : "Сохранить сборку"}</button>
                <p className="small-note">Сборка сохраняется в твой аккаунт Firebase.</p>
              </aside>
            </div>
          </section>
        )}

        {page === "Профиль" && (
          <section className="section page-section profile-section">
            <p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p><h1>Профиль</h1>
            {!user ? (
              <form className="auth-card" onSubmit={(event) => { event.preventDefault(); void submitAuth(); }}>
                <div className="profile-icon"><UserRound size={28} /></div>
                <h2>{authMode === "login" ? "Вход в аккаунт" : "Создание аккаунта"}</h2>
                <p className="muted">{authMode === "login" ? "Войди, чтобы сохранять свои сборки." : "Зарегистрируйся с помощью электронной почты."}</p>
                <label className="auth-label">Электронная почта<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></label>
                <label className="auth-label">Пароль<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Минимум 6 символов" minLength={6} required /></label>
                <button className="button button-red full-width" type="submit">{authMode === "login" ? "Войти" : "Зарегистрироваться"}</button>
                <button className="text-button" type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthMessage(""); }}>{authMode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}</button>
                {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
              </form>
            ) : (
              <>
                <div className="profile-card"><div className="profile-icon"><UserRound size={28} /></div><div><h2>Ты вошёл в PCFORGE</h2><p>{user.email}</p></div><button className="button button-plain" onClick={() => void signOut(auth)}>Выйти</button></div>
                {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
                <div className="saved-card"><h2>Текущая сборка</h2><p>{selected.length ? `Выбрано комплектующих: ${selected.length}` : "Пока нет выбранных комплектующих."}</p><strong className="price">{money(total)}</strong><button className="button button-red" disabled={saving || selected.length === 0} onClick={() => void saveBuild()}>{saving ? "Сохраняем..." : "Сохранить сборку"}</button><button className="button button-plain" onClick={() => setPage("Конфигуратор")}>Открыть конфигуратор</button></div>
                <div className="saved-list"><h2>Сохранённые сборки</h2>{savedBuilds.length === 0 ? <p className="muted">Пока нет сохранённых сборок.</p> : savedBuilds.map((build) => <article className="saved-build" key={build.id}><div><strong>{build.partNames.join(", ") || "Сборка ПК"}</strong><p>{build.partNames.length} комплектующих</p></div><strong className="price">{money(build.total)}</strong></article>)}</div>
              </>
            )}
          </section>
        )}
      </main>

      <footer className="footer"><span>PCFORGE</span><span>Учебный проект · 2026</span></footer>
    </div>
  );
}

function ProductGrid({ items, togglePart, selected }: { items: Part[]; togglePart: (id: number) => void; selected: number[] }) {
  if (items.length === 0) return <div className="empty-state"><HardDrive size={26} /><p>По такому запросу ничего не найдено.</p></div>;
  return (
    <div className="product-grid">
      {items.map((part) => (
        <article className="product-card" key={part.id}>
          <div className="product-image-wrap"><img src={part.image} alt={part.name} loading="lazy" /></div>
          <div className="product-card-body"><span className="muted">{part.category}</span><h3>{part.name}</h3><p>{part.description}</p><div className="product-card-bottom"><strong className="price">{money(part.price)}</strong><button className={selected.includes(part.id) ? "button button-selected" : "button button-red"} onClick={() => togglePart(part.id)}>{selected.includes(part.id) ? "Добавлено" : "Добавить"}</button></div></div>
        </article>
      ))}
    </div>
  );
}
