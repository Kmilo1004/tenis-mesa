# Backend — App de ranking de tenis de mesa

Backend completo del alcance v1 (Fases 0 a 8 del plan de implementación):
Express + Prisma + PostgreSQL, con autenticación, partidos, ranking Oficial/No
Oficial, torneos (eliminación directa, grupos y mixto), panel de administración
con auditoría, notificaciones in-app y reportes.

## Requisitos
- Node.js 18+
- Docker (para levantar PostgreSQL local) o una base de datos PostgreSQL ya disponible

## Instalación

```bash
cd backend
npm install
cp .env.example .env
```

## Levantar la base de datos local

```bash
docker compose up -d
```

Esto levanta PostgreSQL en `localhost:5432` con las credenciales que ya están
en `.env.example` (usuario `tenismesa`, base `tenismesa`).

Si prefieres usar Supabase o Neon en vez de Docker, reemplaza `DATABASE_URL`
en tu `.env` por la cadena de conexión que ellos te den.

## Generar el cliente de Prisma y correr la primera migración

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Esto crea las tablas `usuarios` y `usuario_roles` según el esquema en
`prisma/schema.prisma` (sección 7.1–7.2 del documento de requerimientos).

## Correr el servidor

```bash
npm run dev
```

Y probar:

```bash
curl http://localhost:3000/api/v1/health
```

Deberías ver algo como:

```json
{
  "servidor": "ok",
  "hora": "2026-08-17T...",
  "baseDeDatos": "ok"
}
```

Si `baseDeDatos` sale en `"error"`, revisa que Docker esté corriendo
(`docker compose ps`) y que `DATABASE_URL` en tu `.env` sea correcto.

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor con recarga automática (nodemon) |
| `npm run prisma:studio` | Abre una interfaz visual para ver/editar los datos |
| `npx prisma migrate dev` | Aplica cambios del esquema como nueva migración |

## Autenticación (Fase 1)

- `POST /api/v1/auth/registro` — crea un usuario (`nombre`, `correo`, `password`, `tipo`, y opcionalmente `procedencia`/`programaFacultad`). Asigna el rol `jugador` por defecto y devuelve el usuario junto con un token JWT.
- `POST /api/v1/auth/login` — recibe `correo` y `password`, devuelve el usuario y un token JWT.
- `GET /api/v1/usuarios/me` — requiere header `Authorization: Bearer <token>`, devuelve los datos del usuario autenticado.

El middleware de autenticación (`verificarToken`) y de roles (`requiereRol`)
vive en `src/middleware/auth.middleware.js`.

## Partidos casuales y ranking No Oficial (Fase 2)

- `POST /api/v1/partidos` — registra un partido casual entre dos usuarios internos (`jugadorBId`, `sets`, `fechaPartido`). Si lo registra un jugador queda en estado `pendiente` con 2 días para que el rival lo confirme (RF-06); si lo registra un árbitro o administrador queda `confirmado` de inmediato (RF-07).
- `GET /api/v1/partidos?usuario_id=&estado=` — lista partidos, aplicando antes la expiración perezosa de pendientes vencidos (RF-06b).
- `GET /api/v1/partidos/{id}` — detalle de un partido.
- `POST /api/v1/partidos/{id}/confirmar` — el rival confirma el resultado; aplica el cálculo de ELO no oficial de forma transaccional.
- `POST /api/v1/partidos/{id}/disputar` — el rival disputa el resultado (`motivo`, `marcadorPropuesto` opcional, `comentario`); el partido pasa a `en_revision` y no afecta el ranking (RF-09c).
- `POST /api/v1/partidos/{id}/resolver-disputa` — solo admin: `confirmar_original`, `aceptar_propuesto` o `anular`.
- `POST /api/v1/partidos/{id}/validar` — solo admin: rescata un partido `descartado` (vencido sin confirmación) y lo confirma (RF-06c).
- `GET /api/v1/ranking/no-oficial` — tabla de ranking no oficial, paginada.
- `GET /api/v1/usuarios/{id}/historial-ranking?tipo=no_oficial` — evolución del ELO de un jugador.

El cálculo de ELO (fórmula de la sección 6.2, K=16 para partidos casuales) vive
como función pura en `src/lib/elo.js`. La validación del marcador (sets al mejor
de 5 o 7, RF-08) vive en `src/lib/marcador.js`. La expiración a 2 días (RF-06b) y
la actualización transaccional del ranking al confirmar un resultado viven en
`src/lib/partidos.service.js`.

## Usuarios externos (RF-02)

- `POST /api/v1/usuarios/externos` — solo admin: crea un perfil ligero (`nombre`, `procedencia` opcional) sin correo ni contraseña, para invitados de torneos abiertos que no usan la app.

## Torneos e inscripciones (Fase 3)

- `POST /api/v1/torneos` — solo admin: crea un torneo (`nombre`, `tipo`: flash/oficial, `alcance`: interno/abierto, `formato`, `fechaInicio`, `fechaFin`, `fechaLimiteInscripcion`). Nace en estado `inscripciones_abiertas` (RF-10, RF-10b).
- `GET /api/v1/torneos?tipo=&alcance=&estado=` / `GET /api/v1/torneos/{id}` — listar/consultar (público). Cierra automáticamente las inscripciones vencidas antes de responder (verificación perezosa, mismo patrón que la expiración de partidos).
- `PATCH /api/v1/torneos/{id}` — solo admin: edita nombre, formato, fechas y configuración de grupos.
- `POST /api/v1/torneos/{id}/cerrar-inscripciones` — solo admin: cierre manual (RF-10b).
- `POST /api/v1/torneos/{id}/inscripciones` — el jugador se autoinscribe; valida que las inscripciones estén abiertas y que, si el torneo es interno, el usuario sea interno (RF-10c2).
- `DELETE /api/v1/torneos/{id}/inscripciones/me` — retirar mi inscripción.
- `GET /api/v1/torneos/{id}/inscripciones` — listar inscritos (público).
- `POST /api/v1/torneos/{id}/inscripciones/manual` — solo admin: inscribe a un jugador externo (solo en torneos de alcance abierto, RF-10c).

## Cuadro de eliminación directa y ranking Oficial (Fase 4)

- `POST /api/v1/torneos/{id}/cuadro/generar` — solo admin: genera el cuadro automáticamente a partir de los inscritos (RF-11), una vez cerradas las inscripciones. Solo soporta `formato: "eliminacion_directa"` por ahora (grupos/mixto quedan para la Fase 5). Body opcional `{ "siembra": "ranking" | "aleatorio" }` (por defecto aleatorio); con `"ranking"` se siembra por `eloOficial` con el orden estándar de un cuadro (para que las semillas altas no se crucen antes de la final). Si el número de inscritos no es potencia de 2, reparte los "byes" (pases directos) entre las semillas más altas.
- `GET /api/v1/torneos/{id}/cuadro` — consulta el árbol completo del cuadro (público), con jugadores, ganador y sets de cada partido.
- `POST /api/v1/partidos/{id}/resultado` — solo admin o árbitro: registra el marcador de un partido de torneo ya emparejado. Al confirmarse, el ganador avanza automáticamente al siguiente partido del cuadro (RF-12); si era la final, el torneo pasa a `finalizado` (RF-14).
- `POST /api/v1/partidos/{id}/validar` — ahora también cubre RF-16d: si el partido es un amistoso ya `confirmado` (no oficial) y no fue promovido antes, lo promueve a oficial (aplica el ELO oficial con K=20, de forma independiente del ELO no oficial ya aplicado).
- `GET /api/v1/ranking/oficial` — tabla de ranking oficial, mismo formato que el no oficial.

El K-factor de cada partido de torneo depende de `tipo`/`alcance` del torneo (24 oficial interno,
32 oficial abierto, 20 flash) y vive en `src/lib/elo.js` (`kTorneo`). La construcción de la
estructura del cuadro (siembra, byes, nombres de ronda) es una función pura y testeable en
`src/lib/cuadro.service.js`. La propagación del ganador al siguiente partido y el cierre del
torneo al confirmarse la final viven en `confirmarResultado` (`src/lib/partidos.service.js`),
reutilizada tanto para partidos casuales como de torneo.

Nota: los jugadores externos, por defecto, quedan aislados del ranking general (sección 6.4 del
documento) — `/ranking/oficial` y `/ranking/no-oficial` solo incluyen usuarios internos.

## Fase de grupos (Fase 5)

- `POST /api/v1/torneos/{id}/grupos/generar` — solo admin, formato `grupos` o `mixto`: crea `numeroGrupos` grupos ("Grupo A", "Grupo B"...) una vez cerradas las inscripciones. `metodoAsignacion`: `"aleatorio"`, `"ranking_serpentina"` (siembra en zigzag por `eloOficial`) o `"manual"` (grupos vacíos, se asignan después). Para formato `mixto` requiere `clasificadosPorGrupo`.
- `GET /api/v1/torneos/{id}/grupos` — listar grupos y sus jugadores (público).
- `PATCH /api/v1/torneos/{id}/grupos/{grupoId}` — solo admin: asigna o mueve un jugador a ese grupo (RF-11b manual y RF-11c mover entre grupos); solo antes de publicar.
- `POST /api/v1/torneos/{id}/grupos/publicar` — solo admin: valida que todos los inscritos estén asignados, genera todos los partidos de todos-contra-todos de cada grupo, y pasa el torneo a `en_curso`. A partir de aquí los grupos ya no se pueden editar.
- `GET /api/v1/torneos/{id}/grupos/{grupoId}/tabla` — tabla de posiciones del grupo (RF-11e: PJ/PG/PP/sets a favor/en contra), calculada a partir de los partidos confirmados.

Cuando se confirma el último partido de grupos pendiente de un torneo (vía `POST /partidos/{id}/resultado`):
- si el formato es `"grupos"`, el torneo pasa directo a `finalizado` (RF-14);
- si es `"mixto"`, el sistema toma los `clasificadosPorGrupo` mejores de cada grupo (siembra cruzada: 1° de cada grupo, luego 2° de cada grupo...) y genera automáticamente el cuadro de eliminación directa (RF-11d), reutilizando la misma lógica de `POST /torneos/{id}/cuadro/generar` de la Fase 4.

Esta lógica vive en `src/lib/grupos.service.js` (`calcularTablaGrupo`,
`manejarFinDeFaseDeGrupos`), enganchada dentro de `confirmarResultado`
(`src/lib/partidos.service.js`).

## Panel de administración y auditoría (Fase 6)

- `PATCH /api/v1/partidos/{id}` — solo admin: edita el marcador o anula (`{"anular": true}`) cualquier partido ya `confirmado`, con `motivo` opcional. Revierte el efecto que ese partido tuvo en el ranking (restando exactamente el delta que aportó, no fijando un valor absoluto, para no pisar cambios de partidos posteriores) y, si se edita, vuelve a aplicar el resultado nuevo — incluida la re-promoción a oficial si el partido ya había sido promovido (RF-19). Bloquea la edición con 409 si el resultado ya avanzó a un partido posterior del cuadro que ya se jugó, o si la fase de grupos del torneo ya concluyó.
- `GET /api/v1/auditoria?entidadTipo=&entidadId=&usuarioId=` — solo admin: consulta el log de auditoría (RNF-06), paginado.

RNF-06 exige que toda ruta administrativa que modifique datos quede registrada en
auditoría; además del nuevo `PATCH /partidos/{id}`, ya quedaron instrumentadas
`POST /torneos`, `PATCH /torneos/{id}`, `cerrar-inscripciones`, `inscripciones/manual`,
`cuadro/generar`, `grupos/generar`, mover jugador de grupo, `grupos/publicar`,
`resolver-disputa`, `validar` (rescate y promoción) y `POST /usuarios/externos`.
El helper vive en `src/lib/auditoria.service.js`.

La "vista de gestión del torneo" (RF-14b) se arma en el cliente combinando los
endpoints ya existentes: inscritos (`GET /torneos/{id}/inscripciones`), cuadro
(`GET /torneos/{id}/cuadro`), tabla de grupos (`GET /torneos/{id}/grupos/{grupoId}/tabla`)
y el nuevo `PATCH /partidos/{id}` para corregir o anular cualquier resultado.

## Notificaciones y reportes (Fase 7)

Notificaciones in-app (sección 9: sin push en v1):

- `GET /api/v1/notificaciones?leida=true|false` — notificaciones del usuario autenticado, paginado.
- `PATCH /api/v1/notificaciones/{id}/leida` — marcar como leída (solo el dueño).

Se generan automáticamente:
- **RF-20**: al registrar un partido casual que queda `pendiente`, se notifica al rival que debe confirmarlo.
- **RF-21**: al quedar listo un partido de torneo con ambos jugadores ya definidos (al generar el cuadro/grupos, o al avanzar de ronda), se notifica a ambos jugadores.
- **RF-22**: cada vez que cambia el ELO de un jugador (oficial o no oficial), se le notifica su nueva posición en ese ranking.

El helper vive en `src/lib/notificaciones.service.js`, enganchado en `partidos.service.js`,
`cuadro.service.js` y las rutas de partidos/torneos correspondientes.

Reportes (solo admin):

- `GET /api/v1/reportes/ranking?tipo=oficial|no_oficial&formato=pdf|csv` — exporta la tabla de ranking.
- `GET /api/v1/reportes/torneo/{id}?formato=pdf|csv` — exporta los partidos y resultados de un torneo.
- `GET /api/v1/reportes/estadisticas` — partidos confirmados, torneos por estado, jugadores más activos (JSON).

CSV se genera a mano (`src/lib/csv.js`, sin dependencias) y PDF con `pdfkit`
(`src/lib/pdf.js`, nueva dependencia agregada en esta fase).

## Pulido y entrega (Fase 8)

Revisión de los requerimientos no funcionales (sección 5) contra el backend:

| RNF | Estado | Notas |
|---|---|---|
| RNF-01 (offline solo lectura) | No aplica al backend | Es responsabilidad del cliente móvil (cachear la última respuesta) |
| RNF-02 (< 2s en consultas) | ✅ Verificado | Endpoints de ranking/torneos responden en < 1s contra la base en Neon |
| RNF-03 (JWT + correo/contraseña) | ✅ Hecho | Fase 1 |
| RNF-04 (Ley 1581, consentimiento de externos) | ✅ Corregido en esta fase | `POST /usuarios/externos` ahora exige `consentimientoDatos: true`; se guarda `fechaConsentimiento` |
| RNF-05 (usabilidad) | No aplica al backend | Es del cliente móvil |
| RNF-06 (auditoría) | ✅ Hecho | Fase 6 |
| RNF-07 (300–500 usuarios concurrentes) | Razonable | Cliente Prisma como instancia única, Neon vía pooler; sin pruebas de carga reales |
| RNF-08 (Android 10+ / iOS 15+) | No aplica al backend | Es del cliente móvil |

Lo que queda de la Fase 8 es responsabilidad del equipo, no del código:
**pruebas con usuarios reales del club** (idealmente un torneo Flash piloto)
y la **documentación final de entrega** para la universidad.

## Desplegar a producción (Render)

Hasta ahora el backend solo corrió en `localhost`. Para que el celular de otra
persona (fuera de tu WiFi) pueda usarlo — necesario para un torneo piloto real —
hay que desplegarlo a un servidor público. `render.yaml` ya deja la configuración
lista para un despliegue tipo Blueprint:

1. Sube este repositorio a GitHub (si no lo has hecho: `git remote add origin <url>` y `git push -u origin master`).
2. En [render.com](https://render.com), crea una cuenta y elige **New → Blueprint**, apuntando a este repositorio. Render detecta `backend/render.yaml` automáticamente.
3. Cuando te pida las variables de entorno marcadas `sync: false`, usa los mismos valores de tu `backend/.env`:
   - `DATABASE_URL`: la cadena de conexión de Neon (la misma que ya usas en desarrollo — no hace falta una base de datos separada para el piloto).
   - `JWT_SECRET`: el mismo secreto que ya tienes generado.
4. Render instala dependencias, corre `npx prisma migrate deploy` (aplica las migraciones ya creadas, sin generar unas nuevas) y arranca el servidor.
5. Cuando termine, confirma que responde desde internet (no solo en tu red):
   ```bash
   curl https://tu-servicio.onrender.com/api/v1/health
   ```
6. Actualiza `app/.env` (`EXPO_PUBLIC_API_URL`) con esa URL pública en vez de la IP local, para que la app funcione desde cualquier red — ver el README de `/app`.

Nota: el plan gratuito de Render "duerme" el servicio tras un rato sin tráfico y
tarda unos segundos en despertar con la primera petición — normal para un piloto,
pero considera un plan pago si el torneo real necesita respuesta inmediata todo
el tiempo.

## Próximos pasos

El alcance de v1 definido en la sección 2 del documento está completo (Fases 0 a 8).
Todo lo que sigue (dobles, transmisión en vivo, versión web pública, SSO/LDAP,
notificaciones push, sincronización offline con escritura) queda explícitamente
para v2 — ver secciones 2 y 9 del documento de requerimientos.
