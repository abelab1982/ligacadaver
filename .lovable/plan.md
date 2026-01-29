

## Plan: Eliminar la Columna Fair Play (FP)

### Resumen
Remover completamente la columna de Fair Play de la tabla de posiciones ya que no es relevante para el usuario.

---

### Cambios a Realizar

#### 1. StandingsView.tsx
- Eliminar la columna FP de la cabecera de la tabla (línea 401)
- Eliminar la celda FP con los botones +/- del componente `TeamRow` (líneas 126-150)
- Remover la prop `onUpdateFairPlay` del componente `TeamRow` ya que no será necesaria

#### 2. useLeagueEngine.ts
- Eliminar el criterio de desempate por Fair Play en la función `sortTeams` (línea 96)
- Mantener el campo `fairPlay` en 0 por compatibilidad de tipos, pero remover la lógica activa

#### 3. useLiveLeagueEngine.ts
- Verificar si tiene lógica de Fair Play similar que deba limpiarse

#### 4. Limpieza de Props
- Actualizar las interfaces de `TeamRowProps` y `StandingsViewProps` para remover referencias a Fair Play

---

### Resultado Final
- La tabla mostrará las columnas: #, Equipo, PJ, G, E, P, GF, GC, DG, Pts
- El desempate será por: Puntos → Diferencia de Goles → Goles a Favor → Orden alfabético
- Interfaz más limpia sin controles innecesarios

