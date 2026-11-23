// Motor de documentos: un mismo modelo de documento se convierte en
//  - Word (.docx), generado en el propio dispositivo sin conexión
//  - HTML para imprimir / "Guardar como PDF" desde el navegador
//
// Modelo:
//  doc = { nombre, marcoPagina: '#C00000' | null, numeracion: 'n' | 'n/N' | null,
//          secciones: [{ cabecera: [bloques], pie: [bloques], bloques: [bloques], sinNumero: bool }],
//          margenes: { top, bottom, left, right, header, footer } (pt) }
//  bloque párrafo: { t:'p', runs:[{text,b,u,i,color,size,field}], align, before, after, indent, hanging, bordeInf:{color,size}, bordeSup:{color,size}, keepNext }
//  bloque imagen:  { t:'img', src, w, h, align }  (w,h en pt)
//  bloque tabla:   { t:'tabla', cols:[pt...], filas:[{ alto, celdas:[{ bloques, bordes:{top,bottom,left,right}, vAlign }] }] }
//  bloque salto:   { t:'salto' }

const MotorDocs = (() => {
  // ---------- utilidades ----------
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const TW = pt => Math.round(pt * 20);      // twips
  const EMU = pt => Math.round(pt * 12700);  // EMU
  const hex = c => (c || '000000').replace('#', '').toUpperCase();

  const cacheImg = {};
  async function cargarImagen(src) {
    if (cacheImg[src]) return cacheImg[src];
    let bytes, dataURL;
    if (src.startsWith('data:')) {
      dataURL = src;
      const b64 = src.split(',')[1];
      const bin = atob(b64); bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      const r = await fetch(src); const buf = await r.arrayBuffer(); bytes = new Uint8Array(buf);
      let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      const tipo = /\.jpe?g$/i.test(src) ? 'image/jpeg' : 'image/png';
      dataURL = 'data:' + tipo + ';base64,' + btoa(s);
    }
    const ext = dataURL.startsWith('data:image/jpeg') ? 'jpeg' : 'png';
    const dim = await new Promise(res => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([100, 100]); im.src = dataURL; });
    cacheImg[src] = { bytes, dataURL, ext, pw: dim[0], ph: dim[1] };
    return cacheImg[src];
  }

  // ---------- ZIP (sin compresión) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(ficheros) { // [{nombre, datos: Uint8Array|string}]
    const enc = new TextEncoder(); const partes = []; const central = []; let offset = 0;
    for (const f of ficheros) {
      const datos = typeof f.datos === 'string' ? enc.encode(f.datos) : f.datos;
      const nombre = enc.encode(f.nombre); const crc = crc32(datos);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, datos.length, true); lh.setUint32(22, datos.length, true); lh.setUint16(26, nombre.length, true); lh.setUint16(28, 0, true);
      partes.push(new Uint8Array(lh.buffer), nombre, datos);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, datos.length, true); ch.setUint32(24, datos.length, true);
      ch.setUint16(28, nombre.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nombre);
      offset += 30 + nombre.length + datos.length;
    }
    const tamCentral = central.reduce((a, b) => a + b.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, ficheros.length, true); fin.setUint16(10, ficheros.length, true);
    fin.setUint32(12, tamCentral, true); fin.setUint32(16, offset, true);
    return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  // ---------- DOCX ----------
  async function aDocx(doc) {
    const media = []; // {nombre, bytes}
    const relsPorParte = {}; // parte -> [{id,type,target}]
    const anadirRel = (parte, type, target) => {
      relsPorParte[parte] = relsPorParte[parte] || [];
      const id = 'rId' + (relsPorParte[parte].length + 10);
      relsPorParte[parte].push({ id, type, target }); return id;
    };
    const imgIdx = {}; let dibujoId = 1;
    const RT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';

    async function imagenXml(b, parte) {
      const im = await cargarImagen(b.src);
      let nombre = imgIdx[b.src];
      if (!nombre) { nombre = 'imagen' + (media.length + 1) + '.' + im.ext; imgIdx[b.src] = nombre; media.push({ nombre, bytes: im.bytes }); }
      const rid = anadirRel(parte, RT + 'image', 'media/' + nombre);
      const id = dibujoId++;
      return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${EMU(b.w)}" cy="${EMU(b.h)}"/><wp:docPr id="${id}" name="Imagen ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${nombre}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${EMU(b.w)}" cy="${EMU(b.h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    }
    const runXml = r => {
      if (r.field) return `<w:fldSimple w:instr=" ${r.field} "><w:r>${rPr(r)}<w:t>1</w:t></w:r></w:fldSimple>`;
      const trozos = String(r.text == null ? '' : r.text).split('\n');
      return trozos.map((t, i) => `<w:r>${rPr(r)}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`).join('');
    };
    const rPr = r => `<w:rPr>${r.font ? `<w:rFonts w:ascii="${r.font}" w:hAnsi="${r.font}" w:cs="${r.font}"/>` : ''}${r.b ? '<w:b/>' : ''}${r.i ? '<w:i/>' : ''}${r.color ? `<w:color w:val="${hex(r.color)}"/>` : ''}${r.size ? `<w:sz w:val="${r.size * 2}"/><w:szCs w:val="${r.size * 2}"/>` : ''}${r.u ? '<w:u w:val="single"/>' : ''}</w:rPr>`;
    const borde = (lado, d) => d ? `<w:${lado} w:val="single" w:sz="${Math.round((d.size || 0.75) * 8)}" w:space="1" w:color="${hex(d.color)}"/>` : '';
    const pPr = (b, extra = '') => {
      const bordes = (b.bordeInf || b.bordeSup) ? `<w:pBdr>${borde('top', b.bordeSup)}${borde('bottom', b.bordeInf)}</w:pBdr>` : '';
      const tabs = b.tabs ? `<w:tabs>${b.tabs.map(t => `<w:tab w:val="${t.align || 'left'}" w:pos="${TW(t.pos)}"/>`).join('')}</w:tabs>` : '';
      return `<w:pPr>${b.keepNext ? '<w:keepNext/>' : ''}${bordes}${tabs}<w:spacing w:before="${TW(b.before || 0)}" w:after="${TW(b.after == null ? 4 : b.after)}"${b.line ? ` w:line="${Math.round(b.line * 240)}" w:lineRule="auto"` : ''}/>${(b.indent || b.hanging) ? `<w:ind w:left="${TW((b.indent || 0) + (b.hanging || 0))}"${b.hanging ? ` w:hanging="${TW(b.hanging)}"` : ''}/>` : ''}${b.align ? `<w:jc w:val="${b.align === 'justify' ? 'both' : b.align}"/>` : ''}${extra}</w:pPr>`;
    };
    async function bloquesXml(bloques, parte, ancho) {
      let x = '';
      for (const b of bloques) {
        if (b.t === 'p') x += `<w:p>${pPr(b)}${(b.runs || []).map(r => r.tab ? '<w:r><w:tab/></w:r>' : runXml(r)).join('')}</w:p>`;
        else if (b.t === 'img') x += b.src ? `<w:p>${pPr(b)}${await imagenXml(b, parte)}</w:p>` : `<w:p>${pPr(b)}</w:p>`;
        else if (b.t === 'salto') x += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
        else if (b.t === 'tabla') {
          const total = b.cols.reduce((a, c) => a + c, 0);
          x += `<w:tbl><w:tblPr><w:tblW w:w="${TW(total)}" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="57" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${b.cols.map(c => `<w:gridCol w:w="${TW(c)}"/>`).join('')}</w:tblGrid>`;
          for (const f of b.filas) {
            x += `<w:tr>${f.alto ? `<w:trPr><w:trHeight w:val="${TW(f.alto)}" w:hRule="atLeast"/></w:trPr>` : ''}`;
            for (let i = 0; i < f.celdas.length; i++) {
              const c = f.celdas[i]; const bo = c.bordes || {};
              const ancho = c.span ? b.cols.slice(i, i + c.span).reduce((a, v) => a + v, 0) : b.cols[i];
              x += `<w:tc><w:tcPr><w:tcW w:w="${TW(ancho)}" w:type="dxa"/>${c.span ? `<w:gridSpan w:val="${c.span}"/>` : ''}<w:tcBorders>${['top', 'left', 'bottom', 'right'].map(l => bo[l] ? borde(l, bo[l]) : `<w:${l} w:val="nil"/>`).join('')}</w:tcBorders>${c.vAlign ? `<w:vAlign w:val="${c.vAlign}"/>` : ''}</w:tcPr>`;
              const inner = await bloquesXml(c.bloques && c.bloques.length ? c.bloques : [{ t: 'p', runs: [] }], parte, ancho);
              x += inner + '</w:tc>';
            }
            x += '</w:tr>';
          }
          x += '</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';
        }
      }
      return x;
    }
    const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
    const m = Object.assign({ top: 70, bottom: 70, left: 57, right: 57, header: 28, footer: 28 }, doc.margenes || {});
    const partesExtra = [];
    let cuerpo = '';
    for (let s = 0; s < doc.secciones.length; s++) {
      const sec = doc.secciones[s];
      const hNom = `header${s + 1}.xml`, fNom = `footer${s + 1}.xml`;
      const hXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}>${await bloquesXml(sec.cabecera && sec.cabecera.length ? sec.cabecera : [{ t: 'p', runs: [] }], 'word/' + hNom)}</w:hdr>`;
      const pie = (sec.pie || []).slice();
      if (!sec.sinNumero && doc.numeracion && !doc.pieConNumero) pie.push({ t: 'p', align: doc.numeracionAlign || 'right', after: 0, runs: doc.numeracion === 'n/N' ? [{ field: 'PAGE', size: 9 }, { text: '/', size: 9 }, { field: 'NUMPAGES', size: 9 }] : [{ field: 'PAGE', size: 9 }] });
      const fXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}>${await bloquesXml(pie.length ? pie : [{ t: 'p', runs: [] }], 'word/' + fNom)}</w:ftr>`;
      partesExtra.push({ nombre: 'word/' + hNom, datos: hXml }, { nombre: 'word/' + fNom, datos: fXml });
      const hId = anadirRel('word/document.xml', RT + 'header', hNom);
      const fId = anadirRel('word/document.xml', RT + 'footer', fNom);
      const borde = doc.marcoPagina ? `<w:pgBorders w:offsetFrom="page"><w:top w:val="single" w:sz="12" w:space="24" w:color="${hex(doc.marcoPagina)}"/><w:left w:val="single" w:sz="12" w:space="24" w:color="${hex(doc.marcoPagina)}"/><w:bottom w:val="single" w:sz="12" w:space="24" w:color="${hex(doc.marcoPagina)}"/><w:right w:val="single" w:sz="12" w:space="24" w:color="${hex(doc.marcoPagina)}"/></w:pgBorders>` : '';
      const sectPr = `<w:sectPr><w:headerReference w:type="default" r:id="${hId}"/><w:footerReference w:type="default" r:id="${fId}"/><w:type w:val="nextPage"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${TW(m.top)}" w:right="${TW(m.right)}" w:bottom="${TW(m.bottom)}" w:left="${TW(m.left)}" w:header="${TW(m.header)}" w:footer="${TW(m.footer)}" w:gutter="0"/>${borde}</w:sectPr>`;
      let contenido = await bloquesXml(sec.bloques, 'word/document.xml');
      if (s < doc.secciones.length - 1) contenido += `<w:p><w:pPr>${sectPr}</w:pPr></w:p>`;
      else contenido += sectPr;
      cuerpo += contenido;
    }
    const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${cuerpo}</w:body></w:document>`;
    const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" w:eastAsia="Tahoma"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
    const ajustes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="708"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
    anadirRel('word/document.xml', RT + 'styles', 'styles.xml');
    anadirRel('word/document.xml', RT + 'settings', 'settings.xml');
    const relsXml = parte => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${(relsPorParte[parte] || []).map(r => `<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`).join('')}</Relationships>`;
    const ficheros = [
      { nombre: '[Content_Types].xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>${doc.secciones.map((s, i) => `<Override PartName="/word/header${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`).join('')}</Types>` },
      { nombre: '_rels/.rels', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
      { nombre: 'word/document.xml', datos: documento },
      { nombre: 'word/styles.xml', datos: estilos },
      { nombre: 'word/settings.xml', datos: ajustes },
      ...partesExtra,
      { nombre: 'word/_rels/document.xml.rels', datos: relsXml('word/document.xml') },
    ];
    for (const parte of Object.keys(relsPorParte)) {
      if (parte === 'word/document.xml') continue;
      ficheros.push({ nombre: 'word/_rels/' + parte.replace('word/', '') + '.rels', datos: relsXml(parte) });
    }
    for (const md of media) ficheros.push({ nombre: 'word/media/' + md.nombre, datos: md.bytes });
    return zip(ficheros);
  }

  // ---------- HTML para imprimir / PDF ----------
  async function aHtml(doc) {
    const runHtml = r => {
      if (r.tab) return '<span style="display:inline-block;width:2em"></span>';
      if (r.field) return '';
      const st = [];
      if (r.b) st.push('font-weight:bold'); if (r.i) st.push('font-style:italic'); if (r.u) st.push('text-decoration:underline');
      if (r.color) st.push('color:' + r.color); if (r.size) st.push('font-size:' + r.size + 'pt');
      return `<span style="${st.join(';')}">${esc(r.text).replace(/\n/g, '<br>')}</span>`;
    };
    const bordeCss = (lado, d) => d ? `border-${lado}:${Math.max(0.5, d.size || 0.75)}pt solid ${d.color || '#000'};` : '';
    async function bloquesHtml(bloques) {
      let h = '';
      for (const b of bloques) {
        if (b.t === 'p') {
          const st = `margin:${b.before || 0}pt 0 ${b.after == null ? 4 : b.after}pt ${(b.indent || 0) + (b.hanging || 0)}pt;${b.hanging ? `text-indent:-${b.hanging}pt;` : ''}text-align:${b.align === 'both' ? 'justify' : (b.align || 'left')};${bordeCss('bottom', b.bordeInf)}${bordeCss('top', b.bordeSup)}${b.line ? `line-height:${b.line};` : ''}${b.bordeInf ? 'padding-bottom:2pt;' : ''}`;
          h += `<div class="p" style="${st}">${(b.runs || []).map(runHtml).join('') || '&nbsp;'}</div>`;
        } else if (b.t === 'img') {
          if (!b.src) { h += `<div style="height:${b.h}pt;margin:${b.before || 0}pt 0 ${b.after || 0}pt"></div>`; continue; }
          const im = await cargarImagen(b.src);
          h += `<div style="text-align:${b.align || 'left'};margin:${b.before || 0}pt 0 ${b.after || 0}pt"><img src="${im.dataURL}" style="width:${b.w}pt;height:${b.h}pt"></div>`;
        } else if (b.t === 'salto') h += '<div style="break-after:page"></div>';
        else if (b.t === 'tabla') {
          h += `<table style="border-collapse:collapse;table-layout:fixed;width:${b.cols.reduce((a, c) => a + c, 0)}pt;margin:0 0 2pt"><colgroup>${b.cols.map(c => `<col style="width:${c}pt">`).join('')}</colgroup>`;
          for (const f of b.filas) {
            h += `<tr style="${f.alto ? `height:${f.alto}pt` : ''}">`;
            for (const c of f.celdas) {
              const bo = c.bordes || {};
              h += `<td ${c.span ? `colspan="${c.span}"` : ''} style="padding:1pt 3pt;vertical-align:${c.vAlign === 'center' ? 'middle' : (c.vAlign || 'top')};${['top', 'left', 'bottom', 'right'].map(l => bordeCss(l, bo[l])).join('')}">${await bloquesHtml(c.bloques || [])}</td>`;
            }
            h += '</tr>';
          }
          h += '</table>';
        }
      }
      return h;
    }
    const m = Object.assign({ top: 70, bottom: 70, left: 57, right: 57, header: 28, footer: 28 }, doc.margenes || {});
    const cont = doc.numeracion === 'n/N' ? 'counter(page) "/" counter(pages)' : 'counter(page)';
    const lado = doc.numeracionAlign === 'left' ? 'left' : 'right';
    // Con marco de página: márgenes de página pequeños y el contenido se separa del marco con relleno
    const mp = doc.marcoPagina ? { t: 22, b: 22, l: 22, r: 22 } : { t: m.header, b: m.footer, l: m.left, r: m.right };
    const relleno = doc.marcoPagina ? `padding-left:${m.left - 22}pt;padding-right:${m.right - 22}pt;` : '';
    let css = `@page{size:A4;margin:${mp.t}pt ${mp.r}pt ${mp.b}pt ${mp.l}pt;${doc.numeracion ? `@bottom-${lado}{content:${cont};font:9pt Tahoma,'Lucida Sans Unicode',Arial,sans-serif;vertical-align:top;padding-top:3pt}` : ''}}`;
    if (doc.logoPieHtml && doc.logoPieHtml !== 'null') { const im = await cargarImagen(doc.logoPieHtml); css = css.replace(/}$/, `@bottom-right{content:url("${im.dataURL}");vertical-align:top;padding-top:3pt}}`); }
    if (doc.secciones[0] && doc.secciones[0].sinNumero) css += `@page :first{@bottom-left{content:none}@bottom-right{content:none}}`;
    let h = '';
    if (doc.marcoPagina) h += `<div class="marco" style="border:1.5pt solid ${doc.marcoPagina}"></div>`;
    for (let s = 0; s < doc.secciones.length; s++) {
      const sec = doc.secciones[s];
      const espCab = doc.marcoPagina ? 12 : 0;
      const pieHtml = doc.pieSoloWord ? '' : await bloquesHtml(sec.pie || []);
      let tfoot = `<div style="height:6pt"></div>${pieHtml}<div style="height:${espCab}pt"></div>`;
      if (sec.pieFijo && pieHtml) {
        // Pie fijo al fondo de cada página (como el pie de Word); el tfoot solo reserva el espacio
        const ml = doc.marcoPagina ? m.left - 22 : 0, mr = doc.marcoPagina ? m.right - 22 : 0;
        h += `<div class="pie-fijo" style="left:${ml}pt;right:${mr}pt;bottom:${espCab}pt">${pieHtml}</div>`;
        tfoot = `<div style="height:${(sec.altoPie || 80) + espCab}pt"></div>`;
      }
      h += `<table class="seccion" style="${s ? 'break-before:page;' : ''}"><thead><tr><td style="${relleno}"><div style="height:${espCab}pt"></div>${await bloquesHtml(sec.cabecera || [])}<div style="height:${Math.max(4, m.top - m.header - 34)}pt"></div></td></tr></thead><tfoot><tr><td style="${relleno}">${tfoot}</td></tr></tfoot><tbody><tr><td style="${relleno}">${await bloquesHtml(sec.bloques)}</td></tr></tbody></table>`;
    }
    return { css, html: h };
  }

  return { aDocx, aHtml, cargarImagen };
})();
