# Panamá Conecta — Red solidaria ciudadana

Sitio estático gratuito (HTML/CSS/JS) con mapa de señales ciudadanas **NO verificadas**, contactos oficiales, guía sísmica de SINAPROC y mensajes para WhatsApp. La publicación comunitaria necesita Firebase gratuito.

> ⚠️ **Esto NO es un servicio de rescate ni de alertas oficiales.** Publicar una señal NO comunica con 911, ambulancias, SINAPROC ni brigadistas. La primera acción ante peligro es llamar a emergencias al 911. Nunca promocionar este sitio como canal de despacho de emergencias.

## Activar el mapa comunitario en vivo (sin tarjeta)

1. Ir a https://console.firebase.google.com/ y crear un proyecto con el plan **Spark (sin costo)**. NO seleccionar Blaze; NO vincular facturación.
2. En el proyecto, agregar una **app Web `</>`**. Copiar del bloque `firebaseConfig` exactamente `apiKey`, `authDomain`, `projectId` y `appId`, y reemplazar los cuatro marcadores de `firebase-config.js`. No copiar `measurementId` porque esta web no usa Analytics. Son identificadores públicos, no una clave de administrador. **Nunca publicar una cuenta de servicio ni una clave privada de Firebase Admin SDK**.
3. Ir a **Authentication → Sign-in method → Anonymous → Enable**.
4. Ir a **Firestore Database → Create database**, usar la edición **Standard**, modo de producción (no Test Mode). Elegir ubicación cercana, según lo que ofrezca Firebase.
5. Abrir Firestore Database → **Rules**. Reemplazar TODO el contenido por `firestore.rules`. Hacer clic en **Publish**. Este paso es OBLIGATORIO para evitar escrituras anónimas sin control.
6. En **Authentication → Settings → Authorized domains**, agregar `TUUSUARIO.github.io` si hace falta. No añadir ninguna URL completa, solo el dominio, sin `https://` ni la ruta del repositorio.
7. En GitHub crear repositorio **público** `panama-conecta`. Subir a la raíz `index.html`, `styles.css`, `app.js`, `core.js`, `firebase-config.js`, `favicon.svg`, `.nojekyll`, y opcionalmente `README.md`, `package.json`, `test/` y `firestore.rules`.
8. GitHub → **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**.
9. Abrir `https://TUUSUARIO.github.io/panama-conecta/` desde dos celulares. Desde uno crear señal de PRUEBA con texto explícito "PRUEBA - no existe emergencia real", comprobar que aparece en el otro y **marcar como resuelta** de inmediato. Nunca dejar pruebas como emergencias reales.
10. Si hay un problema, verificar consola del navegador, permisos Firebase, reglas y que Firebase tenga habilitada autenticación anónima.

### Plan gratuito y límites

- GitHub Pages: hosting gratuito para repositorios públicos.
- Firebase Spark / Firestore Standard: incluye 50.000 lecturas de documentos/día, 20.000 escrituras/día y hasta 1 GiB de almacenamiento. Son cuotas, NO capacidad infinita. A alto tráfico, el sitio puede dejar de actualizar señales hasta el siguiente reinicio de cuota. El plan Spark no genera cargos de facturación, porque no se vinculó cuenta de facturación.
- OpenStreetMap: teselas gratuitas de uso comunitario razonable, **sin garantías de disponibilidad** y sujetas a su política. El mapa NO descarga datos offline ni hace precarga.
- No necesita dominio pago, npm ni servidor propio.

### Límites de seguridad ya incluidos

- Mensaje prioritario para llamar al 911 antes de publicar.
- Nada de campos con nombre, correo ni teléfono. Bloqueo básico de teléfonos/enlaces en texto, **no es una protección completa** ante publicaciones malintencionadas.
- GPS **redondeado a 2 decimales ANTES de almacenarlo**, equivalente a ubicación pública aproximada del orden de 1 km. Esto sigue siendo información de ubicación: recomendar publicar solo con consentimiento del interesado. Si no se permite GPS, se publica el **centro de la localidad** marcada, no su dirección exacta.
- Señales visibles por 24 h, sin confundirlas con alertas oficiales.
- Anon Auth: una señal activa por identidad anónima (puede eludirse desde otros dispositivos/navegadores). Autenticación anónima no equivale a identidad verificada.
- El usuario puede marcar su propia señal como resuelta. Puede publicar otra después de 10 minutos.
- Cualquier persona autenticada anónimamente puede marcar una señal ajena para revisión una sola vez. Esos avisos quedan en `reportFlags` y no son públicos.
- Procedimiento de moderación: abrir **Firebase Console → Firestore Database → Data → `reportFlags`**, copiar el `reportId`, revisar el documento correspondiente en `reports` y, si es falso, peligroso o expone datos, eliminarlo desde Console. Luego eliminar los `reportFlags` asociados. La Console usa credenciales administrativas y no está limitada por la regla de borrado del navegador. Revisar esta cola con frecuencia y asignar al menos una persona responsable antes de difundir el sitio.
- **Para difusión masiva o coordinación de rescates se necesita moderación y colaboración con organizaciones oficiales; este MVP no garantiza autenticidad de señales ni respuesta.** Considerá activar App Check y un flujo de revisión antes de escalar el uso público.

### Si no configurás Firebase

La web abre, muestra la información oficial y permite enviar mensajes de WhatsApp, pero **NO recibe, sincroniza ni muestra señales**. Esto es intencional; jamás mostramos emergencias ficticias como reales.

### Personalización

- `index.html`: textos y enlaces institucionales.
- `styles.css`: identidad visual responsive.
- `app.js`: interfaz, mapa, autenticación anónima y Firestore.
- `core.js`: categorías, localidades y validaciones puras probadas.
- `firebase-config.js`: datos públicos de configuración de Firebase.
- `firestore.rules`: validación y seguridad de la base de datos (se pegan en consola).

### Pruebas locales

Con Node.js 20 o posterior, ejecutar `npm test`. Las pruebas no escriben en Firebase ni crean reportes. Para la prueba final real, usar el paso 9 anterior y resolver/eliminar inmediatamente el reporte rotulado como prueba.

Fuentes técnicas:
- https://firebase.google.com/docs/firestore/pricing
- https://firebase.google.com/docs/auth/web/anonymous-auth
- https://firebase.google.com/docs/firestore/security/get-started
- https://docs.github.com/es/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://operations.osmfoundation.org/policies/tiles/

Información panameña:
- https://www.sinaproc.gob.pa/sismos/
- https://www.sinaproc.gob.pa/alertas/
- https://www.sinaproc.gob.pa/centro-de-operaciones-de-emergencia/
- https://earthquake.usgs.gov/earthquakes/map/
