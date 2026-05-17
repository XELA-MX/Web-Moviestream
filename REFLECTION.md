# Reporte de reflexión — MovieStream

Respuestas basadas en el modelo documental ([`model.md`](model.md)), la migración ([`Migracion/main.py`](Migracion/main.py)) y la app web ([`web/`](web/)).

---

## 1. ¿Por qué embebiste algunos datos y referenciaste otros?

La regla que seguí fue **cómo se consultan los datos en una plataforma de streaming**, no cómo estaban normalizados en Oracle.

**Embebí** cuando la relación es 1:1 o de bajo volumen y casi siempre se lee junto con el documento padre:

- Géneros, reparto, crew, estudio, premios y nominaciones dentro de `movies` (el catálogo se consume de forma agregada).
- Dirección, demografía, segmento, encuesta y feedback dentro de `customers` (perfil completo en una lectura).
- Dispositivos asignados y snapshot del plan dentro de `users` (pocos dispositivos por usuario; el plan se comparte pero el snapshot evita un join en cada pantalla).

**Referencié** cuando el volumen crece, la entidad es compartida o tiene ciclo de vida propio:

- `activities` → `customers` y `movies` (miles/millones de eventos; no tiene sentido inflar el documento del cliente).
- `user_sessions` → `customers` (mismo motivo).
- `users.planId` → `subscription_plans` (muchos usuarios, un mismo plan; el precio cambia en un solo sitio).

En resumen: embeber acelera lecturas frecuentes; referenciar evita documentos gigantes y duplicación de la “fuente de verdad”.

---

## 2. ¿Cómo manejaste crear una película con sus géneros?

En el modelo **no hay colección `genres`**. Los géneros viven en el array embebido `movies.genres[]` con `{ genreId, name }`.

En la migración, los géneros venían del campo JSON/relacional de Oracle y se normalizaron a ese array al construir cada documento.

En la app web, el formulario de película permite **filas dinámicas** (añadir/quitar) de `genreId` y `name`. Al guardar, el servidor arma el array y lo persiste en un solo `insertOne` o `updateOne`. Crear una película con dos géneros es un único documento con `genres: [{...}, {...}]` — no hay transacción entre colecciones.

---

## 3. ¿Qué pasa al “borrar un género” o una entidad referenciada?

Depende de qué se borre:

**Quitar un género de una película**  
Solo se edita el array `genres` de esa película. Otras películas no cambian. Las actividades antiguas conservan su `genreSnapshot` (copia al momento del evento), aunque el nombre en el catálogo ya no coincida. Eso es **desnormalización histórica a propósito**, no un bug.

**Borrar una película**  
Las `activities` con ese `movieId` **no se eliminan en cascada**. Quedan con referencia posiblemente huérfana y con `movieSnapshot` con título/año del pasado. La UI avisa cuántas actividades referencian la película antes de confirmar. Asumí que el historial de visualización vale más que la integridad referencial estricta.

**Borrar un cliente**  
Igual: las actividades no se borran automáticamente. En detalle de actividad se hace lookup; si el cliente no existe, se muestra “referencia huérfana”.

MongoDB no impone FK como Oracle; las reglas de negocio las define la aplicación. Aquí prioricé **no perder eventos de analítica** frente a borrados en cascada.

---

## 4. ¿Cómo muestras los datos relacionados al usuario en la app?

En **actividades** (colección con referencias):

- **Formulario:** `<select>` de clientes y películas cargados desde `customers` y `movies` (solo lectura auxiliar).
- **Al guardar:** el servidor valida que existan `customerId` y `movieId`, y genera `movieSnapshot` y `genreSnapshot` desde la película actual.
- **Detalle:** se muestran tres capas:
  1. IDs de referencia (`customerId`, `movieId`).
  2. **Lookup en vivo** (nombre del cliente, enlace a la película si sigue en catálogo).
  3. **Snapshots embebidos** en JSON, con nota de que pueden diferir del catálogo actual.

Así el usuario ve tanto la relación como la copia desnormalizada y entiende por qué pueden no coincidir.

En **películas**, los géneros embebidos se listan en detalle y en la tabla con badges; no hay lookup externo porque no hay colección de géneros.

---

## 5. ¿Qué consultas mejoraron y cuáles empeoraron respecto al modelo relacional?

**Mejoraron** (menos joins, una lectura):

- Ficha de película con géneros y metadatos.
- Perfil de cliente con segmento, encuesta y feedback reciente.
- Usuario con plan y dispositivos.
- Listados filtrados por `genres.name`, país, actividad reciente por cliente (con índices en `activities`).

**Empeoraron o requieren batch / `$lookup`:**

- Renombrar un género “globalmente” (hay que actualizar muchos documentos `movies` o aceptar snapshots viejos).
- Saber todos los usuarios que usaron un dispositivo (hay que escanear `users.devices`).
- Reportes totalmente normalizados tipo SQL con muchas tablas puente.

Para MovieStream, el balance me parece correcto: lectura de catálogo y perfil pesa más que administración centralizada de catálogos auxiliares.

---

## 6. ¿Qué aprendiste en la migración Oracle → MongoDB y en el despliegue?

- **Wallet mTLS** en Autonomous Database es independiente de la contraseña de usuario: el PEM del wallet tiene su propia passphrase aunque el zip ya esté descomprimido.
- La migración es un **ETL de lectura masiva + escritura por colección**; conviene definir el shape del documento en código (`build_movies`, `build_customers`, etc.) antes de insertar.
- Los **snapshots** en `activities` simplifican analítica pero obligan a documentar que no son la fuente de verdad del catálogo.
- Docker facilita desplegar solo la capa web: la base ya vive en MongoDB (local, remoto o Cosmos DB con API de MongoDB) vía `MONGO_URI`.

Si repitiera el ejercicio, consideraría una colección opcional `genres` solo para administración, manteniendo el embebido en `movies` para lectura — pero para el alcance del proyecto el array embebido fue suficiente y más fiel al enunciado.
