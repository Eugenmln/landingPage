const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "No se pudo completar la acción.");
  }

  return response.json();
}

export function getStore() {
  return request("/api/store");
}

export function saveProduct(product, pin) {
  return request(product.id ? `/api/products/${product.id}` : "/api/products", {
    method: product.id ? "PUT" : "POST",
    headers: { "x-admin-pin": pin },
    body: JSON.stringify(product),
  });
}

export function deleteProduct(id, pin) {
  return request(`/api/products/${id}`, {
    method: "DELETE",
    headers: { "x-admin-pin": pin },
  });
}

export function saveOutfit(outfit, pin) {
  return request(outfit.id ? `/api/outfits/${outfit.id}` : "/api/outfits", {
    method: outfit.id ? "PUT" : "POST",
    headers: { "x-admin-pin": pin },
    body: JSON.stringify(outfit),
  });
}

export function deleteOutfit(id, pin) {
  return request(`/api/outfits/${id}`, {
    method: "DELETE",
    headers: { "x-admin-pin": pin },
  });
}

export function saveSettings(settings, pin) {
  return request("/api/settings", {
    method: "PUT",
    headers: { "x-admin-pin": pin },
    body: JSON.stringify(settings),
  });
}

export function uploadImage(file, pin) {
  const form = new FormData();
  form.append("image", file);

  return request("/api/uploads", {
    method: "POST",
    headers: { "x-admin-pin": pin },
    body: form,
  });
}
