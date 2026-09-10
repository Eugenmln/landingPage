import {
  Camera,
  Check,
  Edit3,
  Instagram,
  Loader2,
  Lock,
  MessageCircle,
  Plus,
  Save,
  Shirt,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  deleteOutfit,
  deleteProduct,
  getStore,
  saveOutfit,
  saveProduct,
  saveSettings,
  uploadImage,
} from "./api";
import { categories, starterOutfits, starterProducts } from "./data";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const emptyProduct = {
  name: "",
  category: "Remeras",
  price: "",
  sizes: "S, M, L, XL",
  badge: "",
  image: "",
};

const emptyOutfit = {
  title: "",
  pieces: "",
  image: "",
};

export default function App() {
  const [products, setProducts] = useState(starterProducts);
  const [outfits, setOutfits] = useState(starterOutfits);
  const [settings, setSettings] = useState({
    phone: "5493764000000",
    instagram: "kenza.posadas",
  });
  const [category, setCategory] = useState("Todos");
  const [selection, setSelection] = useState([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [status, setStatus] = useState("Cargando vidriera...");

  useEffect(() => {
    getStore()
      .then((store) => {
        setProducts(store.products);
        setOutfits(store.outfits);
        setSettings(store.settings);
        setStatus("");
      })
      .catch(() => setStatus("Modo muestra: abrí el backend para guardar cambios reales."));
  }, []);

  const visibleProducts = useMemo(() => {
    return category === "Todos"
      ? products
      : products.filter((product) => product.category === category);
  }, [category, products]);

  const total = selection.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const whatsappUrl = makeWhatsappUrl(settings.phone, selection, total);

  function addProduct(product, size) {
    setSelection((items) => {
      const found = items.find((item) => item.id === product.id && item.size === size);
      if (found) {
        return items.map((item) =>
          item.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...items, { ...product, size, quantity: 1 }];
    });
    setOrderOpen(true);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-stone-50">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <a href="#inicio" className="flex items-center gap-3" aria-label="Kenza">
            <span className="grid size-11 place-items-center rounded-full bg-[#151111] ring-1 ring-[#d7673f]/50">
              <span className="text-xl font-black text-[#d7673f]">K</span>
            </span>
            <span>
              <span className="block text-lg font-black uppercase">Kenza</span>
              <span className="block text-xs uppercase tracking-[0.32em] text-stone-400">
                Mens Wear
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="hidden items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white sm:flex"
            >
              <Lock size={16} />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setOrderOpen(true)}
              className="relative grid size-11 place-items-center rounded-full bg-[#d7673f] text-neutral-950"
              aria-label="Ver pedido"
            >
              <ShoppingBag size={20} />
              {selection.length > 0 && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-white text-xs font-black">
                  {selection.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section id="inicio" className="relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1800&q=85"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-neutral-950/20" />
        <div className="relative mx-auto grid min-h-[72vh] max-w-7xl items-center gap-8 px-4 py-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d7673f]/40 bg-[#d7673f]/10 px-4 py-2 text-sm font-bold text-[#f19a73]">
              <Sparkles size={16} />
              Posadas, Misiones
            </p>
            <h1 className="text-5xl font-black uppercase leading-none sm:text-7xl lg:text-8xl">
              Kenza
              <span className="block text-[#d7673f]">Mens Wear</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-stone-300">
              Vidriera digital para mirar prendas, precios y outfits. El pedido se
              arma como selección y se consulta directo por WhatsApp.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#catalogo"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-black text-neutral-950"
              >
                <Shirt size={19} />
                Ver catálogo
              </a>
              <a
                href={`https://instagram.com/${settings.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 font-black text-white"
              >
                <Instagram size={19} />
                @{settings.instagram}
              </a>
            </div>
            {status && <p className="mt-4 text-sm text-stone-400">{status}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {products.slice(0, 4).map((product, index) => (
              <article
                key={product.id}
                className={`overflow-hidden rounded-[8px] border border-white/10 bg-white/5 ${
                  index === 1 ? "translate-y-7" : ""
                }`}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="aspect-[4/5] w-full object-cover"
                />
                <div className="p-3">
                  <p className="truncate text-sm font-black">{product.name}</p>
                  <p className="text-sm font-bold text-[#f19a73]">
                    {money.format(product.price)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#d7673f]">
              Catálogo
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">
              Prendas disponibles
            </h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${
                  category === item
                    ? "bg-[#d7673f] text-neutral-950"
                    : "border border-white/10 text-stone-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={addProduct} />
          ))}
        </div>
      </section>

      <section id="outfits" className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#d7673f]">
                Outfits
              </p>
              <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">
                Looks del local
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="grid size-11 place-items-center rounded-full border border-white/15 sm:hidden"
              aria-label="Cargar outfit"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {outfits.map((outfit) => (
              <article
                key={outfit.id}
                className="overflow-hidden rounded-[8px] border border-white/10 bg-neutral-900"
              >
                <img
                  src={outfit.image}
                  alt={outfit.title}
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="text-xl font-black">{outfit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{outfit.pieces}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-stone-400 md:flex-row md:items-center md:justify-between">
        <p>Kenza Mens Wear. Sin pagos online: la compra se coordina por WhatsApp.</p>
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          className="inline-flex items-center gap-2 font-bold text-stone-200"
        >
          <Lock size={15} />
          Admin
        </button>
      </footer>

      {orderOpen && (
        <OrderPanel
          items={selection}
          total={total}
          whatsappUrl={whatsappUrl}
          onClose={() => setOrderOpen(false)}
          onRemove={(id, size) =>
            setSelection((items) => items.filter((item) => item.id !== id || item.size !== size))
          }
          onQuantity={(id, size, quantity) =>
            setSelection((items) =>
              items.map((item) =>
                item.id === id && item.size === size
                  ? { ...item, quantity: Math.max(1, quantity) }
                  : item,
              ),
            )
          }
        />
      )}

      {adminOpen && (
        <AdminPanel
          products={products}
          outfits={outfits}
          settings={settings}
          onClose={() => setAdminOpen(false)}
          onProducts={setProducts}
          onOutfits={setOutfits}
          onSettings={setSettings}
        />
      )}
    </main>
  );
}

function ProductCard({ product, onAdd }) {
  const [size, setSize] = useState(product.sizes[0] || "Único");

  return (
    <article className="overflow-hidden rounded-[8px] border border-white/10 bg-neutral-900">
      <img src={product.image} alt={product.name} className="aspect-[4/5] w-full object-cover" />
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-stone-400">{product.category}</p>
            <h3 className="text-xl font-black">{product.name}</h3>
          </div>
          <p className="whitespace-nowrap text-lg font-black text-[#f19a73]">
            {money.format(product.price)}
          </p>
        </div>
        {product.badge && (
          <p className="inline-flex rounded-full bg-[#d7673f]/10 px-3 py-1 text-xs font-black uppercase text-[#f19a73]">
            {product.badge}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSize(item)}
              className={`min-w-11 rounded-full px-3 py-2 text-sm font-black ${
                size === item ? "bg-white text-neutral-950" : "border border-white/10 text-stone-300"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onAdd(product, size)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d7673f] px-4 py-3 font-black text-neutral-950"
        >
          <ShoppingBag size={18} />
          Agregar al pedido
        </button>
      </div>
    </article>
  );
}

function OrderPanel({ items, total, whatsappUrl, onClose, onRemove, onQuantity }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm">
      <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-neutral-950">
        <PanelHeader title="Pedido" subtitle="Consulta por WhatsApp" onClose={onClose} />
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-stone-400">
              <p>Agregá prendas para armar la consulta.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.id}-${item.size}`} className="flex gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] p-3">
                <img src={item.image} alt={item.name} className="size-20 rounded-[8px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-black">{item.name}</p>
                  <p className="text-sm text-stone-400">Talle {item.size}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => onQuantity(item.id, item.size, Number(event.target.value))}
                      className="w-16 rounded-[8px] border border-white/10 bg-neutral-900 px-2 py-1 text-sm"
                    />
                    <span className="font-black text-[#f19a73]">{money.format(item.price * item.quantity)}</span>
                  </div>
                </div>
                <button type="button" onClick={() => onRemove(item.id, item.size)} className="self-start text-stone-500">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="mb-4 flex items-center justify-between text-lg font-black">
            <span>Total estimado</span>
            <span>{money.format(total)}</span>
          </div>
          <a
            href={items.length ? whatsappUrl : undefined}
            target="_blank"
            rel="noreferrer"
            className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 font-black ${
              items.length ? "bg-[#25D366] text-neutral-950" : "pointer-events-none bg-white/10 text-stone-500"
            }`}
          >
            <MessageCircle size={20} />
            Enviar consulta
          </a>
        </div>
      </aside>
    </div>
  );
}

function AdminPanel({ products, outfits, settings, onProducts, onOutfits, onSettings, onClose }) {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState("products");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [outfitForm, setOutfitForm] = useState(emptyOutfit);
  const [settingsForm, setSettingsForm] = useState({ ...settings, adminPin: "" });

  async function run(action) {
    setSaving(true);
    setNotice("");
    try {
      await action();
      setNotice("Guardado.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function upload(file, update) {
    if (!file) return;
    await run(async () => {
      const result = await uploadImage(file, pin);
      update(result.url);
    });
  }

  function login(event) {
    event.preventDefault();
    setUnlocked(Boolean(pin.trim()));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-0 backdrop-blur-sm sm:p-4">
      <section className="mx-auto min-h-full max-w-5xl bg-neutral-950 sm:rounded-[8px] sm:border sm:border-white/10">
        <PanelHeader title="Admin" subtitle="Cargar prendas desde el celu" onClose={onClose} />

        {!unlocked ? (
          <form onSubmit={login} className="mx-auto max-w-sm space-y-4 p-5">
            <Field label="Clave admin" type="password" value={pin} onChange={setPin} placeholder="1234" />
            <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d7673f] px-4 py-4 font-black text-neutral-950">
              <Lock size={18} />
              Entrar
            </button>
          </form>
        ) : (
          <div className="p-4">
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-full bg-white/[0.04] p-1">
              {[
                ["products", "Prendas"],
                ["outfits", "Outfits"],
                ["settings", "Contacto"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-full px-3 py-3 text-sm font-black ${
                    tab === key ? "bg-white text-neutral-950" : "text-stone-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {notice && <p className="mb-4 rounded-[8px] border border-white/10 bg-white/[0.03] p-3 text-sm text-stone-300">{notice}</p>}

            {tab === "products" && (
              <div className="grid gap-5 lg:grid-cols-[0.85fr_1fr]">
                <ProductForm
                  form={productForm}
                  setForm={setProductForm}
                  saving={saving}
                  onUpload={(file) => upload(file, (image) => setProductForm((form) => ({ ...form, image })))}
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(async () => {
                      const saved = await saveProduct(productPayload(productForm), pin);
                      onProducts(productForm.id ? products.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...products]);
                      setProductForm(emptyProduct);
                    });
                  }}
                />
                <AdminList
                  items={products}
                  imageKey="image"
                  label={(item) => `${item.name} · ${money.format(item.price)}`}
                  onEdit={(item) => setProductForm({ ...item, sizes: item.sizes.join(", ") })}
                  onDelete={(id) =>
                    run(async () => {
                      await deleteProduct(id, pin);
                      onProducts(products.filter((item) => item.id !== id));
                    })
                  }
                />
              </div>
            )}

            {tab === "outfits" && (
              <div className="grid gap-5 lg:grid-cols-[0.85fr_1fr]">
                <OutfitForm
                  form={outfitForm}
                  setForm={setOutfitForm}
                  saving={saving}
                  onUpload={(file) => upload(file, (image) => setOutfitForm((form) => ({ ...form, image })))}
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(async () => {
                      const saved = await saveOutfit(outfitForm, pin);
                      onOutfits(outfitForm.id ? outfits.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...outfits]);
                      setOutfitForm(emptyOutfit);
                    });
                  }}
                />
                <AdminList
                  items={outfits}
                  imageKey="image"
                  label={(item) => item.title}
                  onEdit={setOutfitForm}
                  onDelete={(id) =>
                    run(async () => {
                      await deleteOutfit(id, pin);
                      onOutfits(outfits.filter((item) => item.id !== id));
                    })
                  }
                />
              </div>
            )}

            {tab === "settings" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  run(async () => {
                    const saved = await saveSettings(settingsForm, pin);
                    onSettings(saved);
                  });
                }}
                className="mx-auto grid max-w-lg gap-3"
              >
                <Field label="WhatsApp con código país" value={settingsForm.phone} onChange={(phone) => setSettingsForm({ ...settingsForm, phone })} />
                <Field label="Instagram" value={settingsForm.instagram} onChange={(instagram) => setSettingsForm({ ...settingsForm, instagram })} />
                <Field label="Nueva clave admin" value={settingsForm.adminPin} onChange={(adminPin) => setSettingsForm({ ...settingsForm, adminPin })} />
                <button className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-4 font-black text-neutral-950">
                  <Save size={18} />
                  Guardar contacto
                </button>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ProductForm({ form, setForm, onSubmit, onUpload, saving }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
      <ImagePicker image={form.image} onUpload={onUpload} />
      <Field label="Nombre" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
      <label className="grid gap-2 text-sm font-bold text-stone-300">
        Categoría
        <select
          value={form.category}
          onChange={(event) => setForm({ ...form, category: event.target.value })}
          className="rounded-[8px] border border-white/10 bg-neutral-900 px-3 py-4 text-base text-white"
        >
          {categories.filter((item) => item !== "Todos").map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <Field label="Precio" type="number" value={form.price} onChange={(price) => setForm({ ...form, price })} required />
      <Field label="Talles" value={form.sizes} onChange={(sizes) => setForm({ ...form, sizes })} />
      <Field label="Etiqueta" value={form.badge} onChange={(badge) => setForm({ ...form, badge })} />
      <Field label="URL de imagen" value={form.image} onChange={(image) => setForm({ ...form, image })} />
      <SaveButton saving={saving} label="Guardar prenda" />
    </form>
  );
}

function OutfitForm({ form, setForm, onSubmit, onUpload, saving }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
      <ImagePicker image={form.image} onUpload={onUpload} />
      <Field label="Título" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
      <Field label="Prendas del look" value={form.pieces} onChange={(pieces) => setForm({ ...form, pieces })} />
      <Field label="URL de imagen" value={form.image} onChange={(image) => setForm({ ...form, image })} />
      <SaveButton saving={saving} label="Guardar outfit" />
    </form>
  );
}

function ImagePicker({ image, onUpload }) {
  return (
    <label className="relative grid aspect-[4/5] cursor-pointer place-items-center overflow-hidden rounded-[8px] border border-dashed border-white/20 bg-neutral-900 text-center">
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="px-6 text-stone-300">
          <Camera className="mx-auto mb-3" size={30} />
          Sacar foto o elegir de la galería
        </span>
      )}
      <span className="absolute bottom-3 left-3 right-3 rounded-full bg-neutral-950/85 px-4 py-3 text-sm font-black backdrop-blur">
        Subir foto
      </span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => onUpload(event.target.files?.[0])}
      />
    </label>
  );
}

function AdminList({ items, label, imageKey, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-neutral-900 p-3">
          <img src={item[imageKey]} alt="" className="size-16 rounded-[8px] object-cover" />
          <p className="min-w-0 flex-1 truncate text-sm font-black">{label(item)}</p>
          <button type="button" onClick={() => onEdit(item)} className="grid size-10 place-items-center rounded-full border border-white/10" aria-label="Editar">
            <Edit3 size={17} />
          </button>
          <button type="button" onClick={() => onDelete(item.id)} className="grid size-10 place-items-center rounded-full border border-white/10 text-red-300" aria-label="Eliminar">
            <Trash2 size={17} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", required = false }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-stone-300">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="rounded-[8px] border border-white/10 bg-neutral-900 px-3 py-4 text-base text-white outline-none focus:border-[#d7673f]"
      />
    </label>
  );
}

function SaveButton({ saving, label }) {
  return (
    <button className="flex items-center justify-center gap-2 rounded-full bg-[#d7673f] px-4 py-4 font-black text-neutral-950">
      {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
      {label}
    </button>
  );
}

function PanelHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 p-4">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#d7673f]">{title}</p>
        <h2 className="text-2xl font-black">{subtitle}</h2>
      </div>
      <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full border border-white/10" aria-label="Cerrar">
        <X size={20} />
      </button>
    </div>
  );
}

function productPayload(form) {
  return {
    ...form,
    price: Number(form.price),
    sizes: String(form.sizes)
      .split(",")
      .map((size) => size.trim())
      .filter(Boolean),
  };
}

function makeWhatsappUrl(phone, selection, total) {
  const message = encodeURIComponent(
    [
      "Hola Kenza, quiero consultar por este pedido:",
      ...selection.map(
        (item) =>
          `- ${item.name} | talle ${item.size} | x${item.quantity} | ${money.format(
            item.price * item.quantity,
          )}`,
      ),
      `Total estimado: ${money.format(total)}`,
      "¿Me confirmás disponibilidad?",
    ].join("\n"),
  );

  return `https://wa.me/${phone}?text=${message}`;
}
