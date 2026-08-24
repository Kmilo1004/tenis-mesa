import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { apiFetch } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import Avatar from '../src/components/Avatar';
import { colores, radios } from '../src/theme/colores';

const ROLES = [
  { valor: 'arbitro', etiqueta: 'Árbitro' },
  { valor: 'administrador', etiqueta: 'Administrador' },
];

export default function GestionarRoles() {
  const { usuario, token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizando, setActualizando] = useState(null); // `${usuarioId}:${rol}`

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const q = busqueda.trim();
      const datos = await apiFetch(`/usuarios${q.length >= 2 ? `?q=${encodeURIComponent(q)}` : ''}`, { token });
      setUsuarios(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [busqueda, token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function togglearRol(item, rol) {
    const clave = `${item.id}:${rol}`;
    setActualizando(clave);
    try {
      const tieneRol = item.roles.includes(rol);
      const datos = await apiFetch(`/usuarios/${item.id}/roles${tieneRol ? `/${rol}` : ''}`, {
        method: tieneRol ? 'DELETE' : 'POST',
        token,
        ...(tieneRol ? {} : { body: JSON.stringify({ rol }) }),
      });
      setUsuarios((actuales) => actuales.map((u) => (u.id === item.id ? { ...u, roles: datos.roles } : u)));
    } catch (err) {
      Alert.alert('No se pudo cambiar el rol', err.message);
    } finally {
      setActualizando(null);
    }
  }

  return (
    <View style={estilos.contenedor}>
      <Stack.Screen options={{ title: 'Gestionar roles' }} />

      <View style={estilos.buscador}>
        <TextInput
          style={estilos.buscadorInput}
          placeholder="Buscar por nombre..."
          placeholderTextColor={colores.textoSecundario}
          value={busqueda}
          onChangeText={setBusqueda}
          onSubmitEditing={cargar}
          returnKeyType="search"
        />
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colores.navy} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          onRefresh={cargar}
          refreshing={false}
          ListEmptyComponent={<Text style={estilos.vacio}>No se encontraron usuarios</Text>}
          renderItem={({ item }) => {
            const soyYo = item.id === usuario.id;
            return (
              <View style={estilos.tarjeta}>
                <View style={estilos.filaEncabezado}>
                  <Avatar nombre={item.nombre} tamano={40} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={estilos.nombre}>{item.nombre}</Text>
                    <Text style={estilos.correo}>{item.correo}</Text>
                  </View>
                </View>

                <View style={estilos.filaChips}>
                  {ROLES.map((r) => {
                    const activo = item.roles.includes(r.valor);
                    const bloqueado = soyYo && r.valor === 'administrador';
                    const clave = `${item.id}:${r.valor}`;
                    return (
                      <Pressable
                        key={r.valor}
                        style={[estilos.chip, activo && estilos.chipActivo, bloqueado && estilos.chipBloqueado]}
                        onPress={() => !bloqueado && togglearRol(item, r.valor)}
                        disabled={bloqueado || actualizando === clave}
                      >
                        {actualizando === clave ? (
                          <ActivityIndicator size="small" color={activo ? colores.textoClaro : colores.navy} />
                        ) : (
                          <Text style={activo ? estilos.chipTextoActivo : estilos.chipTexto}>{r.etiqueta}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                {soyYo && <Text style={estilos.notaPropia}>No puedes modificar tu propio rol de administrador</Text>}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  buscador: { padding: 16, paddingBottom: 8 },
  buscadorInput: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colores.tarjeta,
    color: colores.texto,
  },
  error: { color: colores.error, textAlign: 'center', marginTop: 24 },
  vacio: { textAlign: 'center', color: colores.textoSecundario, marginTop: 24 },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  filaEncabezado: { flexDirection: 'row', alignItems: 'center' },
  nombre: { fontSize: 15, fontWeight: '700', color: colores.texto },
  correo: { fontSize: 12, color: colores.textoSecundario, marginTop: 1 },
  filaChips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.pildora,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  chipActivo: { backgroundColor: colores.navy, borderColor: colores.navy },
  chipBloqueado: { opacity: 0.4 },
  chipTexto: { color: colores.texto, fontWeight: '600', fontSize: 13 },
  chipTextoActivo: { color: colores.textoClaro, fontWeight: '600', fontSize: 13 },
  notaPropia: { fontSize: 11, color: colores.textoSecundario, marginTop: 8, fontStyle: 'italic' },
});
