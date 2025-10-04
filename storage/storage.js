import AsyncStorage from '@react-native-async-storage/async-storage';

export const TASKS_KEY = '@taskflow_tasks_v1';
export const COMPLETED_KEY = '@taskflow_completed_count_v1';

export async function loadTasks() {
  try {
    const raw = await AsyncStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('loadTasks', e);
    return [];
  }
}

export async function saveTasks(tasks) {
  try {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('saveTasks', e);
  }
}

export async function loadCompletedCount() {
  try {
    const raw = await AsyncStorage.getItem(COMPLETED_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch (e) {
    console.error('loadCompletedCount', e);
    return 0;
  }
}

export async function saveCompletedCount(count) {
  try {
    await AsyncStorage.setItem(COMPLETED_KEY, count.toString());
  } catch (e) {
    console.error('saveCompletedCount', e);
  }
}