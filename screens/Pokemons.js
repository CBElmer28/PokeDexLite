import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

const PAGE_LIMIT_KEY = 'PAGE_LIMIT';
const LAST_LOADED_KEY = 'LAST_LOADED_COUNT';
const DEFAULT_LIMIT = 20;
const POKE_API = 'https://pokeapi.co/api/v2/pokemon';

// Constantes de la disposición de la lista
const ROW_HEIGHT = 72;
const SEPARATOR_HEIGHT = 1; // borderBottom
const ITEM_HEIGHT = ROW_HEIGHT + SEPARATOR_HEIGHT;
const PAGE_SIZE_DEFAULT = DEFAULT_LIMIT;

function getIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/\/pokemon\/(\d+)\/?$/);
  return m ? m[1] : null;
}

export default function Pokemons({ navigation }) {
  const isFocused = useIsFocused();

  const [pageLimit, setPageLimit] = useState(DEFAULT_LIMIT);
  const [pokemons, setPokemons] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  // Estado de busqueda
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef(null);

  const fetchingRef = useRef(false);
  const onEndReachedCalledDuringMomentum = useRef(false);

  // Cargar limite persistente y ultimo contador cargado
  const loadStoredSettings = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem(PAGE_LIMIT_KEY);
      const n = v ? Number(v) : DEFAULT_LIMIT;
      setPageLimit(n && n > 0 ? n : DEFAULT_LIMIT);
    } catch {
      setPageLimit(DEFAULT_LIMIT);
    }
  }, []);

  const persistLastLoaded = useCallback(async (count) => {
    try {
      await AsyncStorage.setItem(LAST_LOADED_KEY, String(count));
    } catch {
    }
  }, []);

  useEffect(() => { loadStoredSettings(); }, [loadStoredSettings]);

  // rebote para input de busqueda (300ms) (osea que al dejar de escribir recien 300ms despues se buscara)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const fetchPokemons = useCallback(async ({ reset = false, givenOffset = null, limitOverride = null } = {}) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const limit = limitOverride ?? pageLimit;
    const currentOffset = givenOffset != null ? givenOffset : (reset ? 0 : offset);

    try {
      if (reset) setRefreshing(true);
      else if (currentOffset === 0) setLoadingInitial(true);
      else setLoadingMore(true);

      const res = await axios.get(POKE_API, { params: { limit, offset: currentOffset } });
      const results = Array.isArray(res.data.results) ? res.data.results : [];

      if (reset) {
        setPokemons(results);
        setOffset(limit);
      } else {
        setPokemons(prev => [...prev, ...results]);
        setOffset(prev => prev + limit);
      }

      const total = typeof res.data.count === 'number' ? res.data.count : null;
      if (total !== null) setHasMore(currentOffset + limit < total);
      else setHasMore(results.length === limit);

      setError(null);
      // persistencia de contador total cargado
      const totalLoaded = (reset ? results.length : (pokemons.length + results.length));
      persistLastLoaded(totalLoaded);
    } catch (err) {
      setError('Error al cargar Pokémons');
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
      setRefreshing(false);
      fetchingRef.current = false;
    }
  }, [offset, pageLimit, pokemons.length]);

  // Carga inicial (y recarga cuando pageLimit cambia)
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchPokemons({ reset: true, limitOverride: pageLimit, givenOffset: 0 });
  }, [pageLimit]);

  useEffect(() => {
    if (!isFocused) return;
    let mounted = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(PAGE_LIMIT_KEY);
        const n = v ? Number(v) : DEFAULT_LIMIT;
        const newLimit = n && n > 0 ? n : DEFAULT_LIMIT;
        if (mounted && newLimit !== pageLimit) setPageLimit(newLimit);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [isFocused, pageLimit]);

  const handleRefresh = () => {
    if (refreshing) return;
    setHasMore(true);
    fetchPokemons({ reset: true, givenOffset: 0, limitOverride: pageLimit });
  };

  const handleLoadMore = () => {
    if (loadingMore || loadingInitial || refreshing || !hasMore) return;
    if (onEndReachedCalledDuringMomentum.current) return;
    fetchPokemons({ reset: false, givenOffset: offset });
    onEndReachedCalledDuringMomentum.current = true;
  };

  // Lista filtrada derivada de pokemon + consulta debounced(se menciono previamente) 
  const filteredPokemons = useMemo(() => {
    if (!debouncedQuery) return pokemons;
    return pokemons.filter(p => (p.name || '').toLowerCase().includes(debouncedQuery));
  }, [pokemons, debouncedQuery]);

  const getItemLayout = useCallback((_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const renderItem = ({ item }) => {
    const id = getIdFromUrl(item.url);
    const imageUrl = id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` : null;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation && navigation.navigate ? navigation.navigate('DetallePokemon', { pokemonUrl: item.url }) : null}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.avatar} resizeMode="contain" />
        ) : (
          <View style={[styles.avatar, styles.noImage]}><Text>—</Text></View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.url}>{item.url}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const listFooter = () => (
    <View style={styles.footerContainer}>
      {loadingMore ? (
        // ActivityIndicator para carga incremental
        <ActivityIndicator size="small" color="#1976d2" />
      ) : null}
      <Text style={styles.counterText}>Mostrados: {pokemons.length} / {hasMore ? 'más disponibles' : pokemons.length}</Text>
    </View>
  );

  const listEmpty = () => {
    if (loadingInitial) {
      // ActivityIndicator para carga inicial (más prominente)
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchPokemons({ reset: true, givenOffset: 0, limitOverride: pageLimit })}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Text>No hay Pokémons.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>PokeDex Lite</Text>
          <Text style={styles.subtitle}>{pageLimit} Pokémon por carga</Text>
        </View>

        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsButtonText}>Configuraciones</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Buscar por nombre..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <Text style={styles.searchCount}>{debouncedQuery ? `Mostrando ${filteredPokemons.length} de ${pokemons.length}` : ''}</Text>
      </View>

      <FlatList
        data={filteredPokemons}
        keyExtractor={(item, idx) => (getIdFromUrl(item.url) || `p-${idx}`).toString()}
        renderItem={renderItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={Platform.OS === 'web' ? 0.25 : 0.5}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        initialNumToRender={Math.min(10, pageLimit)}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={true}
        onMomentumScrollBegin={() => { onEndReachedCalledDuringMomentum.current = false; }}
        contentContainerStyle={pokemons.length === 0 ? styles.flatEmpty : undefined}
      />
    </SafeAreaView>
  );
}

//Estilos
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  settingsButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1976d2', borderRadius: 6 },
  settingsButtonText: { color: '#fff', fontWeight: '600' },

  searchContainer: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  searchInput: { backgroundColor: '#fafafa', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  searchCount: { marginTop: 6, fontSize: 12, color: '#666' },

  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: SEPARATOR_HEIGHT, borderBottomColor: '#f5f5f5', backgroundColor: '#fff' },
  avatar: { width: 52, height: 52, marginRight: 12 },
  noImage: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  url: { fontSize: 11, color: '#666', marginTop: 4 },

  footerContainer: { padding: 12, alignItems: 'center', justifyContent: 'center' },
  counterText: { marginTop: 8, fontSize: 12, color: '#444' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  error: { color: 'crimson', marginBottom: 12 },
  retryButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1976d2', borderRadius: 6 },
  retryText: { color: '#fff' },

  flatEmpty: { flexGrow: 1 },
});
