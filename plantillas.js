// Plantillas de check list.
// Origen: "00_BDZ_ Check list_28 octubre_v3.pdf" (solo texto negro; anotaciones en azul descartadas).
// Correcciones acordadas: pulsadores "entre 80cm y 120cm"; paréntesis del rack de megafonía.
// Formato de cada punto: [id, título, descripción, opciones]
//   opciones.valor  -> el punto lleva un campo para anotar un valor (solo aljibe)
//   opciones.link   -> el punto comparte estado y nota con otro (se pregunta una vez, sale en los dos capítulos)
//   opciones.brico  -> punto particular de Brico Dépôt (no se incluye en la plantilla General)

const CAPITULOS_BASE = [
  { id: 'OC', num: 1, nombre: 'OBRA CIVIL', lote: 'oc', apartados: [
    { letra: 'A', nombre: 'Carpintería exterior', puntos: [
      ['OC-A1', 'Puertas automáticas', 'Correcto funcionamiento en ambos lados por sensor.'],
      ['OC-A2', 'Accesorios puertas exteriores', 'Correcto funcionamiento y con todos los accesorios colocados correctamente.'],
      ['OC-A3', 'Persianas', 'Correcto funcionamiento.'],
      ['OC-A4', 'Puertas seccionales exteriores fachada principal', 'Correcto funcionamiento.'],
      ['OC-A5', 'Puertas seccionales exteriores fachada trasera', 'Correcto funcionamiento.'],
      ['OC-A6', 'Puertas rápidas exteriores', 'Correcto funcionamiento.'],
      ['OC-A7', 'Puertas emergencias', 'Apertura y cierre correctos. Dispone de todos los accesorios en buen estado.'],
      ['OC-A8', 'Puertas peatonales (no evacuación)', 'Apertura y cierre correctos. Dispone de todos los accesorios en buen estado.'],
      ['OC-A9', 'Trancas puertas', 'Comprobación correcto funcionamiento.'],
    ]},
    { letra: 'B', nombre: 'Carpintería interior', puntos: [
      ['OC-B1', 'Puertas rápidas', 'Apertura y cierre automático en buen funcionamiento. Botonera en funcionamiento.'],
      ['OC-B2', 'Cabinas con mamparas', 'Anclado correctamente, mampara y cierre en buen estado.'],
      ['OC-B3', 'Puertas PMR', 'Correderas o apertura en sentido evacuación, con 80cm de paso mínimo, accesorios correctos. Apertura y cierre en buen funcionamiento.'],
      ['OC-B4', 'Puertas madera', 'Apertura y cierre en buen funcionamiento. Accesorios en buen estado.'],
      ['OC-B5', 'Puertas metálicas', 'Apertura y cierre en buen funcionamiento. Accesorios en buen estado.'],
      ['OC-B6', 'Puertas con cierre automático', 'Buen funcionamiento.'],
      ['OC-B7', 'Ventanas oficinas', 'Estancas y con antepecho bien colocado.'],
      ['OC-B8', 'Ventanas Assesor pro', 'Corredera y buen funcionamiento.', { brico: true }],
      ['OC-B9', 'Puerta cofre', 'Apertura y cierre automático en buen funcionamiento. Accesorios y cerradura en buen estado.'],
    ]},
    { letra: 'C', nombre: 'Sanitarios', puntos: [
      ['OC-C1', 'Grifería', 'Correcto funcionamiento.'],
      ['OC-C2', 'Lavabos', 'Sin presencia de fugas y bien anclados.'],
      ['OC-C3', 'Inodoros', 'Sin presencia de fugas, bien anclados y accesorios en buen estado.'],
      ['OC-C4', 'Urinarios', 'Sin presencia de fugas, bien anclados y accesorios en buen estado.'],
      ['OC-C5', 'Toma de agua almacén', 'Instaladas según indicaciones Brico Depot.'],
    ]},
    { letra: 'D', nombre: 'Saneamiento', puntos: [
      ['OC-D1', 'Estanqueidad saneamiento', 'Ejecutado por la propiedad. Aportación de certificados correspondientes.'],
    ]},
    { letra: 'E', nombre: 'Cubierta', puntos: [
      ['OC-E1', 'Impermeabilización cubierta', 'Está correctamente ejecutado. Se ha aportado certificaciones correspondientes.'],
      ['OC-E2', 'Accesos cubierta', 'Escalera independiente / escalera de gato.'],
      ['OC-E3', 'Seguridad', 'El acceso y en todo el trazado dispone de peto perimetral o bien línea de vida según normativa vigente.'],
    ]},
    { letra: 'F', nombre: 'Otros', puntos: [
      ['OC-F1', 'Barreras automáticas', 'Entrada con sensor y salida con botón.'],
      ['OC-F2', 'Accesos tienda', 'Sin resaltos y en buen estado.'],
      ['OC-F3', 'Pavimento oficinas', 'Sin roturas y sin diferencias de cotas.'],
      ['OC-F4', 'Pavimento aseos', 'Sin roturas, sin diferencias de cotas y grado de resbaladicidad C2.'],
      ['OC-F5', 'Pavimento duchas', 'Sin roturas, sin diferencias de cotas y grado de resbaladicidad C3.'],
      ['OC-F6', 'Pavimento sala de ventas', 'Juntas en buen estado.'],
      ['OC-F7', 'Pavimento Batí', 'Juntas en buen estado.', { brico: true }],
      ['OC-F8', 'Pavimento Almacén', 'Juntas en buen estado.'],
    ]},
  ]},
  { id: 'BT', num: 2, nombre: 'BAJA TENSIÓN', lote: 'inst', apartados: [
    { letra: 'A', nombre: 'Cuadros eléctricos', puntos: [
      ['BT-A1', 'Accesibilidad', 'Libre de obstáculos (sin mercancía bloqueando el acceso).'],
      ['BT-A2', 'Cerramientos y señalización', 'Puertas cerradas. Los esquemas unifilares están dentro de cada cuadro.'],
      ['BT-A3', 'Limpieza e identificación', 'Sin polvo ni basura en su interior; esquema unifilar presente y etiquetado correcto.'],
      ['BT-A4', 'Ventilación y estado', 'Operativa, sin ruidos de chispas ni olores anómalos.'],
      ['BT-A5', 'Test mecánico', 'Los diferenciales saltan correctamente al pulsar el botón "T".'],
      ['BT-A6', 'Estado de aparamenta', 'Sin plásticos quemados/deformados ni automáticos bloqueados de forma manual.'],
    ]},
    { letra: 'B', nombre: 'Canalizaciones, tomas e iluminación', puntos: [
      ['BT-B1', 'Bandejas y cables', 'Bien ancladas, sin cables cortados o empalmes improvisados, tapas de cajas cerradas.'],
      ['BT-B2', 'Zona estanterías (Racks)', 'Cables bajantes bien protegidos contra los golpes de carretillas.'],
      ['BT-B3', 'Tomas de corriente', 'Base firme, tierra visible y sin "efecto margarita" de regletas.'],
      ['BT-B4', 'SAI', 'Trabajando en línea, baterías cargadas y sin alarmas ni ruidos inusuales.'],
      ['BT-B5', 'Iluminación', 'Focos anclados de forma segura, sin parpadeos, y contactores trabajando sin vibración excesiva.'],
      ['BT-B6', 'Carriles de iluminación', 'Colocados según plano alumbrado.'],
      ['BT-B7', 'Nivel lumínico emergencias', '1 lux en pasillos de evacuación y 5 lux en las zonas de cuadros CGBT y sistemas PCI.'],
    ]},
    { letra: 'C', nombre: 'Zonas especificas', puntos: [
      ['BT-C1', 'Exterior', 'Enchufes y cajas completamente estancos y sin humedades.'],
      ['BT-C2', 'Corte de madera', 'Luminarias, motores y cuadros de la zona completamente libres de acumulaciones de serrín.', { brico: true }],
    ]},
    { letra: 'D', nombre: 'Control, BMS y eficiencia energética', puntos: [
      ['BT-D1', 'Estado fotovoltaica', 'Conectado y en funcionamiento.'],
      ['BT-D2', 'Conexión de todos los puntos por BMS', 'Dispositivos conectados para el control centralizado.'],
      ['BT-D3', 'Horarios', 'Encendido y apagado programados correctamente.', { link: 'HORARIOS' }],
      ['BT-D4', 'Termostatos', 'Consignas de temperatura fijadas.', { link: 'TERMOSTATOS' }],
    ]},
  ]},
  { id: 'PCI', num: 3, nombre: 'PROTECCIÓN CONTRA INCENDIOS', lote: 'inst', apartados: [
    { letra: 'A', nombre: 'Sala de Bombas PCI', puntos: [
      ['PCI-A1', 'Cuadro de control', 'Sin averías, sin alarmas y en modo automático.'],
      ['PCI-A2', 'Presión', 'Manómetros indicando la presión correcta en los colectores (suele rondar entre 6 y 10 bar) y ausencia de fugas.'],
      ['PCI-A3', 'Válvulas', 'Válvulas de aspiración e impulsión abiertas y aseguradas.'],
      ['PCI-A4', 'Prueba de funcionamiento', 'Arranque de la bomba Jockey y de la bomba Principal correcto (automático y manual).'],
      ['PCI-A5', 'Aljibe/ Depósito de agua', 'Comprobar visualmente / indicador de nivel:', { valor: 'Indicador de nivel' }],
    ]},
    { letra: 'B', nombre: 'Central de Incendios, Detectores, Pulsadores y Alarma', puntos: [
      ['PCI-B1', 'Centralita', 'Panel limpio de fallos, sin alarmas activas y luces de estado en verde.'],
      ['PCI-B2', 'Conexión centralita PCI con CRA', 'Conectadas.'],
      ['PCI-B3', 'Detectores', 'Bien fijados, sin obstrucciones ni pintados. Capuchón quitados.'],
      ['PCI-B4', 'Pulsadores de alarma', 'Visibles, libres de obstáculos y con el cristal/plástico frontal intacto. Instalados a una altura entre 80cm y 120cm.'],
      ['PCI-B5', 'Sirenas óptico-acústicas', 'Comprobar que las campanas y flashes estroboscópicos están limpios y no han quedado ocultos.'],
    ]},
    { letra: 'C', nombre: 'Rociadores (Sprinklers)', puntos: [
      ['PCI-C1', 'Puestos de control', 'Válvulas de sector abiertas y manómetros con presión estable.'],
      ['PCI-C2', 'Cabezas de rociadores', 'Intactas y sin golpes.'],
      ['PCI-C3', 'Gálibo en estanterías', 'Espacio libre mínimo de unos 50 cm entre la parte superior de la mercancía almacenada.'],
    ]},
    { letra: 'D', nombre: 'BIEs (Bocas de Incendio Equipadas)', puntos: [
      ['PCI-D1', 'Accesibilidad', '100% despejadas.'],
      ['PCI-D2', 'Presión', 'Manómetro marcando presión estática entre 4 y 7 bar.'],
      ['PCI-D3', 'Estado interno', 'Manguera perfectamente enrollada, lanza conectada y cerrada, y cristal de la puerta intacto.'],
    ]},
    { letra: 'E', nombre: 'Extintores', puntos: [
      ['PCI-E1', 'Ubicación y estado', 'Accesibles. Parte superior entre 80 cm y 120 cm.'],
      ['PCI-E2', 'Seguros', 'Precintos y pasadores de seguridad totalmente intactos.'],
      ['PCI-E3', 'Presión', 'Aguja del manómetro en la zona verde.'],
      ['PCI-E4', 'Mantenimiento', 'Etiqueta de revisión anual en vigor.'],
    ]},
    { letra: 'F', nombre: 'Señalética y Evacuación', puntos: [
      ['PCI-F1', 'Visibilidad', 'Las señales de los extintores, BIEs y pulsadores son perfectamente visibles desde cualquier punto del pasillo.'],
      ['PCI-F2', 'Estado', 'Carteles foto luminiscentes limpios, bien fijados y sin roturas.'],
      ['PCI-F3', 'Altura / ubicación', 'Parte superior carteles a 4,60m del suelo y ubicación según planos.'],
    ]},
    { letra: 'G', nombre: 'Evacuación e Iluminación de Emergencia', puntos: [
      ['PCI-G1', 'Salidas de emergencia', '100% despejadas.'],
      ['PCI-G2', 'Puertas automáticas', 'apertura correcta.'],
      ['PCI-G3', 'Barras anti pánico', 'Comprobación visual de que no están bloqueadas, dañadas ni atadas. Las puertas deben abrir sin resistencia.'],
      ['PCI-G4', 'Iluminación de emergencia', 'Comprobar que el piloto LED de estado (carga).'],
    ]},
    { letra: 'H', nombre: 'Puertas Cortafuegos (Sectorización)', puntos: [
      ['PCI-H1', 'Cierre automático', 'Ninguna puerta cortafuegos debe estar bloqueada abierta.'],
      ['PCI-H2', 'Electroimanes', 'Si las puertas están retenidas por electroimanes conectados a la centralita, comprobar que están fijos y no presentan daños.'],
      ['PCI-H3', 'Estado físico', 'Las juntas intumescentes y las bisagras no deben presentar daños estructurales por golpes de transpaletas o toros mecánicos.'],
    ]},
    { letra: 'I', nombre: 'Control de Humos y Alarmas', puntos: [
      ['PCI-I1', 'Exutorios (Aireadores de techo)', 'Revisar que el cuadro de control de exutorios no marca avería y que los pulsadores manuales de apertura de aireadores (suelen ser naranjas o amarillos) están accesibles y con el cristal intacto.'],
    ]},
  ]},
  { id: 'CLI', num: 4, nombre: 'CLIMATIZACIÓN', lote: 'inst', apartados: [
    { letra: 'A', nombre: 'Rooftops/ Unidades de tratamiento de aire (UTAs)', puntos: [
      ['CLI-A1', 'Rooftops', 'Alrededor de las mismas habrá espacio para mantenimiento con tramex y con barandilla en el caso de estar en altura la bancada.'],
    ]},
    { letra: 'B', nombre: 'Splits/ VRV (Oficinas y Zonas críticas)', puntos: [
      ['CLI-B1', 'Unidades interiores', 'Filtros limpios en oficinas y despachos.'],
      ['CLI-B2', 'Sala de Racks (Crítico)', 'Climatización operativa 24/7, sin alarmas en el display y temperatura estable en torno a 20-22ºC.'],
      ['CLI-B3', 'Unidades exteriores', 'Libres de obstáculos, con buena ventilación y sin vibraciones ni ruidos anómalos de los compresores. Tipo de anclaje/apoyo.'],
    ]},
    { letra: 'C', nombre: 'Conductos y distribución de aire', puntos: [
      ['CLI-C1', 'Conductos', 'comprobar que no haya roturas, desgarros ni fugas visibles.'],
      ['CLI-C2', 'Difusores y rejillas', 'Limpios, sin marcas de acumulación de polvo negro a su alrededor.'],
    ]},
    { letra: 'D', nombre: 'Control Climatización', puntos: [
      ['CLI-D1', 'Termostatos', 'Consignas de temperatura fijadas según normativa vigente de ahorro energético (RITE).', { link: 'TERMOSTATOS' }],
      ['CLI-D2', 'Horarios', 'Encendido y apagado programados correctamente y ajustados al horario comercial de la tienda.', { link: 'HORARIOS' }],
      ['CLI-D3', 'Pantallas indicadoras SV', 'Encendido y en buen funcionamiento. Instalados según planos.'],
    ]},
    { letra: 'E', nombre: 'Seguridad e integración PCI', puntos: [
      ['CLI-E1', 'Parada de emergencia', 'Comprobar que, al activarse la alarma de incendios en la centralita, los equipos de clima se detienen automáticamente para no avivar ni propagar el humo.'],
      ['CLI-E2', 'Compuertas cortafuegos', 'Inspeccionar visualmente que las compuertas instaladas en conductos que cruzan sectores de incendio están operativas y no han sido bloqueadas.'],
    ]},
  ]},
  { id: 'MEG', num: 5, nombre: 'MEGAFONÍA', lote: 'inst', apartados: [
    { letra: 'A', nombre: 'Rack central y equipos de control', puntos: [
      ['MEG-A1', 'Accesibilidad y limpieza', 'El rack está cerrado (para evitar manipulación), limpio y el cuarto tiene buena ventilación (extractores funcionando).'],
      ['MEG-A2', 'Amplificadores', 'Ningún equipo muestra luces rojas de avería, protección o saturación (“CLIP”).'],
    ]},
    { letra: 'B', nombre: 'Micrófonos y puestos de Llamada', puntos: [
      ['MEG-B1', 'Estado físico', 'Los micrófonos no tienen el cuello de cisne roto ni cables pelados.'],
      ['MEG-B2', 'Pulsador PTT (Push-to-talk)', 'Al apretar para hablar, no suenan chasquidos fuertes ni zumbidos de masa por los altavoces.'],
      ['MEG-B3', 'Ajuste de volumen', 'El nivel de voz es claro y no se producen acoples (pitidos agudos) al hablar.'],
    ]},
    { letra: 'C', nombre: 'Altavoces y Líneas (Sonorización)', puntos: [
      ['MEG-C1', 'Fijación', 'Altavoces bien fijados a las bandejas o techos (si hay campanas suspendidas, comprobar que tienen el cable de acero de seguridad indicado).'],
      ['MEG-C2', 'Proyectores exteriores', 'En zona exterior, los altavoces no presentan daños por intemperie y están bien sellados.'],
      ['MEG-C3', 'Calidad de sonido', 'A volumen normal, no hay vibraciones, distorsión ni sonido a membrana rota (“cascareo”).'],
      ['MEG-C4', 'Cobertura', 'El sonido es uniforme al caminar por los pasillos, sin zonas mudas apreciados.'],
    ]},
  ]},
];

// Documentos por defecto del acta de recepción provisional (de las actas de CC3 Archi y Meta, sin el texto entre paréntesis)
const DOCUMENTOS_POR_DEFECTO = {
  oc: [
    'As Built completo.',
    'Certificados de instalación y CE/Ensayos de elementos de protección pasiva nuevos instalados.',
    'Fichas técnicas de los materiales suministrados e instalados.',
  ],
  inst: [
    'As Built completo, y una copia impresa.',
    'Esquemas unifilares colocados en los cuadros y subcuadros.',
    'Certificados de instalación y CE/Ensayos de elementos de protección pasiva nuevos instalados.',
    'Proyectos y OCAs de BT y Clima.',
    'Fichas técnicas de los materiales suministrados e instalados.',
  ],
};

function construirPlantilla(incluirBrico) {
  return CAPITULOS_BASE.map(c => ({
    id: c.id, num: c.num, nombre: c.nombre, lote: c.lote,
    apartados: c.apartados.map(a => ({
      letra: a.letra, nombre: a.nombre,
      puntos: a.puntos
        .filter(p => incluirBrico || !(p[3] && p[3].brico))
        .map(p => ({ id: p[0], titulo: p[1], desc: p[2], valor: p[3] && p[3].valor || null, link: p[3] && p[3].link || null })),
    })).filter(a => a.puntos.length),
  }));
}

const PLANTILLAS = {
  brico: { id: 'brico', nombre: 'Brico Dépôt', subtitulo: 'OPERACIONES/MANTENIMIENTO', logoCliente: 'brico', capitulos: construirPlantilla(true) },
  general: { id: 'general', nombre: 'General', subtitulo: 'OPERACIONES/MANTENIMIENTO', logoCliente: null, capitulos: construirPlantilla(false) },
};
