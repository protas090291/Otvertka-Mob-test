import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface Defect {
  id: string;
  x_coord?: number;
  y_coord?: number;
  title?: string;
  name?: string; // Альтернативное поле для названия
  description?: string;
  status?: string;
  severity?: string;
}

interface DefectsOverlayProps {
  defects: Defect[];
  imageLayout: { x: number; y: number; width: number; height: number } | null;
  imageSize?: { width: number; height: number }; // Реальный размер изображения
  animatedStyle: any; // Animated style с трансформациями
  onDefectPress?: (defect: Defect) => void;
  userRole?: string;
}

const DefectsOverlay: React.FC<DefectsOverlayProps> = ({
  defects,
  imageLayout,
  imageSize,
  animatedStyle,
  onDefectPress,
  userRole,
}) => {
  // Отладочная информация
  console.log('🔍 DefectsOverlay render:', {
    defectsCount: defects.length,
    hasImageLayout: !!imageLayout,
    hasImageSize: !!imageSize,
    imageLayout: imageLayout,
    imageSize: imageSize,
    defects: defects.map(d => ({
      id: d.id,
      x_coord: d.x_coord,
      y_coord: d.y_coord,
      title: d.title || d.name,
      status: d.status
    }))
  });

  if (!imageLayout || defects.length === 0) {
    console.log('⚠️ DefectsOverlay: не отображается', {
      hasImageLayout: !!imageLayout,
      defectsCount: defects.length
    });
    return null;
  }

  // Вычисляем реальный размер изображения и смещения для contentFit="contain"
  let actualImageWidth = imageLayout.width;
  let actualImageHeight = imageLayout.height;
  let offsetX = 0;
  let offsetY = 0;

  if (imageSize) {
    const containerAspect = imageLayout.width / imageLayout.height;
    const imageAspect = imageSize.width / imageSize.height;

    if (imageAspect > containerAspect) {
      // Изображение шире контейнера - заполняет по ширине
      actualImageWidth = imageLayout.width;
      actualImageHeight = imageLayout.width / imageAspect;
      offsetY = (imageLayout.height - actualImageHeight) / 2;
    } else {
      // Изображение выше контейнера - заполняет по высоте
      actualImageHeight = imageLayout.height;
      actualImageWidth = imageLayout.height * imageAspect;
      offsetX = (imageLayout.width - actualImageWidth) / 2;
    }
  }

  // Получаем цвет и иконку для дефекта в зависимости от статуса
  const getDefectColor = (status?: string) => {
    switch (status) {
      case 'active':
      case 'open':
      case 'in-progress':
        return '#ef4444'; // Красный для активных
      case 'fixed':
      case 'resolved':
        return '#10b981'; // Зеленый для исправленных
      case 'closed':
        return '#6b7280'; // Серый для закрытых
      default:
        return '#ef4444';
    }
  };

  const getDefectIcon = (status?: string) => {
    switch (status) {
      case 'active':
      case 'open':
      case 'in-progress':
        return 'warning';
      case 'fixed':
      case 'resolved':
        return 'checkmark-circle';
      case 'closed':
        return 'close-circle';
      default:
        return 'warning';
    }
  };

  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: imageLayout.width,
          height: imageLayout.height,
        },
        styles.overlay,
      ]}
      pointerEvents="box-none"
    >
      {/* SVG для визуального отображения маркеров */}
      <Svg
        width={imageLayout.width}
        height={imageLayout.height}
        style={styles.svg}
        viewBox={`0 0 ${imageLayout.width} ${imageLayout.height}`}
        pointerEvents="none"
      >
        <G pointerEvents="none">
          {defects.map((defect) => {
            const xPercent = defect.x_coord ?? 50;
            const yPercent = defect.y_coord ?? 50;
            const color = getDefectColor(defect.status);
            
            // Преобразуем проценты в координаты SVG с учетом смещения изображения
            const svgX = offsetX + (xPercent / 100) * actualImageWidth;
            const svgY = offsetY + (yPercent / 100) * actualImageHeight;

            return (
              <G key={defect.id}>
                {/* Внешний круг (тень/обводка) */}
                <Circle
                  cx={svgX}
                  cy={svgY}
                  r={14}
                  fill="rgba(255, 255, 255, 0.8)"
                />
                {/* Основной круг дефекта */}
                <Circle
                  cx={svgX}
                  cy={svgY}
                  r={12}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2}
                />
              </G>
            );
          })}
        </G>
      </Svg>
      
      {/* Overlay для интерактивности - используем View для кликов */}
      <View 
        style={StyleSheet.absoluteFillObject} 
        pointerEvents="box-none"
      >
        {defects.map((defect) => {
          const xPercent = defect.x_coord ?? 50;
          const yPercent = defect.y_coord ?? 50;
          const color = getDefectColor(defect.status);
          const iconName = getDefectIcon(defect.status) as any;

          // Вычисляем позицию маркера в пикселях с учетом смещения изображения
          const markerX = offsetX + (xPercent / 100) * actualImageWidth;
          const markerY = offsetY + (yPercent / 100) * actualImageHeight;

          console.log(`📍 Маркер дефекта ${defect.id}:`, {
            defectId: defect.id,
            coordinates: { xPercent: xPercent.toFixed(2), yPercent: yPercent.toFixed(2) },
            markerPosition: { x: markerX.toFixed(2), y: markerY.toFixed(2) },
            containerSize: { width: imageLayout.width, height: imageLayout.height },
            actualImageSize: { width: actualImageWidth, height: actualImageHeight },
            offset: { x: offsetX, y: offsetY },
            // Проверка, что координаты в пределах контейнера
            isWithinContainer: {
              x: markerX >= 0 && markerX <= imageLayout.width,
              y: markerY >= 0 && markerY <= imageLayout.height
            }
          });

          return (
            <TouchableOpacity
              key={`touchable-${defect.id}`}
              style={[
                styles.markerTouchable,
                {
                  left: markerX - 16,
                  top: markerY - 16,
                },
              ]}
              onPress={() => {
                console.log('👆 Клик на маркер дефекта:', defect);
                onDefectPress?.(defect);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.markerContainer, { backgroundColor: color }]}>
                <Ionicons name={iconName} size={16} color="#fff" />
              </View>
              {(defect.title || defect.name) && (
                <View style={styles.markerTooltip}>
                  <Text style={styles.markerTooltipText} numberOfLines={1}>
                    {defect.title || defect.name}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 5,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  markerTouchable: {
    position: 'absolute',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  markerContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerTooltip: {
    position: 'absolute',
    bottom: 28,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: 150,
  },
  markerTooltipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default DefectsOverlay;
