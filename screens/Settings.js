// screens/Settings.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAGE_LIMIT_KEY = 'PAGE_LIMIT';

export default function Settings() {
  const options = [10, 20, 50];
  const [selected, setSelected] = useState(20);

  useEffect(() => {
    AsyncStorage.getItem(PAGE_LIMIT_KEY).then(value => {
      if (value) setSelected(Number(value));
    }).catch(() => {});
  }, []);

  const save = async (value) => {
    try {
      await AsyncStorage.setItem(PAGE_LIMIT_KEY, String(value));
      setSelected(value);
    } catch (e) {
      // manejar error si quieres
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pokémon por página</Text>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[styles.option, selected === opt && styles.optionSelected]}
          onPress={() => save(opt)}
        >
          <Text style={[styles.optionText, selected === opt && styles.optionTextSelected]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.note}>La lista aplicará el cambio al volver a la pantalla de Pokémons.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  option: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  optionSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  optionText: { fontSize: 16, color: '#222' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  note: { marginTop: 16, color: '#666' }
});
