# Frontend Guide: WorkTimeConfig & Work Time

Data: 2025-10-28
Zakres: Dokument opisuje, jak frontend korzysta z WorkTimeConfig i powiązanych endpointów, aby budować spójny UI/UX dla trybów ewidencji: SCHEDULE_WORK, PUNCH_IN_OUT, MANUAL_ENTRY. API pozostaje bez zmian.

## 1. Cel i zakres

- Szybka detekcja trybu pracy z WorkTimeConfig i włączenie odpowiednich zachowań UI.
- Jasne reguły: co użytkownik może/nie może zrobić w każdym trybie i jakie walidacje zachodzą po stronie FE.
- Kontrakty API (requests/responses) i przykłady JSON do kopiowania.
- Spójne mapowanie błędów na UI (toast/inline) z użyciem Correlation ID.

Akceptacja: Zespół FE jest w stanie wdrożyć widoki miesiąca/dnia i akcje bez dodatkowych doprecyzowań.

## 2. Szybka detekcja trybu po stronie FE

- Pobierz konfiguracje firmy: GET /api/work-time-configs → wybierz active=true
- Kluczowe pole: workTimeType ∈ { SCHEDULE_WORK, PUNCH_IN_OUT, MANUAL_ENTRY }
- Zasady UI z konfiguracji:
  - PUNCH: autoRoundEnabled, roundingMinutes
  - MANUAL: maxDailyHours, maxDailyOvertimeHours
  - Ogólne: autoMarkLeaveDays, allowCorrections, correctionDaysLimit, approverUserIds[]

Przykład (TypeScript):

```ts
this.http.get<WorkTimeConfig[]>(`/api/work-time-configs`).pipe(
  map(list => list.find(c => c.active) ?? null)
).subscribe(cfg => state.set({ config: cfg, mode: cfg?.workTimeType }));
```

## 3. Zachowania użytkownika – co wolno / czego nie wolno

- SCHEDULE_WORK
  - Widok miesiąca/dnia oparty o opublikowany grafik; brak edycji godzin po stronie użytkownika.
  - Po re-publish HR/Manager: frontend odświeża dane (eventual consistency).
- PUNCH_IN_OUT
  - 1 para Punch In/Out dziennie.
  - Punch Out musi następować po Punch In (FE waliduje, BE zwraca 400 przy naruszeniu).
  - Jeżeli autoRoundEnabled=true → w UI pokazuj roundedHours jako efektywne z tooltipem „zaokrąglono do X min”.
- MANUAL_ENTRY
  - Zakaz raportowania przyszłości (FE blokuje wybór dat > dziś).
  - Walidacje formularza wg limitów: maxDailyHours, maxDailyOvertimeHours.

Action Matrix (skrót):

- SCHEDULE_WORK: Punch — nie; Manual — nie; ReadOnly — tak; Błędy: 403/409 przy próbie edycji.
- PUNCH_IN_OUT: Punch — tak (1x para/dzień); Manual — nie; ReadOnly — tak; Błędy: 409 (drugi in), 400 (out < in).
- MANUAL_ENTRY: Punch — nie; Manual — tak (limity + zakaz przyszłości); ReadOnly — tak; Błędy: 400 (limity), 409 (konflikt).

## 4. Macierz ról i dostępów (FE guardy)

- USER: własne dni/miesiąc, Punch/Manual wg trybu, własne korekty.
- MANAGER/HR/ADMIN: dodatkowo userId w odczytach (podgląd pracownika), akceptacje, grafiki.
- Zasada FE: userId w GET /api/work-time/days dostępny tylko dla MANAGER/HR/ADMIN.

Przykłady:

- USER: GET /api/work-time/days?period=2025-10
- MANAGER: GET /api/work-time/days?period=2025-10&userId=123

## 5. API i kontrakty (dla FE)

- Work Time Config: GET /api/work-time-configs (lista) → wybierz active=true
  - DTO: WorkTimeConfigDto: id, name, description?, workTimeType, active, autoMarkLeaveDays?, allowCorrections?, correctionDaysLimit?, approverUserIds?, autoRoundEnabled?, roundingMinutes?, maxDailyHours?, maxDailyOvertimeHours?
- Widok miesiąca: GET /api/work-time/days?period=YYYY-MM[&userId=...]
  - Response: WorkTimeDayResponse[0..31]
- Widok dnia: GET /api/work-time/day/{yyyy-MM-dd} → WorkTimeDayResponse
- Punch: POST /api/work-time/punch/in|out → PunchRequest { workDate, time? } → 200 OK (bez body lub WorkTimeDayResponse)
- Manual: PUT /api/work-time/manual/day → ManualDayRequest { workDate, standardHours, overtimeHours, note? } → 200 OK
- Adjustments (opcjonalnie): POST /api/work-time-adjustments, GET /my, GET /company, POST /{id}/submit|approve|reject

## 6. Przykłady JSON (copy‑paste)

WorkTimeConfig (PUNCH):
```json
{
  "id": 1,
  "name": "Domyślna",
  "description": "Rejestrator wejść/wyjść z zaokrąglaniem",
  "workTimeType": "PUNCH_IN_OUT",
  "active": true,
  "autoRoundEnabled": true,
  "roundingMinutes": 15,
  "allowCorrections": true,
  "correctionDaysLimit": 7,
  "approverUserIds": [10, 11]
}
```

WorkTimeConfig (MANUAL):
```json
{
  "id": 2,
  "name": "Ręczne wpisy",
  "workTimeType": "MANUAL_ENTRY",
  "active": true,
  "maxDailyHours": 8,
  "maxDailyOvertimeHours": 2
}
```

WorkTimeDayResponse (różne warianty):
```json
{ "workDate":"2025-10-01", "scheduledStartTime":"09:00", "scheduledEndTime":"17:00", "editable": false, "leaveDay": false }
{ "workDate":"2025-10-02", "punchInTime":"09:02", "punchOutTime":"17:05", "roundedHours": 8.0, "editable": true, "leaveDay": false }
{ "workDate":"2025-10-03", "standardHours": 8.0, "overtimeHours": 1.0, "editable": true, "leaveDay": false }
```

Punch:
```json
{ "workDate": "2025-10-28" }
```
Manual:
```json
{ "workDate":"2025-10-28", "standardHours":8.0, "overtimeHours":1.0, "note":"Projekt X" }
```

## 7. Reguły biznesowe — co musi respektować FE

- PUNCH: 1 para in/out na dzień (409 przy drugim in), out < in → 400; jeżeli rounding aktywny → pokazuj roundedHours.
- MANUAL: brak przyszłych dat; waliduj limity z configu; przekroczenia → 400 (z details per pole).
- SCHEDULE_WORK: po re‑publish odśwież miesiąc/dzień; brak duplikatów.

## 8. Model błędów i diagnostyka

Standardowy ErrorResponse:
```json
{
  "timestamp": "2025-10-28T10:15:30.123Z",
  "code": "BAD_REQUEST",
  "message": "Czytelny komunikat",
  "path": "/api/work-time/punch/out",
  "correlationId": "a1b2c3...",
  "details": { "field": "error" }
}
```
W FE:
- Wyświetl message (toast/inline), loguj correlationId i przekazuj do wsparcia.
- Mapuj UI po code (BAD_REQUEST, FORBIDDEN, NOT_FOUND, CONFLICT, INTERNAL_ERROR).
- Dodawaj X-Correlation-Id do requestów; preferuj CID z nagłówka odpowiedzi przy prezentacji.

## 9. UX wskazówki (praktyka)

- Kalendarz: puste dni są OK (brak wpisów jeszcze).
- Godziny „efektywne”: jeżeli roundedHours != null → pokazuj je; w przeciwnym razie standardHours + overtimeHours.
- Tooltip przy zaokrągleniu: „zaokrąglono do X min w górę wg polityki firmy”.
- Akcje dzień‑po‑dniu: MANUAL — zablokuj przyszłe daty; PUNCH — zablokuj powtórny punch in.

## 10. Bezpieczeństwo i role

- userId w GET /work-time/days tylko dla MANAGER/HR/ADMIN — UI ukrywa dla USER.
- JWT wymagany we wszystkich wywołaniach (Authorization: Bearer ...).
- X-Correlation-Id — opcjonalny nagłówek generowany przez FE; pokazywany w debug/feedback.

---

## Skrót w README (Quick Start)

- Konfiguracja ewidencji: /work-time/config — podgląd aktywnego trybu i reguł UI.
- Widok miesiąca: /work-time — lista dni; kliknij w dzień po szczegóły/akcje.
- Błędy: komunikaty w toastach, z Correlation ID (kopiuj do zgłoszeń).
