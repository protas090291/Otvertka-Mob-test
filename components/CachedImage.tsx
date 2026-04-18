import React from 'react';
import { Image, ImageProps } from 'expo-image';
import { useCachedImage } from '../hooks/useCachedImage';

/**
 * Обёртка над expo-image, которая использует наш файловый кэш (lib/imageCache.ts).
 *
 * Работает так же, как <Image source={{ uri }} />, но при первой загрузке
 * скачивает картинку в cacheDirectory, а при последующих — подсовывает локальный
 * file:// URI. Это даёт устойчивый оффлайн-просмотр (планы квартир, фото дефектов).
 *
 * Если в source передан модуль (require(...)) или не-http URI — просто пробрасываем без изменений.
 */
const CachedImage: React.FC<ImageProps> = (props) => {
  const { source, ...rest } = props as any;

  // Берём uri только если это объект { uri }
  const remoteUrl: string | undefined =
    source && typeof source === 'object' && !Array.isArray(source) && typeof source.uri === 'string'
      ? source.uri
      : undefined;

  const resolvedUri = useCachedImage(remoteUrl);

  // Если мы работаем с http(s)-URI — подменяем на кэшированный; иначе источник оставляем как есть.
  const nextSource = remoteUrl
    ? { ...(source as object), uri: resolvedUri || remoteUrl }
    : source;

  return <Image {...rest} source={nextSource} />;
};

export default CachedImage;
