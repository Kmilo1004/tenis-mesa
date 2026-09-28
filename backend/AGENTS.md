# Base de datos: producción y desarrollo

La base de datos vive en Neon. La rama `main` es **producción**: tiene los usuarios, partidos y el
ranking reales del club. Para desarrollo local se usa una **rama aparte** de Neon.

## Nunca ejecutar contra producción

`prisma migrate dev`, `prisma migrate reset` y `prisma db push` pueden ofrecer borrar y recrear la
base cuando detectan que el esquema no coincide con el historial de migraciones. Contra producción
eso borra todo el club.

Por eso las migraciones de desarrollo se corren **siempre** con los scripts de npm, que pasan
primero por `scripts/proteger-migraciones.js` y abortan si el `.env` apunta al endpoint de
producción:

```bash
npm run prisma:migrate    # en vez de: npx prisma migrate dev
npm run prisma:reset      # en vez de: npx prisma migrate reset
```

El guardia solo cubre esos scripts. Ejecutar `npx prisma migrate dev` directamente lo evita, así
que no se hace.

`prisma migrate deploy` es la excepción: no borra datos, aplica las migraciones pendientes y es el
que corre Render al desplegar. Ese sí va contra producción y no pasa por el guardia.

## Al terminar una tarea

Si durante el desarrollo se crearon datos de prueba (usuarios, torneos, partidos), hay que
borrarlos. Ojo: `Auditoria` tiene una llave foránea con `RESTRICT` hacia `Usuario`, así que para
borrar un usuario de prueba primero hay que borrar sus filas de auditoría.
