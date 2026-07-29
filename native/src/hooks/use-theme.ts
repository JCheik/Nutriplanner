import { Colors, type ThemeColors } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-theme-preference';

export function useTheme(): ThemeColors {
  // Claro por defecto; el oscuro solo si el usuario lo elige en Perfil (o pone
  // "automático" y su móvil está en modo noche). Ver use-theme-preference.
  return useResolvedScheme() === 'dark' ? Colors.dark : Colors.light;
}
