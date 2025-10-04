import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Pokemons from './screens/Pokemons';
import DetallePokemon from './screens/DetallePokemon';
import Settings from './screens/Settings';

const Stack = createStackNavigator();
export default function App() {
return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Pokemons" component={Pokemons} />
        <Stack.Screen name="DetallePokemon" component={DetallePokemon} />
        <Stack.Screen name="Settings" component={Settings} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}