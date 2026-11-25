// Tela inicial: imagem do próprio modelo, e os dois caminhos (atlas e anotações).
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { noteCount, useNotes } from '@/data/notes';
import { Icon, Press, T } from '@/ui/kit';
import { EASE_OUT, usePalette } from '@/ui/theme';

// Na web as entradas ficam de fora: a página já aparece pronta.
const web = Platform.OS === 'web';
const enter = (i: number) => web ? undefined : FadeInDown.duration(420).delay(120 + i * 60).easing(Easing.bezier(...EASE_OUT)).withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });

export default function Home() {
  const c = usePalette();
  const ins = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const n = noteCount(useNotes());
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ minHeight: height, paddingTop: ins.top + 8, paddingBottom: ins.bottom + 24 }}>
      <Animated.View entering={web ? undefined : FadeIn.duration(600)} style={styles.hero}>
        <Image source={require('../../assets/hero.png')} style={{ width: '100%', height: Math.min(460, height * 0.5) }} contentFit="contain" accessibilityLabel="Crânio com músculos da face e da mastigação" />
      </Animated.View>
      <View style={styles.text}>
        <Animated.View entering={enter(0)}>
          <T serif style={{ fontSize: 48, lineHeight: 50, letterSpacing: -0.8 }}>Atlas da face</T>
          <T style={{ color: c.mute, fontSize: 17, lineHeight: 25, marginTop: 10, maxWidth: 360 }}>
            Músculos da face e da mastigação, ATM e nervo trigêmeo num crânio em 3D. Toque numa estrutura para vê-la no lugar.
          </T>
        </Animated.View>
        <Animated.View entering={enter(1)} style={{ marginTop: 22, gap: 10 }}>
          <Press onPress={() => router.push('/atlas')} style={[styles.go, { backgroundColor: c.ink }]}>
            <View style={{ flex: 1 }}>
              <T serif style={{ fontSize: 22, color: c.bg }}>Abrir o atlas</T>
              <T style={{ fontSize: 14, color: c.bg, opacity: 0.72, marginTop: 2 }}>Face, mastigação, ATM e trigêmeo</T>
            </View>
            <Icon name="next" color={c.bg} />
          </Press>
          <Press onPress={() => router.push('/notas')} style={[styles.go, { backgroundColor: c.card, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
            <View style={{ flex: 1 }}>
              <T serif style={{ fontSize: 22 }}>Minhas anotações</T>
              <T style={{ fontSize: 14, color: c.mute, marginTop: 2 }}>{n ? `${n} ${n === 1 ? 'estrutura anotada' : 'estruturas anotadas'}` : 'Nenhuma anotação ainda'}</T>
            </View>
            <Icon name="next" />
          </Press>
        </Animated.View>
        <Animated.View entering={enter(2)}>
          <T style={{ color: c.mute, fontSize: 12.5, lineHeight: 18, marginTop: 18 }}>
            Para estudo. Modelo 3D: Z-Anatomy, baseado no BodyParts3D (© The Database Center for Life Science), CC BY-SA 4.0. Textos revisados com base em Rossi, Anatomia craniofacial aplicada à odontologia (2ª ed., Santos, 2017).
          </T>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: 16 },
  text: { paddingHorizontal: 22, maxWidth: 560, width: '100%', alignSelf: 'center' },
  go: { minHeight: 72, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
