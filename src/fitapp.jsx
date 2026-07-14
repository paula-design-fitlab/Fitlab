import { useState, useRef, useEffect } from "react";
/* ─── SUPABASE CONFIG ────────────────────────────────────────────────────────── */
const SB_URL = "https://ahevmeblkcetnxqedjal.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZXZtZWJsa2NldG54cWVkamFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjI2MTEsImV4cCI6MjA5NjI5ODYxMX0.5283LtCqzQ3jKAhDrwUnoZJbPycmWNAt_Js8VHaXqGk";

const sbFetch = async (path, options = {}) => {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${SB_URL}/rest/v1/${path}${sep}apikey=${SB_ANON}`;
  const headers = {
    "apikey": SB_ANON,
    "Authorization": `Bearer ${SB_ANON}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };
  if (options.headers) Object.assign(headers, options.headers);
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.text();
    console.error("Supabase error:", err);
    return null;
  };
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const sb = {
  get: (table, query="") => sbFetch(`${table}?${query}`),
  post: (table, body) => sbFetch(table, {method:"POST", body:JSON.stringify(body)}),
  patch: (table, query, body) => sbFetch(`${table}?${query}`, {method:"PATCH", body:JSON.stringify(body), headers:{"Prefer":"return=representation"}}),
  delete: (table, query) => sbFetch(`${table}?${query}`, {method:"DELETE"}),
};

/* ─── DATA TRANSFORMERS ──────────────────────────────────────────────────────── */
const profileFromDB = p => ({
  id: p.id, name: p.nombre, emoji: p.emoji, accentIdx: p.accent_idx||0,
  objetivo: p.objetivo||"Definir y tonificar", altura: p.altura, pesoInicio: p.peso_inicio
});

const exerciseFromDB = (exs, vars) => exs.map(e => ({
  id: e.id, name: e.nombre, primary: e.grupo_principal, secondary: e.grupo_secundario,
  emoji: e.emoji||"💪", photo: e.foto_url||"",
  variations: vars.filter(v=>v.ejercicio_id===e.id).map(v=>({
    id: v.id, name: v.nombre, material: v.material||"", photo: v.foto_url||"",
    video: v.video_url||"", notes: v.notas||""
  }))
}));

const routineFromDB = (ruts, rexs) => ruts.map(r => ({
  id: r.id, ownerId: r.owner_id, sharedWith: r.shared_with||[],
  name: r.nombre, emoji: r.emoji||"💪", colorHex: r.color_hex||"#c8f060",
  archived: r.archivada||false,
  exercises: rexs.filter(re=>re.rutina_id===r.id)
    .sort((a,b)=>a.orden-b.orden)
    .map(re=>({varId:re.variacion_id, sets:re.series, reps:re.reps, rir:re.rir}))
}));

const sessionFromDB = s => ({
  id: s.id, userId: s.usuario_id, routineId: s.es_libre?"free":s.rutina_id,
  date: s.fecha, hora: s.hora||null, status: s.estado||"pending", objetivo: s.objetivo||"",
  sharedWith: s.shared_with||[s.usuario_id],
  groupId: s.group_id||null, groupParticipants: s.group_participants||null
});

const logFromDB = l => ({
  id: l.id, userId: l.usuario_id, sessionId: l.sesion_id,
  varId: l.variacion_id, set: l.serie, kg: l.peso_kg,
  reps: l.repeticiones, feel: l.sensacion||"Bien"
});



/* ─── THEME ─────────────────────────────────── */
const ACCENT_OPTIONS = [
  { name:"Lima",    val:"#c8f060" },
  { name:"Rosa",    val:"#ff6eb4" },
  { name:"Rojo",    val:"#ff3e3e" },
  { name:"Azul",    val:"#40d9f0" },
  { name:"Morado",  val:"#b06cff" },
  { name:"Naranja", val:"#ffaa30" },
];
function makeTheme(accent) {
  return { bg:"#0a0a0b",surface:"#111114",card:"#18181c",border:"#25252d",
    accent,accent2:"#ff5f40",blue:"#60b4ff",purple:"#b06cff",
    text:"#f2f2f4",sub:"#9090a0",muted:"#50505e" };
}
const FONTS=`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');`;

/* ─── MOCK DATA ──────────────────────────────── */
const PROFILES_INIT=[
  {id:1,name:"Paula",emoji:"⭐",accentIdx:4,objetivo:"Definir y tonificar",altura:160,pesoInicio:74},
  {id:2,name:"Gloria",emoji:"🌸",accentIdx:1,objetivo:"Definir y tonificar",altura:155,pesoInicio:63},
  {id:3,name:"Javier",emoji:"⚡",accentIdx:2,objetivo:"Definir y tonificar",altura:162,pesoInicio:57},
  {id:4,name:"Lucía",emoji:"🌙",accentIdx:3,objetivo:"Definir y tonificar",altura:170,pesoInicio:74},
];
const OBJETIVOS=["Definir y tonificar","Hipertrofia","Fuerza","Resistencia","Pérdida de grasa","Salud","Mantenimiento"];
const MUSCLE_EMOJI={"Glúteo":"🍑","Pierna":"🦵","Pecho":"🎯","Espalda":"🏋️","Hombro":"⬆️","Brazo":"💪","Abdomen":"🔥","Cardio":"🏃","Fullbody":"🔄"};
const OBJETIVO_ICONS={"Definir y tonificar":"✨","Hipertrofia":"💪","Fuerza":"🏋️","Resistencia":"🏃","Pérdida de grasa":"🔥","Salud":"💚","Mantenimiento":"⚖️"};
const MUSCLE_GROUPS=["Glúteo","Pierna","Pecho","Espalda","Hombro","Brazo","Abdomen","Cardio","Fullbody"];
const EXERCISES_INIT=[
  {id:"E001",name:"Prensa de piernas",primary:"Pierna",secondary:"Cuádriceps",emoji:"🦵",photo:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80",variations:[
    {id:"V001",name:"Press pierna inclinada",material:"Máquina",photo:"",notes:""},
    {id:"V002",name:"Press pierna recta",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E002",name:"Extensión de cuádriceps",primary:"Pierna",secondary:"Cuádriceps",emoji:"🦵",photo:"",variations:[
    {id:"V003",name:"Extensión de cuádriceps en máquina",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E003",name:"Curl femoral",primary:"Pierna",secondary:"Femoral",emoji:"🦵",photo:"",variations:[
    {id:"V004",name:"Curl femoral en máquina",material:"Máquina",photo:"",notes:""},
    {id:"V005",name:"Curl femoral en multipower",material:"Multipower",photo:"",notes:""}
  ]},
  {id:"E004",name:"Abductora",primary:"Glúteo",secondary:"Abductores",emoji:"🍑",photo:"",variations:[
    {id:"V006",name:"Abductor en máquina",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E005",name:"Aductora",primary:"Pierna",secondary:"Aductores",emoji:"🦵",photo:"",variations:[
    {id:"V007",name:"Aductor en máquina",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E006",name:"Hip Thrust",primary:"Glúteo",secondary:"Glúteo",emoji:"🍑",photo:"https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80",variations:[
    {id:"V008",name:"Hip Thrust en máquina",material:"Máquina",photo:"",notes:""},
    {id:"V009",name:"Hip Thrust en multipower",material:"Multipower",photo:"",notes:""},
    {id:"V010",name:"Hip Thrust en barra",material:"Barra libre",photo:"",notes:""},
    {id:"V011",name:"Hip Thrust con mancuerna",material:"Mancuerna",photo:"",notes:""}
  ]},
  {id:"E007",name:"Jalón al pecho",primary:"Espalda",secondary:"Bíceps",emoji:"🏋️",photo:"https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&q=80",variations:[
    {id:"V012",name:"Jalón en máquina",material:"Máquina",photo:"",notes:""},
    {id:"V013",name:"Jalón en polea",material:"Polea",photo:"",notes:""}
  ]},
  {id:"E008",name:"Remo",primary:"Espalda",secondary:"Bíceps",emoji:"🏋️",photo:"",variations:[
    {id:"V014",name:"Remo en máquina",material:"Máquina",photo:"",notes:""},
    {id:"V015",name:"Remo con barra",material:"Banco inclinado",photo:"",notes:""},
    {id:"V016",name:"Remo con mancuernas",material:"Banco plano",photo:"",notes:""}
  ]},
  {id:"E009",name:"Press pecho",primary:"Pecho",secondary:"Tríceps",emoji:"💪",photo:"https://images.unsplash.com/photo-1581009137042-c552e485697a?w=600&q=80",variations:[
    {id:"V017",name:"Press de pecho en máquina",material:"Máquina",photo:"",notes:""},
    {id:"V018",name:"Press de pecho en multipower",material:"Multipower",photo:"",notes:""},
    {id:"V019",name:"Press de pecho en barra",material:"Barra libre",photo:"",notes:""},
    {id:"V020",name:"Press de pecho inclinado con barra",material:"Barra libre",photo:"",notes:""},
    {id:"V021",name:"Press de pecho con mancuernas",material:"Mancuerna",photo:"",notes:""}
  ]},
  {id:"E010",name:"Aperturas de pecho",primary:"Pecho",secondary:"Hombro",emoji:"💪",photo:"",variations:[
    {id:"V022",name:"Aperturas pecho en máquina",material:"Máquina",photo:"",notes:""},
    {id:"V023",name:"Aperturas pecho con mancuernas",material:"Mancuerna",photo:"",notes:""},
    {id:"V024",name:"Aperturas pecho con mancuernas en banco inclinado",material:"Mancuerna",photo:"",notes:""},
    {id:"V025",name:"Aperturas pecho en polea",material:"Polea",photo:"",notes:""}
  ]},
  {id:"E011",name:"Press hombro",primary:"Hombro",secondary:"Tríceps",emoji:"🏋️",photo:"",variations:[
    {id:"V026",name:"Press hombro en máquina",material:"Máquina",photo:"",notes:""},
    {id:"V027",name:"Press hombro multipower",material:"Multipower",photo:"",notes:""},
    {id:"V028",name:"Press hombro con mancuernas",material:"Mancuerna",photo:"",notes:""},
    {id:"V029",name:"Press hombros con barra",material:"Barra libre",photo:"",notes:""}
  ]},
  {id:"E012",name:"Deltoide posterior / Pájaros",primary:"Hombro",secondary:"Espalda",emoji:"🏋️",photo:"",variations:[
    {id:"V030",name:"Pájaros en máquina",material:"Máquina",photo:"",notes:""},
    {id:"V031",name:"Pájaros con mancuernas en banco",material:"Mancuerna",photo:"",notes:""},
    {id:"V032",name:"Pájaros con mancuernas en banco inclinado",material:"Mancuerna",photo:"",notes:""}
  ]},
  {id:"E013",name:"Dominadas asistidas",primary:"Espalda",secondary:"Bíceps",emoji:"🏋️",photo:"",variations:[
    {id:"V033",name:"Dominadas asistidas en máquina",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E014",name:"Fondos asistidos",primary:"Brazo",secondary:"Tríceps",emoji:"💪",photo:"",variations:[
    {id:"V034",name:"Fondos asistidos en máquina",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E015",name:"Zancadas",primary:"Pierna",secondary:"Glúteo",emoji:"🦵",photo:"",variations:[
    {id:"V035",name:"Zancadas con mancuernas",material:"Mancuerna",photo:"",notes:""},
    {id:"V036",name:"Zancadas con kettlebells",material:"Kettlebells",photo:"",notes:""}
  ]},
  {id:"E016",name:"Peso muerto rumano",primary:"Pierna",secondary:"Femoral",emoji:"🦵",photo:"",variations:[
    {id:"V037",name:"Peso rumano en multipower",material:"Multipower",photo:"",notes:""},
    {id:"V038",name:"Peso rumano con barra",material:"Barra libre",photo:"",notes:""},
    {id:"V039",name:"Peso rumano con mancuernas",material:"Mancuerna",photo:"",notes:""}
  ]},
  {id:"E017",name:"Gemelo",primary:"Pierna",secondary:"Gemelo",emoji:"🦵",photo:"",variations:[
    {id:"V040",name:"Gemelos en máquina",material:"Máquina",photo:"",notes:""},
    {id:"V041",name:"Gemelos en multipower",material:"Multipower",photo:"",notes:""},
    {id:"V042",name:"Gemelos con discos",material:"Discos",photo:"",notes:""}
  ]},
  {id:"E018",name:"Sentadilla",primary:"Glúteo",secondary:"Cuádriceps",emoji:"🍑",photo:"https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80",variations:[
    {id:"V043",name:"Sentadilla en multipower",material:"Multipower",photo:"",notes:""},
    {id:"V044",name:"Sentadilla con kettlebells",material:"Kettlebells",photo:"",notes:""},
    {id:"V045",name:"Sentadilla con discos",material:"Discos",photo:"",notes:""},
    {id:"V046",name:"Sentadillas con mancuernas",material:"Mancuerna",photo:"",notes:""}
  ]},
  {id:"E019",name:"Elevaciones laterales",primary:"Hombro",secondary:"Core",emoji:"🏋️",photo:"",variations:[
    {id:"V047",name:"Elevaciones laterales mancuerna",material:"Mancuerna",photo:"",notes:""},
    {id:"V048",name:"Elevaciones laterales polea",material:"Polea",photo:"",notes:""}
  ]},
  {id:"E020",name:"Curl bíceps",primary:"Brazo",secondary:"Bíceps",emoji:"💪",photo:"",variations:[
    {id:"V049",name:"Curl bíceps en polea",material:"Polea",photo:"",notes:""},
    {id:"V050",name:"Curl bíceps con barra",material:"Barra libre",photo:"",notes:""},
    {id:"V051",name:"Curl bíceps con mancuernas",material:"Mancuerna",photo:"",notes:""}
  ]},
  {id:"E021",name:"Extensión tríceps",primary:"Brazo",secondary:"Tríceps",emoji:"💪",photo:"",variations:[
    {id:"V052",name:"Extensión tríceps en polea",material:"Polea",photo:"",notes:""},
    {id:"V053",name:"Extensión tríceps con mancuerna",material:"Mancuerna",photo:"",notes:""}
  ]},
  {id:"E022",name:"Face pull",primary:"Hombro",secondary:"Espalda",emoji:"🏋️",photo:"",variations:[
    {id:"V054",name:"Face pull en polea",material:"Polea",photo:"",notes:""}
  ]},
  {id:"E023",name:"Patada de glúteo",primary:"Glúteo",secondary:"Core",emoji:"🍑",photo:"",variations:[
    {id:"V055",name:"Patada de glúteo en polea",material:"Polea",photo:"",notes:""}
  ]},
  {id:"E024",name:"Crunch",primary:"Abdomen",secondary:"Core",emoji:"🧘",photo:"",variations:[
    {id:"V056",name:"Crunch",material:"Esterilla",photo:"",notes:""}
  ]},
  {id:"E025",name:"Pall of press",primary:"Abdomen",secondary:"Core",emoji:"🧘",photo:"",variations:[
    {id:"V057",name:"Pall of press en polea",material:"Polea",photo:"",notes:""}
  ]},
  {id:"E026",name:"Hiperextensiones",primary:"Abdomen",secondary:"Glúteo",emoji:"🧘",photo:"",variations:[
    {id:"V058",name:"Hiperextensiones en máquina",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E027",name:"Step-up",primary:"Pierna",secondary:"Glúteo",emoji:"🦵",photo:"",variations:[
    {id:"V059",name:"Step-up en banco",material:"Banco plano",photo:"",notes:""},
    {id:"V060",name:"Step-up con cajón",material:"Cajón pliométrico",photo:"",notes:""}
  ]},
  {id:"E028",name:"Pull over",primary:"Pecho",secondary:"Bíceps",emoji:"💪",photo:"",variations:[
    {id:"V061",name:"Pull over en polea",material:"Polea",photo:"",notes:""},
    {id:"V062",name:"Pull over con mancuerna",material:"Mancuerna",photo:"",notes:""}
  ]},
  {id:"E029",name:"Cinta",primary:"Cardio",secondary:"Fullbody",emoji:"🏃",photo:"https://images.unsplash.com/photo-1538805060514-97d9cc172144?w=600&q=80",variations:[
    {id:"V063",name:"Cinta",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E030",name:"Bicicleta",primary:"Cardio",secondary:"Fullbody",emoji:"🏃",photo:"",variations:[
    {id:"V064",name:"Bicicleta",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E031",name:"Elíptica",primary:"Cardio",secondary:"Fullbody",emoji:"🏃",photo:"",variations:[
    {id:"V065",name:"Elíptica",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E032",name:"Remo cardio",primary:"Cardio",secondary:"Fullbody",emoji:"🏃",photo:"",variations:[
    {id:"V066",name:"Remo cardio",material:"Máquina",photo:"",notes:""}
  ]},
  {id:"E033",name:"Escaladora",primary:"Cardio",secondary:"Fullbody",emoji:"🏃",photo:"",variations:[
    {id:"V067",name:"Escaladora",material:"Máquina",photo:"",notes:""}
  ]}
];
const ROUTINES_INIT=[
  {id:1,ownerId:1,sharedWith:[1,3],name:"Pierna",emoji:"🦵",colorHex:"#c8f060",exercises:[
    {varId:"V001",sets:4,reps:"10-12",rir:2},{varId:"V035",sets:4,reps:"8-12",rir:2},
    {varId:"V058",sets:3,reps:"12-15",rir:2},{varId:"V059",sets:3,reps:"12-15",rir:2},
  ]},
  {id:2,ownerId:2,sharedWith:[1,2,3,4],name:"Espalda y hombro",emoji:"🏋️",colorHex:"#ff5f40",exercises:[
    {varId:"V033",sets:4,reps:"10-12",rir:2},{varId:"V026",sets:3,reps:"10-12",rir:2},
    {varId:"V054",sets:3,reps:"10-12",rir:2},{varId:"V049",sets:3,reps:"10-12",rir:2},
  ]},
  {id:3,ownerId:1,sharedWith:[1,2],name:"Glúteo y Core",emoji:"🍑",colorHex:"#b06cff",exercises:[
    {varId:"V040",sets:4,reps:"10-12",rir:2},{varId:"V058",sets:3,reps:"12-15",rir:2},
    {varId:"V006",sets:3,reps:"10-12",rir:1},{varId:"V037",sets:3,reps:"12-15",rir:2},
  ]},
  {id:4,ownerId:4,sharedWith:[4],name:"Pecho, tríceps y bíceps",emoji:"💪",colorHex:"#40d9f0",exercises:[
    {varId:"V033",sets:3,reps:"12",rir:2},{varId:"V054",sets:3,reps:"12",rir:2},
    {varId:"V047",sets:3,reps:"12",rir:2},{varId:"V052",sets:3,reps:"12",rir:2},
    {varId:"V017",sets:3,reps:"10",rir:2},
  ]},
];
const todayStr=()=>new Date().toISOString().split("T")[0];
const SESSIONS_INIT=[
  {id:1,userId:1,date:todayStr(),routineId:1,status:"pending",objetivo:"Hipertrofia",sharedWith:[1]},
  {id:2,userId:1,date:"2026-06-03",routineId:2,status:"done",objetivo:"Fuerza",sharedWith:[1]},
  {id:3,userId:1,date:"2026-06-01",routineId:3,status:"done",objetivo:"Definir y tonificar",sharedWith:[1]},
  {id:4,userId:1,date:"2026-06-08",routineId:2,status:"pending",objetivo:"Hipertrofia",sharedWith:[1]},
  {id:5,userId:1,date:"2026-05-29",routineId:1,status:"done",objetivo:"Hipertrofia",sharedWith:[1]},
  {id:6,userId:1,date:"2026-05-27",routineId:3,status:"done",objetivo:"Resistencia",sharedWith:[1]},
];
const LOGS_INIT=[
  {id:1,userId:1,sessionId:2,varId:"V017",set:1,kg:40,reps:8,feel:"Bien"},
  {id:2,userId:1,sessionId:2,varId:"V017",set:2,kg:42.5,reps:7,feel:"Bien"},
  {id:3,userId:1,sessionId:3,varId:"V012",set:1,kg:35,reps:10,feel:"Fácil"},
  {id:4,userId:1,sessionId:3,varId:"V012",set:2,kg:37.5,reps:9,feel:"Bien"},
  {id:5,userId:1,sessionId:5,varId:"V008",set:1,kg:60,reps:10,feel:"Bien"},
  {id:6,userId:1,sessionId:5,varId:"V008",set:2,kg:65,reps:9,feel:"Difícil"},
];
const FEELS=["Fácil","Bien","Difícil","Al límite"];

/* ─── HELPERS ────────────────────────────────── */
const fmtShort=d=>new Date(d+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"numeric",month:"short"});
const fmtDay=d=>new Date(d+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
function getVar(varId,exs){if(!varId||!exs)return null;const sid=String(varId);for(const e of exs)for(const v of e.variations)if(String(v.id)===sid)return{...v,exercise:e};return null;}
function getRoutine(id,rts){return rts.find(r=>r.id===id);}
function getWeekDates(offset=0){
  const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)+offset*7);
  return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return x.toISOString().split("T")[0];});
}
function getMonthDates(year,month){
  const first=new Date(year,month,1),last=new Date(year,month+1,0);
  const pad=(first.getDay()+6)%7,days=[];
  for(let i=0;i<pad;i++)days.push(null);
  for(let i=1;i<=last.getDate();i++)days.push(`${year}-${String(month+1).padStart(2,"0")}-${String(i).padStart(2,"0")}`);
  return days;
}
const WEEKDAYS=["L","M","X","J","V","S","D"];
const MONTHS_ES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

/* ─── GLOBAL STYLES ──────────────────────────── */
const GS=T=>`
${FONTS}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{background:${T.bg};color:${T.text};font-family:'DM Sans',sans-serif;min-height:100dvh;overscroll-behavior:none;}
input,select,textarea,button{font-family:'DM Sans',sans-serif;}
::-webkit-scrollbar{display:none;}
.page{min-height:100dvh;animation:fadeUp .22s ease both;}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.stagger>*{animation:fadeUp .3s ease both;}
.stagger>*:nth-child(1){animation-delay:.04s}.stagger>*:nth-child(2){animation-delay:.08s}
.stagger>*:nth-child(3){animation-delay:.12s}.stagger>*:nth-child(4){animation-delay:.16s}
.stagger>*:nth-child(5){animation-delay:.20s}.stagger>*:nth-child(6){animation-delay:.24s}
.tap{transition:transform .12s,opacity .12s;cursor:pointer;}.tap:active{transform:scale(.96);opacity:.8;}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:.4;}
`;

/* ─── UI PRIMITIVES ──────────────────────────── */
const Card=({children,style,onClick,accent,T})=>(
  <div onClick={onClick} className={onClick?"tap":""} style={{background:T.card,border:`1px solid ${accent?accent+"55":T.border}`,borderRadius:18,padding:16,...style}}>{children}</div>
);
const Chip=({children,color,active,onClick,T})=>(
  <button onClick={onClick} className="tap" style={{background:active?color+"22":"transparent",border:`1px solid ${active?color:T.border}`,color:active?color:T.sub,borderRadius:999,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",letterSpacing:.4,whiteSpace:"nowrap"}}>{children}</button>
);
const Btn=({children,onClick,variant="primary",style,full,T})=>{
  const v={primary:{background:T.accent,color:"#000",fontWeight:700,border:"none"},ghost:{background:"transparent",color:T.text,border:`1px solid ${T.border}`},danger:{background:"#ff444418",color:"#ff5555",border:"1px solid #ff444430"}};
  return <button onClick={onClick} className="tap" style={{...v[variant],borderRadius:14,padding:"13px 20px",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,width:full?"100%":"auto",...style}}>{children}</button>;
};
const Input=({label,value,onChange,type="text",placeholder,style,T})=>(
  <div style={{display:"flex",flexDirection:"column",gap:5,...style}}>
    {label&&<div style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:.6}}>{label.toUpperCase()}</div>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:15,outline:"none"}}/>
  </div>
);
const Badge=({children,color,T})=>(<span style={{background:color+"20",color,border:`1px solid ${color}35`,borderRadius:999,padding:"2px 9px",fontSize:11,fontWeight:700,}}>{children}</span>);
const StatusDot=({status,T})=>{const map={pending:[T.accent,"PENDIENTE"],done:[T.blue,"COMPLETADA"],cancelled:[T.muted,"CANCELADA"]};const[color,label]=map[status]||[T.muted,"—"];return <Badge color={color} T={T}>{label}</Badge>;};
const SectionTitle=({children,T})=>(<div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:22,fontWeight:800,marginBottom:14}}>{children}</div>);
const BackBtn=({onClick,T})=>(<button onClick={onClick} className="tap" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",color:T.text,cursor:"pointer",fontSize:14}}>←</button>);

/* ─── PHOTO UPLOAD ───────────────────────────── */
function PhotoUpload({current,onSave,T}){
  const[url,setUrl]=useState("");
  const[saving,setSaving]=useState(false);
  const[preview,setPreview]=useState(current||"");
  const ref=useRef();
  const handleFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{setUrl(ev.target.result);setPreview(ev.target.result);};r.readAsDataURL(f);};
  const handleSave=async()=>{
    const toSave=url.trim()||preview;
    if(!toSave) return;
    setSaving(true);
    await onSave(toSave);
    setPreview(toSave);
    setUrl("");
    setSaving(false);
  };
  const handleUrlChange=v=>{setUrl(v);if(v.startsWith("http"))setPreview(v);};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {preview&&preview.length>4&&(
        <div style={{position:"relative"}}>
          <img src={preview} alt="" onError={e=>e.target.style.display="none"} style={{width:"100%",height:160,objectFit:"cover",borderRadius:12}}/>
          <div style={{position:"absolute",bottom:6,left:6,background:"#000a",borderRadius:6,padding:"2px 8px",fontSize:10,color:"#fff"}}>Foto actual</div>
        </div>
      )}
      <div style={{background:T.surface,borderRadius:10,padding:"10px 12px"}}>
        <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>NUEVA URL (Imgur recomendado)</div>
        <div style={{fontSize:11,color:T.muted,marginBottom:8,lineHeight:1.5}}>
          imgur.com → sube foto → clic derecho → copiar dirección
        </div>
        <div style={{display:"flex",gap:8}}>
          <input
            value={url}
            onChange={e=>handleUrlChange(e.target.value)}
            placeholder="https://i.imgur.com/..."
            style={{flex:1,background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:11,
              padding:"11px 14px",color:T.text,fontSize:14,outline:"none"}}
          />
          <Btn T={T} onClick={handleSave} style={{padding:"10px 16px",fontSize:13,flexShrink:0}}>
            {saving?"⏳":"✓"}
          </Btn>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>ref.current.click()} className="tap" style={{flex:1,background:T.surface,border:`1px solid ${T.border}`,borderRadius:11,padding:"10px",color:T.sub,fontSize:13,cursor:"pointer"}}>📷 Subir desde dispositivo</button>
        <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
      </div>
      {url&&url.startsWith("data:")&&(
        <Btn T={T} onClick={handleSave} full>{saving?"Guardando...":"✓ Guardar foto"}</Btn>
      )}
    </div>
  );
}

/* ─── IMAGE VIEWER ──────────────────────────── */
function ImageViewer({src,onClose}){
  if(!src) return null;
  return(
    <div onClick={onClose} style={{
      position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:1000,
      background:"#000d",display:"flex",alignItems:"center",justifyContent:"center",
      padding:16,cursor:"zoom-out"}}>
      <div style={{position:"absolute",top:16,right:16,width:36,height:36,borderRadius:"50%",
        background:"#fff2",display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:20,color:"#fff",cursor:"pointer"}}>✕</div>
      <img src={src} alt="" onClick={e=>e.stopPropagation()}
        style={{maxWidth:"100%",maxHeight:"90dvh",borderRadius:12,objectFit:"contain",
          boxShadow:"0 0 40px #0008"}}/>
    </div>
  );
}

/* ─── NAV BAR ────────────────────────────────── */
const NAV=[
  {id:"home",label:"Inicio",icon:"🏠"},{id:"routines",label:"Rutinas",icon:"📋"},
  {id:"library",label:"Ejercicios",icon:"💪"},{id:"calendar",label:"Calendario",icon:"📅"},
  {id:"progress",label:"Progreso",icon:"📈"},{id:"ia",label:"IA",icon:"✨"},
  {id:"settings",label:"Ajustes",icon:"⚙️"},
];
function NavBar({tab,setTab,T}){
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:T.surface,borderTop:`1px solid ${T.border}`,display:"flex",padding:"8px 0 20px"}}>
      {NAV.map(n=>(
        <button key={n.id} onClick={()=>setTab(n.id)} className="tap" style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0"}}>
          <span style={{fontSize:18,filter:tab===n.id?"none":"grayscale(1) opacity(.35)"}}>{n.icon}</span>
          <span style={{fontSize:9,fontWeight:600,letterSpacing:.3,color:tab===n.id?T.accent:T.muted}}>{n.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── PROFILE SCREEN ─────────────────────────── */
function ProfileScreen({profiles,onSelect,T}){
  return(
    <div className="page" style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,background:`radial-gradient(ellipse at 50% 0%,${T.accent}18 0%,${T.bg} 60%)`}}>
      <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:36,fontWeight:800,letterSpacing:1,color:T.accent,marginBottom:8}}>FITLAB</div>
      <div style={{color:T.sub,fontSize:14,marginBottom:52}}>¿Quién va a entrenar hoy?</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,width:"100%",maxWidth:280}}>
        {profiles.map(p=>{const color=ACCENT_OPTIONS[p.accentIdx]?.val||T.accent;return(
          <div key={p.id} onClick={()=>onSelect(p)} className="tap" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
            <div style={{width:110,height:110,borderRadius:28,background:`linear-gradient(135deg,${color}33,${color}11)`,border:`2px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:50,boxShadow:`0 0 32px ${color}22`}}>{p.emoji}</div>
            <div style={{fontWeight:700,fontSize:15,color:T.text}}>{p.name}</div>
          </div>
        );})}
      </div>
    </div>
  );
}

/* ─── HOME ───────────────────────────────────── */
function HomeScreen({profile,sessions,logs,routines,exercises,onStartWorkout,onGoTo,T}){
  const today=todayStr();
  const todaySess=sessions.filter(s=>s.userId===profile.id&&s.date===today);
  const doneSess=sessions.filter(s=>s.userId===profile.id&&s.status==="done");
  const weekStart=new Date();weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
  const weekSess=sessions.filter(s=>s.userId===profile.id&&s.status==="done"&&new Date(s.date)>=weekStart);
  const myLogs=logs.filter(l=>l.userId===profile.id);
  const weekLogVarIds=[...new Set(weekSess.flatMap(s=>logs.filter(l=>l.sessionId===s.id).map(l=>l.varId)))];
  const weekMuscles=[...new Set(weekLogVarIds.map(vid=>getVar(vid,exercises)?.exercise?.primary).filter(Boolean))];
  const hour=new Date().getHours();
  return(
    <div className="page" style={{padding:"0 16px 100px"}}>
      <div style={{padding:"24px 0 20px"}}>
        <div style={{color:T.sub,fontSize:13}}>{hour<13?"Buenos días ☀️":hour<20?"Buenas tardes 🌤":"Buenas noches 🌙"}</div>
        <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:30,fontWeight:800,}}>{profile.name} {profile.emoji}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}} className="stagger">
        {[{label:"Esta semana",value:weekSess.length,unit:"sesiones",color:T.accent},{label:"Total",value:doneSess.length,unit:"completadas",color:T.blue},{label:"Series",value:myLogs.length,unit:"registradas",color:T.purple}].map(s=>(
          <Card key={s.label} T={T} style={{textAlign:"center",padding:"12px 8px"}}>
            <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:26,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:T.sub,fontWeight:600,marginTop:2}}>{s.unit.toUpperCase()}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:1}}>{s.label}</div>
          </Card>
        ))}
      </div>
      {weekMuscles.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:.6,marginBottom:8}}>MÚSCULOS ESTA SEMANA</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{weekMuscles.map(m=><Badge key={m} color={T.accent} T={T}>{m}</Badge>)}</div>
        </div>
      )}
      <SectionTitle T={T}>HOY</SectionTitle>
      {/* Botón rutina libre siempre visible */}
      <button onClick={()=>onStartWorkout({id:Date.now(),userId:profile.id,routineId:"free",date:today,status:"pending",objetivo:"",hora:""})} className="tap" style={{
        width:"100%",display:"flex",alignItems:"center",gap:14,
        background:`linear-gradient(135deg,${T.accent}22,${T.accent}08)`,
        border:`1px solid ${T.accent}44`,borderRadius:16,padding:"16px 18px",
        cursor:"pointer",marginBottom:16,textAlign:"left"}}>
        <div style={{width:48,height:48,borderRadius:14,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🎲</div>
        <div>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:16,fontWeight:800,color:T.accent}}>Rutina libre</div>
          <div style={{fontSize:12,color:T.sub,marginTop:2}}>Elige los ejercicios sobre la marcha</div>
        </div>
        <div style={{marginLeft:"auto",fontSize:20,color:T.accent}}>▶</div>
      </button>

      {todaySess.length===0?(
        <Card T={T} style={{textAlign:"center",padding:20,marginBottom:20}}>
          <div style={{fontSize:28,marginBottom:6}}>😴</div>
          <div style={{color:T.sub,fontSize:14}}>Sin entreno planificado hoy</div>
          <Btn T={T} onClick={()=>onGoTo("calendar")} variant="ghost" style={{marginTop:12,fontSize:13,padding:"9px 16px"}}>Planificar sesión</Btn>
        </Card>
      ):todaySess.map(s=>{const r=getRoutine(s.routineId,routines);return(
        <Card key={s.id} T={T} accent={r?.colorHex} style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{fontSize:28,marginBottom:6}}>{r?.emoji}</div><div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:20,fontWeight:800}}>{r?.name}</div><div style={{color:T.sub,fontSize:13,marginTop:4}}>{r?.exercises.length} ejercicios</div></div>
            <StatusDot status={s.status} T={T}/>
          </div>
          {s.status==="pending"&&<Btn T={T} onClick={()=>onStartWorkout(s)} style={{marginTop:14,width:"100%"}}>▶ Empezar entrenamiento</Btn>}
        </Card>
      );})}
      <SectionTitle T={T}>ÚLTIMAS SESIONES</SectionTitle>
      <div className="stagger" style={{display:"flex",flexDirection:"column",gap:10}}>
        {sessions.filter(s=>s.userId===profile.id&&s.status==="done").slice(0,3).map(s=>{const r=getRoutine(s.routineId,routines);return(
          <Card key={s.id} T={T} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{fontSize:26}}>{r?.emoji}</div>
              <div><div style={{fontWeight:600}}>{r?.name}</div><div style={{fontSize:12,color:T.sub,marginTop:2}}>{fmtShort(s.date)}</div></div>
            </div>
            <Badge color={T.blue} T={T}>✓</Badge>
          </Card>
        );})}
      </div>
    </div>
  );
}

/* ─── LIBRARY ────────────────────────────────── */
function LibraryScreen({exercises,setExercises,T}){
  const[filter,setFilter]=useState("Todos");
  const[selected,setSelected]=useState(null);
  const[selVar,setSelVar]=useState(null);
  const[editingPhoto,setEditingPhoto]=useState(null);
  const[viewerSrc,setViewerSrc]=useState(null);
  // New exercise
  const[creatingEx,setCreatingEx]=useState(false);
  const[newExName,setNewExName]=useState("");
  const[newExPrimary,setNewExPrimary]=useState("Glúteo");
  const[newExSecondary,setNewExSecondary]=useState("");
  const[newExEmoji,setNewExEmoji]=useState("💪");
  // New variation
  const[creatingVar,setCreatingVar]=useState(false);
  const[newVarName,setNewVarName]=useState("");
  const[newVarMaterial,setNewVarMaterial]=useState("Máquina");
  const[newVarNotes,setNewVarNotes]=useState("");

  const EMOJIS_EX=["💪","🍑","🦵","🏋️","🔥","🏃","🧘","🎯","⬆️","🔄","🤸","🏊"];
  const MATERIALS=["Máquina","Multipower","Barra libre","Mancuerna","Polea","Kettlebells","Banda elástica","Peso corporal","Banco plano","Banco inclinado","Esterilla","Discos","Cajón pliométrico"];

  const saveNewExercise=async()=>{
    if(!newExName.trim()) return;
    const autoEmoji=MUSCLE_EMOJI[newExPrimary]||"💪";
    const id="E"+Date.now();
    const newEx={id,name:newExName.trim(),primary:newExPrimary,secondary:newExSecondary,emoji:autoEmoji,photo:"",variations:[]};
    setExercises([...exercises,newEx]);
    try{ await sb.post("ejercicios",{id,nombre:newExName.trim(),grupo_principal:newExPrimary,grupo_secundario:newExSecondary,emoji:autoEmoji,foto_url:""}); }
    catch(e){console.error("Error guardando ejercicio:",e);}
    setCreatingEx(false);setNewExName("");setNewExPrimary("Glúteo");setNewExSecondary("");
    setSelected(newEx);
  };

  const saveNewVariation=async()=>{
    if(!newVarName.trim()||!selected) return;
    const id="V"+Date.now();
    const newVar={id,name:newVarName.trim(),material:newVarMaterial,photo:"",video:"",notes:newVarNotes};
    setExercises(exercises.map(e=>e.id===selected.id?{...e,variations:[...e.variations,newVar]}:e));
    setSelected({...selected,variations:[...selected.variations,newVar]});
    try{ await sb.post("variaciones",{id,ejercicio_id:selected.id,nombre:newVarName.trim(),material:newVarMaterial,notas:newVarNotes,foto_url:"",video_url:""}); }
    catch(e){console.error("Error guardando variación:",e);}
    setCreatingVar(false);setNewVarName("");setNewVarMaterial("Máquina");setNewVarNotes("");
  };
  const groups=["Todos",...MUSCLE_GROUPS];
  const filtered=filter==="Todos"?exercises:exercises.filter(e=>e.primary===filter||e.secondary===filter);
  const saveExPhoto=async photo=>{
    setExercises(exercises.map(e=>e.id===selected.id?{...e,photo}:e));
    setSelected({...selected,photo});
    setEditingPhoto(null);
    try { await sb.patch("ejercicios",`id=eq.${selected.id}`,{foto_url:photo}); }
    catch(e){ console.error("Error guardando foto ejercicio:",e); }
  };
  const saveVarPhoto=async photo=>{
    setExercises(exercises.map(e=>({...e,variations:e.variations.map(v=>v.id===selVar.id?{...v,photo}:v)})));
    setSelVar({...selVar,photo});
    setEditingPhoto(null);
    try { await sb.patch("variaciones",`id=eq.${selVar.id}`,{foto_url:photo}); }
    catch(e){ console.error("Error guardando foto variacion:",e); }
  };

  if(selVar){
    const ex=exercises.find(e=>e.variations.some(v=>v.id===selVar.id));
    return(
      <div className="page" style={{padding:"0 16px 100px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0 14px"}}>
          <BackBtn onClick={()=>setSelVar(null)} T={T}/>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,flex:1,lineHeight:1.2}}>{selVar.name}</div>
        </div>
        {viewerSrc&&<ImageViewer src={viewerSrc} onClose={()=>setViewerSrc(null)}/>}
        <div style={{position:"relative",marginBottom:16}}>
          {selVar.photo
            ?<img src={selVar.photo} alt={selVar.name} onClick={()=>setViewerSrc(selVar.photo)}
                style={{width:"100%",height:200,objectFit:"cover",borderRadius:16,cursor:"zoom-in"}}/>
            :<div style={{width:"100%",height:200,borderRadius:16,background:T.surface,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}><span style={{fontSize:48}}>{ex?.emoji}</span><span style={{fontSize:12,color:T.muted}}>Sin foto</span></div>}
          <button onClick={()=>setEditingPhoto("variation")} className="tap" style={{position:"absolute",bottom:10,right:10,background:"#000a",borderRadius:10,border:`1px solid ${T.border}`,padding:"6px 12px",color:T.text,fontSize:12,cursor:"pointer"}}>📷 Editar foto</button>
        </div>
        {editingPhoto==="variation"&&<Card T={T} style={{marginBottom:16,border:`1px solid ${T.accent}44`}}><div style={{fontSize:13,fontWeight:600,marginBottom:10,color:T.accent}}>CAMBIAR FOTO</div><PhotoUpload current={selVar.photo} onSave={saveVarPhoto} T={T}/></Card>}
        <Card T={T}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Badge color={T.accent} T={T}>{ex?.primary}</Badge>
              {ex?.secondary&&<Badge color={T.blue} T={T}>{ex.secondary}</Badge>}
              <Badge color={T.muted} T={T}>{selVar.material}</Badge>
            </div>
            <button onClick={async()=>{
              if(!window.confirm("¿Eliminar esta variación?")) return;
              setExercises(exercises.map(e=>({...e,variations:e.variations.filter(v=>v.id!==selVar.id)})));
              setSelVar(null);
              try{ await sb.delete("variaciones",`id=eq.${selVar.id}`); }
              catch(e){ console.error("Error:",e); }
            }} className="tap" style={{background:"#ff444415",border:"1px solid #ff444430",borderRadius:8,padding:"5px 10px",color:"#ff5555",fontSize:12,cursor:"pointer",flexShrink:0}}>🗑 Eliminar</button>
          </div>
          {selVar.video&&selVar.video.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>VÍDEO</div>
              {(()=>{
                const url=selVar.video;
                const ytMatch=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
                if(ytMatch){
                  return(
                    <div style={{position:"relative",paddingBottom:"56.25%",height:0,borderRadius:12,overflow:"hidden"}}>
                      <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Tutorial"/>
                    </div>
                  );
                }
                return(
                  <a href={url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:8,background:T.surface,borderRadius:10,padding:"10px 14px",color:T.accent,textDecoration:"none",fontSize:13,fontWeight:600}}>
                    ▶ Ver vídeo
                  </a>
                );
              })()}
            </div>
          )}
          {selVar.notes&&selVar.notes.length>0&&(
            <div style={{background:T.surface,borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:4}}>NOTAS TÉCNICAS</div>
              <div style={{fontSize:14,lineHeight:1.6}}>{selVar.notes}</div>
            </div>
          )}
        </Card>
      </div>
    );
  }




  if(selected){
    return(
      <div className="page" style={{padding:"0 16px 100px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0 14px"}}>
          <BackBtn onClick={()=>setSelected(null)} T={T}/>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:22,fontWeight:800}}>{selected.emoji} {selected.name}</div>
        </div>
        {viewerSrc&&<ImageViewer src={viewerSrc} onClose={()=>setViewerSrc(null)}/>}
        <div style={{position:"relative",marginBottom:16}}>
          {selected.photo
            ?<img src={selected.photo} alt={selected.name} onClick={()=>setViewerSrc(selected.photo)}
                style={{width:"100%",height:200,objectFit:"cover",borderRadius:16,cursor:"zoom-in"}}/>
            :<div style={{width:"100%",height:160,borderRadius:16,background:T.surface,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}><span style={{fontSize:48}}>{selected.emoji}</span><span style={{fontSize:12,color:T.muted}}>Sin foto</span></div>}
          <button onClick={()=>setEditingPhoto("exercise")} className="tap" style={{position:"absolute",bottom:10,right:10,background:"#000a",borderRadius:10,border:`1px solid ${T.border}`,padding:"6px 12px",color:T.text,fontSize:12,cursor:"pointer"}}>📷 Editar foto</button>
        </div>
        {editingPhoto==="exercise"&&<Card T={T} style={{marginBottom:16,border:`1px solid ${T.accent}44`}}><div style={{fontSize:13,fontWeight:600,marginBottom:10,color:T.accent}}>FOTO DE PORTADA</div><PhotoUpload current={selected.photo} onSave={saveExPhoto} T={T}/></Card>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",gap:8}}>
            <Badge color={T.accent} T={T}>{selected.primary}</Badge>
            {selected.secondary&&<Badge color={T.blue} T={T}>{selected.secondary}</Badge>}
          </div>
          <button onClick={async()=>{
            if(!window.confirm("¿Eliminar este ejercicio y todas sus variaciones?")) return;
            setExercises(exercises.filter(e=>e.id!==selected.id));
            setSelected(null);
            try{
              await sb.delete("variaciones",`ejercicio_id=eq.${selected.id}`);
              await sb.delete("ejercicios",`id=eq.${selected.id}`);
            } catch(e){ console.error("Error:",e); }
          }} className="tap" style={{background:"#ff444415",border:"1px solid #ff444430",borderRadius:8,padding:"5px 10px",color:"#ff5555",fontSize:12,cursor:"pointer"}}>🗑 Eliminar</button>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <SectionTitle T={T}>VARIACIONES</SectionTitle>
          <Btn T={T} onClick={()=>setCreatingVar(true)} variant="ghost" style={{fontSize:13,padding:"9px 14px"}}>+ Añadir</Btn>
        </div>

        {creatingVar&&(
          <Card T={T} style={{marginBottom:16,border:`1px solid ${T.accent}44`}}>
            <div style={{fontSize:13,color:T.accent,fontWeight:700,marginBottom:12}}>NUEVA VARIACIÓN</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Input T={T} label="Nombre" value={newVarName} onChange={setNewVarName} placeholder="Ej: Hip Thrust — Máquina"/>
              <div>
                <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>MATERIAL</div>
                <select value={newVarMaterial} onChange={e=>setNewVarMaterial(e.target.value)} style={{width:"100%",background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:15}}>
                  {MATERIALS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <Input T={T} label="Notas técnicas (opcional)" value={newVarNotes} onChange={setNewVarNotes} placeholder="Ej: Mantén la espalda recta"/>
              <div style={{display:"flex",gap:8}}>
                <Btn T={T} onClick={saveNewVariation} full>✓ Guardar</Btn>
                <Btn T={T} onClick={()=>setCreatingVar(false)} variant="ghost">✕</Btn>
              </div>
            </div>
          </Card>
        )}

        <div className="stagger" style={{display:"flex",flexDirection:"column",gap:10}}>
          {selected.variations.map(v=>(
            <Card key={v.id} T={T} onClick={()=>setSelVar(v)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
              {v.photo?<img src={v.photo} alt={v.name} style={{width:52,height:52,objectFit:"cover",borderRadius:10,flexShrink:0}}/>:
              <div style={{width:52,height:52,borderRadius:10,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{selected.emoji}</div>}
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{v.name}</div><div style={{fontSize:12,color:T.sub,marginTop:3}}>{v.material}</div></div>
              <span style={{color:T.muted,fontSize:20}}>›</span>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  return(
    <div className="page" style={{padding:"0 16px 100px"}}>
      <div style={{padding:"24px 0 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <SectionTitle T={T}>EJERCICIOS</SectionTitle>
        <Btn T={T} onClick={()=>setCreatingEx(true)} style={{fontSize:13,padding:"9px 14px"}}>+ Nuevo</Btn>
      </div>

      {creatingEx&&(
        <Card T={T} style={{marginBottom:16,border:`1px solid ${T.accent}44`}}>
          <div style={{fontSize:13,color:T.accent,fontWeight:700,marginBottom:12}}>NUEVO EJERCICIO</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Input T={T} label="Nombre" value={newExName} onChange={setNewExName} placeholder="Ej: Hip Thrust"/>
            <div>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>GRUPO PRINCIPAL</div>
              <select value={newExPrimary} onChange={e=>setNewExPrimary(e.target.value)} style={{width:"100%",background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:15}}>
                {MUSCLE_GROUPS.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>GRUPO SECUNDARIO (opcional)</div>
              <select value={newExSecondary} onChange={e=>setNewExSecondary(e.target.value)} style={{width:"100%",background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:15}}>
                <option value="">Ninguno</option>
                {MUSCLE_GROUPS.map(g=><option key={g} value={g}>{MUSCLE_EMOJI[g]||""} {g}</option>)}
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,background:T.surface,borderRadius:10,padding:"10px 14px"}}>
              <span style={{fontSize:28}}>{MUSCLE_EMOJI[newExPrimary]||"💪"}</span>
              <span style={{fontSize:13,color:T.sub}}>Emoji asignado automáticamente al grupo muscular</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn T={T} onClick={saveNewExercise} full>✓ Guardar</Btn>
              <Btn T={T} onClick={()=>setCreatingEx(false)} variant="ghost">✕</Btn>
            </div>
          </div>
        </Card>
      )}

      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:12,marginBottom:16}}>{groups.map(g=><Chip key={g} T={T} color={T.accent} active={filter===g} onClick={()=>setFilter(g)}>{g}</Chip>)}</div>
      <div className="stagger" style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(ex=>(
          <Card key={ex.id} T={T} onClick={()=>setSelected(ex)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div style={{width:56,height:56,borderRadius:12,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>{ex.emoji}</div>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:15}}>{ex.name}</div><div style={{display:"flex",gap:6,marginTop:5}}><Badge color={T.accent} T={T}>{ex.primary}</Badge><span style={{fontSize:11,color:T.muted}}>{ex.variations.length} var.</span></div></div>
            <span style={{color:T.muted,fontSize:20}}>›</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── ROUTINES ───────────────────────────────── */
function RoutinesScreen({profile,profiles,routines,setRoutines,exercises,setExercises,onStartWorkout,T}){
  // ── All hooks first (React rules) ──
  const[selected,setSelected]=useState(null);
  const[sharingId,setSharingId]=useState(null);
  const[creating,setCreating]=useState(false);
  const[newName,setNewName]=useState("");
  const[newEmoji,setNewEmoji]=useState("💪");
  const[newColor,setNewColor]=useState("#c8f060");
  const[newExercises,setNewExercises]=useState([]);
  const[pickingEx,setPickingEx]=useState(false);
  const[exFilter,setExFilter]=useState("Todos");
  const[creatingExInline,setCreatingExInline]=useState(false);
  const[inlineExName,setInlineExName]=useState("");
  const[inlineExPrimary,setInlineExPrimary]=useState("Glúteo");
  const[inlineExSecondary,setInlineExSecondary]=useState("");
  const[inlineExMaterial,setInlineExMaterial]=useState("Máquina");

  // ── Derived data ──
  const myRoutines=routines.filter(r=>r.sharedWith&&r.sharedWith.includes(profile.id)&&!r.archived);
  const EMOJIS_R=["💪","🍑","🦵","🏋️","🔥","⚡","🏃","🧘","🥊","🎯","💥","🌟"];
  const COLOR_OPTS=["#c8f060","#ff6eb4","#ff3e3e","#40d9f0","#b06cff","#ffaa30","#ff7055","#4ade80"];

  // ── Handlers ──
  const toggleShare=(routineId,profileId)=>{
    setRoutines(routines.map(r=>{
      if(r.id!==routineId) return r;
      if(profileId===r.ownerId) return r;
      const already=r.sharedWith.includes(profileId);
      return{...r,sharedWith:already?r.sharedWith.filter(id=>id!==profileId):[...r.sharedWith,profileId]};
    }));
  };
  const addExToNew=(varId)=>{
    if(newExercises.find(e=>e.varId===varId)) return;
    setNewExercises(prev=>[...prev,{varId,sets:3,reps:10,rir:2}]);
    setPickingEx(false);
  };
  const removeExFromNew=(varId)=>setNewExercises(newExercises.filter(e=>e.varId!==varId));
  const moveEx=(varId,dir)=>{
    const idx=newExercises.findIndex(e=>e.varId===varId);
    if(idx===-1) return;
    const newIdx=idx+dir;
    if(newIdx<0||newIdx>=newExercises.length) return;
    const arr=[...newExercises];
    const tmp=arr[idx]; arr[idx]=arr[newIdx]; arr[newIdx]=tmp;
    setNewExercises(arr);
  };
  const updateExField=(varId,field,val)=>setNewExercises(newExercises.map(e=>e.varId===varId?{...e,[field]:Math.max(0,+val||0)}:e));
  const saveRoutine=()=>{
    if(!newName.trim()||newExercises.length===0) return;
    const r={id:Date.now(),ownerId:profile.id,sharedWith:[profile.id],name:newName.trim(),emoji:newEmoji,colorHex:newColor,exercises:newExercises};
    setRoutines([...routines,r]);
    setCreating(false);setNewName("");setNewEmoji("💪");setNewColor("#c8f060");setNewExercises([]);
  };

  // ── View: sharing panel ─

  // ── View: routine detail ──
  const[editingRoutine,setEditingRoutine]=useState(false);
  const[editRExercises,setEditRExercises]=useState([]);
  const[pickingREx,setPickingREx]=useState(false);
  const[editRExFilter,setEditRExFilter]=useState("Todos");

  const moveREx=(varId,dir)=>{
    const idx=editRExercises.findIndex(e=>e.varId===varId);
    if(idx===-1)return;const ni=idx+dir;
    if(ni<0||ni>=editRExercises.length)return;
    const arr=[...editRExercises];const tmp=arr[idx];arr[idx]=arr[ni];arr[ni]=tmp;
    setEditRExercises(arr);
  };
  const updateRExField=(varId,field,val)=>setEditRExercises(editRExercises.map(e=>e.varId===varId?{...e,[field]:Math.max(0,+val||0)}:e));
  const removeREx=(varId)=>setEditRExercises(editRExercises.filter(e=>e.varId!==varId));
  const addREx=(varId)=>{if(editRExercises.find(e=>e.varId===varId))return;setEditRExercises([...editRExercises,{varId,sets:3,reps:"10",rir:2}]);setPickingREx(false);};
  const saveRoutineEdit=async()=>{
    if(!selected) return;
    setRoutines(routines.map(r=>r.id===selected.id?{...r,exercises:editRExercises}:r));
    setEditingRoutine(false);
    try{
      // Delete old exercises and re-insert
      await sb.delete("rutina_ejercicios",`rutina_id=eq.${selected.id}`);
      for(let i=0;i<editRExercises.length;i++){
        const e=editRExercises[i];
        await sb.post("rutina_ejercicios",{
          rutina_id:selected.id, variacion_id:e.varId,
          orden:i, series:e.sets, reps:String(e.reps), rir:e.rir
        });
      }
    }catch(e){console.error("Error guardando edición rutina:",e);}
  };


  if(pickingREx){
    const allVars=exercises.flatMap(ex=>ex.variations.map(v=>({...v,exercise:ex})));
    const filteredVars=editRExFilter==="Todos"?allVars:allVars.filter(v=>v.exercise.primary===editRExFilter||v.exercise.secondary===editRExFilter);
    return(
      <div className="page" style={{padding:"0 16px 100px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0 14px"}}>
          <BackBtn onClick={()=>setPickingREx(false)} T={T}/>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,color:T.text}}>Añadir ejercicio</div>
        </div>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:12,marginBottom:14}}>
          {["Todos",...MUSCLE_GROUPS].map(g=><Chip key={g} T={T} color={T.accent} active={editRExFilter===g} onClick={()=>setEditRExFilter(g)}>{g}</Chip>)}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filteredVars.map(v=>{const already=!!editRExercises.find(e=>e.varId===v.id);return(
            <div key={v.id} onClick={()=>!already&&addREx(v.id)} className="tap"
              style={{display:"flex",alignItems:"center",gap:12,background:already?T.accent+"15":T.card,
                border:`1px solid ${already?T.accent+"55":T.border}`,borderRadius:14,padding:"12px 14px",cursor:already?"default":"pointer"}}>
              {v.photo&&v.photo.length>0?<img src={v.photo} alt="" style={{width:44,height:44,objectFit:"cover",borderRadius:10,flexShrink:0}}/>:
              <div style={{width:44,height:44,borderRadius:10,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{v.exercise.emoji}</div>}
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:T.text}}>{v.name}</div><div style={{fontSize:12,color:T.sub,marginTop:2}}>{v.exercise.primary} · {v.material}</div></div>
              <span style={{fontSize:20,color:already?T.accent:T.muted}}>{already?"✓":"+"}</span>
            </div>
          );})}
        </div>
      </div>
    );
  }

  if(sharingId!==null){
    const r=routines.find(x=>x.id===sharingId);
    if(!r){setSharingId(null);return null;}
    const isOwner=r.ownerId===profile.id;
    const safeSharedWith=Array.isArray(r.sharedWith)?r.sharedWith:[profile.id];
    return(
      <div className="page" style={{padding:"0 16px 100px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0 16px"}}>
          <BackBtn onClick={()=>setSharingId(null)} T={T}/>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,flex:1,color:T.text}}>Compartir rutina</div>
        </div>
        <Card T={T} style={{marginBottom:14,border:`1px solid ${r.colorHex}44`}}>
          <div style={{fontSize:24,marginBottom:6}}>{r.emoji}</div>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:17,fontWeight:800,color:T.text}}>{r.name}</div>
          <div style={{fontSize:12,color:T.sub,marginTop:4}}>{r.exercises.length} ejercicios</div>
        </Card>
        {!isOwner&&(
          <div style={{background:"#ffaa3015",border:"1px solid #ffaa3033",borderRadius:12,padding:"10px 14px",marginBottom:14}}>
            <div style={{fontSize:12,color:"#ffaa30"}}>Solo el creador puede cambiar quién ve esta rutina</div>
          </div>
        )}
        <div style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:.5,marginBottom:10}}>ACCESO POR PERFIL</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {profiles.map(p=>{
            const color=ACCENT_OPTIONS[p.accentIdx]?.val||T.accent;
            const hasAccess=safeSharedWith.includes(p.id);
            const isCreator=p.id===r.ownerId;
            return(
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:T.card,border:`1px solid ${hasAccess?color+"44":T.border}`,borderRadius:14,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,borderRadius:12,background:color+"22",border:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{p.emoji}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:14,color:T.text}}>{p.name}</div>
                    {isCreator&&<div style={{fontSize:11,color,marginTop:2}}>Creador</div>}
                  </div>
                </div>
                <button onClick={()=>{if(isOwner&&!isCreator)toggleShare(r.id,p.id);}} style={{width:44,height:24,borderRadius:999,border:"none",cursor:isOwner&&!isCreator?"pointer":"default",background:hasAccess?color:"#333",position:"relative",transition:"background .2s",flexShrink:0,opacity:isCreator?0.5:1}}>
                  <div style={{position:"absolute",top:2,left:hasAccess?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if(selected){
    const r=routines.find(x=>x.id===selected.id)||selected;
    const isOwner=r.ownerId===profile.id;
    return(
      <div className="page" style={{padding:"0 16px 100px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0 16px"}}>
          <BackBtn onClick={()=>{setSelected(null);setEditingRoutine(false);}} T={T}/>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:20,fontWeight:800,flex:1,color:T.text}}>{r.emoji} {r.name}</div>
          <div style={{display:"flex",gap:6}}>
            {isOwner&&!editingRoutine&&<button onClick={()=>{setEditingRoutine(true);setEditRExercises([...r.exercises]);}} className="tap" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 12px",color:T.sub,fontSize:12,cursor:"pointer",fontWeight:600}}>✏️</button>}
            {isOwner&&<button onClick={()=>setSharingId(r.id)} className="tap" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 12px",color:T.sub,fontSize:12,cursor:"pointer",fontWeight:600}}>👥</button>}
            {isOwner&&<button onClick={async()=>{
              if(!window.confirm("¿Eliminar esta rutina? Las sesiones ya realizadas con ella seguirán siendo accesibles.")) return;
              setRoutines(routines.map(x=>x.id===r.id?{...x,archived:true}:x));
              setSelected(null);
              try{
                await sb.patch("rutinas",`id=eq.${r.id}`,{archivada:true});
              }catch(e){console.error("Error:",e);}
            }} className="tap" style={{background:"#ff444415",border:"1px solid #ff444430",borderRadius:10,padding:"7px 12px",color:"#ff5555",fontSize:12,cursor:"pointer",fontWeight:600}}>🗑</button>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {r.sharedWith.map(pid=>{const p=profiles.find(x=>x.id===pid);if(!p)return null;const color=ACCENT_OPTIONS[p.accentIdx]?.val||T.accent;return(<div key={pid} style={{display:"flex",alignItems:"center",gap:5,background:color+"15",border:`1px solid ${color}33`,borderRadius:999,padding:"3px 10px 3px 6px"}}><span style={{fontSize:14}}>{p.emoji}</span><span style={{fontSize:12,color,fontWeight:600}}>{p.name}</span></div>);})}
        </div>

        {editingRoutine?(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600}}>EJERCICIOS ({editRExercises.length})</div>
              <Btn T={T} onClick={()=>setPickingREx(true)} variant="ghost" style={{fontSize:12,padding:"7px 12px"}}>+ Añadir</Btn>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {editRExercises.map((e,i)=>{
                const v=getVar(e.varId,exercises);
                const isFirst=i===0,isLast=i===editRExercises.length-1;
                return(
                  <Card key={e.varId} T={T} style={{borderLeft:`3px solid ${r.colorHex}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
                        <button onClick={()=>moveREx(e.varId,-1)} disabled={isFirst} className="tap" style={{width:24,height:20,borderRadius:6,border:`1px solid ${T.border}`,background:isFirst?"transparent":T.surface,color:isFirst?T.muted:T.sub,cursor:isFirst?"default":"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▲</button>
                        <div style={{width:24,height:20,borderRadius:6,background:r.colorHex+"22",color:r.colorHex,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12}}>{i+1}</div>
                        <button onClick={()=>moveREx(e.varId,1)} disabled={isLast} className="tap" style={{width:24,height:20,borderRadius:6,border:`1px solid ${T.border}`,background:isLast?"transparent":T.surface,color:isLast?T.muted:T.sub,cursor:isLast?"default":"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▼</button>
                      </div>
                      <div style={{flex:1,fontWeight:600,fontSize:13,color:T.text,lineHeight:1.3}}>{v?v.name:""}</div>
                      <button onClick={()=>removeREx(e.varId)} className="tap" style={{background:"#ff444415",border:"1px solid #ff444430",borderRadius:8,padding:"4px 8px",color:"#ff5555",fontSize:12,cursor:"pointer"}}>✕</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[["Series",e.sets,"sets"],["Reps",e.reps,"reps"],["RIR",e.rir,"rir"]].map(([label,val,field])=>(
                        <div key={field}>
                          <div style={{fontSize:10,color:T.muted,fontWeight:600,marginBottom:4}}>{label.toUpperCase()}</div>
                          <input type="number" value={val} min="0" onChange={ev=>updateRExField(e.varId,field,ev.target.value)}
                            style={{width:"100%",background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",color:T.text,fontSize:14,outline:"none",textAlign:"center"}}/>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn T={T} onClick={saveRoutineEdit} full>✓ Guardar cambios</Btn>
              <Btn T={T} onClick={()=>setEditingRoutine(false)} variant="ghost">Cancelar</Btn>
            </div>
          </>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}} className="stagger">
            {r.exercises.map((e,i)=>{const v=getVar(e.varId,exercises);return(
              <Card key={i} T={T} style={{display:"flex",gap:14,alignItems:"center",borderLeft:`3px solid ${r.colorHex}`}}>
                <div style={{width:32,height:32,borderRadius:10,background:r.colorHex+"22",color:r.colorHex,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans'",fontWeight:800,fontSize:15,flexShrink:0}}>{i+1}</div>
                {v&&v.photo&&v.photo.length>0?<img src={v.photo} alt="" style={{width:44,height:44,objectFit:"cover",borderRadius:8,flexShrink:0}}/>:<div style={{width:44,height:44,borderRadius:8,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{v&&v.exercise?v.exercise.emoji:""}</div>}
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14,lineHeight:1.3,color:T.text}}>{v?v.name:""}</div>
                  <div style={{color:T.sub,fontSize:12,marginTop:3}}>{e.sets} series · {e.reps} reps · RIR {e.rir}</div>
                </div>
              </Card>
            );})}
          </div>
        )}
      </div>
    );
  }

  // ── View: exercise picker ──
  if(pickingEx){
    const allVars=exercises.flatMap(ex=>ex.variations.map(v=>({...v,exercise:ex})));
    const filteredVars=exFilter==="Todos"?allVars:allVars.filter(v=>v.exercise.primary===exFilter||v.exercise.secondary===exFilter);
    return(
      <div className="page" style={{padding:"0 16px 100px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0 14px"}}>
          <BackBtn onClick={()=>setPickingEx(false)} T={T}/>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,color:T.text,flex:1}}>Añadir ejercicio</div>
          <Btn T={T} onClick={()=>setCreatingExInline(true)} style={{fontSize:12,padding:"7px 12px"}}>+ Crear</Btn>
        </div>
        {creatingExInline&&(
          <Card T={T} style={{marginBottom:14,border:`1px solid ${T.accent}44`}}>
            <div style={{fontSize:12,color:T.accent,fontWeight:700,marginBottom:12}}>NUEVO EJERCICIO</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Input T={T} label="Nombre del ejercicio" value={inlineExName} onChange={setInlineExName} placeholder="Ej: Hip Thrust"/>
              <div>
                <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>GRUPO PRINCIPAL</div>
                <select value={inlineExPrimary} onChange={e=>setInlineExPrimary(e.target.value)} style={{width:"100%",background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:15}}>
                  {MUSCLE_GROUPS.map(g=><option key={g} value={g}>{MUSCLE_EMOJI[g]||""} {g}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>GRUPO SECUNDARIO (opcional)</div>
                <select value={inlineExSecondary} onChange={e=>setInlineExSecondary(e.target.value)} style={{width:"100%",background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:15}}>
                  <option value="">Ninguno</option>
                  {MUSCLE_GROUPS.map(g=><option key={g} value={g}>{MUSCLE_EMOJI[g]||""} {g}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>MATERIAL / VARIACIÓN</div>
                <select value={inlineExMaterial} onChange={e=>setInlineExMaterial(e.target.value)} style={{width:"100%",background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:15}}>
                  {["Máquina","Multipower","Barra libre","Mancuerna","Polea","Kettlebells","Banda elástica","Peso corporal","Esterilla","Discos"].map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,background:T.surface,borderRadius:10,padding:"10px 14px"}}>
                <span style={{fontSize:28}}>{MUSCLE_EMOJI[inlineExPrimary]||"💪"}</span>
                <span style={{fontSize:13,color:T.sub}}>Emoji asignado automáticamente</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn T={T} onClick={async()=>{
                  if(!inlineExName.trim()) return;
                  const autoEmoji=MUSCLE_EMOJI[inlineExPrimary]||"💪";
                  const id="E"+Date.now();
                  const varId="V"+(Date.now()+1);
                  const varName=inlineExName.trim()+(inlineExMaterial?" — "+inlineExMaterial:"");
                  const newVar={id:varId,name:varName,material:inlineExMaterial,photo:"",video:"",notes:""};
                  const newEx={id,name:inlineExName.trim(),primary:inlineExPrimary,secondary:inlineExSecondary,emoji:autoEmoji,photo:"",variations:[newVar]};
                  setExercises([...exercises,newEx]);
                  try{
                    await sb.post("ejercicios",{id,nombre:newEx.name,grupo_principal:newEx.primary,grupo_secundario:inlineExSecondary,emoji:autoEmoji,foto_url:""});
                    await sb.post("variaciones",{id:varId,ejercicio_id:id,nombre:varName,material:inlineExMaterial,notas:"",foto_url:"",video_url:""});
                  }catch(e){console.error(e);}
                  addExToNew(varId);
                  setCreatingExInline(false);setInlineExName("");setInlineExPrimary("Glúteo");setInlineExSecondary("");setInlineExMaterial("Máquina");
                }} full style={{fontSize:13,padding:"10px"}}>✓ Crear y añadir a rutina</Btn>
                <Btn T={T} onClick={()=>setCreatingExInline(false)} variant="ghost" style={{padding:"10px 14px"}}>✕</Btn>
              </div>
            </div>
          </Card>
        )}
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:12,marginBottom:14}}>
          {["Todos",...MUSCLE_GROUPS].map(g=><Chip key={g} T={T} color={T.accent} active={exFilter===g} onClick={()=>setExFilter(g)}>{g}</Chip>)}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filteredVars.map(v=>{
            const already=!!newExercises.find(e=>e.varId===v.id);
            return(
              <div key={v.id} onClick={()=>!already&&addExToNew(v.id)} className="tap"
                style={{display:"flex",alignItems:"center",gap:12,background:already?T.accent+"15":T.card,
                  border:`1px solid ${already?T.accent+"55":T.border}`,borderRadius:14,padding:"12px 14px",cursor:already?"default":"pointer"}}>
                {v.photo&&v.photo.length>0
                  ?<img src={v.photo} alt="" style={{width:44,height:44,objectFit:"cover",borderRadius:10,flexShrink:0}}/>
                  :<div style={{width:44,height:44,borderRadius:10,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{v.exercise.emoji}</div>
                }
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14,color:T.text}}>{v.name}</div>
                  <div style={{fontSize:12,color:T.sub,marginTop:2}}>{v.exercise.primary} · {v.material}</div>
                </div>
                <span style={{fontSize:20,color:already?T.accent:T.muted}}>{already?"✓":"+"}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── View: new routine form ──
  if(creating){
    return(
      <div className="page" style={{padding:"0 16px 100px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0 14px"}}>
          <BackBtn onClick={()=>{setCreating(false);setNewName("");setNewExercises([]);}} T={T}/>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:20,fontWeight:800,color:T.text}}>Nueva rutina</div>
        </div>
        <Card T={T} style={{marginBottom:14}}>
          <Input T={T} label="Nombre" value={newName} onChange={setNewName} placeholder="Ej: Pierna + Glúteo" style={{marginBottom:14}}/>
          <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>EMOJI</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            {EMOJIS_R.map(e=><button key={e} onClick={()=>setNewEmoji(e)} className="tap" style={{width:42,height:42,fontSize:20,borderRadius:12,cursor:"pointer",background:newEmoji===e?T.accent+"22":T.surface,border:`1px solid ${newEmoji===e?T.accent:T.border}`}}>{e}</button>)}
          </div>
          <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>COLOR</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {COLOR_OPTS.map(c=><div key={c} onClick={()=>setNewColor(c)} className="tap" style={{width:36,height:36,borderRadius:10,background:c,cursor:"pointer",border:`3px solid ${newColor===c?"#fff":c+"00"}`,boxShadow:newColor===c?`0 0 10px ${c}`:"none"}}/>)}
          </div>
        </Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:.5}}>EJERCICIOS ({newExercises.length})</div>
          <Btn T={T} onClick={()=>setPickingEx(true)} variant="ghost" style={{fontSize:12,padding:"7px 12px"}}>+ Añadir</Btn>
        </div>
        {newExercises.length===0&&(
          <div style={{textAlign:"center",padding:"20px 0",color:T.muted,fontSize:13}}>Añade al menos un ejercicio</div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {newExercises.map((e,i)=>{
            const v=getVar(e.varId,exercises);
            const isFirst=i===0;
            const isLast=i===newExercises.length-1;
            return(
              <Card key={e.varId} T={T} style={{borderLeft:`3px solid ${newColor}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  {/* Número y botones de orden */}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
                    <button onClick={()=>moveEx(e.varId,-1)} disabled={isFirst} className="tap" style={{
                      width:24,height:20,borderRadius:6,border:`1px solid ${T.border}`,
                      background:isFirst?"transparent":T.surface,color:isFirst?T.muted:T.sub,
                      cursor:isFirst?"default":"pointer",fontSize:10,display:"flex",
                      alignItems:"center",justifyContent:"center",padding:0}}>▲</button>
                    <div style={{width:24,height:20,borderRadius:6,background:newColor+"22",color:newColor,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:800,fontSize:12}}>{i+1}</div>
                    <button onClick={()=>moveEx(e.varId,1)} disabled={isLast} className="tap" style={{
                      width:24,height:20,borderRadius:6,border:`1px solid ${T.border}`,
                      background:isLast?"transparent":T.surface,color:isLast?T.muted:T.sub,
                      cursor:isLast?"default":"pointer",fontSize:10,display:"flex",
                      alignItems:"center",justifyContent:"center",padding:0}}>▼</button>
                  </div>
                  {/* Nombre y eliminar */}
                  <div style={{flex:1,fontWeight:600,fontSize:13,color:T.text,lineHeight:1.3}}>{v?v.name:""}</div>
                  <button onClick={()=>removeExFromNew(e.varId)} className="tap" style={{
                    background:"#ff444415",border:"1px solid #ff444430",borderRadius:8,
                    padding:"4px 8px",color:"#ff5555",fontSize:12,cursor:"pointer",flexShrink:0}}>✕</button>
                </div>
                {/* Series, reps, rir */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[["Series",e.sets,"sets"],["Reps",e.reps,"reps"],["RIR",e.rir,"rir"]].map(([label,val,field])=>(
                    <div key={field}>
                      <div style={{fontSize:10,color:T.muted,fontWeight:600,marginBottom:4}}>{label.toUpperCase()}</div>
                      <input type="number" value={val} min="0" onChange={ev=>updateExField(e.varId,field,ev.target.value)}
                        style={{width:"100%",background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:8,
                          padding:"7px 10px",color:T.text,fontSize:14,outline:"none",textAlign:"center"}}/>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
        <Btn T={T} onClick={saveRoutine} full style={{opacity:!newName.trim()||newExercises.length===0?0.4:1}}>
          ✓ Guardar rutina
        </Btn>
      </div>
    );
  }

  // ── View: list ──
  return(
    <div className="page" style={{padding:"0 16px 100px"}}>
      <div style={{padding:"24px 0 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <SectionTitle T={T}>MIS RUTINAS</SectionTitle>
        <Btn T={T} onClick={()=>setCreating(true)} style={{fontSize:13,padding:"9px 14px"}}>+ Nueva</Btn>
      </div>
      {myRoutines.length===0&&<div style={{textAlign:"center",color:T.sub,marginTop:60}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div>No tienes rutinas todavía</div></div>}
      <div className="stagger" style={{display:"flex",flexDirection:"column",gap:12}}>
        {myRoutines.map(r=>{
          const owner=profiles.find(p=>p.id===r.ownerId);
          const ownerColor=ACCENT_OPTIONS[owner?.accentIdx]?.val||T.accent;
          return(
            <Card key={r.id} T={T} accent={r.colorHex}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{cursor:"pointer",flex:1}} onClick={()=>setSelected(r)}>
                  <div style={{fontSize:28,marginBottom:6}}>{r.emoji}</div>
                  <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,color:T.text}}>{r.name}</div>
                  <div style={{color:T.sub,fontSize:13,marginTop:4}}>{r.exercises.length} ejercicios</div>
                  {owner&&owner.id!==profile.id&&<div style={{display:"flex",alignItems:"center",gap:5,marginTop:6}}><span style={{fontSize:13}}>{owner.emoji}</span><span style={{fontSize:12,color:ownerColor,fontWeight:600}}>de {owner.name}</span></div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  {r.exercises.slice(0,3).map((e,i)=>{const v=getVar(e.varId,exercises);return v&&v.photo&&v.photo.length>0?<img key={i} src={v.photo} alt="" style={{width:36,height:36,objectFit:"cover",borderRadius:8,cursor:"pointer"}} onClick={()=>setSelected(r)}/>:<Badge key={i} color={r.colorHex} T={T} style={{cursor:"pointer"}} onClick={()=>setSelected(r)}>{v&&v.exercise?v.exercise.emoji:""}</Badge>;})}
                </div>
              </div>
              <button onClick={()=>onStartWorkout&&onStartWorkout({id:Date.now(),userId:profile.id,routineId:r.id,date:new Date().toLocaleDateString("sv-SE"),status:"pending",objetivo:"",hora:""})} className="tap" style={{
                width:"100%",background:r.colorHex,border:"none",borderRadius:10,padding:"10px",
                color:"#000",fontSize:14,fontWeight:700,cursor:"pointer"}}>▶ Empezar ahora</button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─── CALENDAR ───────────────────────────────── */
function CalendarScreen({profile,profiles,sessions,setSessions,routines,exercises:exercises_prop,T}){
  const[view,setView]=useState("week");
  const[weekOffset,setWeekOffset]=useState(0);
  const[monthDate,setMonthDate]=useState(new Date());
  const[selectedDay,setSelectedDay]=useState(todayStr());
  const[showAdd,setShowAdd]=useState(false);
  const[newDate,setNewDate]=useState(todayStr());
  const[newRoutine,setNewRoutine]=useState(routines[0]?.id||1);
  const myRoutines=routines.filter(r=>r.sharedWith&&r.sharedWith.includes(profile.id)&&!r.archived);
  const mySessions=sessions.filter(s=>s.userId===profile.id);
  const hasSessions=date=>mySessions.filter(s=>s.date===date);
  const[newObjetivo,setNewObjetivo]=useState("Hipertrofia");
  const[newSharedWith,setNewSharedWith]=useState([]);
  const[isGroupSession,setIsGroupSession]=useState(false);
  const[newHora,setNewHora]=useState("09:00");
  const addSession=()=>{
    const groupId=Date.now();
    const participants=isGroupSession&&newSharedWith.length>0
      ?[profile.id,...newSharedWith]
      :[profile.id];
    const newSess=[...sessions];
    participants.forEach((uid,i)=>{
      newSess.push({
        id:groupId+i, userId:uid, date:newDate, hora:newHora,
        routineId:newRoutine==="free"?"free":+newRoutine, status:"pending",
        objetivo:newObjetivo,
        groupId:participants.length>1?groupId:null,
        groupParticipants:participants.length>1?participants:null
      });
    });
    setSessions(newSess);
    setShowAdd(false);setNewSharedWith([]);setIsGroupSession(false);
  };
  const toggleStatus=sid=>setSessions(sessions.map(s=>s.id===sid?{...s,status:s.status==="done"?"pending":s.status==="pending"?"done":"pending"}:s));
  const deleteSession=sid=>setSessions(sessions.filter(s=>s.id!==sid));

  const[editingSession,setEditingSession]=useState(null);
  const[editRoutine,setEditRoutine]=useState(null);
  const[editObjetivo,setEditObjetivo]=useState(null);
  const[editDate,setEditDate]=useState(null);
  const[editSharedWith,setEditSharedWith]=useState([]);
  const[editIsGroup,setEditIsGroup]=useState(false);
  const[editHora,setEditHora]=useState("");

  const saveEdit=()=>{
    const sid=editingSession;
    if(editIsGroup&&editSharedWith.length>0){
      // Update this session + create/update for other participants
      const groupId=Date.now();
      const participants=[profile.id,...editSharedWith];
      const updated=sessions.filter(s=>s.id!==sid);
      participants.forEach((uid,i)=>{
        updated.push({id:groupId+i,userId:uid,date:editDate,routineId:+editRoutine,
          status:"pending",objetivo:editObjetivo,groupId:groupId,groupParticipants:participants});
      });
      setSessions(updated);
    } else {
      setSessions(sessions.map(s=>s.id===sid?{...s,routineId:+editRoutine,objetivo:editObjetivo,date:editDate,hora:editHora,groupId:null,groupParticipants:null}:s));
    }
    setEditingSession(null);
  };

  const renderSessionCard=(s)=>{
    const isFree=s.routineId==="free";
    const r=isFree?{emoji:"🎲",name:"Rutina libre",colorHex:T.accent,exercises:[]}:getRoutine(s.routineId,routines);
    const groupMembers=s.groupParticipants?s.groupParticipants.map(uid=>profiles&&profiles.find(p=>p.id===uid)).filter(Boolean):[];
    const isEditing=editingSession===s.id;
    return(
    <Card key={s.id} T={T} accent={r?.colorHex} style={{marginBottom:10}}>
      {isEditing?(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:12,color:T.accent,fontWeight:700,marginBottom:4}}>EDITANDO SESIÓN</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Input T={T} label="Fecha" value={editDate} onChange={setEditDate} type="date"/>
            <Input T={T} label="Hora" value={editHora||""} onChange={v=>setEditHora(v)} type="time"/>
          </div>
          <div>
            <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>RUTINA</div>
            <select value={editRoutine} onChange={e=>setEditRoutine(e.target.value)} style={{width:"100%",background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:15}}>
              {myRoutines.map(r=><option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>OBJETIVO</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Hipertrofia","Fuerza","Definir y tonificar","Resistencia"].map(o=>(
                <button key={o} onClick={()=>setEditObjetivo(o)} className="tap" style={{
                  padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:600,cursor:"pointer",
                  background:editObjetivo===o?T.accent+"22":"transparent",
                  border:`1px solid ${editObjetivo===o?T.accent:T.border}`,
                  color:editObjetivo===o?T.accent:T.sub}}>
                  {OBJETIVO_ICONS[o]} {o}
                </button>
              ))}
            </div>
          </div>
          {/* Participantes en edición */}
          <div>
            <button onClick={()=>setEditIsGroup(!editIsGroup)} className="tap" style={{
              display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",
              borderRadius:12,background:editIsGroup?T.blue+"15":T.surface,
              border:`1px solid ${editIsGroup?T.blue:T.border}`,cursor:"pointer"}}>
              <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${editIsGroup?T.blue:T.muted}`,
                background:editIsGroup?T.blue:"transparent",display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:10,color:"#fff",flexShrink:0}}>
                {editIsGroup&&"✓"}
              </div>
              <span style={{fontSize:13,fontWeight:600,color:editIsGroup?T.blue:T.sub}}>👥 Sesión grupal</span>
            </button>
            {editIsGroup&&profiles&&(
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
                <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:2}}>¿QUIÉN SE UNE?</div>
                {profiles.filter(p=>p.id!==profile.id).map(p=>{
                  const color=ACCENT_OPTIONS[p.accentIdx]?.val||T.accent;
                  const checked=editSharedWith.includes(p.id);
                  return(
                    <button key={p.id} onClick={()=>setEditSharedWith(prev=>checked?prev.filter(id=>id!==p.id):[...prev,p.id])}
                      className="tap" style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                      borderRadius:10,background:checked?color+"15":T.surface,
                      border:`1px solid ${checked?color:T.border}`,cursor:"pointer"}}>
                      <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${checked?color:T.muted}`,
                        background:checked?color:"transparent",display:"flex",alignItems:"center",
                        justifyContent:"center",fontSize:10,color:"#000",flexShrink:0}}>
                        {checked&&"✓"}
                      </div>
                      <span style={{fontSize:18}}>{p.emoji}</span>
                      <span style={{fontSize:13,fontWeight:600,color:checked?color:T.text}}>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn T={T} onClick={saveEdit} full>✓ Guardar</Btn>
            <Btn T={T} onClick={()=>setEditingSession(null)} variant="ghost">✕</Btn>
          </div>
        </div>
      ):(
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{fontSize:24}}>{r?.emoji}</div><div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontWeight:600}}>{r?.name}</div>
                {s.groupId&&<span style={{fontSize:10,background:T.blue+"20",color:T.blue,border:`1px solid ${T.blue}33`,borderRadius:999,padding:"1px 7px",fontWeight:700}}>👥 GRUPAL</span>}
              </div>
              {groupMembers.length>0&&<div style={{display:"flex",gap:4,marginTop:4}}>{groupMembers.map(p=><span key={p.id} style={{fontSize:14}}>{p.emoji}</span>)}</div>}
              <div style={{fontSize:12,color:T.sub,marginTop:2}}>{r?.exercises.length} ejercicios{s.hora?" · "+s.hora:""}</div>
            </div></div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <StatusDot status={s.status} T={T}/>
              {s.objetivo&&<span style={{fontSize:10,color:T.accent,fontWeight:700}}>{OBJETIVO_ICONS[s.objetivo]||""} {s.objetivo}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>toggleStatus(s.id)} className="tap" style={{flex:1,background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px",color:T.sub,fontSize:12,cursor:"pointer"}}>{s.status==="done"?"↩ Deshacer":"✓ Completada"}</button>
            <button onClick={()=>{setEditingSession(s.id);setEditRoutine(s.routineId);setEditObjetivo(s.objetivo||"Hipertrofia");setEditDate(s.date);setEditHora(s.hora||"");setEditIsGroup(!!s.groupId);setEditSharedWith(s.groupParticipants?s.groupParticipants.filter(id=>id!==profile.id):[]);}} className="tap" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 12px",color:T.sub,fontSize:12,cursor:"pointer"}}>✏️</button>
            <button onClick={()=>deleteSession(s.id)} className="tap" style={{background:"#ff444415",border:"1px solid #ff444430",borderRadius:10,padding:"8px 12px",color:"#ff5555",fontSize:12,cursor:"pointer"}}>🗑</button>
          </div>
        </>
      )}
    </Card>
  );};

  // ── DAY VIEW ──
  const renderDay=()=>{
    const go=n=>{const d=new Date(selectedDay+"T12:00:00");d.setDate(d.getDate()+n);setSelectedDay(d.toISOString().split("T")[0]);};
    const ds=hasSessions(selectedDay);
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <button onClick={()=>go(-1)} className="tap" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",color:T.text,cursor:"pointer",fontSize:16}}>‹</button>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontFamily:"'Plus Jakarta Sans'",fontWeight:800,fontSize:15,textTransform:"capitalize",color:T.text}}>{fmtDay(selectedDay)}</div>
            {selectedDay===todayStr()&&<div style={{fontSize:11,color:T.accent,fontWeight:600,marginTop:2}}>HOY</div>}
          </div>
          <button onClick={()=>go(1)} className="tap" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",color:T.text,cursor:"pointer",fontSize:16}}>›</button>
        </div>
        {ds.length===0
          ?<Card T={T} style={{textAlign:"center",padding:28}}><div style={{fontSize:32,marginBottom:8}}>📭</div><div style={{color:T.sub}}>Nada planificado este día</div></Card>
          :ds.map(s=>renderSessionCard(s))}
      </div>
    );
  };

  // ── WEEK VIEW ──
  const renderWeek=()=>{
    const dates=getWeekDates(weekOffset);
    const allWeekSessions=mySessions.filter(s=>dates.includes(s.date));
    const weekDone=allWeekSessions.filter(s=>s.status==="done");
    const weekPend=allWeekSessions.filter(s=>s.status==="pending");
    const restDays=dates.filter(d=>!allWeekSessions.find(s=>s.date===d)).length;
    const totalSeries=weekDone.reduce((acc,s)=>{
      const r=getRoutine(s.routineId,routines);
      return acc+(r?r.exercises.reduce((a,e)=>a+e.sets,0):0);
    },0);
    const weekMuscles=[...new Set(weekDone.flatMap(s=>{
      const r=getRoutine(s.routineId,routines);
      if(!r) return [];
      return [...new Set(r.exercises.map(e=>{const v=getVar(e.varId,exercises_prop);return v?.exercise?.primary;}).filter(Boolean))];
    }))];

    return(
      <div>
        {/* Nav */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <button onClick={()=>setWeekOffset(o=>o-1)} className="tap" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",color:T.text,cursor:"pointer",fontSize:16}}>‹</button>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:13,color:T.sub,fontWeight:700}}>{weekOffset===0?"ESTA SEMANA":weekOffset===-1?"SEMANA PASADA":`Semana ${weekOffset>0?"+":""}${weekOffset}`}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>
              {new Date(dates[0]+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"})} — {new Date(dates[6]+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"})}
            </div>
          </div>
          <button onClick={()=>setWeekOffset(o=>o+1)} className="tap" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",color:T.text,cursor:"pointer",fontSize:16}}>›</button>
        </div>

        {/* ── Calendario compacto de 7 días ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:14}}>
          {dates.map((date,i)=>{
            const ds=hasSessions(date);
            const isToday=date===todayStr();
            const isSel=date===selectedDay;
            const done=ds.some(s=>s.status==="done");
            const pend=ds.some(s=>s.status==="pending");
            const routineColor=ds.length>0?getRoutine(ds[0].routineId,routines)?.colorHex:null;
            return(
              <div key={date} onClick={()=>setSelectedDay(date)} className="tap" style={{
                borderRadius:12,padding:"8px 4px",textAlign:"center",cursor:"pointer",
                background:isSel?T.accent+"22":isToday?T.accent+"10":T.card,
                border:`1px solid ${isToday?T.accent:isSel?T.accent+"88":T.border}`}}>
                <div style={{fontSize:9,color:isToday?T.accent:T.muted,fontWeight:700,marginBottom:3}}>{WEEKDAYS[i]}</div>
                <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:16,fontWeight:800,
                  color:isToday?T.accent:isSel?T.accent:T.text}}>{new Date(date+"T12:00:00").getDate()}</div>
                <div style={{height:5,display:"flex",justifyContent:"center",gap:2,marginTop:4}}>
                  {done&&<div style={{width:5,height:5,borderRadius:"50%",background:routineColor||T.blue}}/>}
                  {pend&&<div style={{width:5,height:5,borderRadius:"50%",background:T.accent}}/>}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Vista expandida: todos los días con su contenido ── */}
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
          {dates.map((date,i)=>{
            const ds=hasSessions(date);
            const isToday=date===todayStr();
            const isSel=date===selectedDay;
            const isEmpty=ds.length===0;
            return(
              <div key={date} onClick={()=>setSelectedDay(date)} className="tap" style={{
                borderRadius:14,overflow:"hidden",cursor:"pointer",
                border:`1px solid ${isToday?T.accent:isSel?T.accent+"55":T.border}`,
                background:isToday?T.accent+"08":T.card}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                  borderBottom:isEmpty||!ds.some(s=>s.objetivo)?"none":`1px solid ${T.border}44`}}>
                  {/* Día */}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                    width:34,flexShrink:0}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:.5,
                      color:isToday?T.accent:T.muted}}>{WEEKDAYS[i]}</div>
                    <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,lineHeight:1.1,
                      color:isToday?T.accent:T.text}}>{new Date(date+"T12:00:00").getDate()}</div>
                  </div>
                  {/* Contenido */}
                  <div style={{flex:1}}>
                    {isEmpty
                      ?<span style={{fontSize:12,color:T.muted,fontStyle:"italic"}}>Descanso 💤</span>
                      :<div style={{display:"flex",flexDirection:"column",gap:3}}>
                        {ds.map(s=>{
                          const r=getRoutine(s.routineId,routines);
                          return(
                            <div key={s.id} style={{display:"flex",alignItems:"center",gap:7}}>
                              <div style={{width:4,height:4,borderRadius:"50%",flexShrink:0,
                                background:s.status==="done"?T.blue:T.accent}}/>
                              <span style={{fontSize:13,fontWeight:600,color:r?.colorHex||T.text}}>{r?.emoji} {r?.name}</span>
                              <span style={{fontSize:11,color:T.muted,marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
                                {s.hora&&<span>{s.hora}</span>}
                                {s.status==="done"?"✓":"⏳"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    }
                  </div>
                  {isToday&&<div style={{background:T.accent,color:"#000",fontSize:9,
                    fontWeight:800,borderRadius:6,padding:"2px 7px",flexShrink:0}}>HOY</div>}
                </div>
                {/* Objetivo chips */}
                {!isEmpty&&ds.some(s=>s.objetivo)&&(
                  <div style={{display:"flex",gap:6,padding:"5px 14px 8px",flexWrap:"wrap"}}>
                    {ds.filter(s=>s.objetivo).map(s=>(
                      <span key={s.id} style={{fontSize:10,color:T.accent,fontWeight:600}}>
                        {OBJETIVO_ICONS[s.objetivo]} {s.objetivo}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Resumen semanal ── */}
        <Card T={T} style={{border:`1px solid ${T.border}`,marginBottom:14}}>
          <div style={{fontSize:11,color:T.sub,fontWeight:700,letterSpacing:.5,marginBottom:12}}>RESUMEN DE LA SEMANA</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            {[
              {icon:"✅",val:weekDone.length,label:"completadas",color:T.blue},
              {icon:"⏳",val:weekPend.length,label:"pendientes",color:T.accent},
              {icon:"💤",val:restDays,label:"descanso",color:T.muted},
            ].map(s=>(
              <div key={s.label} style={{textAlign:"center",background:T.surface,borderRadius:12,padding:"10px 6px"}}>
                <div style={{fontSize:18,marginBottom:2}}>{s.icon}</div>
                <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:22,fontWeight:800,color:s.color}}>{s.val}</div>
                <div style={{fontSize:10,color:T.muted,marginTop:1}}>{s.label}</div>
              </div>
            ))}
          </div>
          {totalSeries>0&&(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              background:T.surface,borderRadius:10,padding:"8px 12px",marginBottom:10}}>
              <span style={{fontSize:13,color:T.sub}}>Series completadas</span>
              <span style={{fontFamily:"'Plus Jakarta Sans'",fontSize:16,fontWeight:800,color:T.accent}}>{totalSeries}</span>
            </div>
          )}
          {weekMuscles.length>0&&(
            <div>
              <div style={{fontSize:10,color:T.muted,fontWeight:600,marginBottom:6}}>MÚSCULOS TRABAJADOS</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {weekMuscles.map(m=><Badge key={m} color={T.accent} T={T}>{m}</Badge>)}
              </div>
            </div>
          )}
          {weekDone.length===0&&weekPend.length===0&&(
            <div style={{textAlign:"center",color:T.muted,fontSize:13,padding:"4px 0"}}>Sin sesiones esta semana</div>
          )}
        </Card>

        {/* ── Detalle del día seleccionado ── */}
        {(()=>{
          const ds=hasSessions(selectedDay);
          if(ds.length===0) return null;
          return(
            <div>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:.5,marginBottom:10,textTransform:"capitalize"}}>{fmtDay(selectedDay)}</div>
              {ds.map(s=>renderSessionCard(s))}
            </div>
          );
        })()}
      </div>
    );
  };

  // ── MONTH VIEW ──
  const renderMonth=()=>{
    const year=monthDate.getFullYear(),month=monthDate.getMonth();
    const days=getMonthDates(year,month);
    const monthStr=`${year}-${String(month+1).padStart(2,"0")}`;
    const monthDone=mySessions.filter(s=>s.date.startsWith(monthStr)&&s.status==="done");
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <button onClick={()=>{const d=new Date(monthDate);d.setMonth(d.getMonth()-1);setMonthDate(d);}} className="tap" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",color:T.text,cursor:"pointer",fontSize:16}}>‹</button>
          <div style={{flex:1,textAlign:"center",fontFamily:"'Plus Jakarta Sans'",fontWeight:800,fontSize:18,color:T.text}}>{MONTHS_ES[month]} {year}</div>
          <button onClick={()=>{const d=new Date(monthDate);d.setMonth(d.getMonth()+1);setMonthDate(d);}} className="tap" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",color:T.text,cursor:"pointer",fontSize:16}}>›</button>
        </div>
        {monthDone.length>0&&(
          <Card T={T} style={{marginBottom:14,padding:"12px 14px",background:T.blue+"10",border:`1px solid ${T.blue}33`}}>
            <div style={{fontSize:11,color:T.blue,fontWeight:700,marginBottom:4}}>RESUMEN DEL MES</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:28,fontWeight:800,color:T.blue}}>{monthDone.length}</div>
              <div style={{color:T.sub,fontSize:13}}>sesiones completadas</div>
            </div>
          </Card>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
          {WEEKDAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:T.muted,fontWeight:700,padding:"4px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {days.map((date,i)=>{
            if(!date)return <div key={"e"+i}/>;
            const ds=hasSessions(date);
            const isToday=date===todayStr();
            const done=ds.some(s=>s.status==="done");
            const pend=ds.some(s=>s.status==="pending");
            return(
              <div key={date} onClick={()=>{setSelectedDay(date);setView("day");}} className="tap"
                style={{borderRadius:10,padding:"6px 2px",textAlign:"center",cursor:"pointer",
                  background:isToday?T.accent+"18":done?T.blue+"15":T.card,
                  border:`1px solid ${isToday?T.accent:done?T.blue+"44":T.border}`,
                  minHeight:44,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
                <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:14,fontWeight:800,color:isToday?T.accent:done?T.blue:T.text}}>{new Date(date+"T12:00:00").getDate()}</div>
                {(done||pend)&&<div style={{display:"flex",gap:2}}>{done&&<div style={{width:4,height:4,borderRadius:"50%",background:T.blue}}/>}{pend&&<div style={{width:4,height:4,borderRadius:"50%",background:T.accent}}/>}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return(
    <div className="page" style={{padding:"0 16px 100px"}}>
      <div style={{padding:"24px 0 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <SectionTitle T={T}>CALENDARIO</SectionTitle>
        <Btn T={T} onClick={()=>setShowAdd(!showAdd)} variant="ghost" style={{fontSize:13,padding:"9px 14px"}}>+ Sesión</Btn>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["day","Día"],["week","Semana"],["month","Mes"]].map(([v,l])=><Chip key={v} T={T} color={T.accent} active={view===v} onClick={()=>setView(v)}>{l}</Chip>)}
      </div>
      {showAdd&&(
        <Card T={T} style={{marginBottom:16,border:`1px solid ${T.accent}44`}}>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:15,fontWeight:800,marginBottom:12,color:T.text}}>NUEVA SESIÓN</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Input T={T} label="Fecha" value={newDate} onChange={setNewDate} type="date"/>
            <Input T={T} label="Hora" value={newHora} onChange={setNewHora} type="time"/>
            <div>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>RUTINA</div>
              <select value={newRoutine} onChange={e=>setNewRoutine(e.target.value)} style={{width:"100%",background:"#1c1c22",border:`1px solid ${T.border}`,borderRadius:11,padding:"11px 14px",color:T.text,fontSize:15}}>
                <option value="free">🎲 Rutina libre (elegir sobre la marcha)</option>
                {myRoutines.map(r=><option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:6}}>OBJETIVO DE LA SESIÓN</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["Hipertrofia","Fuerza","Definir y tonificar","Resistencia"].map(o=>(
                  <button key={o} onClick={()=>setNewObjetivo(o)} className="tap" style={{
                    padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:600,cursor:"pointer",
                    background:newObjetivo===o?T.accent+"22":"transparent",
                    border:`1px solid ${newObjetivo===o?T.accent:T.border}`,
                    color:newObjetivo===o?T.accent:T.sub}}>
                    {OBJETIVO_ICONS[o]} {o}
                  </button>
                ))}
              </div>
            </div>
            {/* Sesión grupal */}
            <div>
              <button onClick={()=>setIsGroupSession(!isGroupSession)} className="tap" style={{
                display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",
                borderRadius:12,background:isGroupSession?T.blue+"15":T.surface,
                border:`1px solid ${isGroupSession?T.blue:T.border}`,cursor:"pointer"}}>
                <div style={{width:20,height:20,borderRadius:4,border:`2px solid ${isGroupSession?T.blue:T.muted}`,
                  background:isGroupSession?T.blue:"transparent",display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>
                  {isGroupSession&&"✓"}
                </div>
                <span style={{fontSize:13,fontWeight:600,color:isGroupSession?T.blue:T.sub}}>👥 Sesión grupal</span>
              </button>
              {isGroupSession&&profiles&&(
                <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:2}}>¿QUIÉN SE UNE?</div>
                  {profiles.filter(p=>p.id!==profile.id).map(p=>{
                    const color=ACCENT_OPTIONS[p.accentIdx]?.val||T.accent;
                    const checked=newSharedWith.includes(p.id);
                    return(
                      <button key={p.id} onClick={()=>setNewSharedWith(prev=>checked?prev.filter(id=>id!==p.id):[...prev,p.id])}
                        className="tap" style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                        borderRadius:10,background:checked?color+"15":T.surface,
                        border:`1px solid ${checked?color:T.border}`,cursor:"pointer"}}>
                        <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${checked?color:T.muted}`,
                          background:checked?color:"transparent",display:"flex",alignItems:"center",
                          justifyContent:"center",fontSize:10,color:"#000",flexShrink:0}}>
                          {checked&&"✓"}
                        </div>
                        <span style={{fontSize:18}}>{p.emoji}</span>
                        <span style={{fontSize:13,fontWeight:600,color:checked?color:T.text}}>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn T={T} onClick={addSession} full>Añadir</Btn>
              <Btn T={T} onClick={()=>setShowAdd(false)} variant="ghost">✕</Btn>
            </div>
          </div>
        </Card>
      )}
      {view==="day"&&renderDay()}
      {view==="week"&&renderWeek()}
      {view==="month"&&renderMonth()}
    </div>
  );
}


/* ─── FREE WORKOUT (Rutina libre) ────────────── */
function FreeWorkoutScreen({session,profile,logs,setLogsState,exercises,routines,setRoutines,onFinish,T}){
  const[exList,setExList]=useState([]); // [{varId, sets:[{kg,reps,feel}]}]
  const[picking,setPicking]=useState(exList.length===0);
  const[pickFilter,setPickFilter]=useState("Todos");
  const[activeIdx,setActiveIdx]=useState(null);
  const[kg,setKg]=useState("");
  const[reps,setReps]=useState("");
  const[feel,setFeel]=useState("Bien");
  const[viewerSrc,setViewerSrc]=useState(null);
  const[showSaveDialog,setShowSaveDialog]=useState(false);
  const[saveRoutineName,setSaveRoutineName]=useState("");
  const[saveRoutineEmoji,setSaveRoutineEmoji]=useState("🎲");

  const allVars=exercises.flatMap(ex=>ex.variations.map(v=>({...v,exercise:ex})));
  const filteredVars=pickFilter==="Todos"?allVars:allVars.filter(v=>v.exercise.primary===pickFilter||v.exercise.secondary===pickFilter);

  const addExercise=(varId)=>{
    if(exList.find(e=>e.varId===varId)){setPicking(false);setActiveIdx(exList.findIndex(e=>e.varId===varId));return;}
    const newList=[...exList,{varId,sets:[]}];
    setExList(newList);
    setActiveIdx(newList.length-1);
    setPicking(false);
  };

  const logSet=async()=>{
    if(!kg||!reps||activeIdx===null) return;
    const s={kg:+kg,reps:+reps,feel,id:Date.now()};
    const newList=[...exList];
    newList[activeIdx]={...newList[activeIdx],sets:[...newList[activeIdx].sets,s]};
    setExList(newList);
    setKg("");setReps("");
    try{
      const res=await sb.post("registro_series",{
        sesion_id:session.id,usuario_id:profile.id,variacion_id:newList[activeIdx].varId,
        serie:newList[activeIdx].sets.length,peso_kg:s.kg,repeticiones:s.reps,sensacion:s.feel
      });
      setLogsState(prev=>[...prev,{id:s.id,userId:profile.id,sessionId:session.id,varId:newList[activeIdx].varId,set:newList[activeIdx].sets.length,kg:s.kg,reps:s.reps,feel:s.feel}]);
    }catch(e){console.error("Error guardando serie:",e);}
  };

  const totalSets=exList.reduce((a,e)=>a+e.sets.length,0);

  const confirmFinish=()=>{
    if(exList.length>0) setShowSaveDialog(true);
    else onFinish();
  };

  const saveAsRoutine=async()=>{
    if(!saveRoutineName.trim()) { onFinish(); return; }
    const r={
      id:Date.now(),ownerId:profile.id,sharedWith:[profile.id],
      name:saveRoutineName.trim(),emoji:saveRoutineEmoji,colorHex:"#c8f060",
      exercises:exList.map(e=>({varId:e.varId,sets:e.sets.length||3,reps:"10",rir:2}))
    };
    setRoutines([...routines,r]);
    try{
      const res=await sb.post("rutinas",{owner_id:r.ownerId,shared_with:r.sharedWith,nombre:r.name,emoji:r.emoji,color_hex:r.colorHex});
      if(res&&res[0]){
        const newId=res[0].id;
        for(let i=0;i<r.exercises.length;i++){
          const e=r.exercises[i];
          await sb.post("rutina_ejercicios",{rutina_id:newId,variacion_id:e.varId,orden:i,series:e.sets,reps:e.reps,rir:e.rir});
        }
      }
    }catch(e){console.error("Error guardando rutina:",e);}
    onFinish();
  };

  if(picking){
    return(
      <div className="page" style={{padding:"0 16px 100px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0 16px"}}>
          {exList.length>0&&<BackBtn onClick={()=>setPicking(false)} T={T}/>}
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:T.sub,fontWeight:600}}>RUTINA LIBRE</div>
            <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,color:T.text}}>Elige un ejercicio</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:12,marginBottom:14}}>
          {["Todos",...MUSCLE_GROUPS].map(g=><Chip key={g} T={T} color={T.accent} active={pickFilter===g} onClick={()=>setPickFilter(g)}>{g}</Chip>)}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filteredVars.map(v=>{
            const already=exList.find(e=>e.varId===v.id);
            return(
              <div key={v.id} onClick={()=>addExercise(v.id)} className="tap" style={{
                display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,
                background:already?T.accent+"15":T.card,border:`1px solid ${already?T.accent+"55":T.border}`,cursor:"pointer"}}>
                {v.photo&&v.photo.length>4?<img src={v.photo} alt="" style={{width:44,height:44,objectFit:"cover",borderRadius:10,flexShrink:0}}/>:
                <div style={{width:44,height:44,borderRadius:10,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{v.exercise.emoji}</div>}
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:T.text}}>{v.name}</div><div style={{fontSize:12,color:T.sub,marginTop:2}}>{v.exercise.primary} · {v.material}</div></div>
                {already&&<span style={{color:T.accent,fontSize:18}}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if(showSaveDialog){
    return(
      <div className="page" style={{padding:"0 16px 100px"}}>
        <div style={{padding:"24px 0 16px"}}>
          <div style={{fontSize:40,marginBottom:10,textAlign:"center"}}>💾</div>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:20,fontWeight:800,textAlign:"center",marginBottom:6}}>¿Guardar como rutina?</div>
          <div style={{fontSize:13,color:T.sub,textAlign:"center"}}>Podrás reutilizarla más adelante</div>
        </div>
        <Card T={T} style={{marginBottom:16}}>
          <Input T={T} label="Nombre de la rutina" value={saveRoutineName} onChange={setSaveRoutineName} placeholder="Ej: Pierna improvisada"/>
        </Card>
        <Btn T={T} onClick={saveAsRoutine} full style={{marginBottom:10}}>✓ Guardar y terminar</Btn>
        <Btn T={T} onClick={onFinish} variant="ghost" full>No guardar, solo terminar</Btn>
      </div>
    );
  }

  const active=exList[activeIdx];
  const v=active?getVar(active.varId,exercises):null;
  const lastWeight=active?(()=>{const pl=logs.filter(l=>l.userId===profile.id&&l.varId===active.varId&&l.sessionId!==session.id);return pl.length>0?pl[pl.length-1].kg:null;})():null;

  return(
    <div className="page" style={{padding:"0 16px 100px"}}>
      {viewerSrc&&<ImageViewer src={viewerSrc} onClose={()=>setViewerSrc(null)}/>}
      <div style={{padding:"20px 0 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:11,color:T.sub,fontWeight:600}}>RUTINA LIBRE</div><div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:20,fontWeight:800}}>{totalSets} series · {exList.length} ejercicios</div></div>
        <Btn T={T} onClick={confirmFinish} variant="ghost" style={{fontSize:13,padding:"9px 14px"}}>Terminar</Btn>
      </div>

      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:12,marginBottom:16}}>
        {exList.map((e,i)=>{const ev=getVar(e.varId,exercises);return(
          <div key={i} onClick={()=>setActiveIdx(i)} className="tap" style={{flexShrink:0,padding:"8px 14px",borderRadius:12,
            background:i===activeIdx?T.accent+"22":T.card,border:`1px solid ${i===activeIdx?T.accent:T.border}`,
            color:i===activeIdx?T.accent:T.sub,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            {ev?.exercise?.emoji} {ev?.name} ({e.sets.length})
          </div>
        );})}
        <button onClick={()=>setPicking(true)} className="tap" style={{flexShrink:0,padding:"8px 14px",borderRadius:12,
          background:T.accent,border:"none",color:"#000",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Añadir</button>
      </div>

      {active&&v&&(<>
        <Card T={T} accent={T.accent} style={{marginBottom:16}}>
          {v.photo&&v.photo.length>4&&<img src={v.photo} alt="" onClick={()=>setViewerSrc(v.photo)} style={{width:"100%",height:140,objectFit:"cover",borderRadius:10,marginBottom:12,cursor:"zoom-in"}}/>}
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800}}>{v.name}</div>
          <div style={{color:T.sub,fontSize:13,marginTop:4}}>{v.exercise?.primary}</div>
          {lastWeight&&<div style={{marginTop:8,background:T.blue+"15",border:`1px solid ${T.blue}33`,borderRadius:8,padding:"5px 10px",display:"inline-block"}}>
            <span style={{fontSize:11,color:T.blue,fontWeight:700}}>Última vez: {lastWeight}kg</span>
          </div>}
        </Card>

        {active.sets.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>SERIES</div>
            {active.sets.map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",marginBottom:6}}>
                <span style={{color:T.blue,fontWeight:700,fontSize:13}}>Serie {i+1}</span>
                <span style={{fontSize:14}}>{s.kg} kg · {s.reps} reps</span>
                <Badge color={T.blue} T={T}>{s.feel}</Badge>
              </div>
            ))}
          </div>
        )}

        <Card T={T}>
          <div style={{fontSize:13,color:T.sub,fontWeight:600,marginBottom:12}}>SERIE {active.sets.length+1}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <Input T={T} label="Kilos" value={kg} onChange={setKg} type="number" placeholder={lastWeight?String(lastWeight):"0"}/>
            <Input T={T} label="Reps" value={reps} onChange={setReps} type="number" placeholder="0"/>
          </div>
          <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>SENSACIÓN</div>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            {FEELS.map(f=><Chip key={f} T={T} color={T.accent} active={feel===f} onClick={()=>setFeel(f)}>{f}</Chip>)}
          </div>
          <Btn T={T} onClick={logSet} full>✓ Registrar serie</Btn>
        </Card>
      </>)}
    </div>
  );
}

/* ─── WORKOUT ────────────────────────────────── */
function WorkoutScreen({session,profile,logs,setLogs,setLogsState,routines,exercises,onFinish,onPause,T}){
  const routine=getRoutine(session.routineId,routines);
  const[step,setStep]=useState(0);
  const[setsPerEx,setSetsPerEx]=useState({}); // {stepIndex: [sets]}
  const[kg,setKg]=useState("");
  const[reps,setReps]=useState("");
  const[feel,setFeel]=useState("Bien");
  const[editingSet,setEditingSet]=useState(null);
  const[editKg,setEditKg]=useState("");
  const[editReps,setEditReps]=useState("");
  const[viewerSrc,setViewerSrc]=useState(null);
  const[swappingEx,setSwappingEx]=useState(false);
  const[swapFilter,setSwapFilter]=useState("Todos");
  const[swappedVarId,setSwappedVarId]=useState(null);
  const[addingExToWorkout,setAddingExToWorkout]=useState(false);
  const[addExFilter,setAddExFilter]=useState("Todos");
  const sets=setsPerEx[step]||[];
  const setSets=(newSets)=>setSetsPerEx(prev=>({...prev,[step]:typeof newSets==="function"?newSets(prev[step]||[]):newSets}));

  const curEx=routine?.exercises[step];
  const effectiveVarId=swappedVarId||curEx?.varId;
  const curVar=curEx?getVar(effectiveVarId,exercises):null;
  const targetSets=curEx?.sets||3;
  const progress=routine?((step+sets.length/targetSets)/routine.exercises.length):0;

  // Get last weight for CURRENT exercise (use effectiveVarId so it updates when swapped)
  const prevLogs=logs.filter(l=>l.userId===profile.id&&l.varId===effectiveVarId&&l.sessionId!==session.id);
  const lastWeight=prevLogs.length>0?prevLogs[prevLogs.length-1].kg:null;
  const lastReps=prevLogs.length>0?prevLogs[prevLogs.length-1].reps:null;

  const logSet=async()=>{
    if(!kg||!reps)return;
    const s={id:Date.now(),userId:profile.id,sessionId:session.id,varId:effectiveVarId,set:sets.length+1,kg:+kg,reps:+reps,feel};
    setSets([...sets,s]);
    setLogsState(prev=>[...prev,s]);
    setKg("");setReps("");
    // Save directly to Supabase
    try{
      await sb.post("registro_series",{
        sesion_id:s.sessionId, usuario_id:s.userId,
        variacion_id:s.varId, serie:s.set,
        peso_kg:s.kg, repeticiones:s.reps, sensacion:s.feel
      });
    }catch(e){console.error("Error guardando serie:",e);}
    if(sets.length+1>=targetSets&&step+1<routine.exercises.length)
      setTimeout(()=>{setStep(step+1);setSwappedVarId(null);setKg("");setReps("");},400);
  };

  const saveEditSet=(idx)=>{
    const updated=[...sets];
    const oldSet=updated[idx];
    updated[idx]={...oldSet,kg:+editKg,reps:+editReps};
    setSets(updated);
    // Update in logs too
    setLogs(logs.map(l=>l.id===oldSet.id?{...l,kg:+editKg,reps:+editReps}:l));
    setEditingSet(null);
  };

  return(
    <div className="page" style={{padding:"0 16px 100px"}}>
      {viewerSrc&&<ImageViewer src={viewerSrc} onClose={()=>setViewerSrc(null)}/>}
      <div style={{padding:"20px 0 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:11,color:T.sub,fontWeight:600}}>ENTRENANDO</div><div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:22,fontWeight:800}}>{routine?.name}</div></div>
        <div style={{display:"flex",gap:8}}>
          {onPause&&<Btn T={T} onClick={onPause} variant="ghost" style={{fontSize:13,padding:"9px 14px"}}>⏸ Pausar</Btn>}
          <Btn T={T} onClick={onFinish} variant="ghost" style={{fontSize:13,padding:"9px 14px"}}>Terminar</Btn>
        </div>
      </div>
      <div style={{height:4,background:T.border,borderRadius:999,marginBottom:20}}>
        <div style={{height:"100%",width:`${progress*100}%`,background:T.accent,borderRadius:999,transition:"width .4s"}}/>
      </div>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:12,marginBottom:20}}>
        {routine?.exercises.map((e,i)=>{const v=getVar(e.varId,exercises);const done=(setsPerEx[i]||[]).length>=(routine?.exercises[i]?.sets||3);const active=i===step;return(
          <div key={i} onClick={()=>{setStep(i);setSwappedVarId(null);setSwappingEx(false);setKg("");setReps("");}} className="tap" style={{flexShrink:0,padding:"8px 14px",borderRadius:12,background:active?T.accent+"22":done?T.blue+"15":T.card,border:`1px solid ${active?T.accent:done?T.blue+"44":T.border}`,color:active?T.accent:done?T.blue:T.sub,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            {done?"✓ ":""}{v?.exercise?.emoji} {v?.exercise?.name}
          </div>
        );})}
        <button onClick={()=>setAddingExToWorkout(true)} className="tap" style={{flexShrink:0,padding:"8px 14px",borderRadius:12,background:T.accent,border:"none",color:"#000",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Añadir</button>
      </div>
      {curVar&&(<>
        <Card T={T} accent={T.accent} style={{marginBottom:16}}>
          {curVar.video&&curVar.video.length>4&&(()=>{
            const ytMatch=curVar.video.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
            return ytMatch?(
              <div style={{position:"relative",paddingBottom:"56.25%",height:0,borderRadius:10,overflow:"hidden",marginBottom:12}}>
                <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Tutorial"/>
              </div>
            ):null;
          })()}
          {(!curVar.video||!curVar.video.length)&&curVar.photo&&curVar.photo.length>4&&(
            <img src={curVar.photo} alt="" onClick={()=>setViewerSrc(curVar.photo)}
              style={{width:"100%",height:140,objectFit:"cover",borderRadius:10,marginBottom:12,cursor:"zoom-in"}}/>
          )}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600}}>EJERCICIO {step+1} / {routine.exercises.length}</div>
              <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,marginTop:4}}>{curVar.name}</div>
              <div style={{color:T.sub,fontSize:13,marginTop:4}}>Objetivo: {targetSets} series · {curEx.reps} reps · RIR {curEx.rir}</div>
              {lastWeight&&<div style={{marginTop:8,background:T.blue+"15",border:`1px solid ${T.blue}33`,borderRadius:8,padding:"5px 10px",display:"inline-block"}}>
                <span style={{fontSize:11,color:T.blue,fontWeight:700}}>Última vez: {lastWeight}kg × {lastReps} reps</span>
              </div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
              {(!curVar.photo||curVar.photo.length<4)&&<div style={{fontSize:36}}>{curVar.exercise?.emoji}</div>}
              <button onClick={()=>setSwappingEx(true)} className="tap" style={{
                background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,
                padding:"5px 10px",color:T.sub,fontSize:11,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
                🔄 Cambiar
              </button>
            </div>
          </div>
        </Card>

        {addingExToWorkout&&(()=>{
          const allVars=exercises.flatMap(ex=>ex.variations.map(v=>({...v,exercise:ex})));
          const filtered=addExFilter==="Todos"?allVars:allVars.filter(v=>v.exercise.primary===addExFilter||v.exercise.secondary===addExFilter);
          const existingVarIds=new Set(routine.exercises.map(e=>e.varId));
          return(
            <Card T={T} style={{marginBottom:16,border:`1px solid ${T.accent}44`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:13,color:T.accent,fontWeight:700}}>AÑADIR EJERCICIO</div>
                <button onClick={()=>{setAddingExToWorkout(false);setAddExFilter("Todos");}} className="tap"
                  style={{background:"none",border:"none",color:T.muted,fontSize:16,cursor:"pointer"}}>✕</button>
              </div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:10}}>
                {["Todos",...MUSCLE_GROUPS].map(g=><Chip key={g} T={T} color={T.accent} active={addExFilter===g} onClick={()=>setAddExFilter(g)}>{g}</Chip>)}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:260,overflowY:"auto"}}>
                {filtered.filter(v=>!existingVarIds.has(v.id)).map(v=>(
                  <div key={v.id} onClick={()=>{
                    const newExercise={varId:v.id,sets:3,reps:"10",rir:2};
                    routine.exercises.push(newExercise);
                    setStep(routine.exercises.length-1);
                    setSwappedVarId(null);setKg("");setReps("");
                    setAddingExToWorkout(false);setAddExFilter("Todos");
                  }} className="tap" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:T.surface,border:`1px solid ${T.border}`,cursor:"pointer"}}>
                    {v.photo&&v.photo.length>4?<img src={v.photo} alt="" style={{width:40,height:40,objectFit:"cover",borderRadius:8,flexShrink:0}}/>:
                    <div style={{width:40,height:40,borderRadius:8,background:T.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{v.exercise.emoji}</div>}
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text}}>{v.name}</div><div style={{fontSize:11,color:T.sub,marginTop:1}}>{v.exercise.primary} · {v.material}</div></div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {swappingEx&&(()=>{
          const allVars=exercises.flatMap(ex=>ex.variations.map(v=>({...v,exercise:ex})));
          return(
            <Card T={T} style={{marginBottom:16,border:`1px solid ${T.accent}44`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:13,color:T.accent,fontWeight:700}}>CAMBIAR EJERCICIO</div>
                <button onClick={()=>{setSwapFilter("Todos");setSwappingEx(false);}} className="tap"
                  style={{background:"none",border:"none",color:T.muted,fontSize:16,cursor:"pointer"}}>✕</button>
              </div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:10}}>
                {["Todos",...MUSCLE_GROUPS].map(g=><Chip key={g} T={T} color={T.accent} active={swapFilter===g} onClick={()=>setSwapFilter(g)}>{g}</Chip>)}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto"}}>
                {allVars.filter(v=>swapFilter==="Todos"||(v.exercise.primary===swapFilter||v.exercise.secondary===swapFilter)).map(v=>(
                  <div key={v.id} onClick={()=>{
                    setSwappingEx(false);setSwapFilter("Todos");
                    setSwappedVarId(v.id);
                    setKg("");setReps("");setFeel("Bien");
                  }} className="tap" style={{
                    display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                    borderRadius:10,background:v.id===curEx.varId?T.accent+"15":T.surface,
                    border:`1px solid ${v.id===curEx.varId?T.accent:T.border}`,cursor:"pointer"}}>
                    {v.photo&&v.photo.length>4
                      ?<img src={v.photo} alt="" style={{width:40,height:40,objectFit:"cover",borderRadius:8,flexShrink:0}}/>
                      :<div style={{width:40,height:40,borderRadius:8,background:T.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{v.exercise.emoji}</div>}
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{v.name}</div>
                      <div style={{fontSize:11,color:T.sub,marginTop:1}}>{v.exercise.primary} · {v.material}</div>
                    </div>
                    {v.id===curEx.varId&&<span style={{color:T.accent,fontSize:12}}>Actual</span>}
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {sets.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>SERIES COMPLETADAS</div>
            {sets.map((s,i)=>(
              editingSet===i?(
                <div key={i} style={{background:T.card,border:`1px solid ${T.accent}55`,borderRadius:10,padding:"12px 14px",marginBottom:6}}>
                  <div style={{fontSize:12,color:T.accent,fontWeight:700,marginBottom:8}}>Editando serie {i+1}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <Input T={T} label="Kilos" value={editKg} onChange={setEditKg} type="number"/>
                    <Input T={T} label="Reps" value={editReps} onChange={setEditReps} type="number"/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn T={T} onClick={()=>saveEditSet(i)} full style={{fontSize:12,padding:"9px"}}>✓ Guardar</Btn>
                    <Btn T={T} onClick={()=>setEditingSet(null)} variant="ghost" style={{fontSize:12,padding:"9px"}}>✕</Btn>
                  </div>
                </div>
              ):(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",marginBottom:6}}>
                  <span style={{color:T.blue,fontWeight:700,fontSize:13}}>Serie {i+1}</span>
                  <span style={{fontSize:14}}>{s.kg} kg · {s.reps} reps</span>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <Badge color={T.blue} T={T}>{s.feel}</Badge>
                    <button onClick={()=>{setEditingSet(i);setEditKg(String(s.kg));setEditReps(String(s.reps));}} className="tap"
                      style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,padding:"2px 7px",color:T.sub,fontSize:12,cursor:"pointer"}}>✏️</button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {sets.length<targetSets&&(
          <Card T={T}>
            <div style={{fontSize:13,color:T.sub,fontWeight:600,marginBottom:12}}>SERIE {sets.length+1} DE {targetSets}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <Input T={T} label="Kilos" value={kg} onChange={setKg} type="number" placeholder={lastWeight?String(lastWeight):"0"}/>
              <Input T={T} label="Reps"  value={reps} onChange={setReps} type="number" placeholder={lastReps?String(lastReps):"0"}/>
            </div>
            <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>SENSACIÓN</div>
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
              {FEELS.map(f=><Chip key={f} T={T} color={T.accent} active={feel===f} onClick={()=>setFeel(f)}>{f}</Chip>)}
            </div>
            <Btn T={T} onClick={logSet} full>✓ Registrar serie</Btn>
          </Card>
        )}

        {sets.length>=targetSets&&step+1<(routine?.exercises.length||0)&&(
          <Card T={T} style={{textAlign:"center",padding:24,border:`1px solid ${T.accent}44`}}>
            <div style={{fontSize:32,marginBottom:8}}>💪</div>
            <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,marginBottom:4}}>¡Ejercicio completado!</div>
            <div style={{color:T.sub,fontSize:13,marginBottom:16}}>Tómate un descanso</div>
            <Btn T={T} onClick={()=>{setStep(step+1);setSwappedVarId(null);setKg("");setReps("");}} full>→ Siguiente ejercicio</Btn>
          </Card>
        )}
        {sets.length>=targetSets&&step+1>=(routine?.exercises.length||0)&&(
          <Card T={T} style={{textAlign:"center",padding:24,border:`1px solid ${T.accent}44`,background:`linear-gradient(135deg,${T.accent}08,${T.card})`}}>
            <div style={{fontSize:48,marginBottom:8}}>🏆</div>
            <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:22,fontWeight:800,marginBottom:4,color:T.accent}}>¡ENTRENO COMPLETADO!</div>
            <div style={{color:T.sub,fontSize:13,marginBottom:20}}>Has registrado todas las series</div>
            <Btn T={T} onClick={onFinish} full>Guardar y salir</Btn>
          </Card>
        )}
      </>)}
    </div>
  );
}

/* ─── PROGRESS ───────────────────────────────── */
function ProgressScreen({profile,logs,setLogs,exercises,sessions,T}){
  const[view,setView]=useState("ejercicios");
  const[editingLog,setEditingLog]=useState(null);
  const[editLogKg,setEditLogKg]=useState("");
  const[editLogReps,setEditLogReps]=useState("");
  const myLogs=logs.filter(l=>l.userId===profile.id);
  const mySessions=sessions.filter(s=>s.userId===profile.id);
  const doneSessions=mySessions.filter(s=>s.status==="done");

  // Group logs by variation
  const byVar=myLogs.reduce((acc,l)=>{(acc[l.varId]=acc[l.varId]||[]).push(l);return acc;},{});
  const entries=Object.entries(byVar);

  // Group sessions by week
  const byWeek=doneSessions.reduce((acc,s)=>{
    const d=new Date(s.date+"T12:00:00");
    d.setDate(d.getDate()-((d.getDay()+6)%7));
    const wk=d.toISOString().split("T")[0];
    (acc[wk]=acc[wk]||[]).push(s);
    return acc;
  },{});
  const weeks=Object.keys(byWeek).sort();

  // Muscles worked per week
  const musclesByWeek=weeks.map(wk=>{
    const wkSessions=byWeek[wk];
    const varIds=myLogs.filter(l=>wkSessions.find(s=>s.id===l.sessionId)).map(l=>l.varId);
    const muscles=[...new Set(varIds.map(vid=>{const v=getVar(vid,exercises);return v?.exercise?.primary;}).filter(Boolean))];
    return{wk,sessions:wkSessions.length,muscles};
  });

  // Muscles frequency overall
  const muscleFreq=myLogs.reduce((acc,l)=>{
    const v=getVar(l.varId,exercises);
    const m=v?.exercise?.primary;
    if(m) acc[m]=(acc[m]||0)+1;
    return acc;
  },{});
  const muscleEntries=Object.entries(muscleFreq).sort((a,b)=>b[1]-a[1]);
  const maxFreq=muscleEntries.length?muscleEntries[0][1]:1;

  const fmtWeek=wk=>{
    const d=new Date(wk+"T12:00:00");
    return d.toLocaleDateString("es-ES",{day:"numeric",month:"short"});
  };

  return(
    <div className="page" style={{padding:"0 16px 100px"}}>
      <div style={{padding:"24px 0 14px"}}><SectionTitle T={T}>PROGRESO</SectionTitle></div>

      {/* View tabs */}
      <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
        {[["ejercicios","Por ejercicio"],["musculos","Por músculo"],["resumen","Resumen"],["sesiones","Sesiones"]].map(([v,l])=>(
          <Chip key={v} T={T} color={T.accent} active={view===v} onClick={()=>setView(v)}>{l}</Chip>
        ))}
      </div>

      {/* ── RESUMEN ── */}
      {view==="resumen"&&(
        <div>
          {/* Stats cards */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
            {[
              {label:"Sesiones completadas",val:doneSessions.length,color:T.accent,icon:"✅"},
              {label:"Series totales",val:myLogs.length,color:T.blue,icon:"💪"},
              {label:"Ejercicios distintos",val:Object.keys(byVar).length,color:T.purple,icon:"🏋️"},
              {label:"Semanas activas",val:weeks.length,color:"#4ade80",icon:"📅"},
            ].map(s=>(
              <Card key={s.label} T={T} style={{textAlign:"center",padding:"14px 10px"}}>
                <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
                <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:28,fontWeight:800,color:s.color}}>{s.val}</div>
                <div style={{fontSize:11,color:T.sub,marginTop:4,lineHeight:1.3}}>{s.label}</div>
              </Card>
            ))}
          </div>
          {/* Weekly sessions chart */}
          {weeks.length>0&&(
            <Card T={T} style={{marginBottom:14}}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:14}}>SESIONES POR SEMANA</div>
              <div style={{display:"flex",gap:6,alignItems:"flex-end",height:80}}>
                {musclesByWeek.map((w,i)=>{
                  const h=Math.max(8,(w.sessions/Math.max(...musclesByWeek.map(x=>x.sessions)))*80);
                  const isLast=i===musclesByWeek.length-1;
                  return(
                    <div key={w.wk} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{width:"100%",height:h,background:isLast?T.accent:T.accent+"44",borderRadius:"4px 4px 0 0",transition:"height .3s"}}/>
                      <div style={{fontSize:9,color:T.muted,textAlign:"center"}}>{fmtWeek(w.wk)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {/* Objetivo */}
          {profile.objetivo&&(
            <Card T={T} style={{marginBottom:14,border:`1px solid ${T.accent}33`}}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>MI OBJETIVO</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:32}}>{OBJETIVO_ICONS[profile.objetivo]||"🎯"}</span>
                <div>
                  <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:17,fontWeight:800,color:T.text}}>{profile.objetivo}</div>
                  {profile.pesoInicio&&<div style={{fontSize:12,color:T.sub,marginTop:2}}>Peso inicio: {profile.pesoInicio} kg</div>}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── POR MÚSCULO ── */}
      {view==="musculos"&&(
        <div>
          {muscleEntries.length===0&&<div style={{textAlign:"center",color:T.sub,marginTop:60}}><div style={{fontSize:48,marginBottom:12}}>🏋️</div><div>Registra entrenamientos para ver estadísticas</div></div>}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {muscleEntries.map(([muscle,count])=>(
              <Card key={muscle} T={T}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:15,color:T.text}}>{muscle}</div>
                  <Badge color={T.accent} T={T}>{count} series</Badge>
                </div>
                <div style={{height:8,background:T.surface,borderRadius:999}}>
                  <div style={{height:"100%",width:`${(count/maxFreq)*100}%`,background:T.accent,borderRadius:999,transition:"width .4s"}}/>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── POR EJERCICIO ── */}
      {view==="ejercicios"&&(
        <div>
          {entries.length===0&&<div style={{textAlign:"center",color:T.sub,marginTop:60}}><div style={{fontSize:48,marginBottom:12}}>📈</div><div>Registra entrenamientos para ver tu progreso</div></div>}
          <div className="stagger" style={{display:"flex",flexDirection:"column",gap:14}}>
            {entries.map(([varId,varLogs])=>{
              const v=getVar(varId,exercises);
              const sorted=[...varLogs].sort((a,b)=>a.id-b.id);
              const kgs=sorted.map(l=>Number(l.kg)||0);
              const maxKg=kgs.length>0?Math.max.apply(null,kgs):0;
              const rawDiff=kgs.length>1?kgs[kgs.length-1]-kgs[0]:0;
              const diff=isNaN(rawDiff)?0:rawDiff;
              return(
                <div key={varId} style={{background:T.card,border:`1px solid ${diff>0?T.accent:T.border}`,borderRadius:18,padding:16}}>
                  {v&&v.photo&&v.photo.length>0&&(
                    <img src={v.photo} alt="" style={{width:"100%",height:90,objectFit:"cover",borderRadius:10,marginBottom:12}}/>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{fontSize:11,color:T.sub,fontWeight:600}}>{v&&v.exercise?v.exercise.name:""}</div>
                      <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:15,fontWeight:800,marginTop:2,color:T.text}}>{v?v.name:"Ejercicio"}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:20,fontWeight:800,color:diff>=0?T.accent:T.accent2}}>
                        {diff>0?"+":""}{diff.toFixed(1)} kg
                      </div>
                      <div style={{fontSize:10,color:T.sub}}>progresión</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:3,alignItems:"flex-end",height:36,marginBottom:8}}>
                    {sorted.map((l,i)=>{
                      const h=maxKg>0?Math.max(4,(Number(l.kg)/maxKg)*36):4;
                      return <div key={i} style={{flex:1,height:h,background:T.accent+"55",borderRadius:3,minWidth:3}}/>;
                    })}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:11,color:T.sub}}>{sorted.length} series</div>
                    <div style={{fontSize:12}}><span style={{color:T.sub}}>Máx: </span><span style={{color:T.accent,fontWeight:700}}>{maxKg} kg</span></div>
                  </div>
                  {sorted.map((l)=>(
                    editingLog===l.id?(
                      <div key={l.id} style={{background:T.surface,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                        <div style={{fontSize:11,color:T.accent,fontWeight:700,marginBottom:8}}>Editando serie {l.set}</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                          <Input T={T} label="Kilos" value={editLogKg} onChange={setEditLogKg} type="number"/>
                          <Input T={T} label="Reps" value={editLogReps} onChange={setEditLogReps} type="number"/>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <Btn T={T} onClick={async()=>{
                            setLogs(logs.map(x=>x.id===l.id?{...x,kg:+editLogKg,reps:+editLogReps}:x));
                            setEditingLog(null);
                            try{ await sb.patch("registro_series",`id=eq.${l.id}`,{peso_kg:+editLogKg,repeticiones:+editLogReps}); }
                            catch(e){ console.error("Error editando serie:",e); }
                          }} full style={{fontSize:12,padding:"9px"}}>✓</Btn>
                          <Btn T={T} onClick={()=>setEditingLog(null)} variant="ghost" style={{fontSize:12,padding:"9px"}}>✕</Btn>
                        </div>
                      </div>
                    ):(
                      <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:4}}>
                        <span style={{fontSize:12,color:T.sub}}>Serie {l.set}</span>
                        <span style={{fontSize:13,fontWeight:600}}>{l.kg} kg · {l.reps} reps</span>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>{setEditingLog(l.id);setEditLogKg(String(l.kg));setEditLogReps(String(l.reps));}} className="tap"
                            style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,padding:"2px 7px",color:T.sub,fontSize:11,cursor:"pointer"}}>✏️</button>
                          <button onClick={async()=>{
                            setLogs(logs.filter(x=>x.id!==l.id));
                            try{ await sb.delete("registro_series",`id=eq.${l.id}`); }
                            catch(e){ console.error("Error borrando serie:",e); }
                          }} className="tap"
                            style={{background:"#ff444415",border:"1px solid #ff444430",borderRadius:6,padding:"2px 7px",color:"#ff5555",fontSize:11,cursor:"pointer"}}>🗑</button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SESIONES COMPLETADAS ── */}
      {view==="sesiones"&&(
        <div>
          {doneSessions.length===0&&<div style={{textAlign:"center",color:T.sub,marginTop:60}}><div style={{fontSize:48,marginBottom:12}}>📋</div><div>Sin sesiones completadas aún</div></div>}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {doneSessions.sort((a,b)=>b.date.localeCompare(a.date)).map(s=>{
              const r=sessions&&routines?routines.find(x=>x.id===s.routineId):null;
              const sLogs=myLogs.filter(l=>l.sessionId===s.id);
              const byVar=sLogs.reduce((acc,l)=>{(acc[l.varId]=acc[l.varId]||[]).push(l);return acc;},{});
              return(
                <Card key={s.id} T={T}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:sLogs.length>0?12:0}}>
                    <div>
                      <div style={{fontSize:22,marginBottom:4}}>{r?.emoji||"💪"}</div>
                      <div style={{fontWeight:700,fontSize:15,color:T.text}}>{r?.name||"Sesión"}</div>
                      <div style={{fontSize:12,color:T.sub,marginTop:2}}>{s.date}{s.hora?" · "+s.hora:""}</div>
                      {s.objetivo&&<div style={{fontSize:11,color:T.accent,marginTop:3}}>{OBJETIVO_ICONS[s.objetivo]} {s.objetivo}</div>}
                    </div>
                    <Badge color={T.blue} T={T}>{sLogs.length} series</Badge>
                  </div>
                  {sLogs.length>0&&(
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {Object.entries(byVar).map(([varId,varLogs])=>{
                        const v=getVar(varId,exercises);
                        return(
                          <div key={varId} style={{background:T.surface,borderRadius:10,padding:"10px 12px"}}>
                            <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:6}}>{v?.name||varId}</div>
                            {varLogs.sort((a,b)=>a.set-b.set).map(l=>(
                              editingLog===l.id?(
                                <div key={l.id} style={{marginBottom:6}}>
                                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                                    <Input T={T} label="Kg" value={editLogKg} onChange={setEditLogKg} type="number"/>
                                    <Input T={T} label="Reps" value={editLogReps} onChange={setEditLogReps} type="number"/>
                                  </div>
                                  <div style={{display:"flex",gap:6}}>
                                    <Btn T={T} onClick={async()=>{
                                      setLogs(logs.map(x=>x.id===l.id?{...x,kg:+editLogKg,reps:+editLogReps}:x));
                                      setEditingLog(null);
                                      try{ await sb.patch("registro_series",`id=eq.${l.id}`,{peso_kg:+editLogKg,repeticiones:+editLogReps}); }
                                      catch(e){ console.error(e); }
                                    }} full style={{fontSize:11,padding:"7px"}}>✓ Guardar</Btn>
                                    <Btn T={T} onClick={()=>setEditingLog(null)} variant="ghost" style={{fontSize:11,padding:"7px"}}>✕</Btn>
                                  </div>
                                </div>
                              ):(
                                <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                                  <span style={{fontSize:11,color:T.muted}}>Serie {l.set}</span>
                                  <span style={{fontSize:12}}>{l.kg}kg × {l.reps} reps</span>
                                  <div style={{display:"flex",gap:4}}>
                                    <button onClick={()=>{setEditingLog(l.id);setEditLogKg(String(l.kg));setEditLogReps(String(l.reps));}} className="tap"
                                      style={{background:"none",border:`1px solid ${T.border}`,borderRadius:5,padding:"1px 6px",color:T.sub,fontSize:10,cursor:"pointer"}}>✏️</button>
                                    <button onClick={async()=>{
                                      setLogs(logs.filter(x=>x.id!==l.id));
                                      try{ await sb.delete("registro_series",`id=eq.${l.id}`); }
                                      catch(e){ console.error(e); }
                                    }} className="tap"
                                      style={{background:"#ff444415",border:"1px solid #ff444430",borderRadius:5,padding:"1px 6px",color:"#ff5555",fontSize:10,cursor:"pointer"}}>🗑</button>
                                  </div>
                                </div>
                              )
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SETTINGS ───────────────────────────────── */
function SettingsScreen({profile,profiles,setProfiles,onSwitchProfile,T}){
  const[name,setName]=useState(profile.name);
  const[emoji,setEmoji]=useState(profile.emoji);
  const[accentIdx,setAccentIdx]=useState(profile.accentIdx);
  const[objetivo,setObjetivo]=useState(profile.objetivo||"Definir y tonificar");
  const[altura,setAltura]=useState(String(profile.altura||""));
  const[peso,setPeso]=useState(String(profile.pesoInicio||""));
  const[saved,setSaved]=useState(false);

  const save=()=>{
    setProfiles(profiles.map(p=>p.id===profile.id?{...p,name,emoji,accentIdx,objetivo,altura:+altura,pesoInicio:+peso}:p));
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };
  const EMOJIS=["🌸","⚡","🔥","💎","🦁","🌙","🌊","🏔","🌺","⭐","🎯","💪"];
  const previewColor=ACCENT_OPTIONS[accentIdx]?.val||T.accent;
  const objIcon=OBJETIVO_ICONS[objetivo]||"🎯";

  return(
    <div className="page" style={{padding:"0 16px 100px"}}>
      <div style={{padding:"24px 0 16px"}}><SectionTitle T={T}>AJUSTES</SectionTitle></div>

      {/* Perfil */}
      <Card T={T} style={{marginBottom:14}}>
        <div style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:.6,marginBottom:14}}>MI PERFIL</div>
        <Input T={T} label="Nombre" value={name} onChange={setName} style={{marginBottom:14}}/>
        <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>EMOJI</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
          {EMOJIS.map(e=><button key={e} onClick={()=>setEmoji(e)} className="tap" style={{width:44,height:44,fontSize:22,borderRadius:12,cursor:"pointer",background:emoji===e?T.accent+"22":T.surface,border:`1px solid ${emoji===e?T.accent:T.border}`}}>{e}</button>)}
        </div>
        <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:10}}>COLOR DE ACENTO</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
          {ACCENT_OPTIONS.map((a,i)=>(
            <div key={i} onClick={()=>setAccentIdx(i)} className="tap" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}}>
              <div style={{width:44,height:44,borderRadius:12,background:a.val,border:`3px solid ${accentIdx===i?"#fff":a.val+"00"}`,boxShadow:accentIdx===i?`0 0 14px ${a.val}`:"none"}}/>
              <div style={{fontSize:10,color:accentIdx===i?a.val:T.muted,fontWeight:600}}>{a.name}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Datos físicos */}
      <Card T={T} style={{marginBottom:14}}>
        <div style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:.6,marginBottom:14}}>DATOS FÍSICOS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <Input T={T} label="Altura (cm)" value={altura} onChange={setAltura} type="number" placeholder="160"/>
          <Input T={T} label="Peso inicial (kg)" value={peso} onChange={setPeso} type="number" placeholder="65"/>
        </div>
        <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>OBJETIVO</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {OBJETIVOS.map(o=>(
            <button key={o} onClick={()=>setObjetivo(o)} className="tap" style={{
              display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,
              background:objetivo===o?previewColor+"18":T.surface,
              border:`1px solid ${objetivo===o?previewColor+"66":T.border}`,
              color:objetivo===o?previewColor:T.sub,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:18}}>{OBJETIVO_ICONS[o]}</span>
              <span style={{fontWeight:objetivo===o?700:400,fontSize:14}}>{o}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Preview */}
      <Card T={T} style={{marginBottom:14,border:`1px solid ${previewColor}44`}}>
        <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:10}}>PREVISUALIZACIÓN</div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:64,height:64,borderRadius:18,background:`linear-gradient(135deg,${previewColor}33,${previewColor}11)`,border:`2px solid ${previewColor}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,boxShadow:`0 0 20px ${previewColor}22`}}>{emoji}</div>
          <div>
            <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:20,fontWeight:800,color:T.text}}>{name||"Tu nombre"}</div>
            <div style={{fontSize:13,color:previewColor,fontWeight:600,marginTop:2}}>{objIcon} {objetivo}</div>
            {(altura||peso)&&<div style={{fontSize:12,color:T.sub,marginTop:2}}>{altura?`${altura} cm`:""}{altura&&peso?" · ":""}{peso?`${peso} kg inicio`:""}</div>}
          </div>
        </div>
      </Card>

      <Btn T={T} onClick={save} full style={{marginBottom:12,background:saved?"#4ade80":undefined,color:saved?"#000":undefined}}>
        {saved?"✓ Guardado":"Guardar cambios"}
      </Btn>
      <Btn T={T} onClick={onSwitchProfile} variant="ghost" full>↩ Cambiar perfil</Btn>
    </div>
  );
}

/* ─── AI SCREEN ─────────────────────────────── */
function AIScreen({profile,exercises,routines,setRoutines,logs,T}){
  const[mode,setMode]=useState("menu"); // "menu"|"rutina"|"consejo"
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState(null);
  const[error,setError]=useState(null);

  // Rutina params
  const[aiGrupos,setAiGrupos]=useState([]);
  const[aiDuracion,setAiDuracion]=useState("60");
  const[aiNivel,setAiNivel]=useState("Intermedio");
  const[aiObjetivo,setAiObjetivo]=useState(profile.objetivo||"Hipertrofia");

  const myLogs=logs.filter(l=>l.userId===profile.id);
  const exerciseNames=exercises.map(e=>({id:e.id,name:e.name,primary:e.primary,variations:e.variations.map(v=>({id:v.id,name:v.name,material:v.material}))}));

  const generateRoutine=async()=>{
    setLoading(true);setResult(null);setError(null);
    const prompt=`Eres un entrenador personal experto. Crea una rutina de entrenamiento en español.

DATOS DEL USUARIO:
- Nombre: ${profile.name}
- Objetivo: ${aiObjetivo}
- Nivel: ${aiNivel}
- Duración disponible: ${aiDuracion} minutos
- Grupos musculares a trabajar: ${aiGrupos.length>0?aiGrupos.join(", "):"Fullbody"}

EJERCICIOS DISPONIBLES (usa SOLO estos, elige la variación más adecuada):
${JSON.stringify(exerciseNames,null,2)}

Crea una rutina con 4-7 ejercicios. Responde SOLO con este JSON sin texto adicional ni comillas de código:
{
  "nombre": "nombre de la rutina",
  "emoji": "emoji relacionado",
  "colorHex": "#color hexadecimal motivador",
  "descripcion": "una frase corta describiendo la rutina",
  "ejercicios": [
    {"varId": "ID_VARIACION", "sets": 3, "reps": "10-12", "rir": 2, "nota": "consejo técnico breve"}
  ]
}`;

    try{
      const res=await fetch("/.netlify/functions/claude",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          max_tokens:1000,
          messages:[{role:"user",content:prompt}]
        })
      });
      const data=await res.json();
      const text=data.content?.map(c=>c.text||"").join("").trim();
      const clean=text.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setResult(parsed);
    }catch(e){setError("Error generando rutina. Inténtalo de nuevo.");}
    setLoading(false);
  };

  const generateAdvice=async()=>{
    setLoading(true);setResult(null);setError(null);
    const recentLogs=myLogs.slice(-20);
    const logSummary=recentLogs.map(l=>{
      const v=exercises.flatMap(e=>e.variations).find(v=>v.id===l.varId);
      return `${v?.name||l.varId}: ${l.kg}kg x ${l.reps} reps (${l.feel})`;
    }).join(", ");

    const prompt=`Eres un entrenador personal experto y motivador. Analiza los últimos registros de entrenamiento y da un consejo personalizado en español.

USUARIO: ${profile.name}
OBJETIVO: ${profile.objetivo||"Mejorar forma física"}
ÚLTIMAS SERIES REGISTRADAS: ${logSummary||"Sin registros aún"}

Da un consejo breve, específico y motivador (máximo 3 párrafos) basado en los datos. 
Si no hay registros, da consejos generales para su objetivo.
Responde SOLO con este JSON:
{
  "titulo": "título corto del consejo",
  "emoji": "emoji relevante",
  "consejo": "el consejo completo aquí",
  "accion": "una acción concreta que puede hacer hoy"
}`;

    try{
      const res=await fetch("/.netlify/functions/claude",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          max_tokens:600,
          messages:[{role:"user",content:prompt}]
        })
      });
      const data=await res.json();
      const text=data.content?.map(c=>c.text||"").join("").trim();
      const clean=text.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setResult({...parsed,tipo:"consejo"});
    }catch(e){setError("Error generando consejo. Inténtalo de nuevo.");}
    setLoading(false);
  };

  const saveGeneratedRoutine=()=>{
    if(!result||result.tipo==="consejo") return;
    const r={
      id:Date.now(), ownerId:profile.id, sharedWith:[profile.id],
      name:result.nombre, emoji:result.emoji||"💪",
      colorHex:result.colorHex||T.accent,
      exercises:result.ejercicios.map(e=>({varId:e.varId,sets:e.sets,reps:String(e.reps),rir:e.rir}))
    };
    setRoutines([...routines,r]);
    setMode("menu");setResult(null);
    alert("✅ Rutina guardada en Mis Rutinas");
  };

  return(
    <div className="page" style={{padding:"0 16px 100px"}}>
      <div style={{padding:"24px 0 16px"}}>
        <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:26,fontWeight:800,marginBottom:4}}>✨ IA Entrenadora</div>
        <div style={{fontSize:13,color:T.sub}}>Powered by Claude</div>
      </div>

      {mode==="menu"&&(
        <div className="stagger" style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card T={T} onClick={()=>setMode("rutina")} accent={T.accent} style={{cursor:"pointer",padding:20}}>
            <div style={{fontSize:36,marginBottom:10}}>📋</div>
            <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,marginBottom:6}}>Generar rutina</div>
            <div style={{color:T.sub,fontSize:13}}>La IA crea una rutina personalizada con tus ejercicios, adaptada a tu objetivo y tiempo disponible.</div>
          </Card>
          <Card T={T} onClick={()=>{setMode("consejo");generateAdvice();}} accent={T.blue} style={{cursor:"pointer",padding:20}}>
            <div style={{fontSize:36,marginBottom:10}}>🧠</div>
            <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,marginBottom:6}}>Consejo personalizado</div>
            <div style={{color:T.sub,fontSize:13}}>Análisis de tus últimos entrenos y recomendaciones específicas para mejorar.</div>
          </Card>
        </div>
      )}

      {mode==="rutina"&&!result&&!loading&&(
        <div>
          <BackBtn onClick={()=>setMode("menu")} T={T}/>
          <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:14}}>
            <Card T={T}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:10}}>GRUPOS MUSCULARES</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {MUSCLE_GROUPS.map(g=>(
                  <Chip key={g} T={T} color={T.accent} active={aiGrupos.includes(g)}
                    onClick={()=>setAiGrupos(prev=>prev.includes(g)?prev.filter(x=>x!==g):[...prev,g])}>{g}</Chip>
                ))}
              </div>
              {aiGrupos.length===0&&<div style={{fontSize:11,color:T.muted,marginTop:8}}>Sin selección = Fullbody</div>}
            </Card>
            <Card T={T}>
              <Input T={T} label="Duración (minutos)" value={aiDuracion} onChange={setAiDuracion} type="number" placeholder="60"/>
            </Card>
            <Card T={T}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>NIVEL</div>
              <div style={{display:"flex",gap:8}}>
                {["Principiante","Intermedio","Avanzado"].map(n=>(
                  <Chip key={n} T={T} color={T.accent} active={aiNivel===n} onClick={()=>setAiNivel(n)}>{n}</Chip>
                ))}
              </div>
            </Card>
            <Card T={T}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8}}>OBJETIVO</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {OBJETIVOS.map(o=>(
                  <Chip key={o} T={T} color={T.accent} active={aiObjetivo===o} onClick={()=>setAiObjetivo(o)}>{OBJETIVO_ICONS[o]} {o}</Chip>
                ))}
              </div>
            </Card>
            <Btn T={T} onClick={generateRoutine} full style={{padding:"16px"}}>✨ Generar rutina</Btn>
          </div>
        </div>
      )}

      {loading&&(
        <div style={{textAlign:"center",marginTop:60}}>
          <div style={{fontSize:48,marginBottom:16}}>⏳</div>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,marginBottom:8}}>
            {mode==="consejo"?"Analizando tus entrenos...":"Creando tu rutina..."}
          </div>
          <div style={{color:T.sub,fontSize:13}}>La IA está trabajando para ti</div>
        </div>
      )}

      {error&&(
        <div style={{marginTop:20}}>
          <Card T={T} style={{textAlign:"center",padding:24,border:"1px solid #ff444444"}}>
            <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
            <div style={{color:"#ff5555",fontSize:14,marginBottom:16}}>{error}</div>
            <Btn T={T} onClick={()=>{setError(null);setMode("menu");}} variant="ghost">Volver</Btn>
          </Card>
        </div>
      )}

      {result&&!loading&&(
        <div>
          {result.tipo==="consejo"?(
            <>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <BackBtn onClick={()=>{setResult(null);setMode("menu");}} T={T}/>
                <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800}}>{result.emoji} {result.titulo}</div>
              </div>
              <Card T={T} style={{marginBottom:14,border:`1px solid ${T.blue}44`,background:T.blue+"08"}}>
                <div style={{fontSize:14,lineHeight:1.7,color:T.text,marginBottom:16,whiteSpace:"pre-wrap"}}>{result.consejo}</div>
                <div style={{background:T.blue+"15",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:11,color:T.blue,fontWeight:700,marginBottom:4}}>ACCIÓN DE HOY</div>
                  <div style={{fontSize:13,color:T.text}}>{result.accion}</div>
                </div>
              </Card>
              <Btn T={T} onClick={()=>{setResult(null);setMode("menu");}} variant="ghost" full>← Volver</Btn>
            </>
          ):(
            <>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <BackBtn onClick={()=>setResult(null)} T={T}/>
                <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800}}>{result.emoji} {result.nombre}</div>
              </div>
              {result.descripcion&&<div style={{color:T.sub,fontSize:13,marginBottom:16}}>{result.descripcion}</div>}
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                {(result.ejercicios||[]).map((e,i)=>{
                  const v=exercises.flatMap(ex=>ex.variations).find(v=>v.id===e.varId);
                  const ex=exercises.find(ex=>ex.variations.some(v=>v.id===e.varId));
                  return(
                    <Card key={i} T={T} style={{borderLeft:`3px solid ${result.colorHex||T.accent}`}}>
                      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                        <div style={{width:28,height:28,borderRadius:8,background:(result.colorHex||T.accent)+"22",color:result.colorHex||T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>{i+1}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:14,color:T.text}}>{v?.name||e.varId}</div>
                          <div style={{color:T.sub,fontSize:12,marginTop:2}}>{e.sets} series · {e.reps} reps · RIR {e.rir}</div>
                          {e.nota&&<div style={{fontSize:11,color:T.accent,marginTop:4,fontStyle:"italic"}}>💡 {e.nota}</div>}
                        </div>
                        <div style={{fontSize:22}}>{ex?.emoji||"💪"}</div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              <Btn T={T} onClick={saveGeneratedRoutine} full style={{marginBottom:10}}>💾 Guardar rutina</Btn>
              <Btn T={T} onClick={()=>setResult(null)} variant="ghost" full>← Regenerar</Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
}


/* ─── REVIEW SESSION SCREEN ─────────────────── */
function ReviewSessionScreen({session,profile,logs,setLogs,routines,exercises,onClose,T}){
  const routine=getRoutine(session.routineId,routines);
  const sessionLogs=logs.filter(l=>l.sessionId===session.id&&l.userId===profile.id);
  const[editingLog,setEditingLog]=useState(null);
  const[editKg,setEditKg]=useState("");
  const[editReps,setEditReps]=useState("");

  // Group logs by varId
  const byVar=sessionLogs.reduce((acc,l)=>{(acc[l.varId]=acc[l.varId]||[]).push(l);return acc;},{});

  return(
    <div className="page" style={{padding:"0 16px 100px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0 16px"}}>
        <BackBtn onClick={onClose} T={T}/>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:T.sub,fontWeight:600}}>SESIÓN COMPLETADA</div>
          <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:18,fontWeight:800,color:T.text}}>{routine?.emoji} {routine?.name}</div>
          <div style={{fontSize:12,color:T.sub,marginTop:2}}>{session.date}{session.hora?" · "+session.hora:""}</div>
        </div>
      </div>

      {Object.entries(byVar).length===0&&(
        <div style={{textAlign:"center",color:T.sub,marginTop:40}}>
          <div style={{fontSize:48,marginBottom:12}}>📋</div>
          <div>No hay series registradas en esta sesión</div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {Object.entries(byVar).map(([varId,varLogs])=>{
          const v=getVar(varId,exercises);
          const sorted=[...varLogs].sort((a,b)=>a.set-b.set);
          const maxKg=Math.max(...sorted.map(l=>+l.kg||0));
          return(
            <Card key={varId} T={T} style={{borderLeft:`3px solid ${routine?.colorHex||T.accent}`}}>
              {v&&v.photo&&v.photo.length>4&&(
                <img src={v.photo} alt="" style={{width:"100%",height:80,objectFit:"cover",borderRadius:10,marginBottom:10}}/>
              )}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:11,color:T.sub,fontWeight:600}}>{v?.exercise?.name||""}</div>
                  <div style={{fontWeight:700,fontSize:15,color:T.text}}>{v?.name||varId}</div>
                </div>
                <Badge color={T.accent} T={T}>{maxKg} kg máx</Badge>
              </div>
              {sorted.map(l=>(
                editingLog===l.id?(
                  <div key={l.id} style={{background:T.surface,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                    <div style={{fontSize:11,color:T.accent,fontWeight:700,marginBottom:8}}>Editando serie {l.set}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      <Input T={T} label="Kilos" value={editKg} onChange={setEditKg} type="number"/>
                      <Input T={T} label="Reps" value={editReps} onChange={setEditReps} type="number"/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <Btn T={T} onClick={async()=>{
                        setLogs(logs.map(x=>x.id===l.id?{...x,kg:+editKg,reps:+editReps}:x));
                        setEditingLog(null);
                        try{ await sb.patch("registro_series",`id=eq.${l.id}`,{peso_kg:+editKg,repeticiones:+editReps}); }
                        catch(e){ console.error(e); }
                      }} full style={{fontSize:12,padding:"9px"}}>✓ Guardar</Btn>
                      <Btn T={T} onClick={()=>setEditingLog(null)} variant="ghost" style={{fontSize:12,padding:"9px"}}>✕</Btn>
                    </div>
                  </div>
                ):(
                  <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    background:T.surface,borderRadius:8,padding:"8px 10px",marginBottom:4}}>
                    <span style={{fontSize:12,color:T.sub,fontWeight:600}}>Serie {l.set}</span>
                    <span style={{fontSize:14,fontWeight:600}}>{l.kg} kg × {l.reps} reps</span>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <Badge color={T.blue} T={T} style={{fontSize:10}}>{l.feel}</Badge>
                      <button onClick={()=>{setEditingLog(l.id);setEditKg(String(l.kg));setEditReps(String(l.reps));}}
                        className="tap" style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,
                          padding:"2px 7px",color:T.sub,fontSize:11,cursor:"pointer"}}>✏️</button>
                      <button onClick={async()=>{
                        setLogs(logs.filter(x=>x.id!==l.id));
                        try{ await sb.delete("registro_series",`id=eq.${l.id}`); }
                        catch(e){ console.error(e); }
                      }} className="tap" style={{background:"#ff444415",border:"1px solid #ff444430",
                        borderRadius:6,padding:"2px 7px",color:"#ff5555",fontSize:11,cursor:"pointer"}}>🗑</button>
                    </div>
                  </div>
                )
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
}


/* ─── APP ROOT ───────────────────────────────── */
export default function App(){
  const[profiles,setProfilesState]=useState([]);
  const[routines,setRoutinesState]=useState([]);
  const[profile,setProfile]=useState(null);
  const[tab,setTab]=useState("home");
  const[activeWorkout,setActiveWorkout]=useState(null);
  const[workoutPaused,setWorkoutPaused]=useState(false);
  const[reviewingSession,setReviewingSession]=useState(null);
  const[sessions,setSessionsState]=useState([]);
  const[logs,setLogsState]=useState([]);
  const[exercises,setExercises]=useState(EXERCISES_INIT);
  const[loading,setLoading]=useState(true);
  const[dbReady,setDbReady]=useState(false);

  // ── Load all data from Supabase on mount ──
  useEffect(()=>{
    const load = async () => {
      try {
        const [profs, exs, vars, ruts, rexs, sess, logs_] = await Promise.all([
          sb.get("perfiles","order=id"),
          sb.get("ejercicios","order=id"),
          sb.get("variaciones","order=id"),
          sb.get("rutinas","order=id"),
          sb.get("rutina_ejercicios","order=orden"),
          sb.get("sesiones","order=fecha.desc"),
          sb.get("registro_series","order=id"),
        ]);
        if(profs) setProfilesState(profs.map(profileFromDB));
        if(exs && vars) setExercises(exerciseFromDB(exs, vars));
        if(ruts && rexs) setRoutinesState(routineFromDB(ruts, rexs));
        if(sess) setSessionsState(sess.map(sessionFromDB));
        if(logs_) setLogsState(logs_.map(logFromDB));
        setDbReady(true);
      } catch(e) {
        console.error("Error loading from Supabase, using local data:", e);
        setProfilesState(PROFILES_INIT);
        setRoutinesState(ROUTINES_INIT);
        setSessionsState(SESSIONS_INIT);
        setLogsState(LOGS_INIT);
      }
      setLoading(false);
    };
    load();
  },[]);

  // ── Setters that sync to Supabase ──
  const setProfiles = async (newProfiles) => {
    setProfilesState(newProfiles);
    const changed = newProfiles.find((p,i) => JSON.stringify(p) !== JSON.stringify(profiles[i]));
    if(changed && dbReady) {
      await sb.patch("perfiles",`id=eq.${changed.id}`,{
        nombre:changed.name, emoji:changed.emoji, accent_idx:changed.accentIdx,
        objetivo:changed.objetivo, altura:changed.altura, peso_inicio:changed.pesoInicio
      });
    }
  };

  const setRoutines = async (newRoutines) => {
    if(!Array.isArray(newRoutines)){setRoutinesState(newRoutines);return;}
    setRoutinesState(newRoutines);
    if(!dbReady) return;
    // New routine: id is Date.now() which is > 1 trillion
    const added = newRoutines.find(r => Number(r.id) > 1000000000000);
    if(added) {
      console.log("Saving new routine:", added.name);
      const res = await sb.post("rutinas",{
        owner_id:added.ownerId, shared_with:added.sharedWith,
        nombre:added.name, emoji:added.emoji, color_hex:added.colorHex
      });
      console.log("Routine save response:", res);
      if(res && res[0]) {
        const newId = res[0].id;
        for(let i=0;i<added.exercises.length;i++){
          const e=added.exercises[i];
          const exRes = await sb.post("rutina_ejercicios",{
            rutina_id:newId, variacion_id:e.varId, orden:i,
            series:e.sets, reps:String(e.reps), rir:e.rir
          });
          console.log("Exercise save response:", exRes);
        }
      }
      return;
    }
    // Find updated routine (shared_with changed)
    const updated = newRoutines.find(r => {
      const old = routines.find(x=>x.id===r.id);
      return old && JSON.stringify(old.sharedWith) !== JSON.stringify(r.sharedWith);
    });
    if(updated) {
      await sb.patch("rutinas",`id=eq.${updated.id}`,{shared_with:updated.sharedWith});
    }
  };

  const setSessions = async (newSessions) => {
    // Use functional update with ref to always compare against the LATEST state,
    // not a stale closure value
    setSessionsState(prevSessions => {
      const oldSessions = prevSessions;

      // Detect additions (new sessions not in old state)
      const addedList = newSessions.filter(s => !oldSessions.find(x=>x.id===s.id));
      addedList.forEach(async (added) => {
        if(!dbReady) return;
        try{
          await sb.post("sesiones",{
            usuario_id:added.userId, rutina_id:added.routineId==="free"?null:added.routineId,
            fecha:added.date, hora:added.hora||null, estado:added.status, objetivo:added.objetivo||"",
            es_libre:added.routineId==="free",
            group_id:added.groupId||null,
            group_participants:added.groupParticipants||null
          });
        }catch(e){console.error("Error creando sesión:",e);}
      });

      // Detect deletions (sessions in old state but not in new)
      const deletedList = oldSessions.filter(s => !newSessions.find(x=>x.id===s.id));
      deletedList.forEach(async (deleted) => {
        if(!dbReady) return;
        try{ await sb.delete("sesiones",`id=eq.${deleted.id}`); }
        catch(e){console.error("Error borrando sesión:",e);}
      });

      // Detect updates (same id, different content)
      newSessions.forEach(async (s) => {
        const old = oldSessions.find(x=>x.id===s.id);
        if(!old) return; // it's an addition, already handled
        if(!dbReady) return;
        const statusChanged = old.status !== s.status;
        const fieldsChanged = old.date!==s.date || old.routineId!==s.routineId || old.objetivo!==s.objetivo || old.hora!==s.hora;
        if(statusChanged && !fieldsChanged) {
          try{ await sb.patch("sesiones",`id=eq.${s.id}`,{estado:s.status}); }
          catch(e){console.error("Error actualizando estado:",e);}
        } else if(fieldsChanged) {
          try{
            await sb.patch("sesiones",`id=eq.${s.id}`,{
              fecha:s.date, hora:s.hora||null, rutina_id:s.routineId==="free"?null:s.routineId,
              objetivo:s.objetivo||"", es_libre:s.routineId==="free", estado:s.status,
              group_id:s.groupId||null, group_participants:s.groupParticipants||null
            });
          }catch(e){console.error("Error actualizando sesión:",e);}
        }
      });

      return newSessions;
    });
  };

  const setLogs = async (newLogs) => {
    setLogsState(newLogs);
    if(!dbReady) return;
    if(!Array.isArray(newLogs)) return;
    const added = newLogs.find(l => !logs.find(x=>x.id===l.id));
    if(added) {
      // Don't save if sessionId is a temp timestamp id (not yet in DB)
      const sessionInDB = sessions.find(s=>s.id===added.sessionId&&Number(s.id)<1000000000000);
      if(!sessionInDB) {
        console.warn("Session not in DB yet, skipping log save for now");
        return;
      }
      try {
        const res = await sb.post("registro_series",{
          sesion_id:added.sessionId, usuario_id:added.userId,
          variacion_id:added.varId, serie:added.set,
          peso_kg:added.kg, repeticiones:added.reps, sensacion:added.feel
        });
        console.log("Log saved:", res);
      } catch(e) {
        console.error("Error saving log:", e);
      }
    }
  };

  const liveProfile=profile?profiles.find(p=>p.id===profile.id)||profile:null;
  const accentColor=liveProfile?(ACCENT_OPTIONS[liveProfile.accentIdx]?.val||"#c8f060"):"#c8f060";
  const T=makeTheme(accentColor);

  const finishWorkout=async()=>{
    if(activeWorkout){
      const updated=sessions.map(s=>s.id===activeWorkout.id?{...s,status:"done"}:s);
      await setSessions(updated);
    }
    setActiveWorkout(null);setWorkoutPaused(false);setTab("home");
  };

  if(loading){
    const Tl=makeTheme("#c8f060");
    return(
      <><style>{GS(Tl)}</style>
      <div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:Tl.bg,gap:16}}>
        <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:32,fontWeight:800,color:Tl.accent,letterSpacing:2}}>FITLAB</div>
        <div style={{color:Tl.sub,fontSize:14}}>Cargando datos...</div>
        <div style={{width:48,height:4,background:Tl.border,borderRadius:999,overflow:"hidden"}}>
          <div style={{width:"60%",height:"100%",background:Tl.accent,borderRadius:999,animation:"fadeUp 1s infinite"}}/>
        </div>
      </div></>
    );
  }

  if(!profile)return(<><style>{GS(T)}</style><ProfileScreen profiles={profiles} onSelect={p=>{setProfile(p);setTab("home");}} T={T}/></>);
  return(
    <>
      <style>{GS(T)}</style>
      <div style={{position:"sticky",top:0,zIndex:100,background:T.bg+"ee",backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"'Plus Jakarta Sans'",fontSize:20,fontWeight:800,letterSpacing:2,color:T.accent}}>FITLAB</div>
        <button onClick={()=>setTab("settings")} className="tap" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"6px 12px",color:T.sub,fontSize:12,cursor:"pointer",fontWeight:600}}>{liveProfile.emoji} {liveProfile.name}</button>
      </div>
      {activeWorkout&&!workoutPaused?(
        activeWorkout.routineId==="free"
          ?<FreeWorkoutScreen session={activeWorkout} profile={liveProfile} logs={logs} setLogsState={setLogsState} exercises={exercises} routines={routines} setRoutines={setRoutines} onFinish={finishWorkout} T={T}/>
          :<WorkoutScreen session={activeWorkout} profile={liveProfile} logs={logs} setLogs={setLogs} setLogsState={setLogsState} routines={routines} exercises={exercises} onFinish={finishWorkout} onPause={()=>setWorkoutPaused(true)} T={T}/>
      ):(
        <>
          {activeWorkout&&workoutPaused&&(
            <div onClick={()=>setWorkoutPaused(false)} style={{
              position:"sticky",top:0,zIndex:100,
              background:T.accent,color:"#000",padding:"10px 16px",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              cursor:"pointer",fontWeight:700,fontSize:13,marginBottom:8}}>
              <span>⏸ Entreno pausado — {getRoutine(activeWorkout.routineId,routines)?.name||"Rutina libre"}</span>
              <span style={{background:"#000",color:T.accent,borderRadius:8,padding:"4px 12px",fontSize:12}}>Volver ▶</span>
            </div>
          )}
          {tab==="home"&&<HomeScreen profile={liveProfile} sessions={sessions} logs={logs} routines={routines} exercises={exercises} onStartWorkout={s=>{setActiveWorkout(s);setWorkoutPaused(false);}} onGoTo={setTab} T={T}/>}
          {tab==="library"&&<LibraryScreen exercises={exercises} setExercises={setExercises} T={T}/>}
          {tab==="routines"&&<RoutinesScreen profile={liveProfile} profiles={profiles} routines={routines} setRoutines={setRoutines} exercises={exercises} setExercises={setExercises} onStartWorkout={s=>{setActiveWorkout(s);setWorkoutPaused(false);}} T={T}/>}
          {tab==="calendar"&&<CalendarScreen profile={liveProfile} profiles={profiles} sessions={sessions} setSessions={setSessions} routines={routines} exercises={exercises} T={T}/>}
          {tab==="progress"&&<ProgressScreen profile={liveProfile} logs={logs} setLogs={setLogs} exercises={exercises} sessions={sessions} T={T}/>}
          {tab==="ia"&&<AIScreen profile={liveProfile} exercises={exercises} routines={routines} setRoutines={setRoutines} logs={logs} T={T}/>}
          {tab==="settings"&&<SettingsScreen profile={liveProfile} profiles={profiles} setProfiles={setProfiles} onSwitchProfile={()=>setProfile(null)} T={T}/>}
        </>
      )}
      {(!activeWorkout||workoutPaused)&&<NavBar tab={tab} setTab={setTab} T={T}/>}
    </>
  );
}
