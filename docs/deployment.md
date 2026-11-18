# Развёртывание

## Windows

Нужен PowerShell 7, Node.js 26.13 или совместимое исправление ветки 26, PostgreSQL 18. По умолчанию локальный PostgreSQL слушает порт 55438, приложение порт 5180. Пути к бинарным файлам хранятся в `var/config/runtime.json`, параметры приложения в `var/config/application.env`.

На новом компьютере из корня:

```powershell
.\deka.ps1 setup
.\deka.ps1 migrate
.\deka.ps1 seed
.\deka.ps1 start -WithoutAssistant
```

`setup` устанавливает зависимости из lock-файла и создаёт отдельный кластер, случайный пароль и локальные настройки. Если данные или настройки уже существуют, подготовка прекращается без их перезаписи. `seed` предназначен только для пустой базы локального показа. Для установки с реальными пользователями он не используется.

Если программы отсутствуют в `PATH`, укажите пути при подготовке. Для второй копии задайте свободные порты параметрами `-AppPort` и `-DatabasePort`.

```powershell
.\deka.ps1 setup -NodePath 'C:\Runtime\node\node.exe' -PostgresBin 'C:\Runtime\postgres\bin'
```

`check`, `test` и `build` вызываются через корневой `deka.ps1`. Для запуска с помощником выполните `.\deka.ps1 start`. Первый запуск скачает модель и локальный сервер llama.cpp.

## Docker

Все файлы находятся в `infrastructure/docker`. Контекст сборки остаётся корнем проекта; специфичный `Dockerfile.dockerignore` исключает `var`, зависимости и сборки. Финальный образ содержит production-зависимости, `.output`, миграции, служебные сценарии БД и healthcheck. Пользователь контейнера `node`, файловая система только для чтения.

```powershell
.\deka.ps1 docker-config
.\deka.ps1 docker-up
```

На Linux или без корневого PowerShell-скрипта:

```sh
node apps/portal/tooling/deployment/create-environment.mjs
docker compose --env-file var/config/compose.env -f infrastructure/docker/compose.yaml config --quiet
docker compose --env-file var/config/compose.env -f infrastructure/docker/compose.yaml up --build -d
```

При запуске через `deka.ps1` помощник включён по умолчанию. Отдельный сервис `model-init` скачивает GGUF из закреплённой ревизии и проверяет размер и SHA-256 до запуска модели. Файл остаётся в `var/models` между перезапусками. Если он уже проверен, повторная загрузка не выполняется. Для ручного вызова Compose добавьте `--profile ai` перед `up`.

Compose запускает PostgreSQL 18.7, затем миграции и приложение. Порты БД и модели не публикуются. Доступен только `127.0.0.1:5180`. Приложение использует роль `deka_app`, миграции роль `deka_owner`. Пароли генерируются в `var/config/compose.env` и не перезаписываются автоматически. Изменение файла не изменяет пароль уже созданной БД.

Пустую отдельную базу для презентации можно наполнить явно:

```sh
docker compose --env-file var/config/compose.env -f infrastructure/docker/compose.yaml --profile sample-data run --rm seed
```

Быстрый вход в обычном запуске Compose отключён. Команда `.\deka.ps1 docker-demo` явно включает локальный режим показа и наполняет только пустую базу. `APP_ORIGIN` задаётся при сборке; после изменения адреса образ нужно пересобрать. `docker compose ... down` сохраняет именованный том PostgreSQL и скачанную модель. Не используйте удаление томов для штатного обновления.

## GPU и переход на CPU

`deka.ps1` сначала поднимает приложение, подготавливает модель, проверяет доступ к GPU из контейнера и запускает помощника. Для NVIDIA выбирается `compose.cuda.yaml`, для Linux с `/dev/dri` используется `compose.vulkan.yaml`. Если запуск или проверка здоровья GPU-контейнера завершились ошибкой, он заменяется CPU-контейнером. Ошибка запуска CPU не скрывается. Выбранный режим записывается в `var/run/docker-acceleration.json`.

На Windows для NVIDIA необходим Docker Desktop с WSL2 и рабочий драйвер. Наличие видеокарты в системе само по себе не подтверждает её доступность из контейнера. Обычный вызов `docker compose` использует CPU-конфигурацию; автоматический выбор и резервный запуск выполняет `deka.ps1`.

```powershell
.\deka.ps1 docker-demo
.\deka.ps1 docker-demo -Acceleration cpu
.\deka.ps1 docker-demo -WithoutAssistant
```

## Резервные копии

```powershell
.\deka.ps1 backup
```

Создаётся custom-дамп `var/backups/deka-ДАТА-ВРЕМЯ.dump`. Пароль передаётся `pg_dump` через окружение дочернего процесса. Файл не перезаписывает предыдущие копии. Восстановление проверяйте через `pg_restore` в отдельную пустую БД, затем выполняйте функциональную проверку. Не восстанавливайте поверх работающей базы.

До пилота нужны согласованные периоды хранения и проверка восстановления, внешний мониторинг, HTTPS, ротация журналов и контроль доступа к каталогу `var` и копиям.

## Проверка восстановления и архив

Нативная установка: `.\deka.ps1 backup-check` создаёт копию и восстанавливает её в отдельную базу с проверкой контрольных записей. Для Docker: `.\deka.ps1 docker-backup`; Node.js и pg_dump на хосте не нужны.

Архив исходников: `.\deka.ps1 package`. Файл появляется в `var/releases`; локальное состояние не включается.

Образы llama.cpp CPU, CUDA и Vulkan закреплены SHA-256 digest, полученными из официального GHCR 17 ноября 2026. Переопределения LLAMA_IMAGE, LLAMA_CUDA_IMAGE и LLAMA_VULKAN_IMAGE сохраняются. Замена digest требует повторной проверки на целевой машине.
