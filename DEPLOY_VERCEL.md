# 🚀 Guía de Despliegue en Vercel

## Configuración del Proyecto

### 1. Archivo `vercel.json` (✅ Ya creado)

Este archivo es **crucial** para que funcionen las rutas SPA (Single Page Application). Ya está configurado correctamente en el proyecto.

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Esto redirige todas las rutas al `index.html`, permitiendo que React Router maneje la navegación.

---

## 2. Variables de Entorno en Vercel

Debes configurar las siguientes variables de entorno en tu proyecto de Vercel:

### Ir a: **Project Settings** → **Environment Variables**

Agrega:

```bash
VITE_API_URL=https://tu-backend.com/api
```

⚠️ **Importante**: Reemplaza `https://tu-backend.com/api` con la URL real de tu backend.

---

## 3. Configuración de Build

En Vercel, asegúrate de tener esta configuración:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

---

## 4. Solución al Error 404

Si obtienes el error:
```
404: NOT_FOUND
Code: NOT_FOUND
```

### Causas Comunes:

1. **❌ Falta el archivo `vercel.json`**
   - ✅ Ya lo creamos en la raíz del proyecto frontend

2. **❌ Variables de entorno no configuradas**
   - Configura `VITE_API_URL` en Vercel

3. **❌ Build fallido**
   - Revisa los logs de deployment en Vercel
   - Verifica que no haya errores de TypeScript

4. **❌ Ruta incorrecta en el router**
   - Verifica que las rutas en `router.tsx` coincidan con las URLs

---

## 5. Pasos para Redesplegar

Después de los cambios:

1. **Commit y push a GitHub:**
   ```bash
   git add .
   git commit -m "fix: Agregar vercel.json y mejorar UI del formulario"
   git push origin feat/SDBCG-15-crud-postulantes
   ```

2. **Vercel desplegará automáticamente** (si está conectado a GitHub)

3. **O despliega manualmente:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

---

## 6. Verificar el Despliegue

1. Ve a la URL de tu proyecto: `https://fcgfront.vercel.app`
2. Prueba navegar a: `https://fcgfront.vercel.app/admin/forms`
3. Deberías ver el constructor de formularios mejorado

---

## 7. Troubleshooting

### Si aún obtienes 404:

1. **Verifica los logs de build en Vercel**
   - Deployment → Logs
   - Busca errores

2. **Limpia caché y redespliega**
   - En Vercel: Settings → Advanced → Clear Cache
   - Redespliega

3. **Verifica la configuración del dominio**
   - Asegúrate de que el dominio esté correctamente configurado

4. **Revisa las rutas protegidas**
   - Temporalmente, quitamos `RequireAuth` del AdminLayout
   - Si aún está, podría estar bloqueando el acceso

---

## 8. Mejoras Implementadas en la UI

### ✨ Nueva Interfaz del Editor de Sección

- **Diseño más limpio y moderno** con gradientes y sombras
- **Iconos visuales** para cada tipo de campo
- **Tarjetas informativas** con badges de estado
- **Modal mejorado** para crear campos con mejor UX
- **Panel de ayuda lateral** con guías y consejos
- **Mejor feedback visual** para campos obligatorios, activos y administrativos
- **Editor de opciones mejorado** para campos de selección

### Características destacadas:

- 🎨 Paleta de colores moderna y accesible
- 📱 Diseño responsive (móvil y desktop)
- 🔍 Mejor legibilidad con iconos descriptivos
- ✅ Estados visuales claros (activo, inactivo, obligatorio, solo staff)
- 💡 Tooltips y textos de ayuda contextuales
- 🚀 Animaciones suaves y transiciones

---

## 9. Siguiente Paso: Backend

Asegúrate de que tu backend tenga configurado CORS para aceptar peticiones desde Vercel:

```typescript
// En tu backend (NestJS)
app.enableCors({
  origin: ['https://fcgfront.vercel.app', 'http://localhost:5173'],
  credentials: true,
});
```

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs de Vercel
2. Verifica las variables de entorno
3. Asegúrate de que el backend esté funcionando
4. Verifica que `vercel.json` esté en el directorio correcto

---

¡Listo! Tu aplicación debería estar funcionando correctamente en Vercel. 🎉
