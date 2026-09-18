import { useState } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import CampoTexto from '../../../src/components/CampoTexto';
import SelectorOpciones from '../../../src/components/SelectorOpciones';
import CampoFecha from '../../../src/components/CampoFecha';

const TIPOS_ADMIN = [
  { valor: 'flash', etiqueta: 'Flash' },
  { valor: 'oficial', etiqueta: 'Oficial' },
];
const TIPOS_JUGADOR = [{ valor: 'flash', etiqueta: 'Flash' }];
const ALCANCES_ADMIN = [
  { valor: 'interno', etiqueta: 'Interno' },
  { valor: 'abierto', etiqueta: 'Abierto' },
];
const ALCANCES_JUGADOR = [{ valor: 'abierto', etiqueta: 'Abierto' }];
const FORMATOS = [
  { valor: 'mixto', etiqueta: 'Mixto' },
  { valor: 'eliminacion_directa', etiqueta: 'Eliminación directa' },
  { valor: 'grupos', etiqueta: 'Grupos' },
];

const HOY = new Date();

export default function NuevoTorneo() {
  const { usuario, token } = useAuth();
  const esAdmin = usuario?.roles?.some((r) => r.rol === 'administrador');
  const opcionesTipo = esAdmin ? TIPOS_ADMIN : TIPOS_JUGADOR;
  const opcionesAlcance = esAdmin ? ALCANCES_ADMIN : ALCANCES_JUGADOR;

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('flash');
  const [alcance, setAlcance] = useState(esAdmin ? 'interno' : 'abierto');
  const [formato, setFormato] = useState('mixto');
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [fechaLimiteInscripcion, setFechaLimiteInscripcion] = useState(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const listo = nombre && fechaInicio && fechaFin && fechaLimiteInscripcion;

  async function enviar() {
    setError(null);
    setEnviando(true);
    try {
      await apiFetch('/torneos', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nombre: nombre.trim(),
          tipo,
          alcance,
          formato,
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString(),
          fechaLimiteInscripcion: fechaLimiteInscripcion.toISOString(),
        }),
      });
      router.back();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={estilos.contenedor}>
        <CampoTexto etiqueta="Nombre del torneo" placeholder="Flash de agosto" value={nombre} onChangeText={setNombre} />

        <SelectorOpciones etiqueta="Tipo" opciones={opcionesTipo} valor={tipo} onCambiar={setTipo} />
        <SelectorOpciones etiqueta="Alcance" opciones={opcionesAlcance} valor={alcance} onCambiar={setAlcance} />
        <SelectorOpciones etiqueta="Formato" opciones={FORMATOS} valor={formato} onCambiar={setFormato} />

        <CampoFecha etiqueta="Fecha de inicio" valor={fechaInicio} onCambiar={setFechaInicio} minimo={HOY} modo="inicio" />
        <CampoFecha etiqueta="Fecha de fin" valor={fechaFin} onCambiar={setFechaFin} minimo={fechaInicio || HOY} modo="fin" />
        <CampoFecha
          etiqueta="Fecha límite de inscripción"
          valor={fechaLimiteInscripcion}
          onCambiar={setFechaLimiteInscripcion}
          minimo={HOY}
          modo="fin"
        />

        {error && <Text style={estilos.error}>{error}</Text>}

        <Pressable style={[estilos.boton, (!listo || enviando) && estilos.botonDeshabilitado]} onPress={enviar} disabled={!listo || enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Crear torneo</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 20, paddingBottom: 48 },
  error: { color: '#dc2626', marginTop: 8, textAlign: 'center' },
  boton: { backgroundColor: '#0B1E4D', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: { color: '#fff', fontWeight: '700' },
});
