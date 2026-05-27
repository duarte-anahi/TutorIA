import './index.css'
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

const API_URL = `${import.meta.env.VITE_API_URL}/api/chat`;
const API_MODELOS = `${import.meta.env.VITE_API_URL}/api/modelos`;

const ETAPAS_ORDEN = ['etapa_a', 'etapa_b', 'etapa_c', 'etapa_d'];

const ETAPAS_CONFIG = {
  etapa_a: { icono: '🌱', color: 'bg-emerald-300', textoColor: 'text-emerald-500', etiqueta: 'Sembrando ideas', porcentaje: 25 },
  etapa_b: { icono: '🌿', color: 'bg-emerald-500', textoColor: 'text-emerald-600', etiqueta: 'Creciendo...', porcentaje: 50 },
  etapa_c: { icono: '🌳', color: 'bg-cyan-600', textoColor: 'text-cyan-700', etiqueta: 'Puliendo detalles', porcentaje: 75 },
  etapa_d: { icono: '🌸', color: 'bg-pink-500', textoColor: 'text-pink-600', etiqueta: '¡Listo para entregar!', porcentaje: 100 },
};

const IndicadorProgreso = ({ etapa }) => {
  const config = ETAPAS_CONFIG[etapa] || ETAPAS_CONFIG.etapa_a;

  return (
    <div className="w-full flex flex-col items-center px-6">
      <div className="text-5xl mb-4 animate-bounce [animation-iteration-count:1]">
        {config.icono}
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2 border border-slate-50">
        <div
          className={`h-full ${config.color} transition-all duration-1000 ease-out`}
          style={{ width: `${config.porcentaje}%` }}
        />
      </div>
      <span className={`text-[9px] uppercase tracking-[0.2em] font-bold ${config.textoColor}`}>
        {config.etiqueta}
      </span>
    </div>
  );
};

function App() {
  const [textoBorrador, setTextoBorrador] = useState('');
  const [mensajes, setMensajes] = useState([
    { rol: 'ia', texto: "¡Bienvenid@! Estoy acá para guiarte en tu proceso de escritura. ¿Sobre qué consigna trabajaremos hoy?" }
  ]);
  const [inputChat, setInputChat] = useState('');
  const [cargando, setCargando] = useState(false);
  const [modelosDisponibles, setModelosDisponibles] = useState([]);
  const [modeloSeleccionado, setModeloSeleccionado] = useState('llama3.1');
  const [finalizado, setFinalizado] = useState(false);
  const [etapaActual, setEtapaActual] = useState('etapa_a');

  const mensajesFinRef = useRef(null);
  const palabrasCount = textoBorrador.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    const cargarModelos = async () => {
      try {
        const res = await fetch(API_MODELOS);
        const data = await res.json();
        setModelosDisponibles(data.modelos || ['llama3.1']);
      } catch {
        setModelosDisponibles(['llama3.1']);
      }
    };
    cargarModelos();
  }, []);

  useEffect(() => {
    mensajesFinRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const avanzarEtapa = (etapaActual) => {
    const indiceActual = ETAPAS_ORDEN.indexOf(etapaActual);
    const hayProximaEtapa = indiceActual < ETAPAS_ORDEN.length - 1;
    if (hayProximaEtapa) {
      return ETAPAS_ORDEN[indiceActual + 1];
    }
    return etapaActual;
  };

  const enviarMensaje = async () => {
    if (!inputChat.trim()) return;
    const nuevoMensaje = inputChat;
    setInputChat('');

    const nuevosMensajes = [...mensajes, { rol: 'usuario', texto: nuevoMensaje }];
    setMensajes(nuevosMensajes);
    setCargando(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: nuevoMensaje,
          texto_borrador: textoBorrador,
          etapa_actual: etapaActual,
          modelo: modeloSeleccionado,
          historial: nuevosMensajes,
        }),
      });

      const datos = await res.json();
      const respuestaCompleta = datos.respuesta;
      const debeAvanzar = respuestaCompleta.includes('[AVANZAR]');
      const textoLimpio = respuestaCompleta.replace('[AVANZAR]', '').trim();

      setMensajes(prev => [...prev, { rol: 'ia', texto: textoLimpio }]);

      if (debeAvanzar) {
        setEtapaActual(prev => avanzarEtapa(prev));
      }
    } catch {
      setMensajes(prev => [...prev, { rol: 'ia', texto: '⚠️ Error de conexión.' }]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-emerald-200 via-slate-50 to-blue-200 text-slate-800 overflow-hidden font-sans">

      <main className="flex-1 flex flex-col items-center justify-center p-12 relative bg-transparent">
        <div className="w-full max-w-4xl flex flex-col h-[85vh]">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">
            Tu espacio de trabajo
          </h2>
          <div className="flex-1 bg-white rounded-xl shadow-[0_10px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-16 relative">
            <textarea
              className="w-full h-full text-lg text-slate-600 placeholder-slate-300 focus:outline-none resize-none leading-relaxed"
              placeholder="Escríbí tu texto acá..."
              value={textoBorrador}
              onChange={(e) => setTextoBorrador(e.target.value)}
              spellCheck="false"
            />
            <div className="absolute bottom-4 right-8 flex items-center gap-4">
              <button
                onClick={() => setFinalizado(!finalizado)}
                className={`text-[10px] px-4 py-2 rounded-full transition-all uppercase tracking-widest font-bold shadow-sm ${
                  finalizado
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {finalizado ? '✓ Entregado' : 'Aprobado por tutor'}
              </button>
              <div className="text-[10px] text-slate-300 uppercase tracking-widest">
                {palabrasCount} palabras
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside className="w-[400px] bg-white border-l border-slate-100 flex flex-col shadow-sm z-10">
        <div className="p-10 pb-6 text-right">
          <h1 className="text-3xl font-bold text-cyan-800 tracking-tighter">TutorIA</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium">Asistente de escritura</p>
        </div>

        <div className="px-10 py-10 flex justify-center border-y border-slate-50 bg-slate-50/20">
          <IndicadorProgreso etapa={etapaActual} />
        </div>

        <div className="px-10 mb-6 mt-6">
          <label className="text-[10px] text-slate-400 uppercase font-bold mb-3 block tracking-wider">Modelo</label>
          <select
            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm text-slate-600"
            value={modeloSeleccionado}
            onChange={(e) => setModeloSeleccionado(e.target.value)}
          >
            {modelosDisponibles.map(m => <option key={m} value={m}>🧠 {m}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-10 flex flex-col gap-4 py-4">
          {mensajes.map((msg, index) => (
            <div key={index} className={`flex ${msg.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm border ${
                msg.rol === 'usuario'
                  ? 'bg-cyan-50 border-cyan-100 text-slate-700'
                  : 'bg-[#fffdf0] border-yellow-100 text-slate-600'
              }`}>
                <ReactMarkdown>{msg.texto}</ReactMarkdown>
              </div>
            </div>
          ))}
          {cargando && <p className="text-[9px] text-teal-600 animate-pulse uppercase font-bold">Analizando texto...</p>}
          <div ref={mensajesFinRef} />
        </div>

        <div className="p-8 border-t border-slate-100 bg-white">
          <div className="relative">
            <input
              type="text"
              className="w-full bg-slate-50 border-none rounded-xl p-4 pr-12 text-sm text-slate-600"
              placeholder="Escribí tus dudas..."
              value={inputChat}
              onChange={(e) => setInputChat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
            />
            <button onClick={enviarMensaje} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 p-2">➤</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default App;