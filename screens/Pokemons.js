// screens/Pokemons.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAGE_LIMIT_KEY = 'PAGE_LIMIT';
const DEFAULT_LIMIT = 20;
const OPTIONS = [10, 20, 50];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Pokemons({ navigation }) {
  const [pageLimit, setPageLimit] = useState(DEFAULT_LIMIT);
  const [pokemons, setPokemons] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef(null);

  const fetchingRef = useRef(false);
  const onEndReachedCalledDuringMomentum = useRef(false);

  // carga el límite desde storage
  const loadStoredLimit = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem(PAGE_LIMIT_KEY);
      const n = v ? Number(v) : DEFAULT_LIMIT;
      setPageLimit(n && n > 0 ? n : DEFAULT_LIMIT);
    } catch {
      setPageLimit(DEFAULT_LIMIT);
    }
  }, []);

  useEffect(() => { loadStoredLimit(); }, [loadStoredLimit]);

  // debounce para la query (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // fetch principal
  const fetchPokemons = useCallback(async (params = { reset: false, limitOverride: null }) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const limit = params.limitOverride ?? pageLimit;
    const currentOffset = params.reset ? 0 : offset;

    try {
      if (params.reset) setRefreshing(true);
      else if (currentOffset === 0) setLoading(true);
      else setLoadingMore(true);

      const res = await axios.get('https://pokeapi.co/api/v2/pokemon', {
        params: { limit, offset: currentOffset }
      });

      const results = Array.isArray(res.data.results) ? res.data.results : [];

      if (params.reset) {
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
    } catch (err) {
      setError('Error al cargar Pokémons');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      fetchingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, pageLimit]);

  // carga inicial cuando cambia pageLimit
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchPokemons({ reset: true, limitOverride: pageLimit });
  }, [pageLimit]);

  // control de carga adicional
  const handleLoadMore = () => {
    if (loadingMore || loading || refreshing || !hasMore) return;
    if (onEndReachedCalledDuringMomentum.current) return;
    fetchPokemons({ reset: false });
    onEndReachedCalledDuringMomentum.current = true;
  };

  const handleRefresh = () => {
    if (refreshing) return;
    setOffset(0);
    setHasMore(true);
    fetchPokemons({ reset: true, limitOverride: pageLimit });
  };

  // extractor id robusto
  const getIdFromUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const m = url.match(/\/pokemon\/(\d+)\/?$/);
    return m ? m[1] : null;
  };

  // cambiar límite y persistir; aplica inmediatamente
  const changeLimit = async (newLimit) => {
    if (newLimit === pageLimit) return;
    try {
      await AsyncStorage.setItem(PAGE_LIMIT_KEY, String(newLimit));
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSettingsOpen(false);
      setPageLimit(newLimit);
    } catch {
      setPageLimit(newLimit);
    }
  };

  // filtro local memoizado (filtra por nombre)
  const filteredPokemons = useMemo(() => {
    if (!debouncedQuery) return pokemons;
    return pokemons.filter(p => (p.name || '').toLowerCase().includes(debouncedQuery));
  }, [pokemons, debouncedQuery]);

  const renderItem = ({ item }) => {
    const id = getIdFromUrl(item.url);
    const imageUrl = id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DetallePokemon', { pokemonUrl: item.url })}
      >
        <View style={styles.row}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatar} resizeMode="contain" />
          ) : (
            <View style={[styles.avatar, styles.noImage]}><Text>—</Text></View>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.url}>{item.url}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => loadingMore ? (
    <View style={styles.footer}><ActivityIndicator size="small" /></View>
  ) : null;

  const ListEmpty = () => (
    <View style={styles.center}>
      {loading ? <ActivityIndicator size="large" /> : <Text>No hay Pokémons.</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Settings colapsable en la parte superior */}
      <View style={styles.settingsContainer}>
        <TouchableWithoutFeedback onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSettingsOpen(v => !v); }}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Settings</Text>
            <Text style={styles.settingsSubtitle}>Pokémon por página: {pageLimit}</Text>
          </View>
        </TouchableWithoutFeedback>

        {settingsOpen && (
          <View style={styles.settingsBody}>
            <Text style={styles.settingsLabel}>Selecciona el número de Pokémon por página</Text>
            <View style={styles.optionsRow}>
              {OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.option, pageLimit === opt && styles.optionSelected]}
                  onPress={() => changeLimit(opt)}
                >
                  <Text style={[styles.optionText, pageLimit === opt && styles.optionTextSelected]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.settingsNote}>El cambio se aplica inmediatamente y recarga la lista.</Text>
          </View>
        )}
      </View>

      {/* Barra de búsqueda */}
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
        {debouncedQuery ? <Text style={styles.searchCount}>Mostrando {filteredPokemons.length} de {pokemons.length}</Text> : null}
      </View>

      <FlatList
        data={filteredPokemons}
        keyExtractor={(item, idx) => (item.name ? item.name : `p-${idx}`)}
        renderItem={renderItem}
        contentContainerStyle={styles.contentContainer}
        style={styles.list}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.8}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={ListEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        initialNumToRender={pageLimit}
        removeClippedSubviews={true}
        nestedScrollEnabled={false}
        showsVerticalScrollIndicator={true}
        onMomentumScrollBegin={() => { onEndReachedCalledDuringMomentum.current = false; }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  /* Settings */
  settingsContainer: { padding: 8, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa' },
  settingsHeader: { paddingVertical: 8, paddingHorizontal: 4 },
  settingsTitle: { fontSize: 16, fontWeight: '700' },
  settingsSubtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  settingsBody: { marginTop: 8, paddingBottom: 8 },
  settingsLabel: { fontSize: 13, color: '#333', marginBottom: 8 },
  optionsRow: { flexDirection: 'row', alignItems: 'center' },
  option: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 8 },
  optionSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  optionText: { fontSize: 14, color: '#222' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  settingsNote: { marginTop: 8, color: '#666', fontSize: 12 },

  /* Search */
  searchContainer: { padding: 8, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  searchInput: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  searchCount: { marginTop: 6, fontSize: 12, color: '#666' },

  list: { flex: 1 },
  contentContainer: { padding: 8 },

  card: { backgroundColor: '#f8f8f8', padding: 12, marginVertical: 6, marginHorizontal: 4, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 72, height: 72, marginRight: 12, backgroundColor: '#fff', borderRadius: 8 },
  noImage: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' },
  info: { flex: 1 },
  name: { fontWeight: 'bold', fontSize: 16, textTransform: 'capitalize' },
  url: { color: '#666', marginTop: 4, fontSize: 12 },
  footer: { paddingVertical: 12, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }
});
