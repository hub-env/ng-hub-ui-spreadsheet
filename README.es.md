# ng-hub-ui-spreadsheet

**Español** | [English](./README.md)

[![NPM Version](https://img.shields.io/npm/v/ng-hub-ui-spreadsheet.svg)](https://www.npmjs.com/package/ng-hub-ui-spreadsheet)
[![Angular](https://img.shields.io/badge/Angular-22%2B-red.svg)](https://angular.dev)
[![License](https://img.shields.io/npm/l/ng-hub-ui-spreadsheet.svg)](LICENSE)

Una hoja de celdas editable para Angular 22+: se escribe dentro, se recorre con el teclado y se pega en ella desde Excel. Selección rectangular, portapapeles que va y viene en los dos sentidos, paneles congelados y un estado de guardado por celda, todo desde un único elemento `<hub-spreadsheet>`. Semántica de rejilla de verdad, no una tabla maquillada para parecerlo. Sin nivel de pago, sin funciones bloqueadas y sin nada ajeno a Angular entre sus dependencias: las primitivas de rejilla viven en `ng-hub-ui-utils`, no en `@angular/cdk`.

## Documentación y ejemplos en vivo

Este paquete forma parte de [Hub UI](https://hubui.dev/es/), una colección de bibliotecas de componentes de Angular para aplicaciones autónomas.

- Documentación: https://hubui.dev/es/spreadsheet/overview/
- Ejemplos en vivo: https://hubui.dev/es/spreadsheet/examples/
- Hub UI: https://hubui.dev/es/
- Hub UI en GitHub (incidencias, hoja de ruta y contribuciones): https://github.com/hub-env/hub-ui

## 🧩 Familia de bibliotecas `ng-hub-ui`

Esta biblioteca forma parte del ecosistema **ng-hub-ui**:

- [**ng-hub-ui-action-sheet**](https://www.npmjs.com/package/ng-hub-ui-action-sheet)
- [**ng-hub-ui-avatar**](https://www.npmjs.com/package/ng-hub-ui-avatar)
- [**ng-hub-ui-badges**](https://www.npmjs.com/package/ng-hub-ui-badges)
- [**ng-hub-ui-board**](https://www.npmjs.com/package/ng-hub-ui-board)
- [**ng-hub-ui-breadcrumbs**](https://www.npmjs.com/package/ng-hub-ui-breadcrumbs)
- [**ng-hub-ui-buttons**](https://www.npmjs.com/package/ng-hub-ui-buttons)
- [**ng-hub-ui-calendar**](https://www.npmjs.com/package/ng-hub-ui-calendar)
- [**ng-hub-ui-ds**](https://www.npmjs.com/package/ng-hub-ui-ds)
- [**ng-hub-ui-forms**](https://www.npmjs.com/package/ng-hub-ui-forms)
- [**ng-hub-ui-history**](https://www.npmjs.com/package/ng-hub-ui-history)
- [**ng-hub-ui-icons**](https://www.npmjs.com/package/ng-hub-ui-icons)
- [**ng-hub-ui-loading**](https://www.npmjs.com/package/ng-hub-ui-loading)
- [**ng-hub-ui-metrics**](https://www.npmjs.com/package/ng-hub-ui-metrics)
- [**ng-hub-ui-milestones**](https://www.npmjs.com/package/ng-hub-ui-milestones)
- [**ng-hub-ui-modal**](https://www.npmjs.com/package/ng-hub-ui-modal)
- [**ng-hub-ui-nav**](https://www.npmjs.com/package/ng-hub-ui-nav)
- [**ng-hub-ui-paginable**](https://www.npmjs.com/package/ng-hub-ui-paginable)
- [**ng-hub-ui-panels**](https://www.npmjs.com/package/ng-hub-ui-panels)
- [**ng-hub-ui-portal**](https://www.npmjs.com/package/ng-hub-ui-portal)
- [**ng-hub-ui-signature**](https://www.npmjs.com/package/ng-hub-ui-signature)
- [**ng-hub-ui-skeleton**](https://www.npmjs.com/package/ng-hub-ui-skeleton)
- [**ng-hub-ui-sortable**](https://www.npmjs.com/package/ng-hub-ui-sortable)
- [**ng-hub-ui-spreadsheet**](https://www.npmjs.com/package/ng-hub-ui-spreadsheet) ← Estás aquí
- [**ng-hub-ui-stepper**](https://www.npmjs.com/package/ng-hub-ui-stepper)
- [**ng-hub-ui-toast**](https://www.npmjs.com/package/ng-hub-ui-toast)
- [**ng-hub-ui-utils**](https://www.npmjs.com/package/ng-hub-ui-utils)

## 📑 Índice

- [📦 Descripción](#-descripción)
- [✨ Características](#-características)
- [⚙️ Instalación](#️-instalación)
- [🚀 Inicio rápido](#-inicio-rápido)
- [📊 Columnas](#-columnas)
- [⌨️ Teclado](#️-teclado)
- [📋 El portapapeles](#-el-portapapeles)
- [❄️ Paneles congelados](#️-paneles-congelados)
- [💾 Estado de guardado](#-estado-de-guardado)
- [➕ Añadir y quitar filas y columnas](#-añadir-y-quitar-filas-y-columnas)
- [📖 Referencia de la API](#-referencia-de-la-api)
- [Archivos](#archivos)
- [🎨 Estilos](#-estilos)
- [♿ Accesibilidad](#-accesibilidad)
- [🤝 Contribuir](#-contribuir)
- [📄 Soporte y licencia](#-soporte-y-licencia)

## 📦 Descripción

`<hub-spreadsheet>` dibuja las filas y columnas que ya tienes, y te cuenta qué ha hecho el lector con ellas. Nunca escribe en tus datos. Tú describes cada columna —qué enseña, si se puede escribir en ella— y atiendes `commit`, `pasted` y `cleared` como te convenga: escribiendo en un almacén, mandándolo a un servidor o ignorándolo.

Esa separación es deliberada. Es lo que permite que el mismo componente sirva para una factura, una tarifa y un parte de horas sin saber nada de facturas, tarifas ni horas.

## ✨ Características

- **Dos identidades por columna.** Un alias estable al que apunta todo lo que se guarda, y una cabecera visible que puedes reescribir cuando quieras sin romper ni una referencia.
- **El teclado de edición de Excel**, hasta en los detalles: escribir sustituye, `F2` conserva, `Intro` confirma y baja, `Tab` confirma y avanza, `Escape` revierte.
- **Selección rectangular** con mayúsculas y flechas, con mayúsculas y clic, o arrastrando, y **varios bloques a la vez** con `Ctrl` pulsado. `Supr` vacía todos; copiar funciona cuando los bloques se alinean y se rechaza cuando no, igual que lo rechaza una hoja de cálculo.
- **Un portapapeles que de verdad va y viene con Excel.** Escribe los dos formatos, lee los dos, y recupera el número crudo del HTML, así que una cifra copiada donde se escribe `1.234,56` llega como `1234.56`.
- **Paneles congelados**, contados desde el borde como los congela Excel.
- **Cinco estados de guardado por celda**, dibujados como una barra y no como una insignia.
- **Celdas que abren algo**, dichas por su propia plantilla e informadas por `opened` — con el puntero y con `Intro`. El detalle propio de una fila se abre **en su sitio**, bajo una plantilla `expansion`.
- **Columnas y filas plegables**, por nivel de esquema — el agrupado de Excel: una tirada en un nivel se pliega con un solo botón, y qué grupos están plegados es tuyo.
- **Salida estructurada por alias**: `{ price: 12, units: 3 }`, no una rejilla de coordenadas.
- **Semántica de rejilla real** —`role="grid"`, índices de fila y columna, `aria-selected`, una parada de tabulación que viaja— para que un lector de pantalla pueda recorrerla.
- **A prueba de métodos de escritura.** El `Intro` que confirma un carácter chino, japonés o coreano no confirma la celda.
- **72 variables CSS** que heredan de `--hub-table-*` antes de caer en el sistema de diseño.
- **Salida a un `.xlsx` de verdad y vuelta**, con los números como números y las fechas como fechas — y a CSV, con el separador que espera el idioma de quien lo abre. El zip y el XML se escriben aquí, así que exportar no trae ninguna dependencia.
- **Sin `@angular/cdk`.** Las primitivas de rejilla están en `ng-hub-ui-utils`.

## ⚙️ Instalación

```bash
npm install ng-hub-ui-spreadsheet ng-hub-ui-utils
```

`ng-hub-ui-ds` es opcional. Sin él, cada variable cae en un valor fijo y la hoja se dibuja igual.

## 🚀 Inicio rápido

```typescript
import { Component, signal } from '@angular/core';
import { HubSpreadsheetColumn, HubSpreadsheetCommit, HubSpreadsheetComponent } from 'ng-hub-ui-spreadsheet';

interface Line {
	id: string;
	product: string;
	units: number | null;
	price: number | null;
}

@Component({
	selector: 'app-order',
	standalone: true,
	imports: [HubSpreadsheetComponent],
	template: `
		<hub-spreadsheet
			[rows]="lines()"
			[columns]="columns"
			[rowKey]="rowKey"
			[frozenColumns]="1"
			(commit)="onCommit($event)"
		/>
	`
})
export class OrderComponent {
	protected readonly lines = signal<Line[]>([
		{ id: 'a', product: 'M6 bolt', units: 1200, price: 0.12 },
		{ id: 'b', product: 'M6 washer', units: 3400, price: 0.04 }
	]);

	protected readonly rowKey = (row: Line) => row.id;

	protected readonly columns: HubSpreadsheetColumn<Line>[] = [
		{ key: 'product', header: 'Product', cell: (row) => ({ value: row.product, editable: true }) },
		{ key: 'units', header: 'Units', kind: 'number', align: 'end', cell: (row) => ({ value: row.units, editable: true }) },
		{
			key: 'price',
			header: 'Unit price',
			kind: 'currency',
			align: 'end',
			cell: (row) => ({ value: row.price, editable: true })
		},
		{
			key: 'total',
			header: 'Total',
			kind: 'currency',
			align: 'end',
			cell: (row) => ({ value: (row.units ?? 0) * (row.price ?? 0), muted: true })
		}
	];

	protected onCommit(change: HubSpreadsheetCommit<Line>): void {
		this.lines.update((lines) =>
			lines.map((line) => (line.id === change.row.id ? { ...line, [change.column.key]: change.value } : line))
		);
	}
}
```

La columna `total` no lleva `editable`, así que no se puede escribir en ella. Si pegas un bloque encima, esos valores se cuentan como `skipped` en vez de escribirse.

## 📊 Columnas

Una columna dice cómo se llama y cómo sacar una celda de una fila:

```typescript
{
	key: 'price',              // stable; what stored state and formulas point at
	header: 'Unit price',      // visible; rename freely
	kind: 'currency',          // 'text' | 'number' | 'currency'
	align: 'end',
	minWidth: '8rem',
	cell: (row) => ({ value: row.price, editable: true })
}
```

**Por qué dos nombres.** Si el nombre visible es la clave, renombrar una columna obliga a reescribir todas las referencias a ella: el error que cometió Excel, y la razón de que allí una columna renombrada rompa fórmulas por todo el libro. Manteniéndolos separados, renombrar es solo renombrar.

Leer la hoja como datos planos con los alias por clave:

```typescript
import { spreadsheetRecords } from 'ng-hub-ui-spreadsheet';

spreadsheetRecords(this.lines(), this.columns);
// [{ product: 'M6 bolt', units: 1200, price: 0.12, total: 144 }, …]
```

Una celda puede además **abrir algo** —un detalle en otro sitio, un panel, otra página—. La celda la
dibuja una plantilla tuya, `hubSpreadsheetCell`, así que la entrada se dibuja ahí también; lo único
que la plantilla tiene que decir en voz alta es que la celda abre, con `hubSpreadsheetCellAction`,
que es lo que le guarda el `Intro` a la celda:

```html
<hub-spreadsheet [rows]="products()" [columns]="columns" [rowKey]="rowKey" (opened)="onOpened($event)">
	<ng-template hubSpreadsheetCell="name" hubSpreadsheetCellAction="Abrir el producto" let-value let-open="open">
		<a (click)="open()">{{ value }}</a>
	</ng-template>
</hub-spreadsheet>
```

`open()` se le entrega a la plantilla y avisa de la intención por `opened`; la hoja no abre nada por
su cuenta. Una celda editable conserva `Intro` para editar, y el portapapeles sigue llevando el
valor, no el dibujo.

`hubSpreadsheetCellAction` también puede ser **una función de la fila**, para una columna donde solo
abren algunas celdas — un producto cuya fila plegada abre sus variantes mientras la suya solo se lee:

```html
<ng-template
	hubSpreadsheetCell="name"
	[hubSpreadsheetCellRows]="products()"
	[hubSpreadsheetCellAction]="opensItsVariants"
	let-row="row"
	let-open="open"
>
	@if (opensItsVariants(row)) {
		<a (click)="open()">{{ row.name }}</a>
	} @else {
		{{ row.name }}
	}
</ng-template>
```

Entonces `Intro` abre las filas para las que la función responde, y deja las demás a la hoja.

Para una celda que abre el detalle propio de la fila, pon el detalle en una plantilla `expansion` y deja que `expandedRow` nombre la fila abierta:

```html
<hub-spreadsheet
	[rows]="rows()"
	[columns]="columns"
	[rowKey]="rowKey"
	[expansion]="rowDetail"
	[(expandedRow)]="openRow"
	(opened)="onOpened($event)"
/>

<ng-template #rowDetail let-row let-close="close">
	<!-- lo que la fila guarda detrás de sus cifras, dibujado bajo la fila misma -->
	<hub-button (click)="close()">Cerrar</hub-button>
</ng-template>
```

`expandedRow` es bidireccional y nombra la fila por su clave; la plantilla recibe la fila, su índice, su clave y una forma de cerrarla. Solo hay una fila abierta a la vez.

## ⌨️ Teclado

| Tecla                            | Qué hace                                                  |
| -------------------------------- | --------------------------------------------------------- |
| Flechas                          | Mover una celda                                           |
| Mayús + flechas                  | Extender la selección                                     |
| `Tab` / `Mayús+Tab`              | Moverse de lado, cayendo en la fila siguiente en el borde |
| `Inicio` / `Fin`                 | Primera y última celda de la fila                         |
| `Ctrl+Inicio` / `Ctrl+Fin`       | Primera y última celda de la hoja                         |
| `Re Pág` / `Av Pág`              | Moverse `pageSize` filas                                  |
| Cualquier carácter imprimible    | Sustituir la celda y empezar a editar                     |
| `F2`, `Intro`                    | Editar conservando el valor                               |
| `Alt` + `Abajo`                  | Abrir una celda que lleva una lista o una fecha           |
| `Intro` / `Tab` al editar        | Confirmar y bajar / avanzar                               |
| `Escape`                         | Revertir la edición, y después deshacer la selección      |
| `Supr` / `Retroceso`             | Vaciar todas las celdas editables de la selección         |
| `Ctrl+C` / `X` / `V`             | Copiar, cortar, pegar                                     |
| `Ctrl+A`                         | Seleccionar la hoja                                       |
| `Ctrl+Espacio` / `Mayús+Espacio` | Seleccionar la columna / la fila                          |

## 📋 El portapapeles

Al copiar se escriben dos formatos: texto separado por tabuladores, y HTML con cada número en crudo. Al pegar se leen los dos y gana el crudo, que es lo que hace que una cifra sobreviva a un viaje entre idiomas: `1.234,56` copiado en España llega como `1234.56` y no como texto.

`decimalMark` dice con qué carácter escribe los decimales este lector; es `','` por defecto y solo importa cuando el origen no dio un valor crudo.

```html
<hub-spreadsheet [decimalMark]="'.'" ... />
```

Cada pegado cuenta lo que ha pasado:

```typescript
protected onPaste(paste: HubSpreadsheetPaste<Line>): void {
	for (const change of paste.cells) { /* write it */ }

	// paste.skipped  — fell outside the sheet or on a read-only cell
	// paste.rejected — did not read as a number in a figure column
	// paste.range    — the rectangle it covered
}
```

## ❄️ Paneles congelados

```html
<hub-spreadsheet [frozenColumns]="1" [frozenRows]="2" style="--hub-spreadsheet-max-block-size: 60vh" />
```

Contados desde el borde inicial, como congela paneles Excel. Ponle una altura, o la hoja no se desplaza nunca y una cabecera congelada no tiene contra qué quedarse quieta.

## 💾 Estado de guardado

Le pasas un mapa con la clave de la fila y el alias de la columna unidos por un tabulador:

```typescript
states = signal<Record<string, HubSpreadsheetCellState>>({
	'a\tprice': 'saving',
	'b\tunits': 'error'
});
```

`pending`, `saving`, `saved`, `error` y `conflict` pintan una barra en el margen inicial de la celda. `saving` marca además `aria-busy`. `conflict` va a rayas en vez de solo en rojo, para distinguirlo de `error` sin depender del color.

## ➕ Añadir y quitar filas y columnas

La hoja pregunta; tú decides. No se ofrece nada hasta que lo permitas:

```html
<hub-spreadsheet
	[structure]="{ insertRows: true, deleteRows: (row, index) => index > 0 }"
	[retiredColumnKeys]="retired()"
	(insertRequested)="onInsert($event)"
	(deleteRequested)="onDelete($event)"
/>
```

Una petición de insertar columna trae un `key` que nunca ha pertenecido a otra columna de esta hoja: pásale por `retiredColumnKeys` todos los alias que hayas usado alguna vez, incluidos los borrados. Reutilizar un alias muerto hace que todo lo que apuntaba a la columna vieja apunte en silencio a la nueva, y el error aparece mucho después en forma de números equivocados.

Antes de aceptar un borrado, mira qué dejaría huérfano:

```typescript
import { danglingColumnKeys } from 'ng-hub-ui-spreadsheet';

danglingColumnKeys(Object.keys(this.savedState), this.columns); // ['discount']
```

## 📖 Referencia de la API

### Entradas

| Entrada              | Tipo                                      | Por defecto      | Descripción                                                                   |
| -------------------- | ----------------------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `rows`               | `readonly TRow[]`                         | —                | **Obligatoria.** Las filas. Nunca se escriben.                                |
| `columns`            | `readonly HubSpreadsheetColumn<TRow>[]`   | —                | **Obligatoria.** Qué muestra y qué permite cada columna.                      |
| `rowKey`             | `(row: TRow) => string`                   | —                | **Obligatoria.** Un nombre estable por fila.                                  |
| `states`             | `Record<string, HubSpreadsheetCellState>` | `{}`             | Estado de guardado por celda, con clave `` `${rowKey}\t${columnKey}` ``.      |
| `errors`             | `Record<string, string>`                  | `{}`             | Un mensaje de validación por celda, con la misma clave. Marca la celda.       |
| `decimalMark`        | `',' \| '.'`                              | `','`            | Con qué carácter escribe los decimales este lector.                           |
| `emptyText`          | `string`                                  | `''`             | Qué dice una hoja vacía.                                                      |
| `pageSize`           | `number`                                  | `10`             | Filas que recorren `Re Pág` y `Av Pág`.                                       |
| `readonly`           | `boolean`                                 | `false`          | Desactiva todos los editores, digan lo que digan las celdas.                  |
| `formulas`           | `boolean`                                 | `false`          | Lee como fórmula la celda que empieza por `=`. Ver abajo.                     |
| `editOn`             | `'click' \| 'double-click'`               | `'double-click'` | Qué abre el editor con el puntero. Escribir lo abre en ambos casos.           |
| `expansion`          | `TemplateRef<HubSpreadsheetExpansionContext<TRow>> \| null` | `null` | Una plantilla dibujada bajo la fila que está abierta. Ver abajo.  |
| `expandedRow`        | `string \| null`                          | `null`           | Bidireccional. Qué fila está abierta, por su clave.                           |
| `direction`          | `'auto' \| 'ltr' \| 'rtl'`                | `'auto'`         | Hacia dónde corre la hoja. `auto` sigue a la página; las otras dos la fuerzan. |
| `frozenColumns`      | `number`                                  | `0`              | Cuántas columnas quedan fijadas al margen inicial.                            |
| `frozenRows`         | `number`                                  | `0`              | Cuántas filas quedan fijadas bajo la cabecera.                                |
| `virtual`            | `boolean`                                 | `false`          | Dibuja solo las filas a la vista. Le da altura a la hoja; ver abajo.          |
| `rowHeight`          | `number`                                  | `0`              | Cuánto mide una fila al virtualizar. Cero mide la primera dibujada.           |
| `spans`              | `readonly HubGridSpan[]`                  | `[]`             | Bloques combinados, declarados por su ancla.                                  |
| `structure`          | `HubSpreadsheetStructureOptions<TRow>`    | `{}`             | Qué cambios de estructura se ofrecen. Todo se rechaza por defecto.            |
| `retiredColumnKeys`  | `readonly string[]`                       | `[]`             | Alias de columnas borradas, para que uno nuevo no los reutilice.              |
| `contextMenu`        | `boolean`                                 | `false`          | Ofrece los cambios de estructura con el botón derecho.                        |
| `mergeable`          | `boolean`                                 | `false`          | Ofrece combinar celdas y separarlas en ese mismo menú.                        |
| `disjointSelection`  | `boolean`                                 | `true`           | Si con `Ctrl` pulsado un clic añade otro bloque en lugar de empezar de nuevo. |
| `fillHandle`         | `boolean`                                 | `false`          | Dibuja el tirador en la esquina de la selección.                              |
| `canUndo`            | `boolean`                                 | `false`          | Si `Ctrl+Z` tiene algo que pedir. El histórico es del anfitrión.              |
| `canRedo`            | `boolean`                                 | `false`          | Lo mismo para `Ctrl+Mayús+Z` y `Ctrl+Y`.                                      |
| `resizableColumns`   | `boolean`                                 | `false`          | Permite arrastrar el borde final de una cabecera.                             |
| `reorderableColumns` | `boolean`                                 | `false`          | Permite arrastrar una cabecera para mover su columna.                         |
| `columnWidths`       | `Record<string, number>`                  | `{}`             | De doble vía. Anchos por alias, así uno sobrevive a que muevan su columna.    |
| `minColumnWidth`     | `number`                                  | `48`             | El suelo por debajo del cual no baja un arrastre, en píxeles.                 |

### Salidas

| Salida                  | Carga                           | Se emite cuando                                                                            |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| `commit`                | `HubSpreadsheetCommit<TRow>`    | Una celda toma un valor nuevo, distinto del anterior.                                      |
| `pasted`                | `HubSpreadsheetPaste<TRow>`     | Se pega un bloque.                                                                         |
| `filled`                | `HubSpreadsheetPaste<TRow>`     | Se suelta el tirador de relleno.                                                           |
| `cleared`               | `HubSpreadsheetCellRef<TRow>[]` | Se pulsa `Supr` sobre una selección.                                                       |
| `opened`                | `HubSpreadsheetCellRef<TRow>`   | La plantilla de una celda avisó de que el lector pidió abrirla —con el puntero, o con `Intro` donde no hay campo que editar—. |
| `selectionChange`       | `HubGridRange \| null`          | Cambia el rectángulo seleccionado.                                                         |
| `selectionRangesChange` | `readonly HubGridRange[]`       | Cambia la selección entera. Un solo elemento salvo que se hayan cogido bloques con `Ctrl`. |
| `insertRequested`       | `HubSpreadsheetInsertRequest`   | El lector pide añadir filas o columnas.                                                    |
| `deleteRequested`       | `HubSpreadsheetDeleteRequest`   | El lector pide quitar filas o columnas.                                                    |
| `undoRequested`         | `void`                          | `Ctrl+Z`. La hoja no deshace nada por su cuenta.                                           |
| `redoRequested`         | `void`                          | `Ctrl+Mayús+Z` o `Ctrl+Y`.                                                                 |
| `columnMoved`           | `{ from, to, key, keys }`       | Se suelta una cabecera. `keys` llega ya reordenado.                                        |
| `mergeRequested`        | `HubSpreadsheetMergeRequest`    | El lector pide combinar una selección. Incluye lo que absorbe.                             |
| `unmergeRequested`      | `readonly HubGridCoords[]`      | El lector pide separar los bloques que toca su selección.                                  |

### Ayudantes

| Función                              | Qué te da                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| `spreadsheetRecords(rows, columns)`  | Todas las filas como datos planos, con los alias por clave.                             |
| `spreadsheetRecord(row, columns)`    | Una fila, igual.                                                                        |
| `duplicateColumnKeys(columns)`       | Alias declarados más de una vez, que se pisarían en silencio.                           |
| `nextColumnKey(taken, prefix?)`      | Un alias que no se ha usado nunca.                                                      |
| `danglingColumnKeys(refs, columns)`  | Referencias que ya no apuntan a ninguna columna.                                        |
| `parseDecimal(text, mark)`           | Un número, `null` si está vacío, `undefined` si no se puede leer.                       |
| `parseClipboardTable(payload)`       | Un bloque pegado, con los números crudos donde el origen los declaró.                   |
| `serialiseClipboardTable(rows)`      | Los dos formatos de portapapeles de un bloque.                                          |
| `isStructureAllowed(perm, subj, i)`  | Si un permiso deja pasar a un sujeto; una función que revienta cuenta como negativa.    |
| `resolveInsertIndex(ref, side, len)` | Dónde cae una inserción, recortada a la colección.                                      |
| `provideHubSpreadsheetControls(a)`   | Registra un adaptador de controles: todas las columnas de lista lo usan. Ver abajo.     |
| `mergeRequestFor(spans, range)`      | El bloque en que se convertiría una selección, y lo que absorbe; null si es una celda.  |
| `applySpanMerge(spans, request)`     | La lista de bloques tras esa combinación, sin los que absorbe.                          |
| `applySpanUnmerge(spans, anchors)`   | La lista tras separar esos bloques.                                                     |
| `spansWithin(spans, range)`          | Los bloques que toca un rectángulo.                                                     |
| `sheetToXlsx(rows, cols, o?)`        | La hoja como un `.xlsx` de verdad, en bytes.                                            |
| `downloadXlsx(name, bytes)`          | Le da ese libro al lector para que lo guarde.                                           |
| `xlsxToTable(bytes, o?)`             | La primera hoja de un libro como texto, deshechas las cadenas compartidas y las fechas. |
| `xlsxToRecords(bytes, cols, o?)`     | Lo mismo, con los alias de columna por clave.                                           |
| `sheetToCsv(rows, cols, o?)`         | La hoja como CSV, con el separador que toca según la marca decimal.                     |
| `downloadText(name, text)`           | Le da ese archivo al lector, con la marca que lo hace UTF-8.                            |
| `csvToTable(text, o?)`               | Un CSV como texto, olfateando su separador en lugar de suponerlo.                       |
| `csvToRecords(text, cols, o?)`       | Lo mismo, con los alias de columna por clave.                                           |
| `sheetValues(rows, cols, o?)`        | Lo que tiene cada celda, con las fórmulas ya resueltas.                                 |

## Fórmulas

`formulas` lee como fórmula la celda cuyo valor empieza por `=`. Una columna puede nombrarse por el
alias con el que se declaró, que es para lo que estaban los alias:

```ts
{ id: 'a', units: 400, price: 0.12, total: '=[units] * [price]' }
```

Reordena las columnas, reescribe una cabecera, y todas las fórmulas siguen diciendo lo mismo. Excel
eligió lo otro, y allí renombrar una columna reescribe todas las fórmulas del libro.

Las coordenadas también valen, al lado de los alias: `=ROUND(SUM(E1:E4), 2)`. Una coordenada dice
_dónde_ estaba una columna y no cuál es, así que cuando la hoja cambia de forma las fórmulas tienen
que cambiar con ella: `rewriteRowFormulas()` mueve todas las coordenadas de las filas después de
mover una columna o de insertar o borrar filas y columnas, y una referencia a algo borrado pasa a
ser `#REF!` en lugar de leer en silencio a su vecina. La llama el anfitrión en su propio manejador,
porque las filas son suyas.

| Se escribe                  | Significa                                                   |
| --------------------------- | ----------------------------------------------------------- |
| `[units]`                   | El valor de esta fila en la columna `units`.                |
| `B3`, `SUM(A1:B4)`          | Una coordenada y un rango, como se escriben en una hoja.    |
| `[total:]`                  | El valor de **las demás** filas en `total` — ver la nota.   |
| `+ - * / ^`                 | Aritmética; `&` junta texto.                                |
| `= <> < <= > >=`            | Comparación: números como números, palabras como palabras.  |
| `IF(condición, sí, no)`     | Solo se calcula la rama que se toma.                        |
| `SUM AVERAGE MIN MAX COUNT` | Sobre valores y columnas enteras, dejando fuera los huecos. |
| `ROUND ABS LEN CONCAT`      | Lo de siempre.                                              |
| `AND OR NOT TRUE FALSE`     | Sí y no.                                                    |

**Una columna entera deja fuera la celda que pregunta.** `=SUM([total:])` escrito en la fila de
totales es lo que escribe todo el mundo, y al pie de la letra es una suma que necesita su propio
resultado. Leer _otra_ columna no cambia: una fila de totales que suma los precios los suma todos.

Cualquier otro círculo se detecta y se muestra, no se persigue. Una celda que no se puede resolver
enseña lo que enseñaría una hoja de cálculo —`#DIV/0!`, `#NAME?`, `#VALUE!`, `#CYCLE!`,
`#SYNTAX!`— y queda marcada. La celda muestra el resultado; el editor, la fórmula, para corregirla
en vez de reescribirla; y el portapapeles lleva la fórmula, que es lo que la celda tiene.

**La hoja dice qué cabe en una fórmula.** Al escribir `=` aparecen las funciones y las columnas, se
van filtrando según escribes y se eligen con las flechas e `Intro`; dentro de corchetes solo se
ofrecen columnas. A la vez, cada cabecera muestra el alias con el que una fórmula llama a esa
columna, y basta pulsarlo para escribirlo. Sin eso, escribir una fórmula exige saber un nombre que
la hoja nunca enseñó.

**Una fórmula también se puede fijar en la columna**, declarada en código y no guardada en los
datos:

```ts
{ key: 'vat', header: 'IVA 21%', kind: 'currency', formula: '=ROUND([total] * 0.21, 2)', cell: () => ({ value: null }) }
```

La misma fórmula en todas las filas, y esas celdas no se pueden editar: sustituir una perdería la
fórmula solo en esa fila, y eso no se nota hasta que los totales dejan de cuadrar.

El motor es de la casa: `parseFormula`, `evaluateFormula` y `evaluateSheet` se exportan para quien
quiera resolver una hoja sin dibujarla.

## Una hoja larga

`virtual` dibuja lo que cubre la ventana en los dos ejes y reserva el tamaño del resto, así que
diez mil filas por cincuenta columnas cuestan un par de cientos de celdas en lugar de medio millón.

```html
<hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey" [virtual]="true" />
```

Hay tres cosas que conviene saber antes de activarlo.

- **Las filas fuera de la vista no están en el documento.** La búsqueda del navegador y la
  impresión solo alcanzan lo dibujado. Para una hoja pensada para imprimirse, mejor dejarlo
  apagado.
- **Las filas tienen que medir lo mismo.** Se mide la primera dibujada, que es lo correcto cuando
  son iguales. Declara `rowHeight` si la hoja se construye oculta: una fila que nunca se ha
  maquetado mide cero, y una ventana calculada desde cero es la hoja entera.
- **Las columnas se acotan con sus anchos medidos.** El primer dibujado las pinta todas, porque si
  no no hay nada que medir; un ancho que no se pueda medir hace que se pinten todas siempre.
- **La hoja pasa a ser lo que hace scroll.** Si se deja crecer, mide lo que su contenido, hace
  scroll la página y no hay nada que virtualizar; por eso activarlo le pone una altura de `24rem`.
  Con `--hub-spreadsheet-max-block-size` pones la tuya.

Las filas congeladas siguen en el documento esté donde esté el lector, y un bloque combinado que
entra en la ventana se trae su ancla: un bloque se dibuja desde su ancla, y una que quede fuera
significa que no se dibuja nada.

## Un editor más rico dentro de la celda

Una columna de lista se abre con un `<select>` nativo: no hay que instalar nada y es lo que un
móvil ya sabe hacer. Hay dos maneras de poner otra cosa.

**Celdas propias, en reposo.** `hubSpreadsheetCell` dibuja lo que muestra una columna mientras no
se edita: una insignia, un avatar, una fila de acciones. El portapapeles sigue llevando el valor y
no el dibujo.

```html
<ng-template hubSpreadsheetCell="state" let-value>
	<hub-badge variant="soft" [color]="colourOf(value)">{{ labelOf(value) }}</hub-badge>
</ng-template>
```

**Una columna, una plantilla.** `hubSpreadsheetEditor` nombra la columna por su alias y le pasa a
la plantilla el valor, el par `commit` / `cancel` y `seed`: el carácter con el que el lector abrió
la celda, que es lo que va en el buscador de un selector.

```html
<hub-spreadsheet [rows]="rows()" [columns]="columns" [rowKey]="rowKey">
	<ng-template hubSpreadsheetEditor="assignee" let-value let-seed="seed" let-commit="commit">
		<hub-select
			[items]="people"
			autoOpen
			[initialSearchTerm]="seed ?? null"
			[ngModel]="value"
			(ngModelChange)="commit($event)"
		/>
	</ng-template>
</hub-spreadsheet>
```

**Todas las columnas de lista, un proveedor.** Se registra un adaptador y suben todas, sin escribir
ninguna plantilla:

```ts
import { provideHubSpreadsheetControls } from 'ng-hub-ui-spreadsheet';
import { hubFormControlAdapter } from 'ng-hub-ui-forms';

providers: [provideHubSpreadsheetControls(hubFormControlAdapter)];
```

El adaptador lo declara esta biblioteca y se cumple por forma, así que aquí no se importa nada del
paquete que lo proporciona: el mismo trato que hace `ng-hub-ui-paginable` con los controles de su
tabla. Si no se registra ninguno, se queda la lista nativa. Y una columna con plantilla propia
sigue mandando: una regla para todas pierde contra una escrita para esa.

## Archivos

Salir a un libro de Excel, o a CSV, y volver a entrar.

```ts
import { sheetToXlsx, downloadXlsx, sheetToCsv, downloadText, xlsxToRecords, csvToRecords } from 'ng-hub-ui-spreadsheet';

downloadXlsx('lineas-pedido.xlsx', sheetToXlsx(this.rows(), this.columns, { sheetName: 'Líneas' }));
downloadText('lineas-pedido.csv', sheetToCsv(this.rows(), this.columns, { decimalMark: ',' }));
```

El `.xlsx` conserva lo que un CSV pierde: un número es un número y una fecha es una fecha, sea lo
que sea lo que la máquina que lo abre crea que es la marca decimal. El CSV es para quien quiera
leerlo en algo más viejo, y elige su separador a partir de esa marca: donde la coma es la marca
decimal, un archivo escrito con comas se abre como una sola columna de texto, así que escribe punto
y coma.

Los dos escriben **lo que muestra la celda**: una columna de lista exporta la etiqueta que alguien
eligió, y una fórmula exporta el número al que llegó, porque una columna de `=[units] * [price]` no
le sirve de nada a quien abre el archivo. `values: 'stored'` es lo contrario, para el archivo que
tiene que volver.

Al entrar, los dos lectores devuelven las filas del archivo con los alias de columna por clave:

```ts
const bytes = new Uint8Array(await file.arrayBuffer());

// Un libro de Excel es un zip, y un zip empieza por PK. Se lee, no se deduce del nombre del archivo.
const records =
	bytes[0] === 0x50 && bytes[1] === 0x4b
		? await xlsxToRecords(bytes, this.columns)
		: csvToRecords(new TextDecoder().decode(bytes), this.columns);
```

Las cabeceras se emparejan con las columnas primero por cabecera y después por alias, sin distinguir
mayúsculas ni espacios alrededor, así que un archivo al que le han cambiado el orden de las columnas
sigue cayendo donde toca, y una cabecera que no reconoce nada se deja en paz en lugar de escribirse
en la columna que viniera detrás. Lo que vuelve es texto: `parseForColumn(text, column, decimalMark)`
lo convierte en valor, o devuelve `undefined` si es algo que la columna no puede tener.

**Ninguno de los dos caminos trae dependencias.** El zip se escribe aquí, con las entradas guardadas
sin comprimir —algo que el formato siempre ha permitido y que acepta cualquier lector—, a cambio de
un archivo unas cuantas veces más grande que el de Excel. Para leer se usa el descompresor que ya
trae la plataforma (`DecompressionStream`, en todos los navegadores desde 2023), porque un libro de
verdad viene comprimido. Lo que no hay: varias hojas, anchos de columna y editar un libro que ya
existe.

## 🎨 Estilos

El componente trae sus propios estilos. No hay que importar nada.

Se tematiza poniendo variables en cualquier ancestro:

```scss
:root {
	--hub-spreadsheet-cursor-color: #6f42c1;
	--hub-spreadsheet-max-block-size: 60vh;
}
```

Cada valor pasa por `--hub-table-*` antes que por `--hub-sys-*`, así que un proyecto que ya haya tematizado sus tablas con `ng-hub-ui-paginable` recibe sus hojas pintadas a juego sin tocar nada.

O en un solo include, que es lo mismo dicho en Sass:

```scss
@use 'ng-hub-ui-spreadsheet/styles' as sheet;

.lineas-factura {
	@include sheet.hub-spreadsheet-theme(
		$cursor-color: #6f42c1,
		$cell-padding-y: 0.125rem,
		$cell-line-height: 1.2,
		$max-block-size: 60vh
	);
}
```

Todos los parámetros son opcionales y solo se emite lo que se pasa, así que el resto siguen cayendo
por la cadena. Úsalo para lo que un tema de tabla no cubra ya, no para repetirlo.

Catálogo completo: [`docs/css-variables-reference.md`](./docs/css-variables-reference.md).

## ♿ Accesibilidad

La hoja es un `role="grid"` de verdad: las celdas llevan `aria-colindex` y sus filas `aria-rowindex`, `aria-selected` sigue al rango, `aria-readonly` marca lo que no se puede escribir, `aria-invalid` marca un editor con algo ilegible dentro, y `aria-busy` marca una celda guardándose. El foco viaja: una sola celda está en el orden de tabulación y las flechas hacen el resto.

Una cosa que conviene saber de cómo está hecho. Los navegadores solo mandan el evento de pegar a elementos editables, así que el atajo de pegar cede el foco a un campo escondido durante el evento y la celda lo recupera enseguida. Eso es lo que mantiene el portapapeles funcionando en Firefox y en Safari, y no solo en Chrome.

## 🤝 Contribuir

```bash
git clone https://github.com/hub-env/hub-ui.git
cd hub-ui
npm install
npm run build:libs
ng test spreadsheet
```

Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/). Las incidencias, la hoja de ruta y las discusiones están en [hub-env/hub-ui](https://github.com/hub-env/hub-ui).

## 📄 Soporte y licencia

- Incidencias: https://github.com/hub-env/hub-ui/issues
- Documentación: https://hubui.dev/es/spreadsheet/overview/

MIT © Carlos Morcillo Fernández. Ver [LICENSE](./LICENSE).
