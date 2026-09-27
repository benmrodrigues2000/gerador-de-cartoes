import { generateQR } from './qr.js';
import { workspaceCopy } from './workspace-copy.js';
import { templates } from './templates.js';
import { normalizeState, parseProject, snapshotState, designFingerprint, projectFilename, safePhoto, websiteURL, createVCard } from './state.js';

/* =========================================================
   CARD STUDIO · CORPORATE EDITION
   Motor de temas, cor HEX, tipografia, QR, ajuste perfeito,
   visualização 3D, virar ao clique e PDF de impressão.
   ========================================================= */
(function(){
"use strict";

var root=document.documentElement, R=root.style, byId=function(i){return document.getElementById(i)};
var qa=function(s,c){return [].slice.call((c||document).querySelectorAll(s))};
var ESC_MAP={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ESC_MAP[c]})};

/* ---------------------------------------------------------
   COLOR SCIENCE
   --------------------------------------------------------- */
function normHex(v){
  if(v==null) return '';
  v=String(v).trim().replace(/^#/,'');
  if(/^[0-9a-fA-F]{3}$/.test(v)) v=v.split('').map(function(c){return c+c}).join('');
  if(!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  return '#'+v.toUpperCase();
}
function rgbOf(h){h=normHex(h)||'#000000';return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]}
function toHex(a){return '#'+a.map(function(v){v=Math.max(0,Math.min(255,Math.round(v)));return (v<16?'0':'')+v.toString(16)}).join('').toUpperCase()}
function shade(h,amt){var c=rgbOf(h);return toHex(c.map(function(v){return amt<0? v*(1+amt) : v+(255-v)*amt}))}
function rgba(h,a){var c=rgbOf(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}
function lumOf(h){var c=rgbOf(h).map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function contrast(a,b){var l1=lumOf(a),l2=lumOf(b),hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+.05)/(lo+.05)}
function wcag(r){return r>=7?['AAA','ok']:r>=4.5?['AA','ok']:r>=3?['AA Large','warn']:['Baixo','bad']}
function mm2px(mm){return mm*(96/25.4)}
function mm2pt(mm){return mm*72/25.4}
function n1(v){return (Math.round(v*10)/10).toString().replace(/\.0$/,'')}

/* ---------------------------------------------------------
   15 CORPORATE THEMES
   --------------------------------------------------------- */
var THEMES=[
 {id:'midnight',  n:'Midnight Navy',   canvas:'#0A1024', canvas2:'#16224A', paper:'#F5F7FC', primary:'#4C7DFF', secondary:'#9CC3FF', accent:'#D9B45B', font:'grotesk', body:'inter'},
 {id:'executive', n:'Executive Gold',   canvas:'#0C1424', canvas2:'#182540', paper:'#F7F3E8', primary:'#C8A24A', secondary:'#E4D3A0', accent:'#C8A24A', font:'playfair', body:'plexsans'},
 {id:'swiss',     n:'Swiss Corporate',  canvas:'#FFFFFF', canvas2:'#EDF0F4', paper:'#F4F5F7', primary:'#E4322B', secondary:'#1F2937', accent:'#E4322B', font:'archivo', body:'inter'},
 {id:'emerald',   n:'Emerald Capital',  canvas:'#05201A', canvas2:'#0B3227', paper:'#F1FBF6', primary:'#10B981', secondary:'#6EE7B7', accent:'#FBBF24', font:'fraunces', body:'lora'},
 {id:'slate',     n:'Slate Minimal',    canvas:'#15181E', canvas2:'#22262F', paper:'#F5F6F8', primary:'#A9B4C4', secondary:'#E3E9F0', accent:'#38BDF8', font:'jost', body:'inter'},
 {id:'burgundy',  n:'Burgundy & Co',    canvas:'#250912', canvas2:'#3A1220', paper:'#FBF2F3', primary:'#C42B4E', secondary:'#EFA9B8', accent:'#D6B26B', font:'plexserif', body:'plexsans'},
 {id:'teal',      n:'Teal Finance',     canvas:'#04202A', canvas2:'#0A3341', paper:'#EFF9FB', primary:'#0FB5C4', secondary:'#7EE8F0', accent:'#FFB020', font:'sora', body:'inter'},
 {id:'copper',    n:'Copper Craft',     canvas:'#1E1310', canvas2:'#31201A', paper:'#FBF5EF', primary:'#C87137', secondary:'#F0C9A6', accent:'#6FAE9E', font:'cormorant', body:'lora'},
 {id:'indigo',    n:'Indigo Tech',      canvas:'#0B0E2A', canvas2:'#161C4A', paper:'#F5F6FF', primary:'#6C7BFF', secondary:'#A5B4FC', accent:'#22D3EE', font:'grotesk', body:'sora'},
 {id:'crimson',   n:'Crimson Law',      canvas:'#1A0409', canvas2:'#2C0A12', paper:'#FDF5F5', primary:'#DC2626', secondary:'#F8B4B4', accent:'#1F2937', font:'dmsersif', body:'plexsans'},
 {id:'forest',    n:'Forest Eco',       canvas:'#0A1E14', canvas2:'#12301F', paper:'#F2F8F1', primary:'#2FA35F', secondary:'#9BE3B4', accent:'#E4B33E', font:'fraunces', body:'inter'},
 {id:'noir',      n:'Charcoal Noir',    canvas:'#0B0B0D', canvas2:'#1A1A1E', paper:'#FAFAFA', primary:'#E7E7EA', secondary:'#9C9CA6', accent:'#B7B7BD', font:'bebas', body:'inter'},
 {id:'platinum',  n:'Platinum Lux',     canvas:'#E8ECF1', canvas2:'#FFFFFF', paper:'#F7F9FB', primary:'#5A6577', secondary:'#0F172A', accent:'#B08D57', font:'playfair', body:'jost'},
 {id:'terracotta',n:'Terracotta Studio',canvas:'#2A1310', canvas2:'#3E1E19', paper:'#FDF4EE', primary:'#E2725B', secondary:'#F6C3AA', accent:'#2E8B8B', font:'cormorant', body:'manrope'},
 {id:'ocean',     n:'Ocean Marine',     canvas:'#05202F', canvas2:'#0B3045', paper:'#F0F7FB', primary:'#0EA5E9', secondary:'#8AD6FB', accent:'#F97316', font:'manrope', body:'inter'}
];

/* ---------------------------------------------------------
   CORPORATE FONT LIBRARY
   --------------------------------------------------------- */
var FONTS=[
 {id:'inter',      n:'Inter',             s:'"Inter",sans-serif',                k:'sans',  both:1},
 {id:'manrope',    n:'Manrope',           s:'"Manrope",sans-serif',              k:'sans',  both:1},
 {id:'grotesk',    n:'Space Grotesk',     s:'"Space Grotesk",sans-serif',        k:'sans',  both:1},
 {id:'sora',       n:'Sora',              s:'"Sora",sans-serif',                 k:'sans',  both:1},
 {id:'archivo',    n:'Archivo',           s:'"Archivo",sans-serif',              k:'sans',  both:1},
 {id:'poppins',    n:'Poppins',           s:'"Poppins",sans-serif',              k:'sans',  both:1},
 {id:'jost',       n:'Jost',              s:'"Jost",sans-serif',                 k:'sans',  both:1},
 {id:'plexsans',   n:'IBM Plex Sans',     s:'"IBM Plex Sans",sans-serif',        k:'sans',  both:1},
 {id:'plexserif',  n:'IBM Plex Serif',    s:'"IBM Plex Serif",serif',            k:'serif', both:1},
 {id:'lora',       n:'Lora',              s:'"Lora",serif',                      k:'serif', both:1},
 {id:'playfair',   n:'Playfair Display',  s:'"Playfair Display",serif',          k:'serif', both:1},
 {id:'cormorant',  n:'Cormorant Garamond',s:'"Cormorant Garamond",serif',        k:'serif', both:1},
 {id:'fraunces',   n:'Fraunces',          s:'"Fraunces",serif',                  k:'serif', both:1},
 {id:'dmsersif',   n:'DM Serif Display',  s:'"DM Serif Display",serif',          k:'serif'},
 {id:'bebas',      n:'Bebas Neue',        s:'"Bebas Neue",sans-serif',           k:'display'}
];
function fontStack(id,fb){var f=FONTS.filter(function(x){return x.id===id})[0];return f?f.s:fontStack(fb||'inter')}

/* ---------------------------------------------------------
   FORMATS (mm) · everything else derives from --u / --v
   --------------------------------------------------------- */
var FORMATS={
 eu:{w:85,h:55,l:'85 × 55 mm'},
 us:{w:88.9,h:50.8,l:'88,9 × 50,8 mm'},
 nordic:{w:90,h:50,l:'90 × 50 mm'},
 sq:{w:55,h:55,l:'55 × 55 mm'}
};

/* ---------------------------------------------------------
   SOCIAL PLATFORMS · icon + micro label
   --------------------------------------------------------- */
var PL={
 linkedin:{l:'LinkedIn',k:'IN',g:'<path d="M4.9 8.7h3.05V20H4.9zM6.44 3.6a1.78 1.78 0 1 1 0 3.56 1.78 1.78 0 0 1 0-3.56zM10.2 8.7h3V10.3h.05a3.35 3.35 0 0 1 3-1.7c3.2 0 3.8 2.05 3.8 4.75V20h-3.1v-5.2c0-1.25-.05-2.85-1.75-2.85s-2 1.35-2 2.75V20h-3z" fill="currentColor"/>'},
 x:{l:'X',k:'X',g:'<path d="M17.6 3H20l-6.3 7.2L21 21h-5.55l-4.2-5.6L6.35 21H3.9l6.85-7.8L3.3 3h5.7l3.8 5.2zm-.95 16.1h1.5L8.1 4.8H6.45z" fill="currentColor"/>'},
 instagram:{l:'Instagram',k:'IG',g:'<g fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5.2"/><circle cx="12" cy="12" r="4.15"/></g><circle cx="16.9" cy="7.1" r="1.2" fill="currentColor"/>'},
 facebook:{l:'Facebook',k:'FB',g:'<path d="M13.55 21v-7.6h2.85l.4-3.3h-3.25V8.15c0-.95.25-1.6 1.65-1.6h1.75V3.6A23 23 0 0 0 14.7 3.45c-2.6 0-4.35 1.55-4.35 4.45v2.15H7.5v3.3h2.85V21z" fill="currentColor"/>'},
 youtube:{l:'YouTube',k:'YT',g:'<g fill="none" stroke="currentColor" stroke-width="1.75"><rect x="2.4" y="5.6" width="19.2" height="12.8" rx="4"/></g><path d="M10.3 9.2l5.1 2.8-5.1 2.8z" fill="currentColor"/>'},
 whatsapp:{l:'WhatsApp',k:'WA',g:'<g fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3.6 20.4l1.25-4.3A8.4 8.4 0 1 1 8.2 19.4z"/><path d="M8.9 8.2c-.4 2.3 2.9 5.6 5.2 5.3l1.1-1.5-1.9-.8-.9.6c-1.1-.5-2-1.4-2.4-2.5l.6-.9-1-1.9z" fill="currentColor" stroke="none"/></g>'},
 github:{l:'GitHub',k:'GH',g:'<path d="M12 3.2a8.8 8.8 0 0 0-2.78 17.15c.44.08.6-.19.6-.42v-1.6c-2.45.53-3-.98-3-.98-.55-1.1-1.15-1.4-1.15-1.4-.85-.58.07-.57.07-.57.94.07 1.44.97 1.44.97.84 1.44 2.2 1.02 2.73.78.08-.61.33-1.03.6-1.27-2.03-.23-4.16-1.02-4.16-4.53 0-1 .36-1.82.95-2.46-.1-.23-.41-1.16.09-2.42 0 0 .77-.25 2.53.94a8.7 8.7 0 0 1 4.6 0c1.76-1.19 2.53-.94 2.53-.94.5 1.26.19 2.19.09 2.42.6.64.95 1.46.95 2.46 0 3.52-2.14 4.3-4.18 4.53.33.28.62.84.62 1.7v2.52c0 .24.16.51.61.42A8.8 8.8 0 0 0 12 3.2z" fill="currentColor"/>'},
 dribbble:{l:'Dribbble',k:'DR',g:'<g fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.9"/><path d="M5 8.3c3.9.6 8.3.2 11.4-1.6M4.1 13.6C7.7 12 12.6 12.5 15.9 16.2M9.2 3.6c2.5 3 4.2 6.9 4.7 11.4"/></g>'},
 behance:{l:'Behance',k:'Bē',t:'Bē'},
 tiktok:{l:'TikTok',k:'TT',g:'<path d="M14.3 3h2.8c.2 1.7 1.2 3.1 3 3.5v2.7a6.9 6.9 0 0 1-3.3-1.05v6.25a5.85 5.85 0 1 1-5.85-5.85c.3 0 .6.03.9.09v2.8a2.95 2.95 0 1 0 2.55 2.92z" fill="currentColor"/>'},
 pinterest:{l:'Pinterest',k:'Pi',t:'P'},
 vimeo:{l:'Vimeo',k:'Vi',t:'V'},
 web:{l:'Website',k:'WEB'}
};
function socChipHTML(p){
  var m=PL[p]||PL.web;
  var inner=m.g?('<svg viewBox="0 0 24 24" aria-hidden="true">'+m.g+'</svg>'):'<span class="sl">'+esc(m.t||m.k)+'</span>';
  return '<span class="soc-chip" title="'+esc(m.l)+'">'+inner+'</span>';
}
var IC={
 mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"><rect x="2.4" y="4.6" width="19.2" height="14.8" rx="2.4"/><path d="M3 7l9 6.2L21 7"/></svg>',
 phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"><path d="M6.4 3h3.1l1.5 4-2 1.5a12.4 12.4 0 0 0 6.5 6.5l1.5-2 4 1.5v3.1a2 2 0 0 1-2.2 2A17.6 17.6 0 0 1 4.4 5.2 2 2 0 0 1 6.4 3z"/></svg>',
 mobile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85"><rect x="6.4" y="2.4" width="11.2" height="19.2" rx="2.6"/><line x1="10.4" y1="18.4" x2="13.6" y2="18.4"/></svg>',
 globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3.5 3.4-3.5 14.2 0 18 3.5-3.8 3.5-14.6 0-18z"/></svg>',
 pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"><path d="M12 21.5s7-6.3 7-11.5a7 7 0 1 0-14 0c0 5.2 7 11.5 7 11.5z"/><circle cx="12" cy="9.7" r="2.6"/></svg>'
};

/* ---------------------------------------------------------
   i18n
   --------------------------------------------------------- */
var I18N={
pt:{
 brand_sub:'Gerador de Cartões de Visita Corporativos',stat_theme:'Tema',stat_fmt:'Formato',
 btn_3d:'Ver em 3D',btn_pdf:'Impressão / PDF',editor:'Editor do Cartão',
 tab_id:'Cartão',tab_net:'Contactos',tab_style:'Estilo',tab_print:'Impressão',
 sec_person:'Quem aparece no cartão',fld_name:'Nome completo',ph_name:'Escreve o teu nome completo',
 fld_role:'Cargo',ph_role:'Indica o teu cargo ou função',fld_dept:'Departamento',ph_dept:'Indica o teu departamento ou equipa',
 sec_company:'Empresa',fld_company:'Nome da empresa',ph_company:'Escreve o nome da empresa',
 fld_monogram:'Monograma',ph_monogram:'Iniciais (até 4 letras)',fld_tagline:'Slogan / proposta',ph_tagline:'Descreve a empresa numa frase curta',
 fld_est:'Fundação / edição',ph_est:'Ano de fundação (ex. EST. 2014)',fld_legal:'Menção legal',ph_legal:'NIF ou dados legais da empresa',
 sec_photo:'Fotografia',fld_photo:'Retrato profissional',btn_upload:'Carregar',btn_gray:'P&B',btn_remove:'Remover',
 rng_zoom:'Zoom',rng_x:'Pos. X',rng_y:'Pos. Y',fld_frame:'Moldura da foto',
 frame_band:'Banda lateral (sangrada)',frame_round:'Retrato circular',frame_none:'Sem foto (tipográfico)',
 hint_frame:'A banda e o círculo ajustam-se automaticamente ao formato escolhido.',
 sec_direct:'Linha direta',fld_email:'Email',fld_phone:'Telefone',fld_mobile:'Telemóvel',
 sec_web:'Website & QR Code',fld_web:'Website (único)',fld_qr:'Conteúdo do QR',
 qr_web:'Abrir o website',qr_vcard:'Guardar contacto (vCard)',qr_phone:'Ligar agora',qr_email:'Enviar email',
 hint_qr:'O QR é gerado localmente (vetorial) e vive no verso, sempre no mesmo módulo.',
 sec_office:'Morada do escritório',fld_street:'Rua e número',ph_street:'Rua, número e andar do escritório',
 fld_city:'Código postal e localidade',ph_city:'Código postal e localidade',fld_country:'País',ph_country:'País onde a empresa está sediada',
 sec_social:'Redes sociais (até 3)',hint_social:'Deixa uma linha vazia e ela desaparece do cartão sem desalinhar nada.',
 sec_front_lines:'O que mostrar na frente',
 sec_themes:'Temas corporativos',sec_hex:'Cores principais em HEX',btn_auto_ink:'Tinta automática',btn_reset_colors:'Repor tema',btn_random:'Paleta aleatória',
 sec_fonts:'Tipografia corporativa',fld_font_d:'Fonte de destaque (nome)',fld_font_b:'Fonte de texto (contactos)',
 fld_name_case:'Caixa do nome',case_title:'Título',case_upper:'MAIÚSCULAS',case_lower:'minúsculas',case_cap:'Capitalize',fld_weight:'Peso do nome',
 rng_track:'Tracking do nome',rng_ltrack:'Tracking das etiquetas',
 sec_layout:'Layout & acabamentos',fld_front_fill:'Fundo da frente',fill_dark:'Escuro',fill_light:'Claro',fill_primary:'Cor sólida',
 fld_texture:'Textura de fundo',tex_none:'Nenhuma',tex_grid:'Grelha',tex_rule:'Diagonal',tex_dot:'Pontos',
 rng_radius:'Cantos',rng_band:'Largura da banda',
 sec_preset:'Perfil de saída PDF',pr_home:'Impressão caseira',pr_home_d:'Folha A4 com 10 cartões, marcas de corte e verso espelhado para frente e verso.',
 pr_pro:'Ficheiro de produção',pr_pro_d:'Tamanho final + sangria, sem marcas. É o formato que os gráficas pedem.',
 pr_marks:'PDF com marcas',pr_marks_d:'Sangria + marcas de corte, marcas de registo e barras de cor.',
 pr_single:'Prova 1:1',pr_single_d:'Uma página por face ao tamanho real; com marcas ligadas ganha 5 mm de margem para cortar.',
 sec_popt:'Opções de impressão',fld_bleed:'Sangria',fld_faces:'Faces',faces_both:'Frente e verso',faces_front:'Só frente',faces_back:'Só verso',
 fld_mirror:'Espelhar o verso',hint_mirror:'Necessário para imprimir frente e verso em impressoras domésticas (margem curta).',
 fld_duplex:'Frente e verso (duplex)',hint_duplex:'Gera uma segunda página com as costas do cartão.',
 fld_gray:'Rascunho a preto e branco',hint_gray:'Útil para provas de tonner caseiras.',
 fld_marks:'Marcas de corte / régua de prova',hint_marks:'Regras de 0,1 mm a 0,7 mm do corte; não se aplicam ao ficheiro de produção.',
 fld_qty:'Cartões por folha',hint_qty:'A4 aceita confortavelmente 10 cartões 85×55 mm.',
 sec_specs:'Especificações calculadas',sec_check:'Validações antes de imprimir',
 btn_make_pdf:'Gerar PDF',btn_preview:'Pré-visualizar folha',
 tb_format:'Formato',mode_side:'Frente e verso',mode_flip:'Clicar para virar',btn_turn:'Virar',
 tb_zoom:'Zoom',tb_safe:'Área segura',tb_grid:'Grelha',
 face_front:'Frente',face_back:'Verso',face_front_no:'01',face_back_no:'02',click_turn:'clicar para virar',
 sec_3d:'Vista 3D · arrasta para mover o cartão',lbl_rot:'Rotação',btn_expand:'Ecrã completo',
 drag_hint:'Arrasta para orbitar',orbit:'ÓRBITA',scroll_hint:'Roda para aproximar · Shift+arrasta para mover',
 btn_spin:'Auto-rotação',btn_face_front:'Frente',btn_face_back:'Verso',btn_reset_view:'Repôr vista',btn_flat:'Vista de topo',
 hint_3d:'A vista 3D é só apresentação: o PDF usa sempre o miolo exato ao tamanho de corte.',
 sec_turn:'Clicar para virar',turn_badge:'Frente',hint_turn:'Um clique roda 180°; 90° mostra a espessura do cartão.',
 btn_turn_auto:'Virar sozinho',btn_turn_90:'Ver 90°',
 btn_vcard:'Guardar vCard',btn_save:'Guardar projeto',btn_load:'Carregar',btn_reset:'Recomeçar',
 modal_title:'O teu cartão, em 3D',modal_sub:'Arrasta para rodar · clica para virar',click_turn_3d:'clique = virar',
 card_office:'Escritório',card_direct:'Direto',card_connect:'Connect',card_qr_cap:'Digitaliza para ligar',
 card_tel:'Tel',card_mobile:'Tlm',card_email:'Mail',card_web:'Web',
 toast_saved:'Projeto guardado neste navegador',toast_loaded:'Projeto carregado',toast_photo:'Fotografia atualizada',
 toast_nophoto:'Sem fotografia: usa o monograma',toast_reset:'Cartão reposto',toast_copied:'copiado',
 toast_pdf:'Na janela de impressão escolhe “Guardar como PDF”',toast_json:'Configuração exportada',toast_jsonerr:'Ficheiro inválido',
 pv_note:'Pré-visualização exata da folha · mesmas coordenadas do PDF',
 sp_trim:'Tamanho final (corte)',sp_page:'Página do PDF',sp_bleed:'Sangria',sp_safe:'Margem de segurança',
 sp_res:'Resolução',sp_color:'Cor',sp_fonts:'Tipos de letra',sp_pages:'Páginas',sp_duplex:'Duplex',sp_dpi:'Foto',
 sp_vec:'Vetorial (texto real) + foto a ',sp_srgb:'sRGB · o gráfico converte para FOGRA39/GRACoL',
 sp_embed:'Incorporadas pelo motor de impressão',sp_short:'Virar margem curta',sp_none:'Face única',
 chk_marks:'Ativa “Fundo e imagens” (ou “Desativar cabeçalhos/rodapés”) na janela de impressão.',
 chk_scale:'Imprime a escala 100% e margens “Nenhuma”; desliga “ajustar à página”.',
 chk_paper:'Para o profissional: 350–400 g/m² couché, laminação mate ou soft-touch.',
 chk_qr:'Testa o QR com o telemóvel antes de imprimir em série.',
 chk_pdf:'Para obter o PDF: destino “Guardar como PDF”.',
 v_ok:'OK',v_warn:'Atenção',v_bad:'Corrigir',
 c_name_short:'Nome com boa respiração no espaço disponível.',
 c_name_long:'Nome muito comprido — o motor reduziu a corpo; considera abreviar.',
 c_photo_ok:'Fotografia com resolução suficiente para 300 ppp.',
 c_photo_low:'Fotografia abaixo de 300 ppp na área impressa — pode serrar.',
 c_photo_none:'Sem fotografia: o monograma ocupa o lugar, alinhado.',
 c_contrast_ok:'Contraste texto/fundo dentro de AAA.',
 c_contrast_warn:'Contraste texto/fundo baixo para impressão.',
 c_web_ok:'Website válido — QR pronto.',
 c_web_bad:'Falta o website para gerar o QR.',
 c_mail_ok:'Email bem formado.',c_mail_bad:'Email sem @ — verifica.',
 c_social_ok:'Redes sociais dentro do limite (3).',
 unit_mm:'mm',unit_pages:'páginas',unit_page:'página',
 ph_email:'Email profissional (nome@empresa.com)',
 ph_phone:'Telefone com indicativo do país',
 ph_mobile:'Telemóvel com indicativo do país',
 ph_web:'Endereço do website (empresa.com)',
 ph_social:'URL do perfil ou @utilizador',
 ph_hex:'Cor HEX (ex. #A78BFA)',
},
en:{
 brand_sub:'Corporate Business Card Generator',stat_theme:'Theme',stat_fmt:'Size',
 btn_3d:'View in 3D',btn_pdf:'Print / PDF',editor:'Card Editor',
 tab_id:'Card',tab_net:'Contacts',tab_style:'Style',tab_print:'Print',
 sec_person:'Who is on the card',fld_name:'Full name',ph_name:'Enter your full name',
 fld_role:'Job title',ph_role:'Enter your job title or role',fld_dept:'Department',ph_dept:'Enter your department or team',
 sec_company:'Company',fld_company:'Company name',ph_company:'Enter your company name',
 fld_monogram:'Monogram',ph_monogram:'Initials (up to 4 letters)',fld_tagline:'Tagline / value line',ph_tagline:'Describe your business in a short line',
 fld_est:'Founded / edition',ph_est:'Founding year (e.g. EST. 2014)',fld_legal:'Legal line',ph_legal:'Company tax ID or legal details',
 sec_photo:'Portrait',fld_photo:'Professional headshot',btn_upload:'Upload',btn_gray:'B&W',btn_remove:'Remove',
 rng_zoom:'Zoom',rng_x:'Pos X',rng_y:'Pos Y',fld_frame:'Photo frame',
 frame_band:'Full-bleed side band',frame_round:'Circular portrait',frame_none:'No photo (type driven)',
 hint_frame:'Band and circle both re-fit automatically to whichever card size you pick.',
 sec_direct:'Direct lines',fld_email:'Email',fld_phone:'Phone',fld_mobile:'Mobile',
 sec_web:'Website & QR code',fld_web:'Website (single)',fld_qr:'QR payload',
 qr_web:'Open the website',qr_vcard:'Save contact (vCard)',qr_phone:'Call now',qr_email:'Send email',
 hint_qr:'The QR is generated locally as vector art and always sits in the same module on the back.',
 sec_office:'Office address',fld_street:'Street and number',ph_street:'Office street, number and floor',
 fld_city:'Postal code and city',ph_city:'Postal code and city',fld_country:'Country',ph_country:'Country where your business is based',
 sec_social:'Social channels (up to 3)',hint_social:'Leave a line empty and it drops out of the card without shifting anything.',
 sec_front_lines:'What the front shows',
 sec_themes:'Corporate themes',sec_hex:'Brand colours in HEX',btn_auto_ink:'Auto ink',btn_reset_colors:'Reset theme',btn_random:'Random palette',
 sec_fonts:'Corporate typography',fld_font_d:'Display font (name)',fld_font_b:'Text font (contacts)',
 fld_name_case:'Name casing',case_title:'Title',case_upper:'UPPERCASE',case_lower:'lowercase',case_cap:'Capitalize',fld_weight:'Name weight',
 rng_track:'Name tracking',rng_ltrack:'Label tracking',
 sec_layout:'Layout & finishing',fld_front_fill:'Front background',fill_dark:'Dark',fill_light:'Light',fill_primary:'Solid brand',
 fld_texture:'Background texture',tex_none:'None',tex_grid:'Grid',tex_rule:'Diagonal',tex_dot:'Dots',
 rng_radius:'Corners',rng_band:'Band width',
 sec_preset:'PDF output profile',pr_home:'Home printing',pr_home_d:'A4 sheet with 10 cards, cut marks and a mirrored back for duplex.',
 pr_pro:'Production file',pr_pro_d:'Trim size plus bleed, no marks. Exactly what print shops ask for.',
 pr_marks:'PDF with marks',pr_marks_d:'Bleed plus crop marks, registration marks and colour bars.',
 pr_single:'1:1 proof',pr_single_d:'One page per side at true size; with marks on it gains a 5 mm cutting margin.',
 sec_popt:'Print options',fld_bleed:'Bleed',fld_faces:'Sides',faces_both:'Front and back',faces_front:'Front only',faces_back:'Back only',
 fld_mirror:'Mirror the back',hint_mirror:'Needed for duplex printing on home printers (short-edge binding).',
 fld_duplex:'Double sided (duplex)',hint_duplex:'Adds a second page with the card backs.',
 fld_gray:'Greyscale draft',hint_gray:'Handy for cheap tonner proofs.',
 fld_marks:'Draw crop marks',hint_marks:'0.1 mm rules stopping 0.7 mm from the trim; ignored by the production file.',
 fld_qty:'Cards per sheet',hint_qty:'A4 fits 10 cards of 85×55 mm comfortably.',
 sec_specs:'Calculated specs',sec_check:'Checks before printing',
 btn_make_pdf:'Build PDF',btn_preview:'Preview sheet',
 tb_format:'Format',mode_side:'Front & back',mode_flip:'Click to turn',btn_turn:'Turn',
 tb_zoom:'Zoom',tb_safe:'Safe zone',tb_grid:'Grid',
 face_front:'Front',face_back:'Back',face_front_no:'01',face_back_no:'02',click_turn:'click to turn',
 sec_3d:'3D view · drag to move the card',lbl_rot:'Rotation',btn_expand:'Fullscreen',
 drag_hint:'Drag to orbit',orbit:'ORBIT',scroll_hint:'Scroll to zoom · Shift-drag to move',
 btn_spin:'Auto spin',btn_face_front:'Front',btn_face_back:'Back',btn_reset_view:'Reset view',btn_flat:'Top view',
 hint_3d:'The 3D view is presentation only: the PDF always uses the exact trim artwork.',
 sec_turn:'Click to turn',turn_badge:'Front',hint_turn:'One click turns 180°; 90° shows the card edge.',
 btn_turn_auto:'Auto turn',btn_turn_90:'Show 90°',
 btn_vcard:'Save vCard',btn_save:'Save project',btn_load:'Load',btn_reset:'Start over',
 modal_title:'Your card, in 3D',modal_sub:'Drag to rotate · click to turn',click_turn_3d:'click = turn',
 card_office:'Office',card_direct:'Direct',card_connect:'Connect',card_qr_cap:'Scan to open',
 card_tel:'Tel',card_mobile:'Mob',card_email:'Mail',card_web:'Web',
 toast_saved:'Project saved in this browser',toast_loaded:'Project loaded',toast_photo:'Photo updated',
 toast_nophoto:'No photo: monogram used instead',toast_reset:'Card reset',toast_copied:'copied',
 toast_pdf:'In the print dialog choose “Save as PDF”',toast_json:'Config exported',toast_jsonerr:'Invalid file',
 pv_note:'Exact sheet preview · same coordinates as the PDF',
 sp_trim:'Trim size',sp_page:'PDF page',sp_bleed:'Bleed',sp_safe:'Safe margin',
 sp_res:'Resolution',sp_color:'Colour',sp_fonts:'Fonts',sp_pages:'Pages',sp_duplex:'Duplex',sp_dpi:'Photo',
 sp_vec:'Vector (live text) + photo at ',sp_srgb:'sRGB · prepress converts to FOGRA39/GRACoL',
 sp_embed:'Embedded by the print engine',sp_short:'Short-edge flip',sp_none:'Single sided',
 chk_marks:'Enable “Background graphics” in the print dialog.',
 chk_scale:'Print at 100% scale with “None” margins; turn “fit to page” off.',
 chk_paper:'For pro print: 300–350 gsm coated stock, matte or soft-touch lamination.',
 chk_qr:'Scan the QR with a phone before running a full batch.',
 chk_pdf:'To get the PDF: choose “Save as PDF” as destination.',
 v_ok:'OK',v_warn:'Check',v_bad:'Fix',
 c_name_short:'Name breathes well inside its block.',
 c_name_long:'Long name — the engine scaled it down; consider shortening.',
 c_photo_ok:'Photo resolves above 300 ppi in the printed area.',
 c_photo_low:'Photo below 300 ppi in the printed area — it may look soft.',
 c_photo_none:'No photo: the monogram fills the slot, still aligned.',
 c_contrast_ok:'Text/background contrast passes AAA.',
 c_contrast_warn:'Text/background contrast is low for print.',
 c_web_ok:'Website valid — QR ready.',
 c_web_bad:'Website missing, so no QR can be built.',
 c_mail_ok:'Email well formed.',c_mail_bad:'Email has no @ — check it.',
 c_social_ok:'Social channels within the 3 limit.',
 unit_mm:'mm',unit_pages:'pages',unit_page:'page',
 ph_email:'Work email (name@company.com)',
 ph_phone:'Phone number with country code',
 ph_mobile:'Mobile number with country code',
 ph_web:'Website address (company.com)',
 ph_social:'Profile URL or @handle',
 ph_hex:'HEX colour (e.g. #A78BFA)',
}};
Object.keys(workspaceCopy).forEach(function(lang){Object.assign(I18N[lang],workspaceCopy[lang])});
function t(k){var l=S.lang;return (I18N[l]&&I18N[l][k])||I18N.pt[k]||k;}

/* ---------------------------------------------------------
   PRESETS
   --------------------------------------------------------- */
var PRESETS=[
 {id:'exec',label:'CEO · Tech (EN)',theme:'indigo',font:'grotesk',fill:'dark',frame:'band',
  en:{name:'Alex Chen',role:'Chief Executive Officer',dept:'Vertex Cloud',company:'Vertex Cloud Inc.',mono:'VX',
   tag:'Distributed infrastructure at planetary scale',est:'EST. 2016',legal:'EIN 84-1234567 · Delaware, USA',
   email:'alex.chen@vertexcloud.io',phone:'+1 (415) 555 0142',mobile:'+1 (415) 555 0198',web:'vertexcloud.io',
   street:'535 Mission Street, 14th floor',city:'San Francisco, CA 94105',country:'United States',
   socials:[{p:'linkedin',v:'linkedin.com/in/alexchen'},{p:'x',v:'x.com/alexchen'},{p:'github',v:'github.com/alexchen'}]},
  pt:{name:'Alex Chen',role:'Director Executivo',dept:'Vertex Cloud',company:'Vertex Cloud Inc.',mono:'VX',
   tag:'Infraestrutura distribuída à escala do planeta',est:'DESDE 2016',legal:'EIN 84-1234567 · Delaware, EUA',
   email:'alex.chen@vertexcloud.io',phone:'+1 (415) 555 0142',mobile:'+1 (415) 555 0198',web:'vertexcloud.io',
   street:'535 Mission Street, 14.º andar',city:'San Francisco, CA 94105',country:'Estados Unidos',
   socials:[{p:'linkedin',v:'linkedin.com/in/alexchen'},{p:'x',v:'x.com/alexchen'},{p:'github',v:'github.com/alexchen'}]}},

 {id:'sales',label:'Diretor Comercial (PT)',theme:'midnight',font:'inter',fill:'dark',frame:'band',
  pt:{name:'Ruben Rodrigues',role:'Diretor Comercial',dept:'Vendas & Parcerias',company:'Nortech Soluções, Lda.',mono:'NS',
   tag:'Software de gestão para equipas de terreno',est:'EST. 2011',legal:'NIF 509 884 221 · Nível e Capital: 15.000 €',
   email:'ruben.rodrigues@nortech.pt',phone:'+351 213 445 700',mobile:'+351 912 345 678',web:'nortech.pt',
   street:'Av. da Liberdade 245, 4.º direito',city:'1250-143 Lisboa',country:'Portugal',
   socials:[{p:'linkedin',v:'linkedin.com/in/rubenrodrigues'},{p:'web',v:'nortech.pt'},{p:'whatsapp',v:'+351912345678'}]},
  en:{name:'Ruben Rodrigues',role:'Head of Sales',dept:'Sales & Partnerships',company:'Nortech Solutions',mono:'NS',
   tag:'Management software for field teams',est:'EST. 2011',legal:'VAT 509 884 221 · Share capital 15.000 €',
   email:'ruben.rodrigues@nortech.pt',phone:'+351 213 445 700',mobile:'+351 912 345 678',web:'nortech.pt',
   street:'Av. da Liberdade 245, 4th floor',city:'1250-143 Lisbon',country:'Portugal',
   socials:[{p:'linkedin',v:'linkedin.com/in/rubenrodrigues'},{p:'web',v:'nortech.pt'},{p:'whatsapp',v:'+351912345678'}]}},

 {id:'law',label:'Sociedade de Advogados',theme:'burgundy',font:'playfair',fill:'light',frame:'round',
  pt:{name:'Sofia Ramos',role:'Sócia · Direito Fiscal',dept:'Sociedade RLM',company:'Ramos, Lopes & Marques',mono:'RL',
   tag:'Assessoria fiscal a grupos internacionais',est:'RLM · 1998',legal:'Cédula Prof. CL 45.882 · Lisboa',
   email:'s.ramos@rlm-advogados.pt',phone:'+351 213 980 220',mobile:'',web:'rlm-advogados.pt',
   street:'Rua Castilho 168, 6.º',city:'1250-069 Lisboa',country:'Portugal',
   socials:[{p:'linkedin',v:'linkedin.com/in/sofiaramos-adv'},{p:'web',v:'rlm-advogados.pt'}]},
  en:{name:'Sofia Ramos',role:'Partner · Tax Law',dept:'RLM Law Firm',company:'Ramos, Lopes & Marques',mono:'RL',
   tag:'Tax counsel for international groups',est:'RLM · 1998',legal:'Bar licence CL 45.882 · Lisbon',
   email:'s.ramos@rlm-advogados.pt',phone:'+351 213 980 220',mobile:'',web:'rlm-advogados.pt',
   street:'Rua Castilho 168, 6th floor',city:'1250-069 Lisbon',country:'Portugal',
   socials:[{p:'linkedin',v:'linkedin.com/in/sofiaramos-adv'},{p:'web',v:'rlm-advogados.pt'}]}},

 {id:'brand',label:'Estúdio de Marca',theme:'swiss',font:'archivo',fill:'light',frame:'none',
  pt:{name:'Elena Vance',role:'Diretora de Criação',dept:'Identidade & Produto',company:'Studio Vance',mono:'SV',
   tag:'Marcas construídas para durar',est:'EST. 2009',legal:'Atelier n.º 44 · Londres',
   email:'elena@studiovance.design',phone:'+44 20 7946 0912',mobile:'',web:'studiovance.design',
   street:'12 Berners Street',city:'London W1T 3LB',country:'Reino Unido',
   socials:[{p:'behance',v:'behance.net/studiovance'},{p:'dribbble',v:'dribbble.com/studiovance'},{p:'instagram',v:'@studiovance'}]},
  en:{name:'Elena Vance',role:'Creative Director',dept:'Brand & Product',company:'Studio Vance',mono:'SV',
   tag:'Brands built to outlast trends',est:'EST. 2009',legal:'Atelier no. 44 · London',
   email:'elena@studiovance.design',phone:'+44 20 7946 0912',mobile:'',web:'studiovance.design',
   street:'12 Berners Street',city:'London W1T 3LB',country:'United Kingdom',
   socials:[{p:'behance',v:'behance.net/studiovance'},{p:'dribbble',v:'dribbble.com/studiovance'},{p:'instagram',v:'@studiovance'}]}},

 {id:'finance',label:'Gestão de Ativos',theme:'executive',font:'plexserif',fill:'dark',frame:'round',
  pt:{name:'Miguel Antunes',role:'Senior Portfolio Manager',dept:'Renda Fixa',company:'Aurea Capital Partners',mono:'AC',
   tag:'Gestão discrecional de patrimónios',est:'CMVM · 2003',legal:'Aurea Capital Partners · Licença CMVM 2003/114',
   email:'m.antunes@aureacapital.pt',phone:'+351 213 130 900',mobile:'+351 961 220 118',web:'aureacapital.pt',
   street:'Praça do Marques de Pombal 12',city:'1250-162 Lisboa',country:'Portugal',
   socials:[{p:'linkedin',v:'linkedin.com/in/miguelantunes'},{p:'web',v:'aureacapital.pt'}]},
  en:{name:'Miguel Antunes',role:'Senior Portfolio Manager',dept:'Fixed Income',company:'Aurea Capital Partners',mono:'AC',
   tag:'Discretionary wealth management',est:'CMVM · 2003',legal:'Aurea Capital Partners · CMVM licence 2003/114',
   email:'m.antunes@aureacapital.pt',phone:'+351 213 130 900',mobile:'+351 961 220 118',web:'aureacapital.pt',
   street:'Praça do Marques de Pombal 12',city:'1250-162 Lisbon',country:'Portugal',
   socials:[{p:'linkedin',v:'linkedin.com/in/miguelantunes'},{p:'web',v:'aureacapital.pt'}]}}
];

/* ---------------------------------------------------------
   STATE
   --------------------------------------------------------- */
var S={
 lang:navigator.language.toLowerCase().indexOf('pt')===0?'pt':'en',fmt:'eu',mode:'side',side:'front',zoomUser:100,theme:'forest',fill:'dark',texture:'none',frame:'none',layout:'atelier',template:'forma',
 colors:Object.assign({},templates[0].colors),
 fonts:{display:'grotesk',body:'inter'},nameCase:'none',weight:500,track:-0.03,ltrack:0.16,
 radius:0.6,band:31,
 photo:null,photoW:0,photoH:0,photoZoom:1,photoX:50,photoY:42,gray:false,
 lines:{email:true,phone:false,mobile:false,web:true},showSoc:false,qr:'website',
 print:{preset:'home',bleed:3,faces:'both',mirror:false,duplex:true,gray:false,marks:true,qty:10},
 v3:{rx:-14,ry:26,zoom:1.55,persp:1500,glare:.35,thick:.4,shadow:.85,tx:0,ty:0,spin:false,flat:false},
 turn:0,autoTurn:false,
 data:{photo:null,name:'Sofia Martins',role:'Brand Designer',dept:'',company:'Forma Studio',mono:'FM',tag:'Design with intention.',est:'',legal:'',email:'sofia@forma.studio',phone:'+351 912 345 678',mobile:'',web:'forma.studio',
   street:'',city:'Lisbon, Portugal',country:'',socials:[{p:'linkedin',v:''},{p:'instagram',v:''},{p:'behance',v:''}]}
};
if(S.lang==='pt'){S.data.role='Designer de Marca';S.data.tag='Design com intenção.';S.data.city='Lisboa, Portugal'}
var DEFAULT_STATE=JSON.parse(JSON.stringify(S));
var STATE_CHOICES={formats:Object.keys(FORMATS),themes:THEMES.map(function(x){return x.id}),fonts:FONTS.map(function(x){return x.id}),bodyFonts:FONTS.filter(function(x){return x.both}).map(function(x){return x.id}),platforms:Object.keys(PL),templates:templates.map(function(x){return x.id})};
var appReady=false, restoringState=false;
var FIELDS=['name','role','dept','company','mono','tag','est','legal','email','phone','mobile','web','street','city','country'];
var FIELD_IDS={name:'f_name',role:'f_role',dept:'f_dept',company:'f_company',mono:'f_monogram',tag:'f_tagline',est:'f_est',
  legal:'f_legal',email:'f_email',phone:'f_phone',mobile:'f_mobile',web:'f_web',street:'f_addr_street',city:'f_addr_city',country:'f_addr_country'};

/* ---------------------------------------------------------
   TOAST
   --------------------------------------------------------- */
var toastTimer=null;
function toast(msg,kind){
  var host=byId('toasts'),el=document.createElement('div');
  el.className='toast'+(kind?' '+kind:'');el.textContent=msg;host.appendChild(el);
  while(host.children.length>3) host.removeChild(host.firstChild);
  setTimeout(function(){el.classList.add('out');setTimeout(function(){if(el.parentNode)el.remove()},260)},2500);
}
function copyText(str,label){
  var done=function(){toast((label||'')+' '+t('toast_copied'))};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(str).then(done,done);}
  else{var ta=document.createElement('textarea');ta.value=str;document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){}ta.remove();done();}
}

/* ---------------------------------------------------------
   THEME / STYLE PIPELINE
   --------------------------------------------------------- */
function themeById(id){return THEMES.filter(function(x){return x.id===id})[0]||THEMES[0]}
function effColors(){
  var th=themeById(S.theme);
  return {
    canvas:normHex(S.colors.canvas)||th.canvas,
    canvas2:shade(normHex(S.colors.canvas)||th.canvas,(lumOf(th.canvas)>0.45?-0.05:0.10)),
    paper:normHex(S.colors.paper)||th.paper,
    primary:normHex(S.colors.primary)||th.primary,
    secondary:normHex(S.colors.secondary)||th.secondary,
    accent:normHex(S.colors.accent)||th.accent
  };
}
function applyStyle(){
  var c=effColors();
  var ink=lumOf(c.canvas)>0.46?'#0A0E1C':'#EDEFFA';
  var pink=lumOf(c.paper)>0.46?'#0C1122':'#F2F4FA';
  var onP=lumOf(c.primary)>0.57?'#0A0E1C':'#FFFFFF';
  var set=function(k,v){R.setProperty(k,v)};
  set('--c-canvas',c.canvas);set('--c-canvas-2',c.canvas2);set('--c-paper',c.paper);
  set('--c-primary',c.primary);set('--c-secondary',c.secondary);set('--c-accent',c.accent);
  set('--c-primary-deep',shade(c.primary,-0.2));set('--c-primary-soft',rgba(c.primary,0.20));
  set('--c-secondary-soft',rgba(c.secondary,0.15));
  set('--c-ink',ink);set('--c-ink-soft',rgba(ink,0.7));set('--c-ink-faint',rgba(ink,0.4));set('--c-rule',rgba(ink,0.2));
  set('--c-paper-ink',pink);set('--c-paper-ink-soft',rgba(pink,0.68));set('--c-paper-ink-faint',rgba(pink,0.42));
  set('--c-paper-rule',rgba(pink,0.16));
  set('--c-on-primary',onP);set('--c-on-primary-soft',rgba(onP,0.72));set('--c-on-primary-faint',rgba(onP,0.45));
  set('--c-on-primary-rule',rgba(onP,0.22));set('--c-on-primary-tint',rgba(onP,0.1));
  set('--front-tint',rgba(ink,0.075));
  set('--qr-fg','#18251A');set('--qr-bg','#FFFFFF');
  set('--card-w',FORMATS[S.fmt].w+'mm');set('--card-h',FORMATS[S.fmt].h+'mm');
  set('--radius-card','calc(var(--u)*'+S.radius+')');set('--band-w','calc(var(--u)*'+S.band+')');
  set('--cd-display',fontStack(S.fonts.display));set('--cd-body',fontStack(S.fonts.body));
  set('--cd-name-case',S.nameCase);set('--cd-name-tracking',S.track+'em');set('--cd-label-tracking',S.ltrack+'em');
  set('--cd-name-weight',String(S.weight));
  set('--photo-zoom',String(S.photoZoom));set('--photo-x',S.photoX+'%');set('--photo-y',S.photoY+'%');
  set('--photo-filter',S.gray?'grayscale(1) contrast(1.05)':'none');
  root.setAttribute('data-variant',S.frame==='band'?'band':(S.frame==='round'?'open':'minimal'));
  root.setAttribute('data-fill',S.fill);
  root.setAttribute('data-layout',S.layout||'classic');
  root.setAttribute('data-texture',S.texture);
  root.setAttribute('data-fmt',S.fmt);

  byId('statTheme').textContent=themeById(S.theme).n;
  byId('statFmt').textContent=FORMATS[S.fmt].l;
  qa('.theme-chip').forEach(function(b){b.classList.toggle('active',b.dataset.theme===S.theme)});
  syncHexInputs();
}

/* ---------------------------------------------------------
   CONTENT HELPERS
   --------------------------------------------------------- */
function cleanURL(v){return String(v||'').trim().replace(/^https?:\/\//i,'').replace(/^www\./i,'').replace(/\/+$/,'')}
function handleLabel(p,v){
  var s=String(v||'').trim();if(!s)return '';
  if(/^@/.test(s))return s;
  if(/^[+\d][\d\s().-]{5,}$/.test(s))return s;
  var url=cleanURL(s),i=url.indexOf('/');
  if(i<0)return url;
  var tail=url.slice(i+1).replace(/^@/,'');
  if(!tail)return url;
  if(p==='linkedin')return 'in/'+tail.replace(/^in\//,'');
  if(p==='instagram'||p==='tiktok'||p==='x')return '@'+tail.split('/')[0];
  return url;
}
function absURL(v){return websiteURL(v)}
function nameLines(str){
  var parts=String(str||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return [''];
  if(parts.length===1)return [parts[0]];
  if(parts.length===2)return [parts[0],parts[1]];
  var mid=Math.ceil(parts.length/2);
  return [parts.slice(0,mid).join(' '),parts.slice(mid).join(' ')];
}
function monogram(){
  var m=String(S.data.mono||'').trim();
  if(m)return m.slice(0,4).toUpperCase();
  var base=S.data.company||S.data.name||'';
  return base.replace(/[^\p{L}\p{N} ]/gu,'').trim().split(/\s+/).slice(0,2).map(function(w){return w[0]||''}).join('').toUpperCase();
}
function socials(){return (S.data.socials||[]).filter(function(s){return s&&s.v&&String(s.v).trim()}).slice(0,3)}
function frontLines(){
  var d=S.data,out=[];
  if(S.lines.email&&d.email)out.push(['mail',d.email,'l'+(out.length+1)]);
  if(S.lines.phone&&d.phone)out.push(['phone',d.phone,'l'+(out.length+1)]);
  if(S.lines.mobile&&d.mobile)out.push(['mobile',d.mobile,'l'+(out.length+1)]);
  if(S.lines.web&&d.web)out.push(['globe',cleanURL(d.web),'l'+(out.length+1)]);
  return out.slice(0,4);
}
function addressLines(){
  return [S.data.street,S.data.city,S.data.country].map(function(s){return String(s||'').trim()}).filter(Boolean);
}
function qrPayload(){
  var d=S.data;
  if(S.qr==='vcard')return createVCard(d,'3.0');
  if(S.qr==='email')return d.email?'mailto:'+encodeURIComponent(d.email.trim()):'';
  if(S.qr==='phone')return d.phone||d.mobile?'tel:'+String(d.phone||d.mobile).replace(/[^\d+]/g,''):'';
  return absURL(d.web)||(d.email?'mailto:'+encodeURIComponent(d.email.trim()):'');
}
var qrCache={text:null,svg:''};
function qrSVG(){
  var txt=qrPayload();
  if(!txt)return '<div class="qr-placeholder">'+esc(t('qr_empty'))+'</div>';
  if(qrCache.text===txt)return qrCache.svg;
  try{qrCache={text:txt,svg:generateQR(txt,txt.length>180?'L':'M')};return qrCache.svg}
  catch(e){return '<div class="qr-placeholder" role="status">'+esc(t('qr_error'))+'</div>'}
}

/* ---------------------------------------------------------
   FACE RENDERER · one string, every host
   --------------------------------------------------------- */
function frontHTML(){
  var d=S.data,ln=frontLines(),soc=S.showSoc?socials():[],nm=nameLines(d.name);
  var h='';
  h+='<div class="face face-front"><div class="trim">';
  h+='<div class="fx fx-wash"></div><div class="fx fx-tex"></div>';
  h+='<div class="card-art" aria-hidden="true"><svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width=".7">'+[30,40,50,60,70,80,90,100].map(function(r){return '<circle cx="100" cy="100" r="'+r+'"/>'}).join('')+'</svg></div>';
  var pic=d.photo?'<img src="'+esc(d.photo)+'" alt="">':'';
  if(S.frame==='band'){
    h+='<aside class="f-band">';
    h+='<div class="f-photo">'+(d.photo?pic:'<span class="ph-letter">'+esc(monogram())+'</span>')+'</div>';
    h+='<div class="f-band-tint"></div>';
    if(d.role)h+='<p class="f-band-role" data-fit="bandrole">'+esc(d.role)+'</p>';
    h+='<p class="f-band-co" data-fit="bandco">'+esc(d.company||'')+'</p>';
    h+='</aside>';
  }else if(S.frame==='round'){
    h+='<div class="f-photo-round">'+(d.photo?pic:'<span class="ph-letter">'+esc(monogram())+'</span>')+'</div>';
  }
  h+='<div class="f-content" data-fitb="fc">';
  var eye=[d.company&&S.frame!=='band'?d.company:'',d.dept||'',d.est||''].filter(Boolean).join('  ·  ');
  h+='<p class="f-eyebrow">'+(eye?'<i></i><span data-fit="eyebrow">'+esc(eye)+'</span>':'')+'</p>';
  h+='<div class="f-id">';
  h+='<h2 class="f-name'+(nm.length===1?' single':'')+'" data-fit="name">';
  nm.forEach(function(l,i){h+='<span class="ln ln-'+(i+1)+'" data-fit="name'+(i+1)+'">'+esc(l)+'</span>'});
  h+='</h2><i class="f-bar"></i>';
  h+='<p class="f-role" data-fit="role">'+esc(d.role||'')+'</p>';
  if(d.dept&&S.frame==='band')h+='<p class="f-dept" data-fit="dept">'+esc(d.dept)+'</p>';
  else if(!d.role&&d.dept)h+='<p class="f-dept" data-fit="dept">'+esc(d.dept)+'</p>';
  h+='</div>';
  h+='<div class="f-foot">';
  if(ln.length){
    h+='<ul class="f-lines">';
    ln.forEach(function(l){h+='<li class="f-line"><span class="ic">'+IC[l[0]]+'</span><span class="v" data-fit="'+l[2]+'">'+esc(l[1])+'</span></li>'});
    h+='</ul>';
  }
  if(soc.length){
    h+='<div class="f-socials">'+soc.map(function(s){return socChipHTML(s.p)}).join('');
    if(d.web)h+='<span class="soc-url" data-fit="socurl">'+esc(cleanURL(d.web))+'</span>';
    h+='</div>';
  }
  h+='</div></div></div></div>';
  return h;
}
function backHTML(){
  var d=S.data,soc=socials(),addr=addressLines(),direct=[];
  if(d.phone)direct.push(t('card_tel')+'  '+d.phone);
  if(d.mobile)direct.push(t('card_mobile')+'  '+d.mobile);
  if(d.email)direct.push(t('card_email')+'  '+d.email);
  var h='';
  h+='<div class="face face-back"><div class="trim">';
  h+='<div class="fx fx-wash"></div><div class="fx fx-tex"></div>';
  h+='<span class="b-accent"></span>';
  h+='<div class="b-watermark" aria-hidden="true">'+esc(monogram())+'</div>';
  h+='<div class="b-content" data-fitb="bc">';
  h+='<header class="b-head"><div class="b-brand"><span class="b-mark">'+esc(monogram())+'</span><span class="b-btext">';
  h+='<p class="b-co" data-fit="co">'+esc(d.company||d.name||'')+'</p>';
  if(d.tag)h+='<p class="b-tag" data-fit="tag">'+esc(d.tag)+'</p>';
  h+='</span></div>'+(d.web?'<p class="b-head-r" data-fit="headr">'+esc(cleanURL(d.web))+'</p>':'')+'</header>';
  h+='<div class="b-main"><div class="b-rows">';
  if(addr.length)h+='<div class="b-row"><span class="k">'+esc(t('card_office'))+'</span><span class="val">'+esc(addr.join('\n'))+'</span></div>';
  if(direct.length)h+='<div class="b-row"><span class="k">'+esc(t('card_direct'))+'</span><span class="val">'+esc(direct.join('\n'))+'</span></div>';
  soc.forEach(function(s){
    var m=PL[s.p]||PL.web;
    h+='<div class="b-row"><span class="k">'+esc(m.l)+'</span><span class="val one" data-fit="soc'+esc(s.p)+'">'+esc(handleLabel(s.p,s.v))+'</span></div>';
  });
  if(!addr.length&&!direct.length&&!soc.length)h+='<div class="b-row"><span class="k">'+esc(t('card_direct'))+'</span><span class="val">'+esc([d.phone,d.email].filter(Boolean).join('\n')||'—')+'</span></div>';
  h+='</div>';
  h+='<aside class="b-qr"><div class="qr-frame">'+qrSVG()+'</div>';
  if(d.web)h+='<p class="b-qr-url" data-fit="qrurl">'+esc(cleanURL(d.web))+'</p>';
  h+='<p class="b-qr-cap" data-fit="qrcap">'+esc(t('card_qr_cap'))+'</p></aside></div>';
  var foot=[];
  if(d.legal)foot.push(esc(d.legal));
  if(d.est)foot.push(esc(d.est));
  h+='<footer class="b-foot"><span data-fit="foot">'+(foot.join('   ·   ')||('&nbsp;'))+'</span><span>'+esc(monogram()||'')+'</span></footer>';
  h+='</div></div></div>';
  return h;
}
function faceHTML(side){return side==='front'?frontHTML():backHTML()}
function facesEqual(){return true}

/* hosts ------------------------------------------------- */
var HOSTS={
 front:['hostFront','hostFlipFront','host3dFront','hostTurnFront','hostModalFront'],
 back:['hostBack','hostFlipBack','host3dBack','hostTurnBack','hostModalBack']
};
function renderFaces(){
  var f=frontHTML(),b=backHTML();
  byId('fitProbe').innerHTML='<div class="face-slot">'+f+'</div><div class="face-slot">'+b+'</div>';
  HOSTS.front.forEach(function(id){var e=byId(id);if(e)e.innerHTML=f});
  HOSTS.back.forEach(function(id){var e=byId(id);if(e)e.innerHTML=b});
  bindLineCopy();
  measureFit();
}
var fitQueued=false;
function measureFit(){
  var probe=byId('fitProbe');if(!probe||!probe.firstElementChild)return;
  byId('fit-vars').textContent=':root{}';
  var decl=':root{';
  var slots=qa('.face-slot',probe);
  /* block (vertical) fit */
  qa('[data-fitb]',probe).forEach(function(el){
    var fits=function(v){el.style.setProperty('--bs',v);return el.scrollHeight<=el.clientHeight+1};
    var v=1;
    if(!fits(1)){
      var lo=0.5,hi=1;
      for(var i=0;i<10;i++){var mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid}
      v=Math.max(0.5,lo*0.985);
    }
    el.style.removeProperty('--bs');
    decl+='--s-'+el.getAttribute('data-fitb')+':'+v.toFixed(4)+';';
  });
  /* line (horizontal) fit */
  slots.forEach(function(sl){
    qa('[data-fit]',sl).forEach(function(el){
      if(el.tagName==='H2')return;
      var key=el.getAttribute('data-fit');
      var fits=function(v){el.style.setProperty('--ws',v);return el.scrollWidth<=el.clientWidth+0.5};
      var v=1;
      if(el.clientWidth>0&&!fits(1)){
        var lo=0.4,hi=1;
        for(var i=0;i<10;i++){var mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid}
        v=Math.max(0.4,lo*0.97);
      }
      el.style.removeProperty('--ws');
      if(v<1)decl+='--w-'+key+':'+v.toFixed(4)+';';
    });
  });
  byId('fit-vars').textContent=decl+'}';
  var mF=/--s-fc:([0-9.]+)/.exec(decl);S.fitScale=mF?parseFloat(mF[1]):1;
  if(!fitQueued){fitQueued=true;requestAnimationFrame(function(){fitQueued=false;updateSpecs()})}
}

/* ---------------------------------------------------------
   VIEWPORT FIT
   --------------------------------------------------------- */
function stageFits(){
  var dims=FORMATS[S.fmt],cw=mm2px(dims.w),ch=mm2px(dims.h);
  var t=byId('turnStage');
  if(t&&t.clientWidth){
    var aw=Math.max(200,t.clientWidth-46),ah=Math.max(150,(t.clientHeight||260)-64);
    t.style.setProperty('--tz',Math.max(.45,Math.min(1.9,Math.min(aw/cw,ah/ch))).toFixed(4));
  }
  [[byId('stage3d'),'base3d'],[byId('stage3dModal'),'base3dModal']].forEach(function(pair){
    var st=pair[0];if(!st)return;
    var w2=Math.max(120,st.clientWidth-96),h2=Math.max(100,(st.clientHeight||420)-100);
    S[pair[1]]=Math.max(.28,Math.min(1.3,Math.min(w2/cw,h2/ch)));
  });
}
function fitViewport(){
  var vp=byId('stageViewport');if(!vp)return;
  stageFits();
  var dims=FORMATS[S.fmt],availW=vp.clientWidth-50,availH=Math.max(140,vp.clientHeight-112);
  var cw=mm2px(dims.w),ch=mm2px(dims.h);
  var vertical=window.matchMedia('(max-width:800px)').matches&&S.mode==='side';
  var cols=S.mode==='side'&&!vertical?2:1,rows=vertical?2:1,gap=28;
  var scale=Math.min((availW-gap*(cols-1))/(cw*cols),(availH-34*(rows-1))/(ch*rows));
  scale=Math.max(.28,Math.min(1.5,scale))*(S.zoomUser/100);
  vp.style.setProperty('--z',scale.toFixed(4));
}
var fitRAF=null;
function scheduleFit(){if(fitRAF)cancelAnimationFrame(fitRAF);fitRAF=requestAnimationFrame(function(){fitRAF=null;fitViewport()})}

/* ---------------------------------------------------------
   BUILD UI WIDGETS
   --------------------------------------------------------- */
function buildPresetSelect(){
  var sel=byId('presetSelect');
  sel.innerHTML='<option value="">'+(S.lang==='pt'?'Modelo base · escolha um preset':'Base card · pick a preset')+'</option>'+
    PRESETS.map(function(p){return '<option value="'+p.id+'">'+esc(p.label)+'</option>'}).join('');
}
function buildFmtSeg(){
  byId('fmtSeg').innerHTML=Object.keys(FORMATS).map(function(k){
    return '<button type="button" data-set-fmt="'+k+'" aria-label="'+FORMATS[k].l+'" title="'+FORMATS[k].l+'" aria-pressed="'+(S.fmt===k)+'">'+({eu:'85 × 55',us:'88.9 × 50.8',nordic:'90 × 50',sq:'55 × 55'}[k])+'<span class="fmt-unit"> mm</span></button>';
  }).join('');
}
function buildThemeGrid(){
  byId('themeGrid').innerHTML=THEMES.map(function(th,i){
    return '<button type="button" class="theme-chip'+(th.id===S.theme?' active':'')+'" data-theme="'+th.id+'" title="'+esc(th.n)+'">'+
      '<span class="tc-idx">'+String(i+1).padStart(2,'0')+'</span>'+
      '<span class="tc-dots"><i style="background:'+th.primary+'"></i><i style="background:'+th.secondary+'"></i><i style="background:'+th.canvas+'"></i><i style="background:'+th.paper+'"></i></span>'+
      '<span class="tc-name">'+esc(th.n)+'</span></button>';
  }).join('');
}
var HEXKEYS=[
 {k:'primary',lab_pt:'Primária',lab_en:'Primary',note:'brand'},
 {k:'secondary',lab_pt:'Secundária',lab_en:'Secondary',note:'link'},
 {k:'canvas',lab_pt:'Fundo (frente)',lab_en:'Background (front)',note:'bg'},
 {k:'paper',lab_pt:'Papel (verso)',lab_en:'Paper (back)',note:'paper'},
 {k:'accent',lab_pt:'Destaque',lab_en:'Accent',note:'accent'}
];
function buildHexGrid(){
  byId('hexGrid').innerHTML=HEXKEYS.map(function(f){
    return '<div class="hex-field" data-hf="'+f.k+'"><div class="hf-top">'+
      '<span class="hf-name">'+(S.lang==='pt'?f.lab_pt:f.lab_en)+'</span>'+
      '<button type="button" class="hf-reset" data-hex-reset="'+f.k+'" title="'+(S.lang==='pt'?'Usar o valor do tema':'Use theme value')+'">auto</button></div>'+
      '<div class="hex-wrap"><input type="color" data-hex-pick="'+f.k+'" aria-label="'+f.k+'"><input type="text" class="hex-text" data-hex="'+f.k+'" placeholder="'+t('ph_hex')+'" title="'+t('ph_hex')+'" aria-label="'+(S.lang==='pt'?f.lab_pt:f.lab_en)+' HEX" maxlength="7" spellcheck="false" autocomplete="off"></div>'+
      '<div class="hex-meta"><span data-hex-ratio="'+f.k+'">—</span><span class="pill-ok" data-hex-badge="'+f.k+'">—</span></div></div>';
  }).join('');
  syncHexInputs();
}
function syncHexInputs(){
  var c=effColors();
  qa('.hex-field').forEach(function(f){
    var k=f.dataset.hf,val=c[k],raw=S.colors[k]||'';
    f.classList.toggle('dirty',!!raw);
    var picker=f.querySelector('[data-hex-pick]'),txt=f.querySelector('[data-hex]');
    if(picker)picker.value=val;
    if(txt&&document.activeElement!==txt)txt.value=raw||val;
    var against=(k==='canvas'||k==='paper')?(lumOf(val)>0.46?'#0C1122':'#F2F4FA'):c.canvas;
    var ratio=contrast(val,against),st=wcag(ratio);
    var meta=f.querySelector('[data-hex-ratio]'),pill=f.querySelector('[data-hex-badge]');
    if(meta)meta.textContent=(k==='canvas'||k==='paper'?(S.lang==='pt'?'tinta ':'ink '):(S.lang==='pt'?'no fundo ':'on bg '))+ratio.toFixed(2)+':1';
    if(pill){pill.className='pill-'+(st[1]==='ok'?'ok':(st[1]==='warn'?'warn':'bad'));pill.textContent=st[0]+' · '+ratio.toFixed(1)}
  });
};
function buildFontSelects(){
  byId('f_font_display').innerHTML=FONTS.map(function(f){
    return '<option value="'+f.id+'">'+esc(f.n)+' · '+(f.k==='serif'?'Serif':(f.k==='display'?'Display':'Sans'))+'</option>'}).join('');
  byId('f_font_body').innerHTML=FONTS.filter(function(f){return f.both}).map(function(f){
    return '<option value="'+f.id+'">'+esc(f.n)+' · '+(f.k==='serif'?'Serif':'Sans')+'</option>'}).join('');
  byId('f_font_display').value=S.fonts.display;byId('f_font_body').value=S.fonts.body;
}
function buildSocialEditors(){
  var plat=Object.keys(PL).filter(function(k){return k!=='web'}).concat(['web']);
  var names=function(p){return (p==='web'?'Website':(PL[p]&&PL[p].l)||p)};
  byId('socialEditors').innerHTML=[0,1,2].map(function(i){
    var s=S.data.socials[i]||{p:'linkedin',v:''};
    return '<div class="social-box" data-idx="'+i+'" data-on="'+(!!s.v)+'">'+
      '<div class="social-head"><span class="sh-num">'+(S.lang==='pt'?'CANAL':'CHANNEL')+' 0'+(i+1)+'</span>'+
      '<span class="switch" style="width:34px;height:19px"><input type="checkbox" data-soc-on="'+i+'" '+(s.v?'checked':'')+' aria-label="on"><i></i></span></div>'+
      '<div class="social-body"><div class="grid-2">'+
      '<select class="input-select" data-soc-p="'+i+'" aria-label="platform">'+plat.map(function(p){return '<option value="'+p+'"'+(s.p===p?' selected':'')+'>'+esc(names(p))+'</option>'}).join('')+'</select>'+
      '<input type="text" class="input-text" data-soc-v="'+i+'" value="'+esc(s.v||'')+'" placeholder="'+t('ph_social')+'" aria-label="'+t('ph_social')+'" spellcheck="false">'+
      '</div></div>'+
      '<div class="social-preview">'+(s.v?socChipHTML(s.p)+'<span>'+esc(handleLabel(s.p,s.v))+'</span>':'<span>'+(S.lang==='pt'?'vazio · não aparece no cartão':'empty · hidden on card')+'</span>')+'</div>'+
      '</div>';
  }).join('');
}
function buildLineToggles(){
  var items=[['email',t('fld_email')],['phone',t('fld_phone')],['mobile',t('fld_mobile')],['web',t('fld_web')]];
  byId('lineToggles').innerHTML=items.map(function(it){
    return '<label class="switch-row"><span class="sr-label">'+esc(it[1])+'</span><span class="switch"><input type="checkbox" data-line="'+it[0]+'" '+(S.lines[it[0]]?'checked':'')+'><i></i></span></label>';
  }).join('')+
   '<label class="switch-row"><span><span class="sr-label">'+(S.lang==='pt'?'Ícones das redes na frente':'Social icons on the front')+'</span></span>'+
   '<span class="switch"><input type="checkbox" data-line="socials" '+(S.showSoc?'checked':'')+'><i></i></span></label>';
}

/* ---------------------------------------------------------
   APPLY · SYNC
   --------------------------------------------------------- */
var syncQ=null;
function syncAll(){
  applyStyle();renderFaces();fitViewport();updateSpecs();apply3D();updateWorkspace();saveLocal();
}
function queueSync(){if(syncQ)cancelAnimationFrame(syncQ);syncQ=requestAnimationFrame(function(){syncQ=null;syncAll()})}
function setLang(l){
  S.lang=l;root.setAttribute('data-lang',l);root.lang=l==='pt'?'pt-PT':'en';
  qa('[data-lang-btn]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.langBtn===l))});
  qa('[data-i18n]').forEach(function(el){el.textContent=t(el.getAttribute('data-i18n'))});
  qa('[data-i18n-ph]').forEach(function(el){el.setAttribute('placeholder',t(el.getAttribute('data-i18n-ph')))});
  qa('[data-i18n-aria]').forEach(function(el){el.setAttribute('aria-label',t(el.getAttribute('data-i18n-aria')))});
  document.title=t('brand_sub')+' · Card Studio';
  buildPresetSelect();buildThemeGrid();buildHexGrid();buildSocialEditors();buildLineToggles();buildFmtSeg();buildSpecsLabels();buildTemplates();
  syncAll();
}
function readFields(){
  FIELDS.forEach(function(k){var el=byId(FIELD_IDS[k]);if(el)S.data[k]=el.value});
}
function writeFields(){
  FIELDS.forEach(function(k){var el=byId(FIELD_IDS[k]);if(el)el.value=S.data[k]||''});
  qa('[data-soc-v]').forEach(function(el){el.value=(S.data.socials[+el.getAttribute('data-soc-v')].v||'')});
  qa('[data-soc-p]').forEach(function(el){el.value=(S.data.socials[+el.getAttribute('data-soc-p')].p||'linkedin')});
  qa('[data-line]').forEach(function(el){el.checked=el.getAttribute('data-line')==='socials'?S.showSoc:!!S.lines[el.getAttribute('data-line')]});
}

/* ---------------------------------------------------------
   PRESETS
   --------------------------------------------------------- */
function loadPreset(id){
  var p=PRESETS.filter(function(x){return x.id===id})[0];if(!p)return;
  var c=p[S.lang]||p.en;
  Object.keys(c).forEach(function(k){if(k!=='socials')S.data[k]=c[k]});
  S.data.socials=[0,1,2].map(function(i){return c.socials[i]?{p:c.socials[i].p,v:c.socials[i].v}:{p:['linkedin','instagram','behance'][i],v:''}});
  captureHistory();
  S.theme=p.theme;S.fonts.display=p.font;S.fill=p.fill;S.frame=p.frame;S.layout='classic';S.template='';
  Object.keys(S.colors).forEach(function(k){S.colors[k]=''});
  var th=themeById(p.theme);S.fonts.body=th.body||'inter';
  applyLoadedControls();
  syncAll();
  toast(S.lang==='pt'?'Modelo carregado':'Preset loaded');
}

/* ---------------------------------------------------------
   STORAGE · JSON
   --------------------------------------------------------- */
var LS='cardstudio.corp.v1';
var saveTimer=null, historyTimer=null, lastSaved='', saveState='saving', warnedStorage=false;
var historyFrames=[], historyIndex=-1;
function snapshot(){return snapshotState(S)}
function showSaveStatus(status){
  saveState=status;
  var element=byId('saveStatus');
  element.dataset.status=status;
  element.querySelector('span').textContent=t(status==='error'?'not_saved':status==='saving'?'saving':'saved');
}
function flushSave(){
  if(!appReady)return;
  clearTimeout(saveTimer);saveTimer=null;
  try{
    var serialized=JSON.stringify(snapshot());
    localStorage.setItem(LS,serialized);lastSaved=serialized;showSaveStatus('saved');
  }catch(e){
    showSaveStatus('error');
    if(!warnedStorage){warnedStorage=true;toast(t('storage_error'),'warn')}
  }
}
function saveLocal(){
  if(!appReady||restoringState)return;
  var serialized=JSON.stringify(snapshot());
  clearTimeout(saveTimer);
  if(serialized!==lastSaved){showSaveStatus('saving');saveTimer=setTimeout(flushSave,450)}
  else showSaveStatus('saved');
  clearTimeout(historyTimer);
  if(!historyFrames[historyIndex]||designFingerprint(S)!==historyFrames[historyIndex].fingerprint){
    historyTimer=setTimeout(captureHistory,500);
  }
  updateHistoryButtons();
}
function loadLocal(){
  try{
    var raw=localStorage.getItem(LS);if(!raw)return false;
    S=parseProject(raw,DEFAULT_STATE,STATE_CHOICES);lastSaved=JSON.stringify(snapshot());return true;
  }catch(e){return false}
}
function captureHistory(){
  clearTimeout(historyTimer);historyTimer=null;
  if(!appReady||restoringState)return;
  var fingerprint=designFingerprint(S);
  if(historyFrames[historyIndex]&&historyFrames[historyIndex].fingerprint===fingerprint){updateHistoryButtons();return}
  historyFrames=historyFrames.slice(0,historyIndex+1);
  var state=snapshot();
  historyFrames.push({state:state,fingerprint:fingerprint,bytes:JSON.stringify(state).length+fingerprint.length});
  var total=historyFrames.reduce(function(n,entry){return n+entry.bytes},0);
  while(historyFrames.length>2&&(historyFrames.length>40||total>16000000))total-=historyFrames.shift().bytes;
  historyIndex=historyFrames.length-1;updateHistoryButtons();
}
function updateHistoryButtons(){
  var changed=historyFrames[historyIndex]&&designFingerprint(S)!==historyFrames[historyIndex].fingerprint;
  byId('undoBtn').disabled=historyIndex<=0&&!changed;
  byId('redoBtn').disabled=!!changed||historyIndex>=historyFrames.length-1;
}
function moveHistory(direction){
  captureHistory();
  var next=historyIndex+direction;
  if(next<0||next>=historyFrames.length)return;
  historyIndex=next;
  var view={lang:S.lang,mode:S.mode,side:S.side,zoomUser:S.zoomUser,v3:S.v3};
  restoringState=true;
  S=normalizeState(historyFrames[next].state,DEFAULT_STATE,STATE_CHOICES);
  Object.keys(view).forEach(function(key){S[key]=view[key]});
  restoreControls();restoringState=false;
  // Normalization can add absent legacy metadata. Keep the current history entry canonical.
  historyFrames[next].state=snapshot();historyFrames[next].fingerprint=designFingerprint(S);
  saveLocal();updateHistoryButtons();toast(t(direction<0?'undo_done':'redo_done'));
}
function restoreControls(){
  if(syncQ){cancelAnimationFrame(syncQ);syncQ=null}
  setAutoTurn(false);setSpin(false);
  setLang(S.lang);applyLoadedControls();setPhoto(S.photo);setMode(S.mode);turn(S.side);
  updatePageSize();apply3D();
  if(byId('tab-print').classList.contains('active'))previewSheet();
}
function downloadBlob(blob,filename){
  var url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},1000);
}
function exportJSON(){
  downloadBlob(new Blob([JSON.stringify({app:'card-studio',v:2,state:snapshot()},null,2)],{type:'application/json'}),projectFilename(S.data.name));
  byId('exportDialog').close();toast(t('toast_json'));
}
async function importJSON(file){
  if(!file)return;
  if(file.size>5000000){toast(t('import_large'),'warn');return}
  try{
    var imported=parseProject(await file.text(),DEFAULT_STATE,STATE_CHOICES);
    captureHistory();restoringState=true;S=imported;
    restoreControls();restoringState=false;syncAll();captureHistory();toast(t('toast_loaded'));
  }catch(e){restoringState=false;toast(t('import_error'),'warn')}
}
function downloadVCard(){
  downloadBlob(new Blob([createVCard(S.data)],{type:'text/vcard;charset=utf-8'}),projectFilename(S.data.name,'vcf'));
  byId('exportDialog').close();toast(S.lang==='pt'?'Contacto descarregado':'Contact downloaded');
}
function uiIcon(name){return '<svg class="ui-icon" aria-hidden="true"><use href="#i-'+name+'"></use></svg>'}
function templateHTML(template){
  return '<button type="button" class="template-tile" data-template-id="'+template.id+'" aria-pressed="'+(S.template===template.id)+'" aria-label="'+esc(t('tpl_'+template.id))+'">'+
    '<div class="template-art" data-art="'+template.id+'" style="--mini-bg:'+template.colors.canvas+';--mini-ink:'+template.ink+'" aria-hidden="true">'+
    '<span class="mini-brand">FORMA STUDIO</span><span class="mini-name">Sofia <br>Martins</span><span class="mini-role">'+(S.lang==='pt'?'Designer de Marca':'Brand Designer')+'</span><span class="mini-footer">sofia@forma.studio</span></div>'+
    '<div class="template-tile-info"><span><strong>'+esc(t('tpl_'+template.id))+'</strong><small>'+esc(t('desc_'+template.id))+'</small></span><span class="template-check">'+uiIcon('check')+'</span></div></button>';
}
var galleryCategory='all';
function buildTemplates(){
  byId('templateStrip').innerHTML=templates.slice(0,4).map(templateHTML).join('');
  filterTemplates();
}
function filterTemplates(){
  var search=byId('templateSearch').value.toLowerCase().trim();
  var matches=templates.filter(function(template){return (galleryCategory==='all'||template.category===galleryCategory)&&[t('tpl_'+template.id),t('desc_'+template.id),template.category].join(' ').toLowerCase().includes(search)});
  byId('templateGallery').innerHTML=matches.map(templateHTML).join('');
  byId('galleryEmpty').hidden=!!matches.length;
}
function applyTemplate(id){
  var template=templates.filter(function(item){return item.id===id})[0];if(!template)return;
  captureHistory();
  S.template=id;S.layout=template.layout;S.theme=template.theme;S.colors=Object.assign({},template.colors);
  S.fonts={display:template.font,body:template.body};S.frame=template.frame;
  S.fill='dark';S.texture='none';S.weight=template.layout==='bold'?600:500;S.track=-.03;S.ltrack=.16;S.nameCase='none';S.radius=.6;S.band=31;
  applyLoadedControls();syncAll();captureHistory();byId('templateDialog').close();toast(t('template_applied'));
}
function updateWorkspace(){
  showSaveStatus(saveState);
  qa('[data-template-id]').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.templateId===S.template))});
  var portrait=byId('uploadPreviewBox');
  if(portrait&&!S.photo){portrait.innerHTML='<span class="monogram">'+esc(monogram())+'</span>'}
  byId('photoState').textContent=S.photo?t('photo_loaded'):t('photo_empty');
  qa('[data-turn]').forEach(function(button){button.setAttribute('aria-label',t('btn_turn'))});
  byId('undoBtn').setAttribute('aria-label',S.lang==='pt'?'Anular':'Undo');
  byId('redoBtn').setAttribute('aria-label',S.lang==='pt'?'Refazer':'Redo');
}
function activateTab(id){
  qa('.tab-btn').forEach(function(button){var active=button.dataset.tab===id;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1});
  qa('.tab-pane').forEach(function(pane){pane.classList.toggle('active',pane.id===id)});
  var index=qa('.tab-btn').findIndex(function(button){return button.dataset.tab===id});
  document.querySelector('.step-count').textContent='0'+(index+1)+' — 04';
  document.querySelector('.form-panel .panel-body').scrollTop=0;
  if(id==='tab-print')previewSheet();
}
function initWorkspace(){
  byId('exportBtn').addEventListener('click',function(){byId('exportDialog').showModal()});
  byId('helpBtn').addEventListener('click',function(){byId('helpDialog').showModal()});
  qa('[data-open-templates]').forEach(function(button){button.addEventListener('click',function(){filterTemplates();byId('templateDialog').showModal()})});
  qa('[data-close-dialog]').forEach(function(button){button.addEventListener('click',function(){button.closest('dialog').close()})});
  qa('dialog').forEach(function(dialog){dialog.addEventListener('click',function(e){
    if(e.target!==dialog)return;
    var rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();
  })});
  ['templateStrip','templateGallery'].forEach(function(id){byId(id).addEventListener('click',function(e){var tile=e.target.closest('[data-template-id]');if(tile)applyTemplate(tile.dataset.templateId)})});
  qa('[data-category]').forEach(function(button){button.addEventListener('click',function(){galleryCategory=button.dataset.category;qa('[data-category]').forEach(function(b){b.setAttribute('aria-pressed',String(b===button))});filterTemplates()})});
  byId('templateSearch').addEventListener('input',filterTemplates);
  byId('undoBtn').addEventListener('click',function(){moveHistory(-1)});
  byId('redoBtn').addEventListener('click',function(){moveHistory(1)});
  byId('advancedPreview').addEventListener('toggle',function(){if(this.open){apply3D();stageFits()}else{setAutoTurn(false);setSpin(false)}});
  var editor=document.querySelector('.form-panel');
  editor.addEventListener('focusin',function(e){if(e.target.matches('input,select,textarea'))captureHistory()});
  editor.addEventListener('change',function(){saveLocal()});
  document.addEventListener('click',function(e){
    var button=e.target.closest('.form-panel button,#fmtSeg button');
    if(button)captureHistory();
  },true);
  window.addEventListener('pagehide',flushSave);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'){flushSave();setAutoTurn(false);setSpin(false)}});
  buildTemplates();updateWorkspace();
}

/* ---------------------------------------------------------
   PHOTO
   --------------------------------------------------------- */
function setPhoto(src,label){
  S.photo=safePhoto(src);S.data.photo=S.photo;src=S.photo;
  var box=byId('uploadPreviewBox');
  box.innerHTML=src?'<img src="'+esc(src)+'" alt="">':'<span class="monogram">'+esc(monogram())+'</span>';
  byId('photoState').textContent=src?(label||t('photo_loaded')):t('photo_empty');
  syncAll();
}
function handlePhotoFile(file){
  if(!file)return;
  if(file.size>4000000){toast(S.lang==='pt'?'Imagem muito pesada (máx. 4 MB)':'Image too large (max 4 MB)','warn');return}
  var r=new FileReader();
  r.onload=function(){
    var img=new Image();
    img.onload=function(){
      try{
      /* downscale to keep print quality ~600dpi on the band, file size sane */
      var bandMM=FORMATS[S.fmt].w*(S.frame==='band'?(S.band/100):0.24);
      var maxW=Math.max(900,Math.min(2400,Math.round(bandMM/25.4*600)));
      if(img.naturalWidth*img.naturalHeight>36000000){toast(S.lang==='pt'?'A imagem tem demasiados píxeis (máx. 36 MP)':'Image dimensions are too large (max 36 MP)','warn');return}
      var sc=Math.min(1,maxW/img.naturalWidth,2400/img.naturalHeight);
      var c=document.createElement('canvas');
      c.width=Math.round(img.naturalWidth*sc);c.height=Math.round(img.naturalHeight*sc);
      var ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,c.width,c.height);
      var out=c.toDataURL('image/jpeg',0.9);
      if(!safePhoto(out)){toast(S.lang==='pt'?'Não foi possível processar a imagem':'Could not process this image','warn');return}
      S.photoW=c.width;S.photoH=c.height;
      if(S.frame==='none'){S.frame='round';byId('f_photo_frame').value='round'}
      setPhoto(out,(S.lang==='pt'?'':'')+c.width+'×'+c.height+' px');
      toast(t('toast_photo'));
      }catch(e){toast(S.lang==='pt'?'Não foi possível processar a imagem':'Could not process this image','warn')}
    };
    img.onerror=function(){toast(S.lang==='pt'?'Não consegui ler a imagem':'Could not read image','warn')};
    img.src=r.result;
  };
  r.onerror=function(){toast(S.lang==='pt'?'Não foi possível ler a imagem':'Could not read image','warn')};
  r.readAsDataURL(file);
}

/* ---------------------------------------------------------
   MODE · TURN
   --------------------------------------------------------- */
function setMode(m){
  S.mode=m;
  byId('stageViewport').dataset.mode=m;
  byId('cardsContainer').setAttribute('data-mode',m);
  qa('[data-set-mode]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.setMode===m))});
  if(m==='flip'){var fl=byId('stageFlipper');if(fl)fl.setAttribute('data-side',S.side)}
  queueSync();
}
function turn(side){
  if(side&&side!=='auto')S.side=side;else S.side=S.side==='front'?'back':'front';
  var fl=byId('stageFlipper');if(fl)fl.setAttribute('data-side',S.side);
  S.turn=S.side==='back'?180:0;
  byId('turnInner').style.setProperty('--turn',S.turn+'deg');
  byId('turnAngle').textContent=S.turn+'°';
  byId('turnBadgeText')&&(byId('turnBadgeText').textContent=t(S.side==='back'?'face_back':'face_front'));
  byId('turnFrontBtn').setAttribute('aria-pressed',String(S.side==='front'));
  byId('turnBackBtn').setAttribute('aria-pressed',String(S.side==='back'));
  var tag=byId('singleSideTag');
  if(tag){tag.setAttribute('data-turn',S.side==='front'?'back':'front');tag.querySelector('span').textContent=t(S.side==='back'?'face_back':'face_front')}
  setSpin(false);
}
function setSpin(on){
  S.v3.spin=on===undefined?!S.v3.spin:on;
  ['card3d','card3dModal'].forEach(function(id){var e=byId(id);if(e)e.classList.toggle('spinning',!!S.v3.spin)});
  var b=byId('spin3dBtn');if(b)b.classList.toggle('btn-pop',!!S.v3.spin);
  var m=byId('modalSpinBtn');if(m)m.classList.toggle('btn-pop',!!S.v3.spin);
  byId('mode3dLabel').textContent=S.v3.spin?(S.lang==='pt'?'AUTO':'AUTO')+' · '+t('orbit').toLowerCase():t('orbit');
}

/* ---------------------------------------------------------
   3D ENGINE
   --------------------------------------------------------- */
function apply3D(){
  var v=S.v3;
  stageFits();
  var flatMul=v.flat?0.42:1;
  [byId('stage3d'),byId('stage3dModal')].forEach(function(st,idx){
    if(!st)return;
    var base=(idx?S.base3dModal:S.base3d)||1;
    var own=v.zoom*flatMul*base;
    st.style.setProperty('--s3d',own.toFixed(4));
    st.style.setProperty('--glare',String(v.glare));
    st.style.setProperty('--shadowOp',v.flat?'0.15':String(v.shadow));
    st.style.setProperty('perspective',v.persp+'px');
  });
  var s3dMain=v.zoom*flatMul*(S.base3d||1);
  [byId('card3d'),byId('card3dModal')].forEach(function(cd,idx){
    if(!cd)return;
    var curS3d=v.zoom*flatMul*((idx?S.base3dModal:S.base3d)||1);
    cd.style.setProperty('--rx',v.rx+'deg');
    cd.style.setProperty('--ry',v.flat?'0deg':v.ry+'deg');
    cd.style.setProperty('--tx',v.tx+'px');
    cd.style.setProperty('--ty',v.ty+'px');
    cd.style.setProperty('--th',(v.thick*3.78*curS3d).toFixed(2)+'px');
    var g=qa('.c3d-glare',cd);
    var gx=50+Math.sin(v.ry*Math.PI/180)*36,gy=50+v.rx*0.5;
    g.forEach(function(el){el.style.setProperty('--gx',gx.toFixed(1)+'%');el.style.setProperty('--gy',gy.toFixed(1)+'%')});
  });
  byId('rotReadout').textContent='Y '+(v.flat?0:Math.round(((v.ry%360)+360)%360>180?((v.ry%360)+360)%360-360:v.ry))+'° · X '+Math.round(v.rx)+'°';
}
function turn3D(side){
  turn(side);
  S.v3.ry=S.side==='back'?180:0;
  S.v3.flat=false;
  apply3D();
}
function bind3D(stageId,cardId){
  var st=byId(stageId),cd=byId(cardId);if(!st||!cd)return;
  var drag=false,sx=0,sy=0,moved=0,t0=0,vt=0,vp=0,raf=null;
  st.addEventListener('pointerdown',function(e){
    if(e.button!==0)return;
    drag=true;moved=0;t0=Date.now();sx=e.clientX;sy=e.clientY;
    S.v3.flat=false;cd.classList.remove('spinning');S.v3.spin=false;
    st.setPointerCapture(e.pointerId);
  });
  st.addEventListener('pointermove',function(e){
    if(!drag)return;
    var dx=e.clientX-sx,dy=e.clientY-sy;sx=e.clientX;sy=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);
    if(shiftDown||e.shiftKey||e.button===2){S.v3.tx+=dx;S.v3.ty+=dy}
    else{S.v3.ry+=dx*0.45;S.v3.rx=Math.max(-85,Math.min(85,S.v3.rx-dy*0.35))}
    vt=dx*0.45;vp=-dy*0.35;
    apply3D();
  });
  var end=function(e){
    if(!drag)return;drag=false;
    if(moved<6&&Date.now()-t0<420){turn3D();}
    else if(!shiftDown&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      if(raf)cancelAnimationFrame(raf);
      var decay=function(){
        if(drag||Math.abs(vt)<0.06){raf=null;return}
        S.v3.ry+=vt;S.v3.rx=Math.max(-85,Math.min(85,S.v3.rx+vp));
        vt*=0.93;vp*=0.9;apply3D();raf=requestAnimationFrame(decay);
      };
      raf=requestAnimationFrame(decay);
    }
  };
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  st.addEventListener('wheel',function(e){
    e.preventDefault();
    S.v3.zoom=Math.max(.5,Math.min(2.7,S.v3.zoom-e.deltaY*0.0011));
    apply3D();
  },{passive:false});
  st.addEventListener('contextmenu',function(e){e.preventDefault()});
}
var shiftDown=false;

/* ---------------------------------------------------------
   AUTO TURN
   --------------------------------------------------------- */
var turnTimer=null;
function setAutoTurn(on){
  S.autoTurn=on===undefined?!S.autoTurn:on;
  if(turnTimer){clearInterval(turnTimer);turnTimer=null}
  if(S.autoTurn)turnTimer=setInterval(function(){turn()},2100);
  byId('turnAutoBtn').setAttribute('aria-pressed',String(S.autoTurn));
  byId('turnAutoBtn').classList.toggle('btn-pop',S.autoTurn);
}

/* ---------------------------------------------------------
   PRINT · PDF
   --------------------------------------------------------- */
function printPlan(){
  var F=FORMATS[S.fmt],p=S.print,b=p.bleed,MZ=5,pages=[],doc={};
  var faces=p.faces==='both'&&p.duplex?['front','back']:(p.faces==='back'?['back']:['front']);
  if(p.preset==='home'){
    var qty=p.qty,cols=qty>2?2:1,rows=Math.ceil(qty/cols),perPage=cols*5;
    var sheetW=210,sheetH=297;
    var gridRows=Math.min(rows,5),startX=(sheetW-cols*F.w)/2,startY=(sheetH-gridRows*F.h)/2;
    var sheets=Math.ceil(qty/perPage);
    doc.pageW=sheetW;doc.pageH=sheetH;doc.bleed=0;doc.type='home';doc.marks=!!p.marks;
    doc.sheets=[];
    faces.forEach(function(side){
      for(var s=0;s<sheets;s++){
        var remaining=qty-s*perPage,cells=[];
        var rowsThis=Math.min(5,Math.ceil(Math.min(remaining,perPage)/cols));
        var y0=(sheetH-rowsThis*F.h)/2;
        for(var i=0;i<Math.min(remaining,perPage);i++){
          cells.push({x:startX+(i%cols)*F.w,y:y0+Math.floor(i/cols)*F.h,side:side});
        }
        doc.sheets.push({cells:cells,side:side});
      }
    });
  }else if(p.preset==='pro'){
    /* production file: trim + bleed, never marks — exactly what a bureau asks for */
    doc.pageW=F.w+2*b;doc.pageH=F.h+2*b;doc.bleed=b;doc.type='pro';doc.marks=false;doc.mz=0;
    doc.pages=faces.map(function(s){return {side:s,mark:false}});
  }else if(p.preset==='marks'){
    doc.pageW=F.w+2*(b+MZ);doc.pageH=F.h+2*(b+MZ);doc.bleed=b;doc.type='pro';doc.marks=true;doc.mz=MZ;
    doc.pages=faces.map(function(s){return {side:s,mark:true}});
  }else{
    var sm=!!p.marks;
    doc.pageW=F.w+(sm?2*MZ:0);doc.pageH=F.h+(sm?2*MZ:0);doc.bleed=0;doc.type='single';doc.marks=sm;doc.mz=sm?MZ:0;
    doc.pages=faces.map(function(s){return {side:s,mark:sm}});
  }
  doc.faces=faces;
  doc.trimW=F.w;doc.trimH=F.h;
  return doc;
}
function faceMarkup(side,bleed){
  return '<div class="face face-'+side+'" style="--bleed:'+bleed+'mm"><div class="trim"></div></div>';
}
function buildPrintDoc(target){
  var plan=printPlan(),p=S.print;
  target.innerHTML='';
  var doc=document.createElement('div');doc.className='print-doc';
  if(p.gray)doc.style.filter='grayscale(1) contrast(1.06)';
  var faceCache={front:frontHTML(),back:backHTML()};
  function pageEl(w,h){
    var pg=document.createElement('div');pg.className='print-page';
    pg.style.width=w+'mm';pg.style.height=h+'mm';
    return pg;
  }
  function addFace(parent,side,x,y,bleed,mirror){
    var tmp=document.createElement('div');tmp.innerHTML=faceCache[side];
    var face=tmp.firstElementChild;
    face.style.setProperty('--bleed',bleed+'mm');
    face.style.position='absolute';face.style.left=x+'mm';face.style.top=y+'mm';face.style.transform=mirror?'scaleX(-1)':'none';
    face.style.zIndex='1';
    parent.appendChild(face);
    return face;
  }
  function cropMarks(pg,tx,ty,w,h,pageW,pageH){
    var TH=.1,GAP=.7;
    function rule(x,y,dw,dh){
      var d=document.createElement('span');d.className='crop';
      d.style.left=x+'mm';d.style.top=y+'mm';d.style.width=Math.max(0,dw)+'mm';d.style.height=Math.max(0,dh)+'mm';
      pg.appendChild(d);
    }
    [[tx,ty,-1,-1],[tx+w,ty,1,-1],[tx,ty+h,-1,1],[tx+w,ty+h,1,1]].forEach(function(c){
      var x=c[0],y=c[1],dx=c[2],dy=c[3];
      if(dx<0) rule(0,y,x-GAP,TH);
      else rule(x+GAP,y,pageW-x-GAP,TH);
      if(dy<0) rule(x,0,TH,y-GAP);
      else rule(x,y+GAP,TH,pageH-y-GAP);
    });
    function reg(cx,cy){
      var el=document.createElement('span');el.className='reg';
      el.style.left=(cx-1.7)+'mm';el.style.top=(cy-1.7)+'mm';el.style.width='3.4mm';el.style.height='3.4mm';
      el.innerHTML='<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.9" fill="none" stroke="currentColor" stroke-width=".7"/><path d="M5 .3v9.4M.3 5h9.4" stroke="currentColor" stroke-width=".7"/></svg>';
      pg.appendChild(el);
    }
    reg(pageW/2,1.7);reg(pageW/2,pageH-1.7);reg(1.7,pageH/2);reg(pageW-1.7,pageH/2);
  }
  if(plan.type==='home'){
    plan.sheets.forEach(function(sheet){
      var pg=pageEl(plan.pageW,plan.pageH);
      sheet.cells.forEach(function(c){
        var cell=document.createElement('div');cell.className='print-cell';
        cell.style.left=c.x+'mm';cell.style.top=c.y+'mm';cell.style.width=plan.trimW+'mm';cell.style.height=plan.trimH+'mm';
        addFace(cell,c.side,0,0,0,(c.side==='back'&&p.mirror&&p.duplex));
        pg.appendChild(cell);
        /* cut marks */
        var mk=plan.marks?[[c.x,c.y,-1,-1],[c.x+plan.trimW,c.y,1,-1],[c.x,c.y+plan.trimH,-1,1],[c.x+plan.trimW,c.y+plan.trimH,1,1]]:[];
        mk.forEach(function(p2){
          var x=p2[0],y=p2[1],dx=p2[2],dy=p2[3],L=3.2,G=.5;
          var segs=[];
          if(x-L-G>1) segs.push([x-L-G,y-G/2,L,G]);
          if(x+G+L<plan.pageW-1) segs.push([x+G,y-G/2,L,G]);
          if(y-L-G>1) segs.push([x-G/2,y-L-G,G,L]);
          if(y+G+L<plan.pageH-1) segs.push([x-G/2,y+G,G,L]);
          segs.forEach(function(s){
            var el=document.createElement('span');el.className='cut';
            el.style.left=s[0]+'mm';el.style.top=s[1]+'mm';el.style.width=s[2]+'mm';el.style.height=s[3]+'mm';
            pg.appendChild(el);
          });
        });
      });
      var note=document.createElement('span');note.className='pg-note';
      note.style.left='12mm';note.style.top=(plan.pageH-9)+'mm';note.style.fontSize='2.5mm';note.style.maxWidth='186mm';
      note.textContent='CARD STUDIO · '+(S.data.name||'')+' · '+plan.trimW+'×'+plan.trimH+' MM · '+(sheet.side==='front'?(S.lang==='pt'?'FRENTE':'FRONT'):(S.lang==='pt'?'VERSO'+(p.mirror?' · ESPELHADO':'')+' · TESTAR ALINHAMENTO DUPLEX':'BACK'+(p.mirror?' · MIRRORED':'')+' · TEST DUPLEX ALIGNMENT'))+' · ESCALA 1:1 · SEM AJUSTAR';
      pg.appendChild(note);
      doc.appendChild(pg);
    });
  }else{
    (plan.pages||[]).forEach(function(pgDef,idx){
      var pg=pageEl(plan.pageW,plan.pageH);
      var mz=plan.marks?plan.mz:0;
      addFace(pg,pgDef.side,mz,mz,plan.bleed,pgDef.side==='back'&&p.mirror&&p.duplex&&plan.type!=='pro');
      if(plan.marks)cropMarks(pg,mz,mz,plan.trimW,plan.trimH,plan.pageW,plan.pageH);
      if(plan.marks){
        var note=document.createElement('span');note.className='pg-note';
        note.style.left=mz+'mm';note.style.top=(plan.pageH-3.4)+'mm';note.style.fontSize='2mm';
        note.textContent=(S.data.name||'')+' · '+pgDef.side.toUpperCase()+' · TRIM '+n1(plan.trimW)+'×'+n1(plan.trimH)+'MM · BLEED '+plan.bleed+'MM · 1:1';
        pg.appendChild(note);
        /* colour bars */
        var cx=mz;['#00AEF3','#EC008C','#FFF200','#000000'].forEach(function(col){
          var s=document.createElement('span');s.className='crop';
          s.style.left=cx+'mm';s.style.top=(plan.pageH-mz+1.4)+'mm';s.style.width='2.2mm';s.style.height='2.2mm';
          s.style.background=col;pg.appendChild(s);cx+=2.6;
        });
      }
      doc.appendChild(pg);
    });
  }
  target.appendChild(doc);
  return {doc:doc,plan:plan,pages:(plan.sheets?plan.sheets.length:(plan.pages||[]).length)};
}
function updatePageSize(){
  var plan=printPlan();
  byId('page-size').textContent='@page{size:'+n1(plan.pageW)+'mm '+n1(plan.pageH)+'mm;margin:0}';
}
function doPrint(){
  qa('dialog[open]').forEach(function(dialog){dialog.close()});
  if(byId('popoutModal').classList.contains('active'))byId('closePopoutBtn').click();
  if(syncQ){cancelAnimationFrame(syncQ);syncQ=null;syncAll()}
  buildPrintDoc(byId('print-root'));updatePageSize();
  var run=function(){renderFaces();buildPrintDoc(byId('print-root'));Promise.all(qa('img',byId('print-root')).map(function(img){return img.decode?img.decode().catch(function(){}):Promise.resolve()})).then(function(){window.print()})};
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(run).catch(run);else run();
  toast(t('toast_pdf'));
}
function previewSheet(){
  var box=byId('sheetPreview');if(!box)return;
  var holder=document.createElement('div');
  var info=buildPrintDoc(holder);
  var plan=info.plan,pages=qa('.print-page',holder).slice(0,2);
  box.innerHTML='';
  var wrap=document.createElement('div');wrap.className='pv-scaler';
  var inner=document.createElement('div');
  inner.style.cssText='display:flex;gap:6px;background:#fff;padding:6px;position:relative';
  pages.forEach(function(pg){
    var c=pg.cloneNode(true);
    c.style.cssText+=';page-break-after:auto;break-after:auto;box-shadow:0 0 0 .3mm rgba(0,0,0,.22)';
    inner.appendChild(c);
  });
  wrap.appendChild(inner);box.appendChild(wrap);
  var unit=mm2px(1);
  var totalW=(plan.pageW*pages.length+12)*unit, totalH=(plan.pageH+12)*unit;
  var k=Math.max(.04,Math.min((box.clientWidth-6)/totalW,300/totalH));
  wrap.style.transformOrigin='top left';
  wrap.style.transform='scale('+k.toFixed(4)+')';
  wrap.style.width=totalW+'px';wrap.style.height=totalH+'px';
  box.style.height=Math.round(totalH*k+12)+'px';
  box.style.alignItems='flex-start';
  byId('pvNote').textContent=t('pv_note')+' · '+info.pages+' '+t('unit_pages');
}
function buildSpecsLabels(){}
function updateSpecs(){
  var plan=printPlan(),F=FORMATS[S.fmt],p=S.print;
  var labels={};
  ['home','pro','marks','single'].forEach(function(kk){
    var keep=S.print.preset;S.print.preset=kk;var pl=printPlan();S.print.preset=keep;
    labels[kk]=n1(pl.pageW)+'×'+n1(pl.pageH)+' mm';
  });
  var pages=plan.type==='home'?plan.sheets.length:(plan.pages||[]).length;
  var photoLine;S.photoDpi=0;
  if(S.photo){
    var areaW=F.w*(S.frame==='band'?(S.band/100):0.24),areaH=(S.frame==='band'?F.h:F.h*0.42);
    var big=Math.max(areaW,areaH),have=Math.max(S.photoW||0,S.photoH||0);
    var dpi=have?Math.round(have/(big/25.4)):300;
    photoLine=dpi+' ppi';S.photoDpi=dpi;
  }else photoLine=(S.lang==='pt'?'monograma (vetorial)':'monogram (vector)');
  var rows=[
    [t('sp_trim'),n1(F.w)+' × '+n1(F.h)+' mm <b>'+Math.round(mm2pt(F.w))+' × '+Math.round(mm2pt(F.h))+' pt</b>'],
    [t('sp_page'),plan.type==='home'?('A4 · 210 × 297 mm'):(n1(plan.pageW)+' × '+n1(plan.pageH)+' mm')],
    [t('sp_bleed'),plan.bleed?('+ '+n1(plan.bleed)+(S.lang==='pt'?' mm por lado':' mm per side')):'0 mm'],
    [t('sp_safe'),'3 mm <b>'+n1(3/F.w*100)+'% / '+n1(3/F.h*100)+'%</b>'],
    [t('sp_res'),t('sp_vec')+'300 ppi'],
    [t('sp_color'),t('sp_srgb')],
    [t('sp_fonts'),t('sp_embed')],
    [t('sp_pages'),pages+' '+t(pages>1?'unit_pages':'unit_page')],
    [t('sp_duplex'),p.duplex&&p.faces==='both'?t('sp_short'):t('sp_none')],
    [t('sp_dpi'),photoLine]
  ];
  byId('specTable').innerHTML=rows.map(function(r){return '<tr><th>'+esc(r[0])+'</th><td>'+r[1]+'</td></tr>'}).join('');
  qa('.preset').forEach(function(b){
    b.classList.toggle('active',b.dataset.preset===p.preset);
    var lab=b.querySelector('.p-size');
    if(lab)lab.textContent=b.dataset.preset==='home'?('A4 · '+p.qty+'× '+n1(F.w)+'×'+n1(F.h)+' mm'):labels[b.dataset.preset];
  });
  updateChecks();
  if(byId('sheetPreview').firstChild)previewSheet();
}
function updateChecks(){
  var F=FORMATS[S.fmt],items=[];
  var nm=(S.data.name||'');
  var fc=S.fit?parseFloat((String(S.fit[1]||'1'))):1;
  var fs=S.fitScale||1;
  items.push([(fs<0.9||nm.length>24)?'warn':'ok',(fs<0.9||nm.length>24)?t('c_name_long'):t('c_name_short')]);
  var lowPhoto=S.photo&&S.photoDpi&&S.photoDpi<300;
  items.push([S.photo?(lowPhoto?'warn':'ok'):'warn',S.photo?(lowPhoto?t('c_photo_low'):t('c_photo_ok')):t('c_photo_none')]);
  var inkC=contrast(effColors().canvas,lumOf(effColors().canvas)>0.46?'#0A0E1C':'#EDEFFA');
  items.push([inkC>=7?'ok':(inkC>=4.5?'ok':'warn'),(inkC>=7?t('c_contrast_ok'):t('c_contrast_warn'))+' · '+inkC.toFixed(1)+':1']);
  var qrReady=!!qrPayload()&&qrCache.text===qrPayload()&&!!qrCache.svg;
  items.push([qrReady?'ok':'warn',t(qrReady?'qr_ready_check':'qr_review_check')]);
  items.push([/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(S.data.email||'')?'ok':'bad',S.data.email&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(S.data.email)?t('c_mail_ok'):t('c_mail_bad')]);
  items.push(['ok',t('c_social_ok')]);
  items.push(['ok',t('chk_marks')]);items.push(['ok',t('chk_scale')]);items.push(['ok',t('chk_paper')]);
  items.push(['ok',t('chk_qr')]);items.push(['ok',t('chk_pdf')]);
  var icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var warn='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3l9.5 17H2.5z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>';
  byId('printChecklist').innerHTML=items.map(function(it){
    return '<li style="color:'+(it[0]==='bad'?'var(--ui-bad)':(it[0]==='warn'?'var(--ui-warn)':'var(--text-muted)'))+'">'+(it[0]==='ok'?icon:warn)+'<span>'+esc(it[1])+'</span></li>';
  }).join('');
}

/* ---------------------------------------------------------
   EVENTS
   --------------------------------------------------------- */
function bindLineCopy(){
  qa('.f-line').forEach(function(li){
    if(li.dataset.bound)return;li.dataset.bound='1';
    li.addEventListener('click',function(e){
      e.stopPropagation();
      var v=li.querySelector('.v');if(v)copyText(v.textContent.trim(),'');
    });
  });
}
function syncSliderOuts(){
  byId('out_photo_zoom').textContent=Math.round(S.photoZoom*100)+'%';
  byId('out_photo_x').textContent=S.photoX+'%';
  byId('out_photo_y').textContent=S.photoY+'%';
  byId('out_radius').textContent=n1(FORMATS[S.fmt].w*(S.radius/100))+' mm';
  byId('out_band').textContent=S.band+'%';
  byId('out_tracking').textContent=S.track.toFixed(3)+'em';
  byId('out_label_track').textContent=S.ltrack.toFixed(2)+'em';
  byId('zoomVal').textContent=S.zoomUser+'%';
}
function setTheme(id){
  S.theme=id;S.template='';
  Object.keys(S.colors).forEach(function(k){S.colors[k]=''});
  var th=themeById(id);
  S.fonts.display=th.font;S.fonts.body=th.body||'inter';
  byId('f_font_display').value=th.font;byId('f_font_body').value=th.body||'inter';
  syncAll();
}
function init(){
  /* ---------- fields ---------- */
  FIELDS.forEach(function(k){
    var el=byId(FIELD_IDS[k]);if(!el)return;el.maxLength=k==='mono'?4:1000;
    el.addEventListener('input',function(){S.data[k]=el.value;queueSync()});
  });
  byId('presetSelect').addEventListener('change',function(e){if(e.target.value)loadPreset(e.target.value)});
  /* tabs */
  qa('.tab-btn').forEach(function(b,i){
    b.id='tab-button-'+i;b.setAttribute('role','tab');b.setAttribute('aria-controls',b.dataset.tab);
    b.setAttribute('aria-selected',String(i===0));b.tabIndex=i===0?0:-1;
    var pane=byId(b.dataset.tab);pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',b.id);
    b.addEventListener('click',function(){activateTab(b.dataset.tab)});
    b.addEventListener('keydown',function(e){
      var next=e.key==='ArrowRight'?(i+1)%4:e.key==='ArrowLeft'?(i+3)%4:e.key==='Home'?0:e.key==='End'?3:-1;
      if(next>=0){e.preventDefault();var button=qa('.tab-btn')[next];activateTab(button.dataset.tab);button.focus()}
    });
  });
  /* format */
  byId('fmtSeg').addEventListener('click',function(e){
    var b=e.target.closest('[data-set-fmt]');if(!b)return;
    S.fmt=b.dataset.setFmt;qa('#fmtSeg button').forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.setFmt===S.fmt))});
    updatePageSize();syncAll();
  });
  /* mode */
  qa('[data-set-mode]').forEach(function(b){b.addEventListener('click',function(){setMode(b.dataset.setMode)})});
  byId('quickFlipBtn').addEventListener('click',function(){if(S.mode!=='flip')setMode('flip');turn()});
  qa('[data-turn]').forEach(function(el){
    el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',S.lang==='pt'?'Virar cartão':'Flip card');
    el.addEventListener('keydown',function(e){if(e.target!==el)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}});
    el.addEventListener('click',function(e){
      if(e.target.closest('.f-line'))return;
      if(S.mode!=='flip')setMode('flip');
      turn(el.dataset.turn);
    });
  });
  /* zoom / guides */
  byId('zoomSlider').addEventListener('input',function(e){S.zoomUser=+e.target.value;byId('zoomVal').textContent=S.zoomUser+'%';fitViewport()});
  byId('toggleSafeBtn').addEventListener('click',function(){
    var on=byId('cardsContainer').classList.toggle('show-safe');this.setAttribute('aria-pressed',String(on));
  });
  byId('toggleGridBtn').addEventListener('click',function(){
    var on=byId('cardsContainer').classList.toggle('show-grid');this.setAttribute('aria-pressed',String(on));
  });
  /* photo */
  byId('photoInput').addEventListener('change',function(e){handlePhotoFile(e.target.files[0]);e.target.value=''});
  byId('photoClearBtn').addEventListener('click',function(){setPhoto(null);toast(t('toast_nophoto'))});
  byId('photoGrayBtn').addEventListener('click',function(){
    S.gray=!S.gray;this.setAttribute('aria-pressed',String(S.gray));syncAll();
  });
  [['f_photo_zoom','photoZoom',100],['f_photo_x','photoX',1],['f_photo_y','photoY',1]].forEach(function(r){
    byId(r[0]).addEventListener('input',function(e){S[r[1]]=(+e.target.value)/(r[2]||1);syncSliderOuts();queueSync()});
  });
  byId('f_photo_frame').addEventListener('change',function(e){S.frame=e.target.value;queueSync()});
  /* socials + lines */
  byId('socialEditors').addEventListener('input',function(e){
    var i=e.target.getAttribute('data-soc-v');
    if(i!==null&&i!==undefined&&e.target.matches('[data-soc-v]')){S.data.socials[+i].v=e.target.value;queueSync()}
  });
  byId('socialEditors').addEventListener('change',function(e){
    var p=e.target.getAttribute('data-soc-p');
    if(p!==null&&e.target.matches('[data-soc-p]')){S.data.socials[+p].p=e.target.value;queueSync()}
    var on=e.target.getAttribute('data-soc-on');
    if(on!==null&&e.target.matches('[data-soc-on]')){
      var i=+on;
      S.data.socials[i].v=e.target.checked?(S.data.socials[i].v||'@'+(S.data.company||'empresa').toLowerCase().replace(/[^a-z0-9]/g,'')):'';
      buildSocialEditors();writeFields();queueSync();
    }
  });
  byId('lineToggles').addEventListener('change',function(e){
    var k=e.target.getAttribute('data-line');if(!k)return;
    if(k==='socials')S.showSoc=e.target.checked;else S.lines[k]=e.target.checked;
    queueSync();
  });
  /* theme + colors */
  byId('themeGrid').addEventListener('click',function(e){
    var b=e.target.closest('[data-theme]');if(!b)return;setTheme(b.dataset.theme);
    toast(themeById(b.dataset.theme).n);
  });
  byId('hexGrid').addEventListener('input',function(e){
    var k=e.target.getAttribute('data-hex');
    if(e.target.matches('[data-hex-pick]')){S.colors[e.target.getAttribute('data-hex-pick')]=e.target.value.toUpperCase();queueSync();return}
    if(k!==null&&k!==undefined&&e.target.matches('[data-hex]')){
      var raw=e.target.value,n=normHex(raw);
      e.target.setAttribute('aria-invalid',String(!n&&raw.length>0));
      if(n){S.colors[k]=n;queueSync()}
    }
  });
  byId('hexGrid').addEventListener('change',function(e){
    if(e.target.matches('[data-hex]')){var n=normHex(e.target.value);if(n){e.target.value=n;S.colors[e.target.getAttribute('data-hex')]=n;queueSync()}else if(!e.target.value.trim()){S.colors[e.target.getAttribute('data-hex')]='';queueSync()}}
  });
  byId('hexGrid').addEventListener('click',function(e){
    var k=e.target.getAttribute('data-hex-reset');if(!k)return;S.colors[k]='';syncAll();
  });
  byId('resetColorsBtn').addEventListener('click',function(){Object.keys(S.colors).forEach(function(k){S.colors[k]=''});syncAll()});
  byId('autoInkBtn').addEventListener('click',function(){
    var c=effColors();
    S.colors.canvas=shade(c.primary,-0.86);S.colors.paper=shade(c.primary,0.9);
    syncAll();toast(S.lang==='pt'?'Fundo e papel derivados da cor primária':'Background & paper derived from primary');
  });
  byId('randomBtn').addEventListener('click',function(){
    var h=Math.floor(Math.random()*360);
    var c1=hsl(h,70,60),c2=hsl((h+32)%360,80,72),c3=hsl((h+178)%360,60,58);
    S.colors.primary=c1;S.colors.secondary=c2;S.colors.canvas=hsl(h,42,7);S.colors.paper=hsl(h,30,97);S.colors.accent=c3;
    syncAll();
  });
  /* fonts */
  byId('f_font_display').addEventListener('change',function(e){S.fonts.display=e.target.value;queueSync()});
  byId('f_font_body').addEventListener('change',function(e){S.fonts.body=e.target.value;queueSync()});
  byId('f_name_case').addEventListener('change',function(e){S.nameCase=e.target.value;queueSync()});
  byId('f_weight').addEventListener('change',function(e){S.weight=+e.target.value;queueSync()});
  byId('f_tracking').addEventListener('input',function(e){S.track=(+e.target.value)/1000;syncSliderOuts();queueSync()});
  byId('f_label_track').addEventListener('input',function(e){S.ltrack=(+e.target.value)/1000;syncSliderOuts();queueSync()});
  byId('f_radius').addEventListener('input',function(e){S.radius=(+e.target.value)/10;syncSliderOuts();queueSync()});
  byId('f_band').addEventListener('input',function(e){S.band=+e.target.value;syncSliderOuts();queueSync()});
  qa('[data-set-fill]').forEach(function(b){b.addEventListener('click',function(){
    S.fill=b.dataset.setFill;qa('[data-set-fill]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});queueSync();
  })});
  qa('[data-set-tex]').forEach(function(b){b.addEventListener('click',function(){
    S.texture=b.dataset.setTex;qa('[data-set-tex]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});queueSync();
  })});
  /* 3D */
  byId('spin3dBtn').addEventListener('click',function(){setSpin()});
  byId('modalSpinBtn').addEventListener('click',function(){setSpin()});
  byId('turn3dBtn').addEventListener('click',function(){turn3D()});
  byId('front3dBtn').addEventListener('click',function(){turn3D('front')});
  byId('back3dBtn').addEventListener('click',function(){turn3D('back')});
  byId('reset3dBtn').addEventListener('click',function(){S.v3={rx:-14,ry:26,zoom:1.55,persp:1500,glare:.35,thick:.4,shadow:.85,tx:0,ty:0,spin:false,flat:false};setSpin(false);apply3D()});
  byId('flat3dBtn').addEventListener('click',function(){S.v3.flat=!S.v3.flat;S.v3.spin=false;byId('flat3dBtn').setAttribute('aria-pressed',String(S.v3.flat));apply3D()});
  bind3D('stage3d','card3d');bind3D('stage3dModal','card3dModal');
  /* turn */
  byId('turnStage').addEventListener('click',function(e){if(e.target.closest('button'))return;turn()});
  byId('turnStage').addEventListener('keydown',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();turn()}});
  byId('turnNowBtn').addEventListener('click',function(){turn()});
  byId('turnAutoBtn').addEventListener('click',function(){setAutoTurn()});
  byId('turn90Btn').addEventListener('click',function(){
    S.turn=S.turn===90?0:90;
    byId('turnInner').style.setProperty('--turn',S.turn+'deg');byId('turnAngle').textContent=S.turn+'°';
  });
  byId('turnFrontBtn').addEventListener('click',function(){turn('front')});
  byId('turnBackBtn').addEventListener('click',function(){turn('back')});
  /* modal */
  var modalReturnFocus=null;
  var openModal=function(){
    if(byId('popoutModal').classList.contains('active'))return;
    modalReturnFocus=document.activeElement;
    byId('popoutModal').inert=false;byId('popoutModal').classList.add('active');byId('popoutModal').setAttribute('aria-hidden','false');
    document.querySelector('.app-header').inert=true;byId('workspace').inert=true;document.body.style.overflow='hidden';
    stageFits();
    var modalStage=byId('stage3dModal');
    var fitW=(modalStage.clientWidth*.72)/mm2px(FORMATS[S.fmt].w),fitH=(modalStage.clientHeight*.68)/mm2px(FORMATS[S.fmt].h);
    S.v3.zoom=Math.max(.5,Math.min(2.7,Math.min(fitW,fitH)/(S.base3dModal||1)));S.v3.tx=0;S.v3.ty=0;
    apply3D();requestAnimationFrame(function(){byId('closePopoutBtn').focus({preventScroll:true})});
  };
  var closeModal=function(){
    byId('popoutModal').inert=true;byId('popoutModal').classList.remove('active');byId('popoutModal').setAttribute('aria-hidden','true');
    document.querySelector('.app-header').inert=false;byId('workspace').inert=false;document.body.style.overflow='';
    setSpin(false);if(modalReturnFocus)modalReturnFocus.focus();
  };
  byId('popoutModal').addEventListener('keydown',function(e){
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeModal()}
    if(e.key==='Tab'){
      var focusables=qa('button',this).filter(function(el){return !el.disabled});
      var first=focusables[0],last=focusables[focusables.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  });
  byId('openPopoutBtn').addEventListener('click',openModal);
  byId('expand3dBtn').addEventListener('click',openModal);
  byId('closePopoutBtn').addEventListener('click',closeModal);
  byId('popoutModal').addEventListener('click',function(e){if(e.target===this)closeModal()});
  byId('modalTurnBtn').addEventListener('click',function(){turn3D()});
  byId('modalPdfBtn').addEventListener('click',function(){closeModal();doPrint()});
  /* print tab */
  qa('.preset').forEach(function(b){b.addEventListener('click',function(){
    S.print.preset=b.dataset.preset;
    if(S.print.preset==='pro'||S.print.preset==='marks')S.print.mirror=false;
    byId('f_mirror').checked=S.print.mirror;
    qa('.preset').forEach(function(x){x.classList.toggle('active',x===b)});
    updatePageSize();updateSpecs();previewSheet();
  })});
  byId('f_bleed').addEventListener('change',function(e){S.print.bleed=+e.target.value;updatePageSize();updateSpecs();previewSheet()});
  byId('f_faces').addEventListener('change',function(e){S.print.faces=e.target.value;S.print.duplex=S.print.faces==='both';byId('f_duplex').checked=S.print.duplex;updatePageSize();updateSpecs();previewSheet()});
  byId('f_mirror').addEventListener('change',function(e){S.print.mirror=e.target.checked;updateSpecs();previewSheet()});
  byId('f_duplex').addEventListener('change',function(e){S.print.duplex=e.target.checked;S.print.faces=S.print.duplex?'both':'front';byId('f_faces').value=S.print.faces;updatePageSize();updateSpecs();previewSheet()});
  byId('f_gray').addEventListener('change',function(e){S.print.gray=e.target.checked;previewSheet()});
  byId('f_marks').addEventListener('change',function(e){S.print.marks=e.target.checked;updateSpecs();previewSheet()});
  byId('f_sheet_qty').addEventListener('change',function(e){S.print.qty=+e.target.value;updateSpecs();previewSheet()});
  byId('makePdfBtn').addEventListener('click',doPrint);
  byId('mainPdfBtn').addEventListener('click',doPrint);
  byId('topPrintBtn').addEventListener('click',function(){byId('exportDialog').close();activateTab('tab-print');document.querySelector('.form-panel').scrollIntoView({behavior:'smooth',block:'start'})});
  byId('previewPdfBtn').addEventListener('click',previewSheet);
  /* actions */
  byId('vcardBtn').addEventListener('click',downloadVCard);
  byId('saveBtn').addEventListener('click',exportJSON);
  byId('loadInput').addEventListener('change',function(e){importJSON(e.target.files[0]);e.target.value=''});
  byId('resetAllBtn').addEventListener('click',function(){
    if(!window.confirm(t('reset_confirm')))return;
    captureHistory();var lang=S.lang;S=normalizeState(DEFAULT_STATE,DEFAULT_STATE,STATE_CHOICES);S.lang=lang;
    if(lang==='pt'){S.data.role='Designer de Marca';S.data.tag='Design com intenção.';S.data.city='Lisboa, Portugal'}
    else {S.data.role='Brand Designer';S.data.tag='Design with intention.';S.data.city='Lisbon, Portugal'}
    restoreControls();syncAll();captureHistory();toast(t('toast_reset'));
  });
  /* lang */
  qa('[data-lang-btn]').forEach(function(b){b.addEventListener('click',function(){setLang(b.dataset.langBtn)})});
  /* keyboard */
  document.addEventListener('keydown',function(e){
    if(e.key==='Shift')shiftDown=true;
    var typing=e.target.matches('input,textarea,select')||e.target.isContentEditable;
    var k=(e.key||'').toLowerCase();
    if((e.ctrlKey||e.metaKey)&&k==='s'){e.preventDefault();exportJSON();return}
    if((e.ctrlKey||e.metaKey)&&!typing&&(k==='z'||k==='y')){
      e.preventDefault();moveHistory(e.shiftKey||k==='y'?1:-1);return;
    }
    if(typing||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]'))return;
    if(k==='f'){e.preventDefault();if(byId('popoutModal').classList.contains('active'))turn3D();else{if(S.mode!=='flip')setMode('flip');turn()}}
    if(k==='p'){e.preventDefault();doPrint()}
    if(k==='3'){e.preventDefault();openModal()}
    if(byId('popoutModal').classList.contains('active')){
      if(k==='arrowleft'){e.preventDefault();S.v3.ry-=6;apply3D()}
      if(k==='arrowright'){e.preventDefault();S.v3.ry+=6;apply3D()}
      if(k==='arrowup'){e.preventDefault();S.v3.rx=Math.max(-85,S.v3.rx-5);apply3D()}
      if(k==='arrowdown'){e.preventDefault();S.v3.rx=Math.min(85,S.v3.rx+5);apply3D()}
    }
  });
  document.addEventListener('keyup',function(e){if(e.key==='Shift')shiftDown=false});
  window.addEventListener('blur',function(){shiftDown=false});
  window.addEventListener('resize',function(){scheduleFit();apply3D();if(byId('sheetPreview').firstChild)previewSheet()});
  window.addEventListener('beforeprint',function(){buildPrintDoc(byId('print-root'));updatePageSize()});
  if(document.fonts){
    document.fonts.ready.then(function(){renderFaces();apply3D()});
    document.fonts.addEventListener('loadingdone',function(){renderFaces();apply3D()});
  }

  /* ---------- boot ---------- */
  var restored=loadLocal();
  buildFontSelects();
  setLang(S.lang);applyLoadedControls();setPhoto(S.photo);apply3D();setMode(S.mode);turn(S.side);
  syncSliderOuts();updatePageSize();initWorkspace();
  appReady=true;syncAll();captureHistory();
  if(restored)toast(t('toast_loaded'));
}

function applyLoadedControls(){
  Object.keys(FIELD_IDS).forEach(function(k){var e=byId(FIELD_IDS[k]);if(e)e.value=S.data[k]||''});
  byId('f_photo_zoom').value=Math.round(S.photoZoom*100);
  byId('f_photo_x').value=S.photoX;byId('f_photo_y').value=S.photoY;
  byId('f_radius').value=Math.round(S.radius*10);byId('f_band').value=S.band;
  byId('f_tracking').value=Math.round(S.track*1000);byId('f_label_track').value=Math.round(S.ltrack*1000);
  byId('f_weight').value=S.weight;byId('f_name_case').value=S.nameCase;
  byId('f_photo_frame').value=S.frame;byId('f_qr_payload').value=S.qr;
  byId('f_bleed').value=S.print.bleed;byId('f_faces').value=S.print.faces;byId('f_sheet_qty').value=S.print.qty;
  byId('f_mirror').checked=S.print.mirror;byId('f_duplex').checked=S.print.duplex;byId('f_gray').checked=S.print.gray;byId('f_marks').checked=S.print.marks;
  byId('zoomSlider').value=S.zoomUser;
  qa('[data-set-fill]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.setFill===S.fill))});
  qa('[data-set-tex]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.setTex===S.texture))});
  qa('.theme-chip').forEach(function(b){b.classList.toggle('active',b.dataset.theme===S.theme)});
  buildFontSelects();buildSocialEditors();buildLineToggles();writeFields();
  byId('photoGrayBtn').setAttribute('aria-pressed',String(S.gray));
  qa('.preset').forEach(function(b){b.classList.toggle('active',b.dataset.preset===S.print.preset)});
  syncSliderOuts();
}
function hsl(h,s,l){
  s/=100;l/=100;
  var k=function(n){return (n+h/30)%12},a=s*Math.min(l,1-l);
  var f=function(n){return l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)))};
  return toHex([f(5)*255,f(3)*255,f(1)*255]);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
