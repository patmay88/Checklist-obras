// App check list de instalaciones – Ingeprojects
// Los datos se guardan en el propio dispositivo (localStorage). Funciona sin conexión.

const CLAVE_DB = 'checklist-ingeprojects-v1';
const $ = s => document.querySelector(s);
const h = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// ---------- datos ----------
let db = { version: 1, obras: [] };
try { const t = localStorage.getItem(CLAVE_DB); if (t) db = JSON.parse(t); } catch (e) { console.error(e); }
let tGuardar = null;
function guardar(inmediato) {
  clearTimeout(tGuardar);
  const f = () => { tGuardar = null; try { localStorage.setItem(CLAVE_DB, JSON.stringify(db)); } catch (e) { alert('No se ha podido guardar: el almacenamiento del dispositivo está lleno. Exporta y elimina obras antiguas.'); } };
  if (inmediato) f(); else tGuardar = setTimeout(f, 300);
}
// Al salir o pasar a segundo plano, guarda lo que quede pendiente
const vaciarPendiente = () => { if (tGuardar) guardar(true); };
window.addEventListener('pagehide', vaciarPendiente);
document.addEventListener('visibilitychange', () => { if (document.hidden) vaciarPendiente(); });
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
db.ajustes = db.ajustes || {};
function pintarLogoBarra() { const im = $('header.barra img'); const l = db.ajustes.logoInge; im.style.display = l ? '' : 'none'; if (l) im.src = l; }

// Reduce una imagen a un ancho máximo (px) y devuelve { dataURL, ratio alto/ancho }
function reducirImagen(dataURL, anchoMax) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { const esc = Math.min(1, anchoMax / im.naturalWidth); const c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * esc); c.height = Math.round(im.naturalHeight * esc);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      res({ dataURL: c.toDataURL('image/png'), ratio: im.naturalHeight / im.naturalWidth }); };
    im.onerror = rej; im.src = dataURL;
  });
}

function responsablesPorDefecto(plantilla) {
  return [
    { id: 'oc', rotulo: 'Lote obra civil', nombre: '', lote: true },
    { id: 'inst', rotulo: 'Lote instalaciones', nombre: '', lote: true },
    { id: 'cc', rotulo: 'Propiedad (CC)', nombre: 'PROPIEDAD (CC)' },
    { id: 'cli', rotulo: 'Cliente / tienda', nombre: plantilla === 'brico' ? 'BRICO DEPOT' : '' },
    { id: 'df', rotulo: 'Dirección facultativa', nombre: 'INGEPROJECTS' },
    { id: 'otros', rotulo: 'Otros', nombre: 'OTROS' },
  ];
}
const obraPorId = id => db.obras.find(o => o.id === id);
const visitaPorId = (o, id) => o.visitas.find(v => v.id === id);
const numVisita = (o, v) => o.visitas.indexOf(v) + 1;

function nuevaVisita(obra) {
  const ant = obra.visitas[obra.visitas.length - 1];
  const v = { id: uid(), fecha: hoy(), asistentes: [], resultados: {}, libres: [], generales: [] };
  if (ant) {
    v.asistentes = JSON.parse(JSON.stringify(ant.asistentes));
    v.resultados = JSON.parse(JSON.stringify(ant.resultados));
    v.libres = JSON.parse(JSON.stringify((ant.libres || []).filter(l => !l.cerrado)));
  }
  obra.visitas.push(v); guardar(true); return v;
}

// ---------- utilidades de interfaz ----------
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2200); }
function ir(ruta) { location.hash = '#/' + ruta; }
function ponerBarra(titulo, atras) {
  $('#titulo').textContent = titulo;
  const b = $('#atras'); b.style.display = atras != null ? '' : 'none'; b.onclick = () => ir(atras);
}
function dialogo(html, botones) {
  return new Promise(res => {
    const d = $('#dlg'); $('#dlg-cuerpo').innerHTML = html; const pie = $('#dlg-pie'); pie.innerHTML = '';
    botones.forEach(b => { const e = document.createElement('button'); e.textContent = b.t; if (b.prim) e.className = 'prim'; e.onclick = () => { if (b.validar && !b.validar()) return; const val = b.v; d.close(); res(val); }; pie.appendChild(e); });
    d.onclose = () => res(d._val); d._val = null; d.showModal();
  });
}
function descargar(blob, nombre) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
function pedirArchivo(input) {
  return new Promise(res => { input.value = ''; input.onchange = () => res(input.files[0] || null); input.click(); });
}
const leerTexto = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(f); });
const leerDataURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });

// ---------- enrutado ----------
function render() {
  const partes = (location.hash.replace(/^#\/?/, '') || '').split('/');
  $('#pestanas').innerHTML = '';
  const app = $('#app'); app.onclick = app.oninput = app.onchange = null;
  window.scrollTo(0, 0);
  if (partes[0] === 'nueva') return vistaDatosObra(null);
  if (partes[0] === 'ajustes') return vistaAjustes();
  if (partes[0] === 'obra') {
    const o = obraPorId(partes[1]); if (!o) return ir('');
    if (partes[2] === 'datos') return vistaDatosObra(o);
    if (partes[2] === 'v') { const v = visitaPorId(o, partes[3]); if (!v) return ir('obra/' + o.id); return vistaVisita(o, v, partes[4] || 'check'); }
    return vistaObra(o);
  }
  vistaInicio();
}
window.addEventListener('hashchange', render);

// ---------- inicio ----------
function vistaInicio() {
  ponerBarra('Check list instalaciones', null);
  const obras = db.obras.slice().sort((a, b) => (b.actualizado || '').localeCompare(a.actualizado || ''));
  $('#app').innerHTML = `
    ${db.ajustes.logoInge ? '' : '<div class="aviso">Falta cargar el logo de Ingeprojects. Ve a «Ajustes (logos)»: los logos se guardan solo en este dispositivo y no se publican con la app.</div>'}
    <div class="acciones" style="margin:0 0 12px"><button class="prim" id="b-nueva">+ Nueva obra</button><button id="b-importar">Importar obra</button><button id="b-ajustes">Ajustes (logos)</button></div>
    ${obras.length ? obras.map(o => `<div class="tarjeta" data-id="${o.id}" style="cursor:pointer">
      <h3>${h(o.proyecto || 'Sin nombre')}</h3>
      <div class="suave">${h(o.codigo || '')}${o.codigo ? ' · ' : ''}${h(o.emplazamiento || '')}</div>
      <div class="suave">Plantilla ${h(PLANTILLAS[o.plantilla].nombre)} · ${o.visitas.length} visita${o.visitas.length === 1 ? '' : 's'}${o.visitas.length ? ' · última ' + fechaCorta(o.visitas[o.visitas.length - 1].fecha) : ''}</div>
    </div>`).join('') : '<div class="vacia">Todavía no hay obras.<br>Pulsa «Nueva obra» para empezar.</div>'}
    ${obras.length ? '<div class="acciones"><button id="b-copia">Copia de seguridad de todas las obras</button></div>' : ''}
    <p class="suave" style="margin-top:20px">Los datos se guardan solo en este dispositivo. Usa «Exportar obra» para pasarla al ordenador o guardar una copia.</p>`;
  $('#b-nueva').onclick = () => ir('nueva');
  $('#b-ajustes').onclick = () => ir('ajustes');
  $('#b-importar').onclick = importarObra;
  const bc = $('#b-copia'); if (bc) bc.onclick = () => descargar(new Blob([JSON.stringify({ app: 'checklist-ingeprojects', tipo: 'copia', version: 1, obras: db.obras }, null, 1)], { type: 'application/json' }), `CopiaSeguridad_CheckList_${fechaArchivo(hoy())}.json`);
  document.querySelectorAll('.tarjeta[data-id]').forEach(e => e.onclick = () => ir('obra/' + e.dataset.id));
}

async function importarObra() {
  const f = await pedirArchivo($('#f-importar')); if (!f) return;
  let datos; try { datos = JSON.parse(await leerTexto(f)); } catch (e) { return alert('El archivo no es válido.'); }
  if (!datos || datos.app !== 'checklist-ingeprojects') return alert('El archivo no es una exportación de esta app.');
  const obras = datos.tipo === 'copia' ? datos.obras : [datos.obra];
  let n = 0;
  for (const o of obras) {
    const ex = obraPorId(o.id);
    if (ex) {
      const r = await dialogo(`<p>La obra <b>${h(o.proyecto)}</b> ya existe en este dispositivo.</p><p class="suave">En este dispositivo: ${ex.visitas.length} visitas (actualizada ${h((ex.actualizado || '').slice(0, 16).replace('T', ' '))}).<br>En el archivo: ${o.visitas.length} visitas (actualizada ${h((o.actualizado || '').slice(0, 16).replace('T', ' '))}).</p>`,
        [{ t: 'Cancelar', v: null }, { t: 'Guardar como copia', v: 'copia' }, { t: 'Sustituir', v: 'sust', prim: true }]);
      if (r === 'sust') { db.obras[db.obras.indexOf(ex)] = o; n++; }
      else if (r === 'copia') { o.id = uid(); o.proyecto = (o.proyecto || '') + ' (copia)'; db.obras.push(o); n++; }
    } else { db.obras.push(o); n++; }
  }
  guardar(true); toast(n ? `Importada${n > 1 ? 's' : ''} ${n} obra${n > 1 ? 's' : ''}` : 'No se ha importado nada'); pintarLogoBarra();
render();
}

// ---------- ajustes: logos guardados en el dispositivo ----------
function vistaAjustes() {
  ponerBarra('Ajustes (logos)', '');
  const a = db.ajustes; a.logosCliente = a.logosCliente || {};
  const prev = src => src ? `<div style="background:#fff;border:1px solid var(--borde);border-radius:8px;padding:10px;margin-top:8px"><img src="${src}" style="max-width:100%;max-height:90px"></div>` : '<div class="suave" style="margin-top:6px">Sin cargar.</div>';
  const clientes = Object.values(PLANTILLAS).filter(p => p.logoCliente);
  $('#app').innerHTML = `
    <div class="aviso">Los logos se guardan solo en este dispositivo y no se publican en GitHub. Si usas la app en otro dispositivo (por ejemplo, el ordenador), cárgalos también allí.</div>
    <div class="tarjeta"><h3>Logo de Ingeprojects</h3><div class="suave">Sale en la portada y en el pie del informe y en la cabecera de las actas. Mejor en PNG y con buena resolución.</div>
      ${prev(a.logoInge)}<div class="acciones"><button class="peq" data-logo="inge">Cargar logo</button>${a.logoInge ? '<button class="peq peligro" data-quitar="inge">Quitar</button>' : ''}</div></div>
    ${clientes.map(p => `<div class="tarjeta"><h3>Logo del cliente: ${h(p.nombre)}</h3><div class="suave">Sale en la portada del informe de las obras con la plantilla ${h(p.nombre)}, salvo que la obra tenga su propio logo.</div>
      ${prev(a.logosCliente[p.logoCliente])}<div class="acciones"><button class="peq" data-logo="cli:${p.logoCliente}">Cargar logo</button>${a.logosCliente[p.logoCliente] ? `<button class="peq peligro" data-quitar="cli:${p.logoCliente}">Quitar</button>` : ''}</div></div>`).join('')}`;
  $('#app').onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.logo) {
      const f = await pedirArchivo($('#f-logo')); if (!f) return;
      const original = await leerDataURL(f);
      if (b.dataset.logo === 'inge') {
        const grande = await reducirImagen(original, 1200); const pie = await reducirImagen(original, 147);
        a.logoInge = grande.dataURL; a.logoIngePie = pie.dataURL; a.logoIngeRatio = grande.ratio;
      } else a.logosCliente[b.dataset.logo.slice(4)] = (await reducirImagen(original, 1280)).dataURL;
    }
    if (b.dataset.quitar) {
      if (b.dataset.quitar === 'inge') { delete a.logoInge; delete a.logoIngePie; delete a.logoIngeRatio; }
      else delete a.logosCliente[b.dataset.quitar.slice(4)];
    }
    guardar(true); pintarLogoBarra(); vistaAjustes(); toast('Guardado');
  };
}

// ---------- datos de la obra (nueva o editar) ----------
function vistaDatosObra(obra) {
  const nueva = !obra;
  const o = obra || { plantilla: 'brico', responsables: responsablesPorDefecto('brico'), documentos: JSON.parse(JSON.stringify(DOCUMENTOS_POR_DEFECTO)) };
  ponerBarra(nueva ? 'Nueva obra' : 'Datos de la obra', nueva ? '' : 'obra/' + o.id);
  const resp = o.responsables;
  $('#app').innerHTML = `
    <div class="tarjeta">
      <label class="campo"><span>Plantilla de check list</span><select id="d-plantilla" ${nueva ? '' : 'disabled'}>
        ${Object.values(PLANTILLAS).map(p => `<option value="${p.id}" ${o.plantilla === p.id ? 'selected' : ''}>${h(p.nombre)}</option>`).join('')}</select></label>
      ${nueva ? '' : '<div class="suave">La plantilla no se puede cambiar una vez creada la obra.</div>'}
      <label class="campo"><span>Proyecto</span><input type="text" id="d-proyecto" value="${h(o.proyecto)}" placeholder="ADECUACIÓN INTERIOR BRICO DEPOT ZARAGOZA"></label>
      <label class="campo"><span>Código interno</span><input type="text" id="d-codigo" value="${h(o.codigo)}" placeholder="2021.238"></label>
      <label class="campo"><span>Emplazamiento</span><input type="text" id="d-empl" value="${h(o.emplazamiento)}" placeholder="PLAZA IMPERIAL BRICO DEPOT ZARAGOZA"></label>
      <label class="campo"><span>Lugar para el texto del acta de recepción («Reunidos en el lugar de las obras citadas, en …»)</span><input type="text" id="d-lugar" value="${h(o.lugarActa)}" placeholder="la futura tienda de Brico Depot Zaragoza"></label>
    </div>
    <div class="tarjeta">
      <h3>Empresas / responsables</h3>
      <div class="suave">Nombre tal como debe salir en las actas.</div>
      <div id="d-resp">${resp.map(r => `<label class="campo"><span>${h(r.rotulo)}</span><input type="text" data-r="${r.id}" value="${h(r.nombre)}"></label>`).join('')}</div>
      <button class="peq" id="d-add-resp">+ Añadir responsable</button>
    </div>
    <div class="tarjeta">
      <h3>Logo del cliente (portada del informe)</h3>
      <div id="d-logo-est" class="suave"></div>
      <div class="acciones"><button class="peq" id="d-logo">Cambiar logo</button><button class="peq" id="d-logo-quitar">Usar el de la plantilla</button></div>
    </div>
    <div class="tarjeta">
      <h3>Documentos a entregar (acta de recepción provisional)</h3>
      <div class="suave">Una línea por documento.</div>
      <label class="campo"><span>Lote obra civil</span><textarea id="d-doc-oc" rows="4">${h((o.documentos.oc || []).join('\n'))}</textarea></label>
      <label class="campo"><span>Lote instalaciones</span><textarea id="d-doc-inst" rows="6">${h((o.documentos.inst || []).join('\n'))}</textarea></label>
    </div>
    <div class="acciones"><button class="prim" id="d-guardar">${nueva ? 'Crear obra y empezar la primera visita' : 'Guardar'}</button></div>
    ${nueva ? '' : '<div class="acciones" style="margin-top:30px"><button class="peligro" id="d-borrar">Eliminar obra</button></div>'}`;
  let logo = o.logoCliente || null;
  const pintaLogo = () => { const pl = PLANTILLAS[$('#d-plantilla').value]; $('#d-logo-est').innerHTML = logo ? 'Logo propio cargado.' : (pl.logoCliente ? (db.ajustes.logosCliente && db.ajustes.logosCliente[pl.logoCliente] ? `Se usa el logo de ${h(pl.nombre)} cargado en Ajustes.` : `Se usará el logo de ${h(pl.nombre)} de Ajustes (todavía no está cargado).`) : 'Sin logo de cliente.'); };
  pintaLogo();
  $('#d-plantilla').onchange = () => { pintaLogo(); const cli = document.querySelector('[data-r=cli]'); if (nueva && cli && !cli.value) cli.value = $('#d-plantilla').value === 'brico' ? 'BRICO DEPOT' : ''; };
  $('#d-logo').onclick = async () => { const f = await pedirArchivo($('#f-logo')); if (f) { logo = await leerDataURL(f); pintaLogo(); } };
  $('#d-logo-quitar').onclick = () => { logo = null; pintaLogo(); };
  $('#d-add-resp').onclick = async () => {
    const r = await dialogo('<label class="campo"><span>Nombre del responsable (empresa)</span><input type="text" id="n-resp"></label>', [{ t: 'Cancelar', v: null }, { t: 'Añadir', v: 'ok', prim: true }]);
    const nom = r && $('#n-resp') ? $('#n-resp').value.trim() : '';
    if (nom) { const id = 'r' + uid(); resp.push({ id, rotulo: nom, nombre: nom.toUpperCase() }); $('#d-resp').insertAdjacentHTML('beforeend', `<label class="campo"><span>${h(nom)}</span><input type="text" data-r="${id}" value="${h(nom.toUpperCase())}"></label>`); }
  };
  $('#d-guardar').onclick = () => {
    const proyecto = $('#d-proyecto').value.trim();
    if (!proyecto) { alert('Indica el nombre del proyecto.'); return; }
    Object.assign(o, {
      plantilla: $('#d-plantilla').value, proyecto, codigo: $('#d-codigo').value.trim(), emplazamiento: $('#d-empl').value.trim(), lugarActa: $('#d-lugar').value.trim(),
      logoCliente: logo, actualizado: new Date().toISOString(),
      documentos: { oc: $('#d-doc-oc').value.split('\n').map(s => s.trim()).filter(Boolean), inst: $('#d-doc-inst').value.split('\n').map(s => s.trim()).filter(Boolean) },
    });
    document.querySelectorAll('[data-r]').forEach(i => { const r = resp.find(x => x.id === i.dataset.r); if (r) r.nombre = i.value.trim(); });
    if (nueva) { o.id = uid(); o.visitas = []; o.creado = new Date().toISOString(); db.obras.push(o); const v = nuevaVisita(o); guardar(true); ir(`obra/${o.id}/v/${v.id}/asis`); }
    else { guardar(true); toast('Guardado'); ir('obra/' + o.id); }
  };
  const bb = $('#d-borrar'); if (bb) bb.onclick = async () => {
    const r = await dialogo(`<p>¿Eliminar la obra <b>${h(o.proyecto)}</b> y todas sus visitas de este dispositivo?</p><p class="suave">Si quieres conservarla, expórtala antes.</p>`, [{ t: 'Cancelar', v: null }, { t: 'Eliminar', v: 'si', prim: true }]);
    if (r === 'si') { db.obras = db.obras.filter(x => x !== o); guardar(true); ir(''); }
  };
}

// ---------- obra ----------
function vistaObra(o) {
  ponerBarra(o.proyecto, '');
  $('#app').innerHTML = `
    <div class="tarjeta"><h3>${h(o.proyecto)}</h3><div class="suave">${h(o.codigo)}${o.codigo ? ' · ' : ''}${h(o.emplazamiento)}</div>
      <div class="suave">Plantilla ${h(PLANTILLAS[o.plantilla].nombre)}</div></div>
    <div class="acciones" style="margin-bottom:12px"><button class="prim" id="o-nueva">+ Nueva visita</button><button id="o-datos">Datos de la obra</button><button id="o-exportar">Exportar obra</button></div>
    ${o.visitas.slice().reverse().map(v => { const n = numVisita(o, v); const pend = pendientesVisita(o, v).length; const r = resumen(o, v);
      return `<div class="tarjeta" data-v="${v.id}" style="cursor:pointer"><h3>Visita Nº${n} · ${fechaCorta(v.fecha)}</h3>
        <div class="suave">${r.revisados}/${r.total} puntos revisados · ${pend} pendiente${pend === 1 ? '' : 's'}</div></div>`; }).join('') || '<div class="vacia">Sin visitas.</div>'}
    ${o.visitas.length > 1 ? '<p class="suave">Cada visita nueva parte del estado de la anterior. Los puntos que pases a «Correcto» y los pendientes libres marcados como resueltos dejan de salir en las actas.</p>' : ''}`;
  $('#o-nueva').onclick = async () => {
    const r = await dialogo(`<p>Se creará la visita Nº${o.visitas.length + 1} con fecha de hoy, copiando el estado, las notas, los asistentes y los pendientes abiertos de la última visita.</p>`, [{ t: 'Cancelar', v: null }, { t: 'Crear visita', v: 'si', prim: true }]);
    if (r === 'si') { const v = nuevaVisita(o); o.actualizado = new Date().toISOString(); guardar(true); ir(`obra/${o.id}/v/${v.id}/asis`); }
  };
  $('#o-datos').onclick = () => ir(`obra/${o.id}/datos`);
  $('#o-exportar').onclick = () => descargar(new Blob([JSON.stringify({ app: 'checklist-ingeprojects', tipo: 'obra', version: 1, obra: o }, null, 1)], { type: 'application/json' }), `${(o.codigo || 'obra').replace(/[^\w.-]+/g, '_')}_${fechaArchivo(hoy())}.json`);
  document.querySelectorAll('[data-v]').forEach(e => e.onclick = () => ir(`obra/${o.id}/v/${e.dataset.v}/check`));
}

function resumen(o, v) {
  const claves = new Set(); let revisados = 0;
  for (const c of capitulosObra(o)) for (const a of c.apartados) for (const p of a.puntos) { const k = claveResultado(p); if (claves.has(k)) continue; claves.add(k); if ((v.resultados[k] || {}).estado) revisados++; }
  return { total: claves.size, revisados };
}

// ---------- visita ----------
function vistaVisita(o, v, tab) {
  const n = numVisita(o, v);
  ponerBarra(`Nº${n} · ${fechaCorta(v.fecha)} · ${o.proyecto}`, 'obra/' + o.id);
  const tabs = [['check', 'Check list'], ['pend', 'Pendientes'], ['asis', 'Visita'], ['docs', 'Documentos']];
  $('#pestanas').innerHTML = `<div class="pestanas">${tabs.map(t => `<button data-t="${t[0]}" class="${t[0] === tab ? 'act' : ''}">${t[1]}</button>`).join('')}</div>`;
  document.querySelectorAll('.pestanas button').forEach(b => b.onclick = () => ir(`obra/${o.id}/v/${v.id}/${b.dataset.t}`));
  const tocar = () => { o.actualizado = new Date().toISOString(); guardar(); };
  if (tab === 'check') tabCheck(o, v, tocar);
  else if (tab === 'pend') tabPendientes(o, v, tocar);
  else if (tab === 'asis') tabAsistentes(o, v, tocar);
  else tabDocumentos(o, v);
}

// ----- pestaña check list -----
function tabCheck(o, v, tocar) {
  const caps = capitulosObra(o);
  const ubic = {}; // dónde aparece cada punto vinculado
  caps.forEach(c => c.apartados.forEach(a => a.puntos.forEach(p => { if (p.link) (ubic[p.link] = ubic[p.link] || []).push(`${c.num}.${a.letra} ${c.nombre.charAt(0) + c.nombre.slice(1).toLowerCase()}`); })));
  const abiertos = JSON.parse(sessionStorage.getItem('abiertos') || '{}');
  const opResp = sel => o.responsables.map(r => `<option value="${r.id}" ${r.id === sel ? 'selected' : ''}>${h(r.nombre || r.rotulo)}</option>`).join('');
  const itemHtml = (c, a, p) => {
    const k = claveResultado(p); const r = v.resultados[k] || {}; const e = r.estado || '';
    const otros = p.link ? ubic[p.link].filter(x => !x.startsWith(`${c.num}.${a.letra}`)) : [];
    const verResp = e === 'ko' || e === 'pend';
    return `<div class="item ${e ? 'e-' + e : ''}" data-k="${k}" data-lote="${c.lote}">
      <div class="t">${h(p.titulo)}</div><div class="d">${h(p.desc)}</div>
      ${otros.length ? `<div class="vinc">También en ${h(otros.join(', '))} (se rellena una vez)</div>` : ''}
      <div class="seg">${['ok', 'ko', 'pend', 'np'].map(s => `<button data-e="${s}" class="${e === s ? 'on' : ''}">${ESTADOS[s].corto}</button>`).join('')}</div>
      <div class="extra">
        ${p.valor ? `<input type="text" data-campo="valor" placeholder="${h(p.valor)}" value="${h(r.valor)}">` : ''}
        <textarea data-campo="nota" placeholder="Nota (sale en el informe y, si está pendiente, en las actas)" style="${r.nota || verResp ? '' : 'display:none'}">${h(r.nota)}</textarea>
        ${r.nota || verResp ? '' : '<button class="link peq" data-accion="nota" style="justify-self:start">+ Añadir nota</button>'}
        <label style="${verResp ? '' : 'display:none'}" class="r-resp"><span class="suave" style="font-size:13px">Responsable</span><select data-campo="resp">${opResp(r.resp || c.lote)}</select></label>
      </div></div>`;
  };
  $('#app').innerHTML = caps.map(c => {
    const r = contarCap(c, v);
    return `<details class="cap" data-c="${c.id}" ${abiertos[c.id] ? 'open' : ''}><summary><span>${c.num}. ${h(c.nombre)}</span><span class="cont" data-cont="${c.id}">${r.rev}/${r.tot}</span></summary>
      ${c.apartados.map(a => `<div class="apartado"><h4>${a.letra}. ${h(a.nombre)}</h4>${a.puntos.map(p => itemHtml(c, a, p)).join('')}</div>`).join('')}</details>`;
  }).join('') + '<p class="suave">✓ Correcto · ✗ Incorrecto · Pend. Pendiente de comprobar · N/P No procede. Pulsa otra vez un estado para quitarlo.</p>';

  document.querySelectorAll('details.cap').forEach(d => d.addEventListener('toggle', () => { abiertos[d.dataset.c] = d.open; sessionStorage.setItem('abiertos', JSON.stringify(abiertos)); }));
  const app = $('#app');
  const res = k => (v.resultados[k] = v.resultados[k] || {});
  const sincronizar = k => { // actualiza todas las tarjetas con la misma clave (puntos vinculados)
    const r = v.resultados[k] || {};
    document.querySelectorAll(`.item[data-k="${k}"]`).forEach(it => {
      const e = r.estado || ''; it.className = 'item' + (e ? ' e-' + e : '');
      it.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.e === e));
      const verResp = e === 'ko' || e === 'pend';
      it.querySelector('.r-resp').style.display = verResp ? '' : 'none';
      const ta = it.querySelector('textarea'); if (document.activeElement !== ta) ta.value = r.nota || '';
      if (verResp || r.nota) { ta.style.display = ''; const bn = it.querySelector('[data-accion=nota]'); if (bn) bn.remove(); }
      const sel = it.querySelector('select'); if (r.resp) sel.value = r.resp;
      const vi = it.querySelector('[data-campo=valor]'); if (vi && document.activeElement !== vi) vi.value = r.valor || '';
    });
    caps.forEach(c => { const x = contarCap(c, v); const el = document.querySelector(`[data-cont="${c.id}"]`); if (el) el.textContent = `${x.rev}/${x.tot}`; });
  };
  app.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const it = b.closest('.item'); if (!it) return;
    const k = it.dataset.k;
    if (b.dataset.e) { const r = res(k); r.estado = r.estado === b.dataset.e ? '' : b.dataset.e; if (!r.resp) r.resp = it.dataset.lote; tocar(); sincronizar(k); }
    if (b.dataset.accion === 'nota') { const ta = it.querySelector('textarea'); ta.style.display = ''; b.remove(); ta.focus(); }
  };
  app.oninput = e => {
    const c = e.target.dataset.campo; if (!c) return; const it = e.target.closest('.item'); const k = it.dataset.k;
    res(k)[c] = e.target.value; tocar();
    document.querySelectorAll(`.item[data-k="${k}"] [data-campo="${c}"]`).forEach(x => { if (x !== e.target) x.value = e.target.value; });
  };
  app.onchange = app.oninput;
}
function contarCap(c, v) { let tot = 0, rev = 0; c.apartados.forEach(a => a.puntos.forEach(p => { tot++; if ((v.resultados[claveResultado(p)] || {}).estado) rev++; })); return { tot, rev }; }

// ----- pestaña pendientes -----
function tabPendientes(o, v, tocar) {
  const opResp = sel => o.responsables.map(r => `<option value="${r.id}" ${r.id === sel ? 'selected' : ''}>${h(r.nombre || r.rotulo)}</option>`).join('');
  const grupos = pendientesPorResponsable(o, v);
  const cerrados = (v.libres || []).filter(l => l.cerrado);
  $('#app').innerHTML = `
    <div class="tarjeta"><h3>Añadir pendiente libre</h3><div class="suave">Para cosas que no están en el check list (formación, presupuestos, documentación…).</div>
      <label class="campo"><span>Texto</span><textarea id="l-texto" rows="2"></textarea></label>
      <div class="fila"><select id="l-resp">${opResp('oc')}</select><button class="prim" id="l-add" style="flex:0 0 auto">Añadir</button></div></div>
    ${grupos.length ? grupos.map(g => `<div class="tarjeta"><h3>${h(g.resp.nombre || g.resp.rotulo)} <span class="chip">${g.items.length}</span></h3>
      ${g.items.map(p => p.origen === 'check'
        ? `<div class="pend-item"><div>${h(p.texto)}</div><div class="suave"><span class="chip">${p.ref} ${h(p.titulo)}</span> <span class="chip">${ESTADOS[p.estado].largo}</span> <button class="link peq" data-ir="${h(p.clave)}">Ver en el check list</button></div></div>`
        : `<div class="pend-item" data-l="${p.id}"><textarea data-lc="texto" rows="2">${h(p.texto)}</textarea>
            <div class="fila" style="margin-top:6px"><select data-lc="resp">${opResp(p.resp)}</select><button class="peq" data-la="cerrar" style="flex:0 0 auto">Resuelto</button><button class="peq peligro" data-la="borrar" style="flex:0 0 auto">Borrar</button></div></div>`).join('')}</div>`).join('')
      : '<div class="vacia">No hay pendientes en esta visita.</div>'}
    <div class="tarjeta"><h3>Puntos generales del acta de visita («Reunidos»)</h3><div class="suave">Opcional. Salen al principio del acta de visita, antes de los apartados por responsable.</div>
      <label class="campo"><span>Texto de introducción (sin numerar)</span><textarea id="g-intro" rows="2" placeholder="Se realiza formación de la central de incendios a personal de tienda:">${h(v.introReunidos)}</textarea></label>
      <div id="g-lista">${(v.generales || []).map((t, i) => `<div class="fila" style="margin-top:6px"><textarea data-g="${i}" rows="2">${h(t)}</textarea><button class="peq peligro" data-gb="${i}" style="flex:0 0 auto">✕</button></div>`).join('')}</div>
      <button class="peq" id="g-add" style="margin-top:8px">+ Añadir punto general</button></div>
    ${cerrados.length ? `<div class="tarjeta"><h3>Resueltos en esta visita</h3>${cerrados.map(l => `<div class="pend-item" data-l="${l.id}"><div class="suave">${h(l.texto)} · ${h(nombreResp(o, l.resp))}</div><button class="link peq" data-la="reabrir">Reabrir</button></div>`).join('')}</div>` : ''}`;
  $('#l-add').onclick = () => { const t = $('#l-texto').value.trim(); if (!t) return; v.libres = v.libres || []; v.libres.push({ id: uid(), texto: t, resp: $('#l-resp').value, cerrado: false }); tocar(); guardar(true); tabPendientes(o, v, tocar); toast('Pendiente añadido'); };
  $('#g-add').onclick = () => { v.generales = v.generales || []; v.generales.push(''); tocar(); tabPendientes(o, v, tocar); const ts = document.querySelectorAll('[data-g]'); ts[ts.length - 1].focus(); };
  const app = $('#app');
  app.oninput = e => {
    const t = e.target;
    if (t.id === 'g-intro') { v.introReunidos = t.value; tocar(); return; }
    if (t.dataset.g != null) { v.generales[+t.dataset.g] = t.value; tocar(); return; }
    const pi = t.closest('[data-l]'); if (pi && t.dataset.lc) { const l = v.libres.find(x => x.id === pi.dataset.l); l[t.dataset.lc] = t.value; tocar(); if (t.dataset.lc === 'resp') tabPendientes(o, v, tocar); }
  };
  app.onchange = e => { if (e.target.tagName === 'SELECT') app.oninput(e); };
  app.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ir) { const caps = capitulosObra(o); const c = caps.find(c => c.apartados.some(a => a.puntos.some(p => claveResultado(p) === b.dataset.ir)));
      const ab = JSON.parse(sessionStorage.getItem('abiertos') || '{}'); ab[c.id] = true; sessionStorage.setItem('abiertos', JSON.stringify(ab));
      ir(`obra/${o.id}/v/${v.id}/check`); setTimeout(() => { const el = document.querySelector(`.item[data-k="${b.dataset.ir}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.style.outline = '3px solid #2f6fb5'; } }, 80); return; }
    if (b.dataset.gb != null) { v.generales.splice(+b.dataset.gb, 1); tocar(); tabPendientes(o, v, tocar); return; }
    const pi = b.closest('[data-l]'); if (!pi || !b.dataset.la) return;
    const l = v.libres.find(x => x.id === pi.dataset.l);
    if (b.dataset.la === 'cerrar') l.cerrado = true;
    if (b.dataset.la === 'reabrir') l.cerrado = false;
    if (b.dataset.la === 'borrar') v.libres = v.libres.filter(x => x !== l);
    tocar(); guardar(true); tabPendientes(o, v, tocar);
  };
}

// ----- pestaña visita (fecha y asistentes) -----
function tabAsistentes(o, v, tocar) {
  const empresas = [...new Set([...o.responsables.map(r => r.nombre).filter(Boolean), ...v.asistentes.map(a => a.empresa).filter(Boolean)])];
  const fila = (a, i) => `<div class="asis" data-i="${i}"><input type="text" data-a="empresa" list="dl-emp" placeholder="Empresa" value="${h(a.empresa)}"><input type="text" data-a="nombre" placeholder="Nombre" value="${h(a.nombre)}"><input type="text" data-a="rol" list="dl-rol" placeholder="Rol" value="${h(a.rol)}"><button class="peq peligro" data-b="${i}">✕</button></div>`;
  $('#app').innerHTML = `
    <div class="tarjeta"><label class="campo"><span>Fecha de la visita</span><input type="date" id="a-fecha" value="${h(v.fecha)}"></label></div>
    <div class="tarjeta"><h3>Asistentes</h3>
      <div id="a-lista">${v.asistentes.map(fila).join('')}</div>
      <button class="peq" id="a-add">+ Añadir asistente</button></div>
    <datalist id="dl-emp">${empresas.map(e => `<option value="${h(e)}">`).join('')}</datalist>
    <datalist id="dl-rol"><option value="PROPIEDAD"><option value="PROPIEDAD (BD)"><option value="PROPIEDAD (CC)"><option value="EMPRESA CONSTRUCTORA"><option value="EMPRESA INSTALADORA"><option value="DIRECCIÓN FACULTATIVA (DF)"></datalist>
    <div class="acciones"><button class="prim" id="a-seguir">Ir al check list</button></div>
    <div class="acciones" style="margin-top:30px"><button class="peligro peq" id="a-borrar">Eliminar esta visita</button></div>`;
  $('#a-fecha').onchange = e => { v.fecha = e.target.value; tocar(); ponerBarra(`Nº${numVisita(o, v)} · ${fechaCorta(v.fecha)} · ${o.proyecto}`, 'obra/' + o.id); };
  $('#a-add').onclick = () => { v.asistentes.push({ empresa: '', nombre: '', rol: '' }); tocar(); $('#a-lista').insertAdjacentHTML('beforeend', fila(v.asistentes[v.asistentes.length - 1], v.asistentes.length - 1)); $('#a-lista').lastElementChild.querySelector('input').focus(); };
  $('#a-lista').oninput = e => { const f = e.target.closest('.asis'); if (!f || !e.target.dataset.a) return; v.asistentes[+f.dataset.i][e.target.dataset.a] = e.target.value; tocar(); };
  $('#a-lista').onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; v.asistentes.splice(+b.dataset.b, 1); tocar(); tabAsistentes(o, v, tocar); };
  $('#a-seguir').onclick = () => ir(`obra/${o.id}/v/${v.id}/check`);
  $('#a-borrar').onclick = async () => {
    const r = await dialogo(`<p>¿Eliminar la visita Nº${numVisita(o, v)} del ${fechaCorta(v.fecha)}?</p>`, [{ t: 'Cancelar', v: null }, { t: 'Eliminar', v: 'si', prim: true }]);
    if (r === 'si') { o.visitas = o.visitas.filter(x => x !== v); guardar(true); ir('obra/' + o.id); }
  };
}

// ----- pestaña documentos -----
function tabDocumentos(o, v) {
  const n = numVisita(o, v);
  const lotes = o.responsables.filter(r => r.lote);
  const otros = o.responsables.filter(r => !r.lote);
  const cuenta = id => pendientesVisita(o, v).filter(p => p.resp === id).length;
  const fila = (id, nombre, det) => `<div class="docbtn"><div class="n"><div>${nombre}</div><div class="suave">${det || ''}</div></div><button class="peq" data-doc="${id}" data-f="docx">Word</button><button class="peq" data-doc="${id}" data-f="pdf">PDF</button></div>`;
  $('#app').innerHTML = `
    <div class="tarjeta"><h3>Para el cliente</h3>${fila('check', 'Informe del check list', 'Formato del listado de entrega (portada, índice y capítulos)')}</div>
    <div class="tarjeta"><h3>Acta de la visita</h3>${fila('visita', `Acta entrega instalaciones Nº${n}`, `${pendientesVisita(o, v).length} pendientes, separados por responsable`)}</div>
    <div class="tarjeta"><h3>Actas de recepción provisional</h3>${lotes.map(r => fila('rec:' + r.id, `${h(r.rotulo)}: ${h(r.nombre || '—')}`, `${cuenta(r.id)} trabajos pendientes`)).join('')}</div>
    <div class="tarjeta"><h3>Listados de incidencias (sin firmas)</h3>${otros.map(r => fila('inc:' + r.id, h(r.nombre || r.rotulo), `${cuenta(r.id)} incidencias`)).join('')}</div>
    <p class="suave">PDF: se abre la vista previa; pulsa «Guardar PDF» y en la ventana de impresión elige «Guardar como PDF».</p>`;
  $('#app').onclick = async e => {
    const b = e.target.closest('[data-doc]'); if (!b) return;
    const id = b.dataset.doc; let doc;
    if (!db.ajustes.logoInge) { const r = await dialogo('<p>No has cargado el logo de Ingeprojects en «Ajustes (logos)». El documento saldrá sin logo.</p>', [{ t: 'Cancelar', v: null }, { t: 'Ir a Ajustes', v: 'aj' }, { t: 'Generar igualmente', v: 'si', prim: true }]); if (r === 'aj') return ir('ajustes'); if (r !== 'si') return; }
    try {
      if (id === 'check') doc = await docCheckList(o, v);
      else if (id === 'visita') doc = await docActaVisita(o, v, n);
      else if (id.startsWith('inc:')) doc = docIncidencias(o, v, id.slice(4));
      else if (id.startsWith('rec:')) { const lote = id.slice(4); const f = await pedirFirmantes(o, v, lote); if (!f) return; doc = docRecepcion(o, v, lote, f.firmantes, f.documentos); }
      if (b.dataset.f === 'docx') { b.disabled = true; const blob = await MotorDocs.aDocx(doc); descargar(blob, doc.nombre + '.docx'); toast('Word descargado'); b.disabled = false; }
      else await vistaPrevia(doc);
    } catch (err) { console.error(err); alert('Error al generar el documento: ' + err.message); b.disabled = false; }
  };
}

async function pedirFirmantes(o, v, lote) {
  const r = o.responsables.find(x => x.id === lote);
  const cli = o.responsables.find(x => x.id === 'cli'); const df = o.responsables.find(x => x.id === 'df');
  const busca = emp => { const e = (emp || '').trim().toUpperCase(); if (!e) return null; return v.asistentes.find(a => (a.empresa || '').trim().toUpperCase() === e) || v.asistentes.find(a => (a.empresa || '').toUpperCase().includes(e) || e.includes((a.empresa || '').toUpperCase().trim() || '@@')); };
  const guard = o.firmantes && o.firmantes[lote] || {};
  const pre = (clave, empresa) => { const a = busca(empresa); return { empresa: (guard[clave] && guard[clave].empresa) || (a ? a.empresa : empresa) || '', nombre: (a ? a.nombre : '') || (guard[clave] && guard[clave].nombre) || '' }; };
  const f = { propiedad: pre('propiedad', cli && cli.nombre), contratista: pre('contratista', r.nombre), df: pre('df', df && df.nombre) };
  const nombres = v.asistentes.map(a => a.nombre).filter(Boolean);
  const bloque = (clave, titulo) => `<div style="margin-bottom:8px"><b>${titulo}</b><div class="fila"><input type="text" id="f-${clave}-e" value="${h(f[clave].empresa)}" placeholder="Empresa"><input type="text" id="f-${clave}-n" list="dl-nom" value="${h(f[clave].nombre)}" placeholder="Nombre"></div></div>`;
  const docs = (o.documentos && o.documentos[lote]) || DOCUMENTOS_POR_DEFECTO[lote] || [];
  const res = await dialogo(`<h3 style="margin-top:0">Acta de recepción provisional – ${h(r.rotulo)}</h3>
    ${bloque('propiedad', 'Propiedad')}${bloque('contratista', lote === 'oc' ? 'Empresa constructora' : 'Empresa instaladora')}${bloque('df', 'Dirección facultativa')}
    <datalist id="dl-nom">${nombres.map(x => `<option value="${h(x)}">`).join('')}</datalist>
    <label class="campo"><span>Documentos (una línea por documento)</span><textarea id="f-docs" rows="6">${h(docs.join('\n'))}</textarea></label>`,
    [{ t: 'Cancelar', v: null }, { t: 'Generar', v: 'ok', prim: true }]);
  if (res !== 'ok') return null;
  const leer = c => ({ empresa: $(`#f-${c}-e`).value.trim(), nombre: $(`#f-${c}-n`).value.trim() });
  const out = { propiedad: leer('propiedad'), contratista: leer('contratista'), df: leer('df') };
  const documentos = $('#f-docs').value.split('\n').map(s => s.trim()).filter(Boolean);
  o.firmantes = o.firmantes || {}; o.firmantes[lote] = { propiedad: { empresa: out.propiedad.empresa }, contratista: { empresa: out.contratista.empresa }, df: { empresa: out.df.empresa } };
  o.documentos = o.documentos || {}; o.documentos[lote] = documentos; guardar(true);
  return { firmantes: out, documentos };
}

async function vistaPrevia(doc) {
  const { css, html } = await MotorDocs.aHtml(doc);
  $('#estilo-pagina').textContent = css;
  $('#hoja').innerHTML = html; $('#zona-impresion').innerHTML = html;
  $('#v-tit').textContent = doc.nombre;
  const vista = $('#vista'); vista.classList.add('on');
  const ajustar = () => { const hoja = $('#hoja'); hoja.style.transform = ''; const disp = vista.querySelector('.scroll').clientWidth - 20; const esc = Math.min(1, disp / hoja.offsetWidth); hoja.style.transform = `scale(${esc})`; hoja.style.marginBottom = `${-(1 - esc) * hoja.offsetHeight}px`; hoja.style.marginLeft = esc < 1 ? '0' : 'auto'; };
  ajustar(); window.onresize = ajustar;
  $('#v-cerrar').onclick = () => { vista.classList.remove('on'); $('#zona-impresion').innerHTML = ''; window.onresize = null; };
  $('#v-imprimir').onclick = () => { const t = document.title; document.title = doc.nombre; window.print(); setTimeout(() => document.title = t, 1000); };
}

// ---------- arranque ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(console.error);
pintarLogoBarra();
render();
