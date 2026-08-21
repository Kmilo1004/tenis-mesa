import { useCallback, useState } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import CampoTexto from '../../../src/components/CampoTexto';
import SelectorOpciones from '../../../src/components/SelectorOpciones';
import CampoFecha from '../../../src/components/CampoFecha';
import { colores } from '../../../src/theme/colores';

const TIPOS = [
  { valor: 'flash', etiqueta: 'Flash' },
  { valor: 'oficial', etiqueta: 'Oficial' },
];
const ALCANCES = [
  { valor: 'interno', etiqueta: 'Interno' },
  { valor: 'abierto', etiqueta: 'Abierto' },
];
const FORMATOS = [
  { valor: 'eliminacion_directa', etiqueta: 'Eliminación directa' },
  { valor: 'grupos', etiqueta: 'Grupos' },
  { valor: 'mixto', etiqueta: 'Mixto' },
];

export default function EditarTorneo() {
  const { torneoId } = useLocalSearchParams();
  const { token } = useAuth();

  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('flash');
  const [alcance, setAlcance] = useState('interno');
  const [formato, setFormato] = useState('eliminacion_directa');
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [fechaLimiteInscripcion, setFechaLimiteInscripcion] = useState(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      (async () => {
        setCargando(true);
        try {
          const torneo = await apiFetch(`/torneos/${torneoId}`);
          if (!vigente) return;
          setNombre(torneo.nombre);
          setTipo(torneo.tipo);
          setAlcance(torneo.alcance);
          setFormato(torneo.formato);
          setFechaInicio(new Date(torneo.fechaInicio));
          setFechaFin(new Date(torneo.fechaFin));
          setFechaLimiteInscripcion(new Date(torneo.fechaLimiteInscripcion));
        } catch (err) {
          if (vigente) setError(err.message);
        } finally {
          if (vigente) setCargando(false);
        }
      })();
      return () => {
        vigente = false;
      };
    }, [torneoId]),
  );

  const listo = nombre && fechaInicio && fechaFin && fechaLimiteInscripcion;

  async function guardar() {
    setError(null);
    setEnviando(true);
    try {
      await apiFetch(`/torneos/${torneoId}`, {
        method: 'PATCH',
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

  if (cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color={colores.navy} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={estilos.contenedor}>
        <CampoTexto etiqueta="Nombre del torneo" placeholder="Flash de agosto" value={nombre} onChangeText={setNombre} />

        <SelectorOpciones etiqueta="Tipo" opciones={TIPOS} valor={tipo} onCambiar={setTipo} />
        <SelectorOpciones etiqueta="Alcance" opciones={ALCANCES} valor={alcance} onCambiar={setAlcance} />
        <SelectorOpciones etiqueta="Formato" opciones={FORMATOS} valor={formato} onCambiar={setFormato} />

        <CampoFecha etiqueta="Fecha de inicio" valor={fechaInicio} onCambiar={setFechaInicio} />
        <CampoFecha etiqueta="Fecha de fin" valor={fechaFin} onCambiar={setFechaFin} minimo={fechaInicio} />
        <CampoFecha etiqueta="Fecha límite de inscripción" valor={fechaLimiteInscripcion} onCambiar={setFechaLimiteInscripcion} />

        {error && <Text style={estilos.error}>{error}</Text>}

        <Pressable style={estilos.boton} onPress={guardar} disabled={!listo || enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Guardar cambios</Text>}
        </Pressable>
        <Pressable onPress={() => router.back()} disabled={enviando}>
          <Text style={estilos.cancelar}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenedor: { padding: 20, paddingBottom: 48 },
  error: { color: '#dc2626', marginTop: 8, textAlign: 'center' },
  boton: { backgroundColor: colores.navy, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  botonTexto: { color: '#fff', fontWeight: '700' },
  cancelar: { textAlign: 'center', color: '#666', marginTop: 16 },
});
