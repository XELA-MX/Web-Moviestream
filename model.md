``` markdown
# Modelo documental de MovieStream en MongoDB

## Objetivo

Este documento propone un modelo documental equivalente en MongoDB para MovieStream a partir del modelo relacional original.

El dise�o prioriza las consultas t�picas de una plataforma de streaming:

- Consultar cat�logo de pel�culas por t�tulo, g�nero, a�o o popularidad.
- Consultar el perfil de un cliente/usuario.
- Ver actividad reciente de reproducci�n o interacci�n.
- Consultar sesiones de usuario.
- Consultar dispositivos asociados a usuarios.
- Consultar informaci�n de planes de suscripci�n.

MongoDB permite embeber datos cuando se consultan junto con frecuencia y referenciar cuando los datos son reutilizables, crecen mucho o cambian independientemente.

---

# Colecciones finales

El modelo propuesto queda con **7 colecciones principales**:

1. `movies`
2. `customers`
3. `activities`
4. `users`
5. `devices`
6. `subscription_plans`
7. `user_sessions`

Algunas tablas relacionales se absorben como subdocumentos dentro de estas colecciones.

---

# 1. Colecci�n `movies`

Representa el cat�logo de pel�culas.

## Decisi�n de modelado

La tabla `MOVIE` ya contiene varios campos con estructura JSON, como reparto, equipo, g�nero, estudio, premios y nominaciones. En MongoDB estos campos se modelan naturalmente como subdocumentos o arreglos embebidos.

La relaci�n con `GENRE` se maneja principalmente embebiendo el g�nero dentro de cada pel�cula, porque en una plataforma de streaming es muy com�n consultar pel�culas junto con su g�nero.

## �Embeber o referenciar?

- `GENRE` se **embebe** dentro de `movies`.
- No se mantiene una colecci�n independiente obligatoria de g�neros.
- Si se necesitara administraci�n centralizada de g�neros, podr�a agregarse una colecci�n auxiliar `genres`, pero no es necesaria para las consultas principales.

## Ejemplo de documento
```

json { "_id": 101, "sku": "MV-000101", "title": "The Example Movie", "year": 2023, "runtime": "120 min", "summary": "A movie summary...", "mainSubject": "Drama", "openingDate": "2023-07-15", "imageUrl": "https://example.com/movie.jpg", "wikiArticle": "https://example.com/wiki/the-example-movie", "listPrice": 9.99, "views": 150000, "budget": "50M", "gross": "200M", "genres": , "cast": , "crew": { "director": "Director Name", "producer": "Producer Name", "writer": "Writer Name" }, "studio": { "name": "Example Studio", "country": "USA" }, "awards": , "nominations": , "createdAt": "2024-01-01T10:00:00Z" }``` 

## Justificaci�n

El cat�logo se consulta frecuentemente de forma agregada: pel�cula, g�nero, reparto, premios y estudio. Embeber estos datos evita joins y hace m�s r�pida la consulta de detalle de pel�cula.

## Consultas m�s f�ciles

- Obtener detalle completo de una pel�cula.
- Buscar pel�culas por g�nero.
- Buscar pel�culas por a�o, t�tulo o popularidad.
- Mostrar ficha de pel�cula sin consultar m�ltiples tablas.

## Consultas m�s dif�ciles

- Cambiar el nombre de un g�nero en todas las pel�culas.
- Obtener una lista maestra normalizada de g�neros sin duplicados.
- Hacer reportes muy normalizados sobre g�neros si se requiere consistencia estricta.

---

# 2. Colecci�n `customers`

Representa clientes de MovieStream, incluyendo datos de contacto, demogr�ficos, segmento, encuestas y feedback.

## Decisi�n de modelado

Las tablas relacionadas con cliente contienen informaci�n que normalmente se consulta junto con el perfil del cliente:

- Datos personales.
- Direcci�n.
- Localizaci�n.
- Demograf�a.
- Segmento.
- Respuestas de encuesta.
- Comentarios o feedback.

Por eso se propone consolidarlas en una sola colecci�n `customers`.

## Relaciones absorbidas

- `CUSTOMER`
- `CUSTOMER_CONTACT`
- `CUSTOMER_EXTENSION`
- `CUSTOMER_SURVEY`
- `CUSTOMER_FEEDBACK`
- `CUSTOMER_SEGMENT`

## �Embeber o referenciar?

- Datos de contacto: **embebidos**.
- Datos demogr�ficos: **embebidos**.
- Segmento: **embebido como snapshot**.
- Encuesta: **embebida**.
- Feedback: **embebido como arreglo**, siempre que el volumen no sea excesivo.

Si un cliente puede generar miles o millones de comentarios, entonces `feedback` deber�a moverse a una colecci�n separada. Para un modelo inicial, se embebe.

## Ejemplo de documento
```

json { "_id": 5001, "firstName": "Ana", "lastName": "Garc�a", "email": "ana.garcia@example.com", "address": { "street": "123 Main Street", "postalCode": "28001", "city": "Madrid", "stateProvince": "Madrid", "country": "Spain", "countryCode": "ES", "continent": "Europe" }, "location": { "type": "Point", "coordinates": [-3.7038, 40.4168] }, "customerInfo": { "yearsCustomer": 4, "promotionResponse": 1 }, "demographics": { "age": 35, "commuteDistance": 12, "creditBalance": 300, "education": "University", "fullTime": "Y", "gender": "F", "householdSize": 3, "income": 55000, "incomeLevel": "Medium", "insufficientFundsIncidents": 0, "jobType": "Technology", "lateMortgageRentPayments": 0, "maritalStatus": "Married", "mortgageAmount": 120000, "numCars": 1, "numMortgages": 1, "pet": "Dog", "rentOwn": "Own", "workExperience": 10, "yearsCurrentEmployer": 5, "yearsResidence": 7 }, "segment": { "segmentId": 3, "name": "Premium Families", "shortName": "PREM_FAM" }, "survey": { "completedSurvey": "Y", "rating": 9, "wouldRecommend": "Y", "interestedInPremiumTier": "Y", "interestedInExclusiveOfferings": "Y", "mobileDevice": "Y", "television": "Y" }, "feedback": }``` 

## Justificaci�n

El perfil del cliente se beneficia de estar en un �nico documento. En lugar de unir varias tablas, MongoDB permite recuperar contacto, demograf�a, segmento, encuesta y feedback reciente en una sola lectura.

El segmento se embebe como snapshot porque normalmente se usa para an�lisis o personalizaci�n. Si el nombre del segmento cambia, se puede actualizar por lote.

## Consultas m�s f�ciles

- Obtener perfil completo del cliente.
- Segmentar clientes por edad, pa�s, ingreso o segmento.
- Consultar encuesta y preferencias del cliente.
- Mostrar feedback reciente del cliente.

## Consultas m�s dif�ciles

- Actualizar globalmente el nombre de un segmento.
- Analizar todos los comentarios si el arreglo `feedback` crece mucho.
- Mantener estrictamente normalizados los datos de segmento.

---

# 3. Colecci�n `activities`

Representa eventos de actividad del cliente: vistas, reproducciones, b�squedas, clicks u otras interacciones.

## Decisi�n de modelado

La actividad suele ser una colecci�n de alto volumen. No conviene embeber todos los eventos dentro del cliente porque el documento podr�a crecer indefinidamente.

Por eso se modela como colecci�n independiente.

## Relaciones

La actividad se relaciona con:

- Cliente.
- Pel�cula.
- G�nero.
- Dispositivo usado.
- Aplicaci�n.
- Sistema operativo.

## �Embeber o referenciar?

- Se referencia al cliente mediante `customerId`.
- Se referencia a la pel�cula mediante `movieId`.
- Se embebe un snapshot m�nimo de pel�cula y g�nero para facilitar anal�tica r�pida.
- No se referencia en ambas direcciones.
- `customers` no guarda todos sus `activityIds`, porque el arreglo crecer�a demasiado.
- `movies` tampoco guarda todos los eventos de actividad.

## Direcci�n de referencia

La referencia va desde `activities` hacia `customers` y `movies`.
```

text activities.customerId -> customers._id activities.movieId -> movies._id``` 

## Ejemplo de documento
```

json { "_id": "activity_900001", "customerId": 5001, "movieId": 101, "activity": "WATCH", "activityTime": "2024-05-01T20:30:00Z", "device": { "name": "Samsung TV", "type": "TV" }, "app": "MovieStream", "os": "Tizen", "movieSnapshot": { "title": "The Example Movie", "year": 2023 }, "genreSnapshot": { "genreId": 1, "name": "Drama" } }``` 

## Justificaci�n

La actividad puede crecer de forma masiva. Separarla evita documentos de cliente enormes. Adem�s, permite crear �ndices por fecha, cliente, pel�cula, g�nero o tipo de actividad.

El snapshot de pel�cula y g�nero permite responder consultas anal�ticas simples sin hacer lookup constantemente.

## Consultas m�s f�ciles

- Actividad reciente de un cliente.
- Pel�culas m�s vistas.
- Actividad por g�nero.
- Actividad por rango de fechas.
- Actividad por dispositivo, sistema operativo o aplicaci�n.

## Consultas m�s dif�ciles

- Obtener el perfil completo del cliente junto con todo su historial en una sola lectura.
- Mantener snapshots actualizados si cambia el t�tulo de una pel�cula o nombre de g�nero.
- Consultas que requieran consistencia fuerte entre actividad y cat�logo.

---

# 4. Colecci�n `users`

Representa usuarios de la aplicaci�n o cuentas de streaming.

## Decisi�n de modelado

La tabla `USERS` se relaciona con planes de suscripci�n y dispositivos. Se propone mantener usuarios en una colecci�n separada y guardar una referencia al plan.

Tambi�n se puede embeber un snapshot del plan para evitar consultas frecuentes a `subscription_plans`.

## Relaciones

- `USERS` con `SUBSCRIPTION_PLANS`.
- `USERS` con `DEVICES` mediante la relaci�n `USER_DEVICES`.

## �Embeber o referenciar?

- Plan de suscripci�n: **referenciado** y adem�s con snapshot embebido.
- Dispositivos asignados: se pueden manejar de dos maneras:
  - Embebidos en `users` si cada usuario tiene pocos dispositivos.
  - Relaci�n independiente si se requiere historial complejo de asignaci�n/desasignaci�n.

En este modelo se embebe el arreglo `devices` dentro de `users` porque un usuario normalmente tiene pocos dispositivos activos o hist�ricos.

## Direcci�n de referencia
```

text users.planId -> subscription_plans._id users.devices.deviceId -> devices._id``` 

No se recomienda referencia inversa desde `devices` hacia todos los usuarios, porque un dispositivo puede cambiar de usuario y la relaci�n hist�rica est� mejor representada desde el usuario.

## Ejemplo de documento
```

json { "_id": 7001, "name": "Ana Garc�a", "email": "ana.garcia@example.com", "createdAt": "2024-01-10T09:00:00Z", "planId": 2, "planSnapshot": { "name": "Premium", "retentionDays": 365, "allowsAlerts": true, "price": 14.99 }, "devices": }``` 

## Justificaci�n

El usuario se consulta frecuentemente junto con su plan y dispositivos. Embeber los dispositivos asignados reduce la necesidad de joins. Como el n�mero de dispositivos por usuario suele ser limitado, el documento no deber�a crecer sin control.

El plan se referencia porque muchos usuarios comparten el mismo plan y sus datos pueden cambiar. El snapshot permite mostrar r�pidamente la informaci�n del plan vigente al momento de la asignaci�n o consulta.

## Consultas m�s f�ciles

- Obtener usuario con su plan y dispositivos.
- Ver dispositivos activos de un usuario.
- Filtrar usuarios por plan.
- Ver fecha de asignaci�n o desasignaci�n de dispositivos.

## Consultas m�s dif�ciles

- Buscar todos los usuarios que han usado un dispositivo espec�fico.
- Actualizar el snapshot del plan en todos los usuarios cuando cambia el precio.
- Mantener historial complejo de dispositivos si hay muchas reasignaciones.

---

# 5. Colecci�n `devices`

Representa el cat�logo de dispositivos registrados.

## Decisi�n de modelado

Aunque los dispositivos se embeben como snapshot dentro de `users`, se mantiene una colecci�n `devices` para tener un cat�logo central de dispositivos.

## �Embeber o referenciar?

- Los datos principales del dispositivo viven en `devices`.
- En `users.devices` se guarda una referencia `deviceId` y un snapshot de los datos m�s usados.
- No se guarda una lista de usuarios dentro de `devices`.

## Ejemplo de documento
```

json { "_id": 9001, "macAddress": "AA:BB:CC:DD:EE:FF", "model": "Samsung Q80", "deviceType": "TV" }``` 

## Justificaci�n

La colecci�n `devices` permite consultar o validar dispositivos de forma independiente. El snapshot en `users` permite mostrar r�pidamente el dispositivo asociado sin hacer lookup.

## Consultas m�s f�ciles

- Buscar dispositivo por MAC address.
- Consultar modelo o tipo de dispositivo.
- Validar si un dispositivo existe.

## Consultas m�s dif�ciles

- Saber todos los usuarios hist�ricos de un dispositivo requiere buscar dentro de `users.devices`.
- Mantener sincronizados los snapshots si cambia la metadata del dispositivo.

---

# 6. Colecci�n `subscription_plans`

Representa los planes de suscripci�n disponibles.

## Decisi�n de modelado

Los planes son entidades compartidas por muchos usuarios. Por eso deben ser una colecci�n independiente.

## �Embeber o referenciar?

- Se referencian desde `users`.
- Se guarda un snapshot dentro de `users` para facilitar lectura.
- No se guarda un arreglo de usuarios dentro de cada plan, porque podr�a crecer mucho.

## Direcci�n de referencia
```

text users.planId -> subscription_plans._id``` 

## Ejemplo de documento
```

json { "_id": 2, "name": "Premium", "retentionDays": 365, "allowsAlerts": true, "price": 14.99 }``` 

## Justificaci�n

El plan es un dato compartido y relativamente estable. Referenciar evita duplicar el plan como fuente principal. El snapshot en usuario evita consultas adicionales para pantallas frecuentes.

## Consultas m�s f�ciles

- Listar planes disponibles.
- Cambiar precio o reglas de un plan en un solo documento.
- Consultar usuarios por `planId`.

## Consultas m�s dif�ciles

- Mostrar usuario con todos los datos actuales del plan requiere lookup si no se conf�a en el snapshot.
- Mantener snapshots hist�ricos sincronizados puede requerir procesos de actualizaci�n.

---

# 7. Colecci�n `user_sessions`

Representa sesiones de usuario o cliente.

## Decisi�n de modelado

Las sesiones pueden crecer mucho con el tiempo, de forma similar a la actividad. No conviene embeberlas dentro de `customers` o `users`.

## �Embeber o referenciar?

- Se referencia al cliente mediante `customerId`.
- No se referencia de vuelta desde `customers`.
- No se embebe en cliente porque es informaci�n de alto volumen.

## Direcci�n de referencia
```

text user_sessions.customerId -> customers._id``` 

## Ejemplo de documento
```

json { "_id": 80001, "customerId": 5001, "startTime": "2024-05-01T20:00:00Z", "endTime": "2024-05-01T21:15:00Z", "elapsedTime": 4500 }``` 

## Justificaci�n

Las sesiones son eventos temporales y pueden acumularse r�pidamente. Separarlas permite crear �ndices por cliente y fecha sin hacer crecer indefinidamente el documento del cliente.

## Consultas m�s f�ciles

- Sesiones recientes de un cliente.
- Duraci�n promedio de sesiones.
- Sesiones por rango de fechas.
- Clientes con mayor tiempo de uso.

## Consultas m�s dif�ciles

- Obtener cliente con todas sus sesiones en una sola lectura.
- Consultas muy agregadas pueden requerir pipelines de agregaci�n.

---

# Resumen de decisiones por relaci�n

| Relaci�n original | Decisi�n | Direcci�n de referencia | Justificaci�n |
|---|---|---|---|
| `MOVIE` - `GENRE` | Embeber g�nero en pel�cula | No aplica | El g�nero se consulta junto con la pel�cula. |
| `CUSTOMER` - `CUSTOMER_CONTACT` | Embeber | No aplica | Son datos 1:1 del cliente. |
| `CUSTOMER` - `CUSTOMER_EXTENSION` | Embeber | No aplica | Son datos demogr�ficos del mismo cliente. |
| `CUSTOMER` - `CUSTOMER_SEGMENT` | Embeber snapshot | No aplica | Facilita segmentaci�n y lectura del perfil. |
| `CUSTOMER` - `CUSTOMER_SURVEY` | Embeber | No aplica | Normalmente es 1:1 o de bajo volumen. |
| `CUSTOMER` - `CUSTOMER_FEEDBACK` | Embeber como arreglo | No aplica | �til para feedback reciente; separar si crece demasiado. |
| `ACTIVITY` - `CUSTOMER` | Referenciar | `activities.customerId -> customers._id` | Actividad es de alto volumen. |
| `ACTIVITY` - `MOVIE` | Referenciar con snapshot | `activities.movieId -> movies._id` | Permite anal�tica r�pida y mantiene v�nculo al cat�logo. |
| `ACTIVITY` - `GENRE` | Snapshot embebido | No aplica | Evita lookup para reportes por g�nero. |
| `USERS` - `SUBSCRIPTION_PLANS` | Referenciar con snapshot | `users.planId -> subscription_plans._id` | Muchos usuarios comparten un plan. |
| `USERS` - `DEVICES` | Embeber relaci�n en usuario con referencia a dispositivo | `users.devices.deviceId -> devices._id` | Cada usuario suele tener pocos dispositivos. |
| `USER_SESSIONS` - `CUSTOMER` | Referenciar | `user_sessions.customerId -> customers._id` | Las sesiones son de alto volumen. |

---

# Consultas que se vuelven m�s f�ciles

## 1. Detalle completo de pel�cula

Con una sola consulta a `movies` se obtiene:

- T�tulo.
- G�neros.
- Reparto.
- Equipo.
- Premios.
- Estudio.
- Estad�sticas b�sicas.

## 2. Perfil completo de cliente

Con una sola consulta a `customers` se obtiene:

- Datos personales.
- Direcci�n.
- Demograf�a.
- Segmento.
- Encuesta.
- Feedback reciente.

## 3. Actividad por cliente o por pel�cula

La colecci�n `activities` permite consultar r�pidamente:

- Historial reciente de un cliente.
- Pel�culas m�s vistas.
- Actividad por g�nero.
- Actividad por dispositivo.
- Actividad por fecha.

## 4. Usuario con plan y dispositivos

La colecci�n `users` contiene el plan actual y los dispositivos asignados, evitando joins frecuentes.

## 5. Anal�tica temporal

`activities` y `user_sessions` como colecciones independientes permiten �ndices y agregaciones eficientes por fecha.

---

# Consultas que se vuelven m�s dif�ciles

## 1. Consistencia global de cat�logos embebidos

Si cambia el nombre de un g�nero, segmento, plan o dispositivo, pueden existir snapshots duplicados en varios documentos.

Ejemplo:

- `movies.genres.name`
- `activities.genreSnapshot.name`

Actualizar esos datos requiere procesos batch o aceptar que son snapshots hist�ricos.

## 2. Consultas inversas

Algunas relaciones est�n optimizadas en una sola direcci�n.

Por ejemplo:

- Es f�cil obtener dispositivos de un usuario.
- Es menos directo obtener todos los usuarios hist�ricos de un dispositivo.

## 3. Reportes completamente normalizados

MongoDB facilita documentos agregados, pero los reportes que requieren datos totalmente normalizados pueden requerir pipelines con `$lookup`, `$unwind` y `$group`.

## 4. Historial completo embebido

No se embeben actividades ni sesiones dentro del cliente porque crecer�an demasiado. Por eso, obtener cliente + todo su historial requiere consultar varias colecciones.

---

# �ndices recomendados

## `movies`
```

json { "title": 1 }
json { "genres.name": 1 }
json { "year": 1 }
json { "views": -1 }``` 

## `customers`
```

json { "email": 1 }
json { "segment.segmentId": 1 }
json { "address.country": 1 }
json { "location": "2dsphere" }``` 

## `activities`
```

json { "customerId": 1, "activityTime": -1 }
json { "movieId": 1, "activityTime": -1 }
json { "genreSnapshot.name": 1, "activityTime": -1 }``` 

## `users`
```

json { "email": 1 }
json { "planId": 1 }
json { "devices.deviceId": 1 }``` 

## `devices`
```

json { "macAddress": 1 }``` 

## `subscription_plans`
```

json { "name": 1 }``` 

## `user_sessions`
```

json { "customerId": 1, "startTime": -1 }``` 

---

# Conclusión

El modelo documental propuesto usa una estrategia mixta:

- **Embeber** datos 1:1 o de bajo volumen que se consultan junto con la entidad principal.
- **Referenciar** datos de alto volumen, compartidos o con ciclo de vida independiente.
- Usar **snapshots embebidos** cuando se quiere acelerar lectura sin perder una referencia a la entidad principal.

El resultado es un modelo optimizado para las consultas habituales de MovieStream, especialmente lectura de cat�logo, perfil de cliente, actividad reciente, sesiones y administraci�n b�sica de usuarios, planes y dispositivos.