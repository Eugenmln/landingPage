# Kenza Mens Wear

Vidriera digital para negocio de ropa creada con Vite, React, JavaScript y Tailwind.

## Funciones

- Catálogo por categorías: jeans, remeras, camperas y accesorios.
- Precios visibles y selección por talle.
- Pedido estilo carrito que envía la consulta por WhatsApp.
- Sección de outfits.
- Panel admin local para cargar, editar y borrar productos/outfits.
- Configuración local de WhatsApp, Instagram y clave admin.

## Desarrollo frontend

```bash
npm install
npm run dev
```

## Backend

En otra terminal:

```bash
npm run dev:api
```

El backend guarda productos, outfits y fotos en `server/data` y `public/uploads`.
La clave inicial del admin es `1234`. Para producción se puede definir `ADMIN_PIN`.
