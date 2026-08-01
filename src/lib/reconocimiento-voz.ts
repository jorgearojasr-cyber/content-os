"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Envoltorio mínimo sobre la Web Speech API nativa del navegador
 * (SpeechRecognition/webkitSpeechRecognition) — sin costo de API, sin
 * enviar audio a ningún servidor. `SpeechRecognition` no está declarada
 * en lib.dom (solo sus tipos de resultado sí), así que se tipa acá lo
 * mínimo necesario en vez de usar `any`.
 */
type ReconocimientoVoz = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type ReconocimientoVozCtor = new () => ReconocimientoVoz;

function obtenerConstructor(): ReconocimientoVozCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: ReconocimientoVozCtor;
    webkitSpeechRecognition?: ReconocimientoVozCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Dicta en vivo hacia un único campo de texto — nunca decide qué hacer
 * con la transcripción, eso lo controla quien usa el hook. Cada llamada a
 * `iniciar()` arranca una sesión nueva: `onTranscripcion` se llama con el
 * texto acumulado SOLO de esa sesión (parcial mientras se habla, final al
 * terminar), para que quien la usa decida cómo combinarla con el texto
 * que ya había en el campo (ver `HoyScreen`, que la antepone).
 */
export function useReconocimientoVoz({ onTranscripcion }: { onTranscripcion: (textoSesion: string) => void }) {
  const [soportado, setSoportado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const recognitionRef = useRef<ReconocimientoVoz | null>(null);
  const finalRef = useRef("");
  const onTranscripcionRef = useRef(onTranscripcion);

  useEffect(() => {
    onTranscripcionRef.current = onTranscripcion;
  });

  useEffect(() => {
    // Detección de soporte del navegador — arranca en `false` (coincide
    // con el render del servidor, que no tiene `window`) y recién se
    // corrige en el cliente tras montar, para no generar un mismatch de
    // hidratación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoportado(obtenerConstructor() !== null);
  }, []);

  const detener = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const iniciar = useCallback(() => {
    const Ctor = obtenerConstructor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "es-AR";
    recognition.continuous = true;
    recognition.interimResults = true;
    finalRef.current = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultado = event.results[i];
        if (resultado.isFinal) {
          finalRef.current += resultado[0].transcript;
        } else {
          interim += resultado[0].transcript;
        }
      }
      onTranscripcionRef.current((finalRef.current + interim).trim());
    };
    recognition.onend = () => setEscuchando(false);
    recognition.onerror = () => setEscuchando(false);

    recognitionRef.current = recognition;
    recognition.start();
    setEscuchando(true);
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { soportado, escuchando, iniciar, detener };
}
