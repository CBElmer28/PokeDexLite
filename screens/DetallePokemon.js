// DetallePokemon.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import axios from 'axios';

export default function DetallePokemon({ route, navigation }) {
  const { pokemonUrl } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!pokemonUrl) {
      setError('URL del Pokémon inválida');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(pokemonUrl);
      setData(res.data);
    } catch (err) {
      setError('Error al cargar detalle');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pokemonUrl]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Cargando detalle...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red' }}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={fetchDetail}>
          <Text style={{ color: '#fff' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sprite = data?.sprites?.other?.['official-artwork']?.front_default
    || data?.sprites?.front_default
    || data?.sprites?.other?.dream_world?.front_default
    || null;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.name}>{data.name}</Text>

      {sprite ? (
        <Image source={{ uri: sprite }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Text>No hay imagen</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.label}>Altura</Text>
        <Text style={styles.value}>{(data.height / 10).toFixed(2)} m</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Peso</Text>
        <Text style={styles.value}>{(data.weight / 10).toFixed(2)} kg</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Tipos</Text>
        <Text style={styles.value}>
          {data.types?.map(t => t.type.name).join(', ')}
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Habilidades</Text>
        <Text style={styles.value}>
          {data.abilities?.map(a => a.ability.name).join(', ')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center', backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  name: { fontSize: 24, fontWeight: 'bold', textTransform: 'capitalize', marginBottom: 12 },
  image: { width: 240, height: 240, marginBottom: 16 },
  noImage: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' },
  infoBox: { width: '100%', padding: 12, borderRadius: 8, backgroundColor: '#f8f8f8', marginBottom: 10 },
  label: { fontSize: 12, color: '#666' },
  value: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize', marginTop: 4 },
  retry: { marginTop: 12, backgroundColor: '#007AFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 }
});
