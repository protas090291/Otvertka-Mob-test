#!/usr/bin/env python3
"""
Скрипт для автоматической загрузки мобильного приложения в GitHub
Использует Python для надежной работы с путями, содержащими специальные символы
"""

import os
import subprocess
import sys
from pathlib import Path

def run_command(cmd, check=True, cwd=None):
    """Выполняет команду и возвращает результат"""
    print(f"🔹 Выполняю: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            check=check,
            cwd=cwd,
            capture_output=True,
            text=True
        )
        if result.stdout:
            print(result.stdout)
        return result
    except subprocess.CalledProcessError as e:
        if e.stderr:
            print(f"⚠️  Ошибка: {e.stderr}")
        if not check:
            return e
        raise

def main():
    # Определяем директорию скрипта
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)
    
    print("🚀 Загрузка мобильного приложения в GitHub")
    print(f"📁 Рабочая директория: {os.getcwd()}")
    print("")
    
    # Проверка .gitignore
    if not (script_dir / ".gitignore").exists():
        print("❌ .gitignore не найден!")
        sys.exit(1)
    
    print("✅ .gitignore найден")
    print("")
    
    # Инициализация Git
    git_dir = script_dir / ".git"
    if not git_dir.exists():
        print("📦 Инициализирую Git репозиторий...")
        run_command(["git", "init"], cwd=str(script_dir))
        print("✅ Git репозиторий инициализирован")
    else:
        print("✅ Git репозиторий уже инициализирован")
    print("")
    
    # Настройка remote
    print("🔗 Настраиваю remote репозиторий...")
    run_command(["git", "remote", "remove", "origin"], check=False, cwd=str(script_dir))
    run_command(["git", "remote", "add", "origin", "https://github.com/protas090291/Otvertka-Mob-test.git"], cwd=str(script_dir))
    print("✅ Remote добавлен")
    print("")
    
    # Настройка пользователя Git
    print("💾 Настраиваю пользователя Git...")
    run_command(["git", "config", "user.name", "zakharprotas"], check=False, cwd=str(script_dir))
    run_command(["git", "config", "user.email", "protas.090291@gmail.com"], check=False, cwd=str(script_dir))
    print("✅ Пользователь Git настроен")
    print("")
    
    # Добавление файлов
    print("📦 Добавляю файлы в Git...")
    run_command(["git", "add", "."], cwd=str(script_dir))
    print("✅ Файлы добавлены")
    print("")
    
    # Показываем статус
    print("📊 Статус (первые 30 файлов):")
    status_result = run_command(["git", "status", "--short"], cwd=str(script_dir))
    lines = status_result.stdout.strip().split('\n')[:30]
    for line in lines:
        if line:
            print(line)
    print("")
    
    # Создание коммита
    print("💾 Создаю коммит...")
    commit_msg = """Initial commit: Mobile app for construction management (Отвёртка)

- Expo React Native application
- Supabase integration
- Voice control support
- Defect management system
- Android and iOS support
- Polyfills for Android compatibility"""
    
    commit_result = run_command(
        ["git", "commit", "-m", commit_msg],
        check=False,
        cwd=str(script_dir)
    )
    
    if commit_result.returncode == 0:
        print("✅ Коммит создан")
    else:
        print("⚠️  Коммит уже существует или нет изменений")
        print("Проверяю статус...")
        run_command(["git", "status"], cwd=str(script_dir))
    print("")
    
    # Переключение на main ветку
    print("🌿 Переключаюсь на ветку main...")
    run_command(["git", "branch", "-M", "main"], check=False, cwd=str(script_dir))
    print("✅ Ветка main активна")
    print("")
    
    # Загрузка в GitHub
    print("🌐 Загружаю в GitHub...")
    push_result = run_command(
        ["git", "push", "-u", "origin", "main"],
        check=False,
        cwd=str(script_dir)
    )
    
    if push_result.returncode == 0:
        print("")
        print("✅ ГОТОВО! Приложение загружено в GitHub!")
    else:
        print("")
        print("⚠️  Возможные проблемы:")
        print("   1. Репозиторий не пустой на GitHub (нужно сделать force push)")
        print("   2. Нет доступа к репозиторию (проверьте права доступа)")
        print("   3. Нужна аутентификация (настройте GitHub credentials)")
        print("")
        print("Если репозиторий не пустой, выполните:")
        print("   git push -u origin main --force")
        print("")
        print("Или настройте аутентификацию:")
        print("   gh auth login")
        print("   или используйте Personal Access Token")
        sys.exit(1)
    
    print("")
    print("📋 ФИНАЛЬНЫЙ СТАТУС:")
    print("")
    print("✅ Репозиторий: https://github.com/protas090291/Otvertka-Mob-test.git")
    print("✅ Ветка: main")
    print("")
    
    # Показываем последний коммит
    log_result = run_command(["git", "log", "--oneline", "-1"], check=False, cwd=str(script_dir))
    if log_result.returncode == 0 and log_result.stdout:
        print(log_result.stdout.strip())
        print("")
    
    print("📁 Что загружено:")
    print("   ✅ Весь исходный код приложения")
    print("   ✅ package.json и конфигурация")
    print("   ✅ app.json")
    print("   ✅ Все компоненты и экраны")
    print("   ✅ Скрипты для запуска")
    print("   ✅ Polyfills для Android")
    print("   ✅ README и документация")
    print("")
    print("📝 Что исключено (.gitignore):")
    print("   ✅ node_modules/")
    print("   ✅ Логи (*.log)")
    print("   ✅ Временные файлы")
    print("   ✅ Build файлы")
    print("")
    print("💡 Теперь можно клонировать на сервер:")
    print("   git clone https://github.com/protas090291/Otvertka-Mob-test.git")
    print("")

if __name__ == "__main__":
    main()
