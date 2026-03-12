import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { BlurView } from 'expo-blur';

interface AnimatedVoiceButtonProps {
  isListening: boolean;
  onPress: () => void;
}

const AnimatedVoiceButton: React.FC<AnimatedVoiceButtonProps> = ({ isListening, onPress }) => {
  // Размеры из CSS - адаптируем для мобильного
  const CARD_SIZE = 163; // 326 / 2
  const CIRCLE1_SIZE = 112; // 224 / 2
  const CIRCLE2_SIZE = 61.5; // 123 / 2
  const ICON_SIZE = 32; // 64 / 2

  // Генерируем линии для SVG (16 линий для производительности)
  const NUM_LINES = 16;
  const lines = [];
  for (let i = 0; i < NUM_LINES; i++) {
    const angle = (i * 22.5) * Math.PI / 180; // 360 / 16 = 22.5 градусов
    const centerX = 231.5;
    const centerY = 231.5;
    const radius = 92;
    const endX = centerX + radius * Math.cos(angle);
    const endY = centerY + radius * Math.sin(angle);
    lines.push({ startX: centerX, startY: centerY, endX, endY });
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <View style={styles.wrap}>
          {/* Card */}
          <View style={[styles.card, { width: CARD_SIZE, height: CARD_SIZE }]}>
            {/* Card background с glassmorphism */}
            <BlurView intensity={15} style={styles.cardBg} tint="light">
              <LinearGradient
                colors={['rgba(208, 228, 255, 0.4)', 'rgba(208, 228, 255, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardBgGradient}
              />
            </BlurView>

            {/* Outline с градиентом (статичный, без анимации) */}
            {isListening && (
              <View style={styles.outline}>
                <LinearGradient
                  colors={['transparent', 'rgba(255, 255, 255, 0.9)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.outlineGradient}
                />
              </View>
            )}

            {/* Wave (только при прослушивании) */}
            {isListening && (
              <>
                <View style={[styles.wave, styles.wave1]} />
                <View style={[styles.wave, styles.wave2]} />
              </>
            )}

            {/* Circle-1 (внешний круг с линиями) */}
            <View
              style={[
                styles.circle1,
                {
                  width: CIRCLE1_SIZE,
                  height: CIRCLE1_SIZE,
                  borderRadius: CIRCLE1_SIZE / 2,
                },
              ]}
            >
              {/* Цветные точки с blur эффектом */}
              <View style={[styles.circle1Dot1, { backgroundColor: '#ff0073' }]} />
              <View style={[styles.circle1Dot2, { backgroundColor: '#00baff' }]} />

              {/* Линии SVG */}
              <View style={[styles.linesContainer, { width: CIRCLE1_SIZE, height: CIRCLE1_SIZE }]}>
                <Svg width={CIRCLE1_SIZE} height={CIRCLE1_SIZE} viewBox="0 0 463 462">
                  {lines.map((line, i) => (
                    <Path
                      key={`line-${i}`}
                      d={`M ${line.startX} ${line.startY} L ${line.endX} ${line.endY}`}
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="100"
                      strokeDashoffset="10"
                      fill="none"
                      opacity={isListening ? 0 : 0.8}
                    />
                  ))}
                </Svg>
              </View>
            </View>

            {/* Circle-2 (внутренний круг) */}
            <View
              style={[
                styles.circle2,
                {
                  width: CIRCLE2_SIZE,
                  height: CIRCLE2_SIZE,
                  borderRadius: CIRCLE2_SIZE / 2,
                },
              ]}
            >
              {/* Цветные точки */}
              <View style={[styles.circle2Dot1, { backgroundColor: '#ff0073' }]} />
              <View style={[styles.circle2Dot2, { backgroundColor: '#00bbff' }]} />

              {/* Background с градиентом */}
              <View style={styles.circle2Bg}>
                <LinearGradient
                  colors={['#c4a8e8', '#9292d8', '#5ab5ff']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  locations={[0, 0.4, 1]}
                  style={styles.circle2BgInner}
                />
              </View>
            </View>

            {/* Icon (микрофон) */}
            <View style={styles.icon}>
              <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
                <Defs>
                  <SvgLinearGradient id="grad-1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.6)" stopOpacity="1" />
                    <Stop offset="100%" stopColor="rgba(255, 255, 255, 0.2)" stopOpacity="1" />
                  </SvgLinearGradient>
                </Defs>
                <Path
                  d="M12 2a3 3 0 0 0-3 3v7a3 3 0 1 0 6 0V5a3 3 0 0 0-3-3zM5 12a1 1 0 1 1 2 0 5 5 0 0 0 10 0 1 1 0 1 1 2 0 7.001 7.001 0 0 1-6 6.93V21a1 1 0 1 1-2 0v-2.07A7.001 7.001 0 0 1 5 12z"
                  fill="url(#grad-1)"
                />
              </Svg>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const CARD_SIZE = 163;
const CIRCLE1_SIZE = 112;
const CIRCLE2_SIZE = 61.5;
const ICON_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  touchable: {
    width: '100%',
    height: '100%',
  },
  wrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 12.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: 3.5,
    // Тени как в веб-версии: 0 10px 40px rgba(0, 0, 60, 0.25), inset 0 0 10px rgba(255, 255, 255, 0.5)
    shadowColor: 'rgba(0, 0, 60, 0.25)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardBg: {
    position: 'absolute',
    top: 0.5,
    left: 0.5,
    right: 0.5,
    bottom: 0.5,
    borderRadius: 12.5,
    overflow: 'hidden',
    zIndex: -1,
  },
  cardBgGradient: {
    width: '100%',
    height: '100%',
  },
  outline: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 13.5,
    overflow: 'hidden',
    top: 0,
    left: 0,
  },
  outlineGradient: {
    width: 200,
    height: 200,
    position: 'absolute',
    top: -18.5,
    left: -18.5,
  },
  wave: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    top: 31.5,
    left: 31.5,
    shadowColor: 'rgba(106, 76, 172, 0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  wave1: {
    transform: [{ scale: 1.2 }],
    opacity: 0.6,
  },
  wave2: {
    transform: [{ scale: 1.4 }],
    opacity: 0.3,
  },
  circle1: {
    backgroundColor: 'hsla(0, 0%, 70%, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    // Множественные тени как в веб-версии
    shadowColor: 'rgb(150, 166, 197)',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  circle1Dot1: {
    position: 'absolute',
    width: 33.6, // 30% of 112
    height: 33.6,
    borderRadius: 16.8,
    top: 33.6, // 30% of 112
    right: 33.6,
    opacity: 0.7,
    shadowColor: '#ff0073',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
  },
  circle1Dot2: {
    position: 'absolute',
    width: 33.6,
    height: 33.6,
    borderRadius: 16.8,
    bottom: 11.2, // 10% of 112
    left: 33.6,
    opacity: 0.7,
    shadowColor: '#00baff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
  },
  linesContainer: {
    position: 'absolute',
  },
  circle2: {
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: 'rgba(255, 255, 255, 0.9)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  circle2Dot1: {
    position: 'absolute',
    width: 18.45, // 30% of 61.5
    height: 18.45,
    borderRadius: 9.225,
    top: 12.3, // 20% of 61.5
    right: 12.3,
    opacity: 0.7,
    shadowColor: '#ff0073',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
  },
  circle2Dot2: {
    position: 'absolute',
    width: 12.3, // 20% of 61.5
    height: 12.3,
    borderRadius: 6.15,
    bottom: 6.15, // 10% of 61.5
    left: 24.6, // 40% of 61.5
    opacity: 0.7,
    shadowColor: '#00bbff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
  },
  circle2Bg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 30.75,
    overflow: 'hidden',
  },
  circle2BgInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30.75,
    // Тени как в веб-версии
    shadowColor: 'rgba(255, 255, 255, 0.9)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  icon: {
    position: 'absolute',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
});

export default AnimatedVoiceButton;
