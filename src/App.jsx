import React, { useEffect, useMemo, useState } from "react";
import { Camera, Instagram, Lock, MessageCircle, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { deleteOutfit, deleteProduct, getStore, saveOutfit, saveProduct, saveSettings, uploadImage } from "./api";
import { categories, starterOutfits, starterProducts } from "./data";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const heroImage = "/hero-kenza.jpg";

export default function App() {
  const [products, setProducts] = useState(starterProducts);
  const [outfits, setOutfits] = useState(starterOutfits);
  const [settings, setSettings] = useState({ phone: "5493764000000", instagram: "kenza.posadas" });
  const [category, setCategory] = useState("Todos");
  const [order, setOrder] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    getStore()
      .then((store) => {
        setProducts(store.products);
        setOutfits(store.outfits);
        setSettings(store.settings);
      })
      .catch(() => {});
  }, []);

  const visibleProducts = useMemo(
    () => category === "Todos" ? products : products.filter((item) => item.category === category),
    [category, products],
  );
  const total = order.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const whatsappUrl = makeWhatsapp(settings.phone, order, total);

  function addItem(product, size) {
    setOrder((items) => {
      const found = items.find((item) => item.id === product.id && item.size === size);
      if (found) {
        return items.map((item) => item.id === product.id && item.size === size ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...items, { ...product, size, quantity: 1 }];
    });
    setCartOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-neutral-950/10 bg-[#f8f5ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <a href="#inicio" className="leading-none">
            <span className="block text-3xl font-black uppercase text-[#c84224]">Kenza</span>
            <span className="block text-[0.65rem] font-bold uppercase tracking-[0.35em] text-neutral-500">Mens Wear</span>
          </a>
          <nav className="hidden items-center gap-8 text-xs font-black uppercase tracking-wide md:flex">
            <a href="#catalogo">Colección</a>
            <a href="#outfits">La marca</a>
            <a href={`https://instagram.com/${settings.instagram}`}>Contacto</a>
          </nav>
          <div className="flex items-center gap-2">
            <Search size={21} />
            <button className="relative grid size-10 place-items-center" onClick={() => setCartOpen(true)} aria-label="Pedido">
              <ShoppingBag size={22} />
              {order.length > 0 && <span className="absolute right-0 top-0 grid size-5 place-items-center rounded-full bg-[#c84224] text-xs font-black text-white">{order.length}</span>}
            </button>
            <button className="grid size-10 place-items-center" onClick={() => setAdminOpen(true)} aria-label="Admin">
              <Lock size={21} />
            </button>
          </div>
        </div>
      </header>

      <section id="inicio" className="mx-auto max-w-7xl px-4 py-5">
        <div className="grid overflow-hidden bg-white shadow-xl shadow-neutral-950/10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex min-h-[440px] flex-col justify-center p-7 sm:p-10 lg:p-12">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-neutral-500">Nueva colección</p>
            <h1 className="max-w-md text-5xl font-black leading-none sm:text-6xl lg:text-7xl">Ropa que te acompaña.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-neutral-600">
              Una vidriera simple para ver prendas, precios y outfits. Elegís lo que te gusta y lo consultás por WhatsApp.
            </p>
            <a href="#catalogo" className="mt-7 inline-flex w-fit items-center rounded-[4px] bg-[#c84224] px-6 py-3 text-sm font-black text-white">
              Ver colección
            </a>
            <div className="mt-7 flex gap-5 text-sm font-black">
              <span className="border-b-2 border-neutral-950 pb-1">01</span>
              <span className="text-neutral-400">02</span>
              <span className="text-neutral-400">03</span>
            </div>
          </div>
          <div className="relative min-h-[460px]">
            <img src={heroImage} alt="Look urbano Kenza" className="h-full w-full object-cover" />
            <div className="absolute bottom-0 right-0 w-44 bg-[#c84224] p-6 text-white">
              <p className="text-2xl font-black leading-tight">Calidad en cada detalle.</p>
              <a href="#catalogo" className="mt-5 inline-block text-sm font-black">Ver más</a>
            </div>
          </div>
        </div>
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-black">Productos destacados</h2>
          <a href="#catalogo" className="text-sm font-black">Ver todos</a>
        </div>
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${category === item ? "bg-[#c84224] text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-950/10"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addItem} />)}
        </div>
      </section>

      <section id="outfits" className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black">Outfits del local</h2>
            <button className="text-sm font-black text-[#c84224]" onClick={() => setAdminOpen(true)}>Cargar look</button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {outfits.map((outfit) => (
              <article key={outfit.id} className="overflow-hidden bg-[#f4f0e9]">
                <img src={outfit.image} alt={outfit.title} className="aspect-[3/4] w-full object-cover" />
                <div className="p-4">
                  <h3 className="text-xl font-black">{outfit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{outfit.pieces}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Sin pagos online. El pedido se coordina por WhatsApp.</span>
        <a className="inline-flex items-center gap-2 font-black text-neutral-950" href={`https://instagram.com/${settings.instagram}`}>
          <Instagram size={17} /> @{settings.instagram}
        </a>
      </footer>

      {cartOpen && <Cart items={order} total={total} whatsappUrl={whatsappUrl} onClose={() => setCartOpen(false)} onOrder={setOrder} />}
      {adminOpen && (
        <AdminPanel
          onClose={() => setAdminOpen(false)}
          products={products}
          outfits={outfits}
          settings={settings}
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
    <article className="overflow-hidden bg-white shadow-sm shadow-neutral-950/5 ring-1 ring-neutral-950/10">
      <img src={product.image} alt={product.name} className="aspect-[4/5] w-full object-cover" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-neutral-500">{product.category}</p>
            <h3 className="mt-1 text-lg font-black">{product.name}</h3>
          </div>
          <p className="font-black text-[#c84224]">{money.format(product.price)}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {product.sizes.map((item) => (
            <button key={item} onClick={() => setSize(item)} className={`min-w-10 rounded-full px-3 py-2 text-sm font-black ${size === item ? "bg-neutral-950 text-white" : "ring-1 ring-neutral-950/10"}`}>
              {item}
            </button>
          ))}
        </div>
        <button onClick={() => onAdd(product, size)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#c84224] px-4 py-3 font-black text-white">
          <ShoppingBag size={18} /> Agregar
        </button>
      </div>
    </article>
  );
}

function Cart({ items, total, whatsappUrl, onClose, onOrder }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/55">
      <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-white text-neutral-950">
        <PanelHeader title="Pedido" subtitle="Consulta por WhatsApp" onClose={onClose} />
        <div className="flex-1 space-y-3 overflow-auto p-4">
          {items.length === 0 ? <p className="pt-20 text-center text-neutral-500">Agregá prendas para armar la consulta.</p> : items.map((item) => (
            <div key={`${item.id}-${item.size}`} className="flex gap-3 border border-neutral-950/10 p-3">
              <img src={item.image} alt={item.name} className="size-20 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-black">{item.name}</p>
                <p className="text-sm text-neutral-500">Talle {item.size} · x{item.quantity}</p>
                <p className="mt-2 font-black text-[#c84224]">{money.format(item.price * item.quantity)}</p>
              </div>
              <button onClick={() => onOrder(items.filter((orderItem) => orderItem.id !== item.id || orderItem.size !== item.size))} aria-label="Quitar">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-neutral-950/10 p-4">
          <div className="mb-4 flex justify-between text-lg font-black"><span>Total estimado</span><span>{money.format(total)}</span></div>
          <a href={items.length ? whatsappUrl : undefined} className={`flex items-center justify-center gap-2 rounded-[4px] px-4 py-3 font-black ${items.length ? "bg-[#25D366]" : "pointer-events-none bg-neutral-200 text-neutral-400"}`}>
            <MessageCircle size={20} /> Enviar consulta
          </a>
        </div>
      </aside>
    </div>
  );
}

function AdminPanel({ onClose, products, outfits, settings, onProducts, onOutfits, onSettings }) {
  const blankProduct = { name: "", category: "Remeras", price: "", sizes: "S, M, L, XL", image: "", highlight: "" };
  const blankOutfit = { title: "", pieces: "", image: "" };
  const [pin, setPin] = useState("");
  const [tab, setTab] = useState("producto");
  const [product, setProduct] = useState(blankProduct);
  const [outfit, setOutfit] = useState(blankOutfit);
  const [storeSettings, setStoreSettings] = useState(settings);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function pickImage(event, target) {
    const file = event.target.files?.[0];
    if (!file || !pin) {
      setStatus("Ingresá el PIN antes de subir una foto.");
      return;
    }
    setBusy(true);
    setStatus("Subiendo foto...");
    try {
      const uploaded = await uploadImage(file, pin);
      if (target === "producto") {
        setProduct((current) => ({ ...current, image: uploaded.url }));
      } else {
        setOutfit((current) => ({ ...current, image: uploaded.url }));
      }
      setStatus("Foto cargada.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function submitProduct(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("Guardando prenda...");
    try {
      const saved = await saveProduct({
        ...product,
        price: Number(product.price),
        sizes: product.sizes.split(",").map((size) => size.trim()).filter(Boolean),
      }, pin);
      onProducts((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      setProduct(blankProduct);
      setStatus("Prenda guardada.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOutfit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("Guardando outfit...");
    try {
      const saved = await saveOutfit(outfit, pin);
      onOutfits((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      setOutfit(blankOutfit);
      setStatus("Outfit guardado.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitSettings(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("Actualizando contacto...");
    try {
      const saved = await saveSettings(storeSettings, pin);
      onSettings(saved);
      setStatus("Contacto actualizado.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(id) {
    if (!pin) {
      setStatus("Ingresá el PIN para borrar.");
      return;
    }
    setBusy(true);
    try {
      await deleteProduct(id, pin);
      onProducts((items) => items.filter((item) => item.id !== id));
      setStatus("Prenda eliminada.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeOutfit(id) {
    if (!pin) {
      setStatus("Ingresá el PIN para borrar.");
      return;
    }
    setBusy(true);
    try {
      await deleteOutfit(id, pin);
      onOutfits((items) => items.filter((item) => item.id !== id));
      setStatus("Outfit eliminado.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/55 sm:p-4">
      <section className="ml-auto flex h-full w-full max-w-md flex-col bg-neutral-950 text-white">
        <PanelHeader title="Admin" subtitle="Cargar desde el celular" onClose={onClose} dark />
        <div className="flex-1 overflow-auto p-4">
          <input
            className="mb-3 w-full rounded-[4px] bg-white px-4 py-3 text-neutral-950"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="PIN admin"
            type="password"
          />
          <div className="mb-4 grid grid-cols-3 gap-2">
            {["producto", "outfit", "contacto"].map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-[4px] px-3 py-3 text-xs font-black uppercase ${tab === item ? "bg-[#c84224]" : "bg-white/10"}`}
              >
                {item}
              </button>
            ))}
          </div>

          {tab === "producto" && (
            <form className="space-y-3" onSubmit={submitProduct}>
              <ImagePicker src={product.image} label="Sacar foto de la prenda" onChange={(event) => pickImage(event, "producto")} />
              <input required className="w-full rounded-[4px] bg-white px-4 py-4 text-neutral-950" value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} placeholder="Nombre de la prenda" />
              <div className="grid grid-cols-2 gap-3">
                <select className="rounded-[4px] bg-white px-4 py-4 text-neutral-950" value={product.category} onChange={(event) => setProduct({ ...product, category: event.target.value })}>
                  {categories.filter((item) => item !== "Todos").map((item) => <option key={item}>{item}</option>)}
                </select>
                <input required className="rounded-[4px] bg-white px-4 py-4 text-neutral-950" value={product.price} onChange={(event) => setProduct({ ...product, price: event.target.value })} placeholder="Precio" inputMode="numeric" />
              </div>
              <input className="w-full rounded-[4px] bg-white px-4 py-4 text-neutral-950" value={product.sizes} onChange={(event) => setProduct({ ...product, sizes: event.target.value })} placeholder="Talles separados por coma" />
              <input className="w-full rounded-[4px] bg-white px-4 py-4 text-neutral-950" value={product.highlight} onChange={(event) => setProduct({ ...product, highlight: event.target.value })} placeholder="Etiqueta opcional" />
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#c84224] px-4 py-4 font-black disabled:opacity-60">
                <Camera size={18} /> Guardar prenda
              </button>
            </form>
          )}

          {tab === "outfit" && (
            <form className="space-y-3" onSubmit={submitOutfit}>
              <ImagePicker src={outfit.image} label="Sacar foto del outfit" onChange={(event) => pickImage(event, "outfit")} />
              <input required className="w-full rounded-[4px] bg-white px-4 py-4 text-neutral-950" value={outfit.title} onChange={(event) => setOutfit({ ...outfit, title: event.target.value })} placeholder="Título del outfit" />
              <textarea required className="min-h-28 w-full rounded-[4px] bg-white px-4 py-4 text-neutral-950" value={outfit.pieces} onChange={(event) => setOutfit({ ...outfit, pieces: event.target.value })} placeholder="Prendas incluidas" />
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#c84224] px-4 py-4 font-black disabled:opacity-60">
                <Camera size={18} /> Guardar outfit
              </button>
            </form>
          )}

          {tab === "contacto" && (
            <form className="space-y-3" onSubmit={submitSettings}>
              <input required className="w-full rounded-[4px] bg-white px-4 py-4 text-neutral-950" value={storeSettings.phone} onChange={(event) => setStoreSettings({ ...storeSettings, phone: event.target.value })} placeholder="WhatsApp con código país" />
              <input required className="w-full rounded-[4px] bg-white px-4 py-4 text-neutral-950" value={storeSettings.instagram} onChange={(event) => setStoreSettings({ ...storeSettings, instagram: event.target.value })} placeholder="Instagram sin @" />
              <button disabled={busy} className="w-full rounded-[4px] bg-[#c84224] px-4 py-4 font-black disabled:opacity-60">Guardar contacto</button>
            </form>
          )}

          {status && <p className="mt-4 rounded-[4px] bg-white/10 p-3 text-sm">{status}</p>}

          <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-white/45">Publicados</p>
            {tab === "producto" && products.slice(0, 5).map((item) => <AdminRow key={item.id} title={item.name} image={item.image} onDelete={() => removeProduct(item.id)} />)}
            {tab === "outfit" && outfits.slice(0, 5).map((item) => <AdminRow key={item.id} title={item.title} image={item.image} onDelete={() => removeOutfit(item.id)} />)}
            {tab === "contacto" && <p className="text-sm text-white/60">El WhatsApp arma el pedido automáticamente con prendas, talles y total estimado.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function ImagePicker({ src, label, onChange }) {
  return (
    <label className="grid aspect-[4/3] place-items-center overflow-hidden border border-dashed border-white/25 text-center">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span><Camera className="mx-auto mb-3" />{label}</span>}
      <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={onChange} />
    </label>
  );
}

function AdminRow({ title, image, onDelete }) {
  return (
    <div className="flex items-center gap-3 bg-white/10 p-2">
      <img src={image} alt="" className="size-14 object-cover" />
      <p className="min-w-0 flex-1 truncate text-sm font-black">{title}</p>
      <button onClick={onDelete} className="grid size-10 place-items-center" aria-label="Eliminar">
        <Trash2 size={18} />
      </button>
    </div>
  );
}

function PanelHeader({ title, subtitle, onClose, dark = false }) {
  return (
    <div className={`flex items-center justify-between border-b p-4 ${dark ? "border-white/10" : "border-neutral-950/10"}`}>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#c84224]">{title}</p>
        <h2 className="text-2xl font-black">{subtitle}</h2>
      </div>
      <button onClick={onClose} className={`grid size-11 place-items-center rounded-full border ${dark ? "border-white/10" : "border-neutral-950/10"}`} aria-label="Cerrar">
        <X size={20} />
      </button>
    </div>
  );
}

function makeWhatsapp(phone, items, total) {
  const text = encodeURIComponent([
    "Hola Kenza, quiero consultar por este pedido:",
    ...items.map((item) => `- ${item.name} | talle ${item.size} | x${item.quantity} | ${money.format(item.price * item.quantity)}`),
    `Total estimado: ${money.format(total)}`,
    "¿Me confirmás disponibilidad?",
  ].join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}
