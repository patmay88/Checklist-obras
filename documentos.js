// Construcción de los documentos a partir de los datos de la obra y de la visita.
const ROJO_ACTA = '#C00000';
const ROJO_LISTADO = '#C82B00';
const AZUL_NOTA = '#4C94D8';
const AZUL_MARCA = '#3355FF';
// Los logos no se publican con la app: se cargan una vez en Ajustes y se guardan en el dispositivo
const logoInge = () => (db.ajustes && db.ajustes.logoInge) || null;
const logoIngePie = () => (db.ajustes && db.ajustes.logoIngePie) || null;
const logoClientePlantilla = clave => (clave && db.ajustes && db.ajustes.logosCliente && db.ajustes.logosCliente[clave]) || null;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const ESTADOS = {
  ok: { corto: '✓', largo: 'Correcto' },
  ko: { corto: '✗', largo: 'Incorrecto' },
  pend: { corto: 'Pend.', largo: 'Pendiente de comprobar' },
  np: { corto: 'N/P', largo: 'No procede' },
};

function fechaLarga(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; }
function fechaCorta(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
function fechaArchivo(iso) { return (iso || '').replace(/-/g, ''); }
function nombreResp(obra, id) { const r = obra.responsables.find(x => x.id === id); return r ? (r.nombre || r.rotulo) : id; }
function claveResultado(p) { return p.link || p.id; }
function capitulosObra(obra) { return PLANTILLAS[obra.plantilla].capitulos; }

// Lista de pendientes de una visita (puntos del check list incorrectos o pendientes + pendientes libres abiertos)
function pendientesVisita(obra, visita) {
  const vistos = new Set(); const lista = [];
  for (const c of capitulosObra(obra)) for (const a of c.apartados) for (const p of a.puntos) {
    const k = claveResultado(p); if (vistos.has(k)) continue;
    const r = visita.resultados[k];
    if (!r || (r.estado !== 'ko' && r.estado !== 'pend')) continue;
    vistos.add(k);
    const texto = (r.nota || '').trim() || (r.estado === 'pend' ? `${p.titulo}: pendiente de comprobar.` : `${p.titulo}: ${p.desc}`);
    lista.push({ origen: 'check', clave: k, ref: `${c.num}.${a.letra}`, titulo: p.titulo, estado: r.estado, resp: r.resp || c.lote, otro: r.otro, texto });
  }
  for (const l of visita.libres || []) if (!l.cerrado && (l.texto || '').trim()) lista.push({ origen: 'libre', id: l.id, resp: l.resp, otro: l.otro, texto: l.texto.trim() });
  return lista;
}
function pendientesPorResponsable(obra, visita) {
  const todos = pendientesVisita(obra, visita);
  const grupos = [];
  for (const r of obra.responsables) {
    const items = todos.filter(p => p.resp === r.id);
    if (r.id !== 'otros') { if (items.length) grupos.push({ clave: r.id, nombre: r.nombre || r.rotulo, resp: r, items }); continue; }
    // «Otros»: un grupo por cada empresa o persona indicada
    const nombres = [...new Set(items.map(nombreOtro).filter(Boolean))];
    for (const n of nombres) grupos.push({ clave: 'otros:' + n, nombre: n, resp: r, items: items.filter(p => nombreOtro(p) === n) });
    const sin = items.filter(p => !nombreOtro(p));
    if (sin.length) grupos.push({ clave: 'otros', nombre: r.nombre || r.rotulo, resp: r, items: sin });
  }
  return grupos;
}
function nombreOtro(p) { return p.resp === 'otros' ? (p.otro || '').trim().toUpperCase() : ''; }

// ---------- bloques comunes ----------
const P = (runs, o = {}) => Object.assign({ t: 'p', runs: Array.isArray(runs) ? runs : [{ text: runs }] }, o);
const linea = (color, size = 1) => ({ color, size });
const ANCHO_LISTADO = 481;   // ancho útil del listado (márgenes 57 pt)
const ANCHO_ACTA = 475;      // ancho útil de las actas (márgenes 60 pt)

// ---------- 1. Informe check list (formato v3) ----------
async function docCheckList(obra, visita) {
  const plant = PLANTILLAS[obra.plantilla];
  const titulo = 'LISTADO DE ENTREGA DE INSTALACIONES';
  const proyecto = (obra.proyecto || '').toUpperCase();
  const logoCliente = obra.logoCliente || logoClientePlantilla(plant.logoCliente);
  const cabecera = cap => [
    P([{ text: `${titulo} – ${proyecto}`, size: 9 }], { align: 'center', after: 2, bordeInf: linea(ROJO_LISTADO, 1) }),
    P([{ text: cap, size: 9 }], { align: 'right', after: 0 }),
  ];
  const pie = [{ t: 'tabla', cols: [240, 241], filas: [{ celdas: [
    { bloques: [P([{ field: 'PAGE', size: 9 }], { after: 0 })], vAlign: 'bottom' },
    { bloques: [{ t: 'img', src: logoInge(), w: 110, h: 13.5, align: 'right' }], vAlign: 'bottom' },
  ] }] }];

  const portada = [
    { t: 'img', src: logoInge(), w: 213, h: 26.1, align: 'right', before: 30 },
    P([{ text: titulo, b: true, size: 14 }], { align: 'center', before: 90, after: 2 }),
    P([{ text: proyecto, b: true, size: 14 }], { align: 'center', after: 6 }),
    P([{ text: plant.subtitulo, i: true, size: 14 }], { align: 'center', after: 40 }),
  ];
  if (logoCliente) {
    const im = await MotorDocs.cargarImagen(logoCliente);
    const w = Math.min(314, 191 * im.pw / im.ph), h = w * im.ph / im.pw;
    portada.push({ t: 'img', src: logoCliente, w, h, align: 'center', after: 0 });
  } else portada.push(P('', { after: 191 }));
  portada.push(P([{ text: fechaLarga(visita.fecha), size: 10 }], { align: 'right', before: 140 }));

  const caps = capitulosObra(obra);
  const indice = [
    P([{ text: 'ÍNDICE', b: true, size: 12 }], { after: 14 }),
    ...caps.map(c => P([{ text: `${c.num}   ${c.nombre}`, size: 11 }], { after: 10, indent: 7 })),
    P([{ text: 'Leyenda:', b: true, size: 9 }], { before: 30, after: 4 }),
    P([{ text: '☑ ', color: AZUL_MARCA, size: 10 }, { text: 'Correcto      ', size: 9 }, { text: '☒ ', color: AZUL_MARCA, size: 10 }, { text: 'Incorrecto      ', size: 9 }, { text: '☐ ', size: 10 }, { text: 'Pendiente de comprobar / No procede (se indica en el punto)', size: 9 }], { after: 0 }),
  ];
  const secciones = [{ sinNumero: true, cabecera: [], pie: [], bloques: portada }, { cabecera: cabecera('ÍNDICE'), pie, bloques: indice }];

  for (const c of caps) {
    const b = [P([{ text: `${c.num}     ${c.nombre}`, b: true, size: 14 }], { after: 10 })];
    for (const a of c.apartados) {
      b.push(P([{ text: `${a.letra}. ${a.nombre}`, b: true, size: 11 }], { before: 6, after: 8, bordeInf: linea(ROJO_LISTADO, 1), keepNext: true }));
      const notas = [];
      for (const p of a.puntos) {
        const r = visita.resultados[claveResultado(p)] || {};
        const caja = r.estado === 'ok' ? '☑' : r.estado === 'ko' ? '☒' : '☐';
        const runs = [{ text: caja + '  ', color: r.estado === 'ok' || r.estado === 'ko' ? AZUL_MARCA : null, size: 11 },
          { text: p.titulo + ':', b: true, u: true, size: 10 }, { text: ' ' + p.desc, size: 10 }];
        if (p.valor) runs.push({ text: ' ' + ((r.valor || '').trim() || '_______'), color: (r.valor || '').trim() ? AZUL_NOTA : null, size: 10 });
        if (r.estado === 'pend') runs.push({ text: '  Pendiente de comprobar.', color: AZUL_NOTA, size: 10 });
        if (r.estado === 'np') runs.push({ text: '  No procede.', color: AZUL_NOTA, size: 10 });
        if ((r.nota || '').trim()) { notas.push(r.nota.trim()); runs.push({ text: `  Ver nota ${notas.length}`, color: AZUL_NOTA, size: 10 }); }
        b.push(P(runs, { hanging: 18, after: 8, line: 1.15 }));
      }
      b.push(P([{ text: 'Notas:', size: 10 }], { after: 4, keepNext: notas.length > 0 }));
      notas.forEach((n, i) => b.push(P([{ text: `${i + 1}.- ${n}`, color: AZUL_NOTA, size: 9 }], { after: 3, bordeInf: linea('#000000', 0.5) })));
      b.push(P('', { after: 6 }));
    }
    secciones.push({ cabecera: cabecera(c.nombre), pie, bloques: b });
  }
  return { nombre: `${fechaArchivo(visita.fecha)}_CheckList_${obra.codigo || 'obra'}`, numeracion: 'n', numeracionAlign: 'left', pieConNumero: true,
    pieSoloWord: true, logoPieHtml: logoIngePie(),
    margenes: { top: 85, bottom: 70, left: 57, right: 57, header: 28, footer: 28 }, secciones };
}

// ---------- cabecera y datos comunes de las actas ----------
function cabeceraActa(tituloDoc, o = {}) {
  const ratio = (db.ajustes && db.ajustes.logoIngeRatio) || (109 / 890);
  const titulo = [{ text: tituloDoc, size: 14 }];
  if (o.numero != null) titulo.push({ text: String(o.numero), b: true, size: 20 });
  const b = [
    { t: 'tabla', cols: [200, 275], filas: [{ celdas: [
      { bloques: [{ t: 'img', src: logoInge(), w: 160, h: 160 * ratio }], vAlign: 'bottom' },
      { bloques: [P(titulo, { align: 'right', after: 0 })], vAlign: 'bottom' },
    ] }] },
  ];
  if (o.linea !== false) b.push(P('', { after: 0, bordeInf: linea(ROJO_ACTA, 1.5) }));
  return b;
}
function datosActa(obra, visita, asistentes, tamAsis = 8) {
  const b = [
    P([{ text: 'PROYECTO: ', b: true, size: 9 }, { text: (obra.proyecto || '').toUpperCase(), b: true, size: 9 }], { before: 14, after: 10, bordeInf: linea(ROJO_ACTA, 1.5) }),
    { t: 'tabla', cols: [310, 165], filas: [{ celdas: [
      { bloques: [P([{ text: 'CÓDIGO INTERNO: ', b: true, size: 9 }, { text: obra.codigo || '', b: true, size: 9 }], { after: 2 })], bordes: { bottom: linea(ROJO_ACTA, 1.5) } },
      { bloques: [P([{ text: 'FECHA: ', b: true, size: 9 }, { text: fechaCorta(visita.fecha), b: true, size: 9 }], { after: 2 })], bordes: { bottom: linea(ROJO_ACTA, 1.5) } },
    ] }] },
    P([{ text: 'EMPLAZAMIENTO: ', b: true, size: 9 }, { text: (obra.emplazamiento || '').toUpperCase(), size: 9 }], { before: 10, after: 10, bordeInf: linea(ROJO_ACTA, 1.5) }),
    P([{ text: 'ASISTENTES:', b: true, size: 9 }], { after: 4 }),
  ];
  const filas = asistentes.map(a => ({ celdas: [a.empresa, a.nombre, a.rol].map(t => ({ bloques: [P([{ text: t || '', size: tamAsis }], { after: 1 })], bordes: { top: linea(ROJO_ACTA, 1.5), bottom: linea(ROJO_ACTA, 1.5) } })) }));
  if (filas.length) b.push({ t: 'tabla', cols: [160, 155, 160], filas });
  return b;
}
// Agrupa asistentes por empresa: la empresa y el rol solo en la primera fila del grupo (como en el Acta Nº1)
function asistentesAgrupados(lista) {
  const orden = []; const grupos = {};
  for (const a of lista) { const k = (a.empresa || '').trim().toUpperCase(); if (!grupos[k]) { grupos[k] = []; orden.push(k); } grupos[k].push(a); }
  const out = [];
  for (const k of orden) grupos[k].forEach((a, i) => out.push({ empresa: i ? '' : (a.empresa || '').toUpperCase(), nombre: a.nombre, rol: i ? '' : (a.rol || '').toUpperCase() }));
  return out;
}
const listaNumerada = (textos, desde = 1, tam = 10) => textos.map((t, i) => P([{ text: `${desde + i}.`, size: tam }, { text: '  ' + t, size: tam }], { hanging: 18, indent: tam === 9 ? 18 : 10, after: 3, align: 'justify', line: tam === 9 ? 1.5 : null }));

// ---------- 2. Acta de visita (modelo del Acta Nº1 de BDZ) ----------
function docActaVisita(obra, visita, numVisita) {
  const b = datosActa(obra, visita, asistentesAgrupados(visita.asistentes || []), 9);
  b.push(P([{ text: 'REUNIDOS:', b: true, size: 9 }], { before: 14, after: 12, bordeInf: linea(ROJO_ACTA, 1.5) }));
  const intro = (visita.introReunidos || '').trim();
  if (intro) b.push(P([{ text: intro, size: 9 }], { after: 4, line: 1.5, align: 'justify' }));
  const generales = (visita.generales || []).map(t => (t || '').trim()).filter(Boolean);
  b.push(...listaNumerada(generales, 1, 9));
  let n = 1;
  for (const g of pendientesPorResponsable(obra, visita)) {
    b.push(P([{ text: g.nombre.toUpperCase() + ':', size: 9 }], { before: 12, after: 4, keepNext: true }));
    b.push(...listaNumerada(g.items.map(i => i.texto), n, 9)); n += g.items.length;
  }
  b.push(P([{ text: 'FOTOGRAFIAS', b: true, size: 9 }], { before: 18 }));
  return { nombre: `${fechaArchivo(visita.fecha)}_ActaVisita_N${numVisita}`, numeracion: 'n/N', marcoPagina: ROJO_ACTA,
    margenes: { top: 71, bottom: 50, left: 54, right: 46, header: 35, footer: 30 }, secciones: [{ cabecera: cabeceraActa('ACTA ENTREGA INSTALACIONES Nº', { numero: numVisita, linea: false }), pie: [], bloques: b }] };
}

// ---------- 3. Listado de incidencias de un responsable (p. ej. Propiedad CC), sin firmas ----------
function docIncidencias(obra, visita, clave) {
  const g = pendientesPorResponsable(obra, visita).find(x => x.clave === clave);
  const r0 = obra.responsables.find(x => x.id === clave);
  const r = { nombre: g ? g.nombre : (r0 ? (r0.nombre || r0.rotulo) : clave) };
  const items = g ? g.items : [];
  const b = datosActa(obra, visita, asistentesAgrupados(visita.asistentes || []), 9);
  b.push(P([{ text: 'RESPONSABLE: ', b: true, size: 9 }, { text: (r.nombre || r.rotulo).toUpperCase(), b: true, size: 9 }], { before: 14, after: 12, bordeInf: linea(ROJO_ACTA, 1.5) }));
  b.push(...listaNumerada(items.map(i => i.texto), 1, 9));
  return { nombre: `${fechaArchivo(visita.fecha)}_Incidencias_${(r.nombre || r.rotulo).replace(/[^\wÀ-ÿ]+/g, '')}`, numeracion: 'n/N', marcoPagina: ROJO_ACTA,
    margenes: { top: 71, bottom: 50, left: 54, right: 46, header: 35, footer: 30 }, secciones: [{ cabecera: cabeceraActa('LISTADO DE INCIDENCIAS', { linea: false }), pie: [], bloques: b }] };
}

// ---------- 4. Acta de recepción provisional de un lote ----------
// firmantes: { propiedad:{empresa,nombre}, contratista:{empresa,nombre}, df:{empresa,nombre} }
function docRecepcion(obra, visita, lote, firmantes, documentos) {
  const esOC = lote === 'oc';
  const rolEmpresa = esOC ? 'EMPRESA CONSTRUCTORA' : 'EMPRESA INSTALADORA';
  const rolFirma = esOC ? 'CONSTRUCTORA' : 'INSTALADORA';
  const adjudicataria = esOC ? 'adjudicataria de las obras' : 'adjudicataria de las obras de instalaciones';
  const f = firmantes; const up = s => (s || '').toUpperCase();
  const asist = [
    { empresa: up(f.propiedad.empresa), nombre: f.propiedad.nombre, rol: 'PROPIEDAD' },
    { empresa: up(f.contratista.empresa), nombre: f.contratista.nombre, rol: rolEmpresa },
    { empresa: up(f.df.empresa), nombre: f.df.nombre, rol: 'DIRECCIÓN FACULTATIVA (DF)' },
  ];
  const b = datosActa(obra, visita, asist);
  b.push(P([{ text: 'ACTA DE INSPECCIÓN', b: true, size: 9 }], { before: 18, after: 12, bordeInf: linea(ROJO_ACTA, 1.5) }));
  const lugar = (obra.lugarActa || '').trim();
  b.push(P([{ text: `Reunidos en el lugar de las obras citadas${lugar ? ', en ' + lugar : ''}, el día ${fechaLarga(visita.fecha)}; por una parte ${f.propiedad.nombre} en representación de ${up(f.propiedad.empresa)}; y por otra parte, ${f.contratista.nombre}, representante de la empresa ${up(f.contratista.empresa)} ${adjudicataria}; con la asistencia de ${f.df.nombre}, representante de la empresa ${up(f.df.empresa)} adjudicataria de la Dirección de las Obras, manifiestan:`, size: 10 }], { align: 'justify', after: 10, line: 1.4 }));
  b.push(P([{ text: 'Que se procede a la inspección de toda la obra, realizando un listado de anomalías, defectos de acabado y temas pendientes. Atendiendo a lo que se ha expuesto, y teniendo en cuenta los trabajos pendientes de completar que se exponen en este acta:', size: 10 }], { align: 'justify', after: 14, line: 1.4 }));
  b.push(P([{ text: 'TRABAJOS PENDIENTES', size: 10 }], { after: 4 }));
  const items = pendientesVisita(obra, visita).filter(p => p.resp === lote);
  b.push(...listaNumerada(items.map(i => i.texto)));
  b.push(P([{ text: 'DOCUMENTOS:', b: true, size: 10 }], { before: 12, after: 4 }));
  documentos.filter(d => d.trim()).forEach(d => b.push(P([{ text: '- ' + d.trim(), size: 10 }], { hanging: 8, after: 2 })));
  const borde = linea('#000000', 0.5); const todos = { top: borde, bottom: borde, left: borde, right: borde };
  const celda = (t, o = {}) => ({ bloques: [P([{ text: t, size: 8 }], { after: 0 })], bordes: Object.assign({}, todos, o) });
  const firmas = { t: 'tabla', cols: [158, 158, 159], filas: [
    { celdas: [celda(`PROPIEDAD: ${up(f.propiedad.empresa)}`, { bottom: null }), celda(`${rolFirma}: ${up(f.contratista.empresa)}`, { bottom: null }), celda(`DIRECCION FACULTATIVA: ${up(f.df.empresa)}`, { bottom: null })] },
    { alto: 48, celdas: [celda('', { top: null, bottom: null }), celda('', { top: null, bottom: null }), celda('', { top: null, bottom: null })] },
    { celdas: [celda(`Fdo. ${up(f.propiedad.nombre)}`, { top: null }), celda(`Fdo. ${up(f.contratista.nombre)}`, { top: null }), celda(`Fdo. ${up(f.df.nombre)}`, { top: null })] },
  ] };
  const nomEmpresa = (f.contratista.empresa || 'Lote').split(/\s+/)[0].replace(/[^\wÀ-ÿ]+/g, '');
  return { nombre: `${fechaArchivo(visita.fecha)}_ActaEntregaProvisional_${nomEmpresa}`, numeracion: 'n/N', marcoPagina: ROJO_ACTA,
    margenes: { top: 70, bottom: 140, left: 60, right: 60, header: 42, footer: 30 },
    secciones: [{ cabecera: cabeceraActa('ACTA DE RECEPCIÓN PROVISIONAL'), pie: [firmas], pieFijo: true, altoPie: 95, bloques: b }] };
}
