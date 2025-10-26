# SimpleHR - Frontend# SimplehrFront



Aplikacja frontendowa do zarządzania zasobami ludzkimi (HR) z funkcjami zarządzania grafikami pracy i wnioskami urlopowymi.This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.7.



## Funkcjonalności## Development server



### ✅ ZaimplementowaneTo start a local development server, run:

- **Autentykacja JWT** - logowanie/rejestracja z tokenami

- **Dashboard** - główny ekran z nawigacją i podsumowaniem```bash

- **Grafiki pracy** - lista grafików z zarządzaniem statusaming serve

- **Wnioski urlopowe** - lista wniosków użytkownika```

- **Responsive design** - dopasowany do różnych urządzeń

- **Role-based security** - różne uprawnienia dla ADMIN/HR/MANAGER/USEROnce the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.



### 🚧 Do dokończenia## Code scaffolding

- Tworzenie/edycja grafików pracy

- Szczegóły grafików z kalendarzemAngular CLI includes powerful code scaffolding tools. To generate a new component, run:

- Tworzenie/edycja wniosków urlopowych  

- Panel administracyjny do zarządzania wnioskami```bash

- Zarządzanie pracownikaming generate component component-name

- Konfiguracja typów urlopów```



## Struktura projektuFor a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:



``````bash

src/app/ng generate --help

├── components/           # Komponenty UI```

│   ├── auth/            # Logowanie/rejestracja

│   ├── dashboard/       # Dashboard główny## Building

│   ├── work-schedule/   # Grafiki pracy

│   └── leave-requests/  # Wnioski urlopoweTo build the project run:

├── services/            # Serwisy komunikacji z API

├── models/              # Interfejsy TypeScript```bash

├── guards/              # Guards autentykacji i uprawnieńng build

└── environments/        # Konfiguracja środowiska```

```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Technologie

## Running unit tests

- **Angular 18** - framework frontend

- **TypeScript** - język programowaniaTo execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

- **CSS** - stylowanie (bez dodatkowych bibliotek)

- **RxJS** - reaktywne programowanie```bash

- **HTTP Client** - komunikacja z APIng test

```

## Backend API

## Running end-to-end tests

Aplikacja komunikuje się z backend API Spring Boot dostępnym pod adresem `http://localhost:8080`.

For end-to-end (e2e) testing, run:

### Główne endpointy:

```bash

#### Autentykacjang e2e

- `POST /api/auth/login` - logowanie```

- `POST /api/auth/register` - rejestracja

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

#### Grafiki pracy  

- `GET /api/work-schedules` - lista grafików## Additional Resources

- `POST /api/work-schedules` - tworzenie grafiku

- `GET /api/work-schedules/{id}` - szczegóły grafikuFor more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

- `POST /api/work-schedules/{id}/submit` - przesłanie do zatwierdzenia
- `POST /api/work-schedules/{id}/approve` - zatwierdzenie
- `POST /api/work-schedules/{id}/publish` - publikowanie

#### Wnioski urlopowe
- `GET /api/leave-proposals/user/{userId}` - wnioski użytkownika
- `POST /api/leave-proposals` - tworzenie wniosku
- `POST /api/leave-proposals/{id}/accept` - zatwierdzenie
- `POST /api/leave-proposals/{id}/reject` - odrzucenie

## Uruchomienie

### Wymagania
- Node.js 18+
- npm lub yarn
- Uruchomiony backend Spring Boot na porcie 8080

### Instalacja i uruchomienie

1. **Instalacja zależności**
   ```bash
   cd simplehr-front
   npm install
   ```

2. **Uruchomienie serwera deweloperskiego**
   ```bash
   npm start
   # lub
   ng serve
   ```

3. **Otwarcie aplikacji**
   Otwórz przeglądarkę pod adresem: http://localhost:4200

### Build dla produkcji
```bash
npm run build
# Pliki będą w folderze dist/
```

## Konta testowe

Po uruchomieniu aplikacji możesz:

1. **Zarejestrować nowe konto** - tworzy użytkownika ADMIN dla nowej firmy
2. **Lub użyć istniejących kont** z bazy danych (jeśli backend ma dane testowe)

## Funkcjonalności ról

### 👤 USER (Pracownik)
- Przeglądanie opublikowanych grafików
- Składanie wniosków urlopowych
- Zarządzanie własnymi wnioskami

### 👥 MANAGER (Kierownik)
- Wszystko co USER +
- Tworzenie/edycja grafików pracy
- Przesyłanie grafików do zatwierdzenia

### 🏢 HR (Kadry)
- Wszystko co MANAGER +
- Zatwierdzanie/odrzucanie grafików
- Publikowanie grafików
- Zarządzanie wnioskami urlopowymi
- Zarządzanie pracownikami

### ⚙️ ADMIN (Administrator)
- Pełne uprawnienia do wszystkich funkcji
- Konfiguracja systemu
- Zarządzanie użytkownikami

## Komponenty główne

### AuthComponent
- Logowanie z walidacją
- Rejestracja z danymi firmy
- JWT token management

### DashboardComponent  
- Nawigacja główna
- Szybkie akcje
- Informacje o użytkowniku
- Role-based menu

### WorkScheduleListComponent
- Lista grafików z filtrami
- Akcje zależne od uprawnień
- Zarządzanie statusami

### LeaveRequestsListComponent
- Lista wniosków użytkownika
- Różne statusy wniosków
- Szczegóły i komentarze

## Rozwój

Aplikacja jest gotowa do dalszego rozwoju. Kluczowe obszary do rozszerzenia:

1. **Szczegółowe komponenty** - formularze tworzenia/edycji
2. **Kalendarz grafików** - wizualizacja planów pracy
3. **Panel administracyjny** - zarządzanie wszystkimi wnioskami
4. **Raporty i statystyki** - dashboardy analityczne
5. **Notyfikacje** - powiadomienia o zmianach statusów

## Integracja z backendem

Aplikacja jest w pełni zintegrowana z backend API i obsługuje:
- Autoryzację JWT z automatycznym dodawaniem headerów
- Obsługę błędów HTTP
- Mapowanie DTO na modele TypeScript
- Role-based security na poziomie UI

Wystarczy uruchomić backend Spring Boot na porcie 8080 i frontend będzie gotowy do użycia!

## Szybki start

1. **Uruchom backend**
   ```bash
   cd simplehr
   ./mvnw spring-boot:run
   ```

2. **Uruchom frontend**
   ```bash
   cd simplehr-front
   npm install
   npm start
   ```

3. **Otwórz aplikację**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:8080

4. **Zarejestruj się** jako pierwszy użytkownik (będzie miał rolę ADMIN)

5. **Gotowe!** - możesz korzystać z aplikacji HR

---

*Aplikacja jest w pełni funkcjonalna z autentykacją JWT, rolami użytkowników i responsywnym interfejsem. Gotowa do dalszego rozwoju i wdrożenia!*