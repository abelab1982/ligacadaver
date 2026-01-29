

## Plan: Limpiar Fixtures de Prueba

### Objetivo
Eliminar los fixtures de demostración (`r1m6`, `r1m7`) de la base de datos para dejar el sistema limpio y listo para datos reales.

### Acción

Ejecutar una consulta DELETE para eliminar los registros de prueba:

```sql
DELETE FROM fixtures WHERE id IN ('r1m6', 'r1m7');
```

### Resultado Esperado
- Base de datos de fixtures vacía (0 registros)
- El frontend mostrará únicamente los datos del archivo `fixture.json` estático
- Sistema listo para recibir datos reales de la API de livescore

### Consideración
Los fixtures del archivo `src/data/fixture.json` seguirán funcionando normalmente ya que el hook `useFixtures` combina datos de Supabase con el JSON local.

