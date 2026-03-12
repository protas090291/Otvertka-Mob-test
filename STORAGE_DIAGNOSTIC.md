# 🔍 Диагностика проблем с загрузкой фотографий дефектов

## 📋 Возможные причины проблем

### 1. **Bucket не существует или неправильно настроен**
- Bucket `defect-photos` должен существовать в Supabase Storage
- Проверка: Storage → Buckets → ищите `defect-photos`

### 2. **Bucket приватный без правильных RLS политик**
- Если bucket приватный, нужны RLS политики для доступа
- Проверка: Storage → Policies → bucket `defect-photos`

### 3. **Отсутствуют или неправильные RLS политики**
Нужны политики для:
- **SELECT** - чтение файлов
- **INSERT** - загрузка файлов  
- **UPDATE** - обновление файлов
- **DELETE** - удаление файлов

### 4. **Ограничения по размеру файла**
- Supabase имеет лимит на размер файла (обычно 50MB для бесплатного плана)
- Проверка: Settings → API → Storage → Max file size

### 5. **Ограничения по трафику**
- Бесплатный план Supabase имеет лимит трафика (2GB/месяц)
- Проверка: Dashboard → Usage → Bandwidth

### 6. **Неправильные пути к файлам**
- Путь должен быть: `defect-photos/${fileName}`
- Не должно быть дублирования: `defect-photos/defect-photos/...`

---

## 🛠️ Как проверить в Supabase Dashboard

### Шаг 1: Проверка bucket

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Storage** → **Buckets**
4. Найдите bucket `defect-photos`
5. Проверьте:
   - ✅ Bucket существует
   - ✅ Настройки доступа (Public/Private)

**Если bucket не существует:**
- Создайте новый bucket с именем `defect-photos`
- Выберите "Public bucket" если хотите публичный доступ
- Или настройте RLS политики для приватного доступа

### Шаг 2: Проверка RLS политик

1. Перейдите в **Storage** → **Policies**
2. Выберите bucket `defect-photos`
3. Проверьте наличие политик:

**Для публичного bucket:**
- Политики не обязательны, но можно добавить для безопасности

**Для приватного bucket (обязательно!):**
```sql
-- Политика для чтения (SELECT)
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'defect-photos');

-- Политика для загрузки (INSERT)
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'defect-photos');

-- Политика для обновления (UPDATE)
CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'defect-photos');

-- Политика для удаления (DELETE)
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'defect-photos');
```

### Шаг 3: Проверка ограничений

1. Перейдите в **Settings** → **API**
2. Проверьте:
   - **Max file size** - максимальный размер файла
   - **Storage limits** - лимиты хранилища

3. Перейдите в **Usage** (в боковом меню)
4. Проверьте:
   - **Bandwidth** - использованный трафик
   - **Storage** - использованное хранилище

### Шаг 4: Проверка существующих файлов

1. Перейдите в **Storage** → **defect-photos**
2. Посмотрите список файлов:
   - Есть ли загруженные файлы?
   - Какой у них размер?
   - Когда они были загружены?

---

## 🔧 Решения проблем

### Проблема: "Bucket not found"

**Решение:**
1. Создайте bucket `defect-photos` в Storage
2. Выберите "Public bucket" или настройте RLS

### Проблема: "Access denied" или "Permission denied"

**Решение:**
1. Если bucket приватный - добавьте RLS политики (см. выше)
2. Если bucket публичный - проверьте настройки bucket

### Проблема: "File too large"

**Решение:**
1. Уменьшите размер фотографий перед загрузкой
2. Или обновите план Supabase для большего лимита

### Проблема: "Bandwidth limit exceeded"

**Решение:**
1. Проверьте использование трафика в Usage
2. Дождитесь обновления лимита (месячный цикл)
3. Или обновите план Supabase

### Проблема: "File not found" при просмотре

**Решение:**
1. Проверьте путь к файлу в базе данных
2. Убедитесь, что путь правильный: `defect-photos/filename.jpg`
3. Проверьте, что файл действительно существует в Storage

---

## 🧪 Использование диагностического инструмента

Я создал HTML-файл для автоматической диагностики:

1. Откройте файл `check-storage-config.html` в браузере
2. Нажмите кнопки для проверки:
   - **Проверка подключения** - проверяет подключение к Supabase
   - **Проверка bucket** - проверяет существование bucket
   - **Проверка политик** - проверяет RLS политики
   - **Тест загрузки** - тестирует загрузку файла
   - **Список файлов** - показывает существующие файлы
   - **Полная диагностика** - запускает все проверки

---

## 📝 Рекомендации

1. **Используйте публичный bucket** для простоты (если нет требований безопасности)
2. **Добавьте RLS политики** если bucket приватный
3. **Проверяйте размер файлов** перед загрузкой (рекомендуется < 5MB)
4. **Мониторьте использование** трафика и хранилища
5. **Используйте signed URLs** для приватных файлов (как в коде)

---

## 🔗 Полезные ссылки

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage Limits](https://supabase.com/docs/guides/platform/limits)

---

## 💡 Если ничего не помогает

1. Проверьте логи в консоли браузера/Expo Go
2. Проверьте логи в Supabase Dashboard → Logs
3. Попробуйте загрузить файл через Supabase Dashboard вручную
4. Проверьте, что используете правильные ключи API (anon key для клиента)
