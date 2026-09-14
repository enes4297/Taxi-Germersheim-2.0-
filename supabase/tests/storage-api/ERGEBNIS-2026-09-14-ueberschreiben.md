# Überschreiben im Testprojekt geprüft — 14.09.2026

Nachtrag zum Lauf vom 12.09.2026
(`ERGEBNIS-2026-09-12-storage-api.md`). Dort blieb eine Lücke offen, die dieser
Lauf schließt: **Jeder bisherige Upload lief mit `x-upsert: false`.** Ob die
echte Storage-API das Überschreiben einer bereits vorhandenen Datei verweigert,
war damit nie gemessen — es war eine Annahme, gestützt allein darauf, dass es
keine UPDATE-Policy gibt.

| | |
| --- | --- |
| Lauf | `supabase/tests/storage-api/20_storage_api_test.ps1 -Bestaetigung -Aufraeumen` |
| Ziel | Supabase-**Testprojekt**, Kennung nur lokal in `projekt-freigabe.txt` |
| Ergebnis | **34 von 34 Prüfungen bestanden**, Rückgabewert 0 |
| Davon neu | 6 Prüfungen, Abschnitt `3c. Ueberschreiben einer vorhandenen Datei` |
| Gegen die Produktivinstanz ausgeführt | **nichts** |
| Verwendete Daten | ausschließlich synthetisch: vier Konten auf `example.invalid`, im Skript erzeugte PDF-Bytes |

Die 28 Prüfungen vom 12.09.2026 sind unverändert mitgelaufen und alle erneut
bestanden.

## Die sechs neuen Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Inhalt der Datei ist vor den Versuchen messbar | bestanden, SHA-256 über 193 Bytes |
| A kann die **eigene** Datei nicht per Upsert überschreiben | bestanden, HTTP 400 |
| A kann die **eigene** Datei nicht per `PUT` ersetzen | bestanden, HTTP 400 |
| B kann die Datei von A nicht per Upsert überschreiben | bestanden, HTTP 400 |
| **Inhalt der Datei ist nach allen Versuchen unverändert** | **bestanden, SHA-256 vorher = nachher** |
| Länge entspricht weiterhin dem Original | bestanden, 193 von 193 Bytes |

Die Ersatzdatei war 252 Bytes lang und unterschied sich auch im Inhalt. Ein
gelungenes Überschreiben wäre also an beiden Maßen sichtbar geworden.

### Warum die Prüfsumme und nicht nur die Länge

Eine Fehlermeldung allein ist kein Nachweis — sie könnte auch erscheinen,
nachdem die Datei bereits ersetzt wurde. Und eine Längenprüfung allein würde ein
Überschreiben mit gleich langem Inhalt nicht bemerken. Gemessen wird deshalb der
tatsächlich ausgelieferte Inhalt, über eine signierte URL des Admin-Kontos,
vor und nach den Versuchen.

### Warum drei Versuche und nicht einer

`supabase-js` erreicht die Tabelle `storage.objects` auf zwei verschiedenen
Wegen, und beide mussten gemessen werden:

- `upload(pfad, datei, { upsert: true })` → `POST` mit Kopfzeile `x-upsert: true`
- `update(pfad, datei)` → `PUT` auf denselben Pfad

Der dritte Versuch — B überschreibt die Datei von A per Upsert — beantwortet die
Frage, ob `x-upsert: true` die Ordnerprüfung der INSERT-Policy umgeht. Tut es
nicht.

## Was das belegt — und was nicht

**Belegt ist:** Bei unveränderten Plattform-Rechten reicht RLS aus, um das
Überschreiben zu verhindern. `authenticated` besitzt das Tabellenrecht `UPDATE`
auf `storage.objects` im Testprojekt weiterhin; das Basisskript hat den
GRANT/REVOKE-Abschnitt übersprungen, weil die Bedingung `storage_grant`
(Mitgliedschaft im Eigentümer) `false` war. Der Zugriff wird dort also
ausschließlich über RLS geregelt — und genau in diesem Zustand ist der Nachweis
entstanden.

**Nicht belegt ist:**

1. Dass die Produktivinstanz sich ebenso verhält. Ein bestandener Lauf gilt für
   das Testprojekt.
2. Der Rechtestand des Testprojekts wurde für diesen Lauf **nicht erneut
   gemessen**, sondern aus der übersprungenen Bedingung des Basisskripts
   erschlossen. Wer es genau wissen will, führt `01c_rechtestand_storage.sql`
   (rein lesend) im SQL Editor des Testprojekts aus.
3. **`move` und `copy` sind nicht geprüft.** Beide ändern Zeilen in
   `storage.objects` und laufen damit ebenfalls gegen die fehlende
   UPDATE-Policy. Der Fall „Datei auf einen fremden, belegten Pfad verschieben"
   bleibt offen.
4. Nebenläufigkeit bleibt unverändert nur lokal gemessen — siehe Grenze 1 des
   Laufs vom 12.09.2026.
5. Gemessen wurde Verhalten, keine Zusage der Plattform.

## Hinterlassener Zustand

Im Bucket: **nichts**. Das Aufräumen hat alle sechs Testpfade entfernt und
anschließend nachgemessen, dass im Ordner von A keine `tg-test-`-Datei mehr
liegt. Die synthetischen Stammdaten bestehen unverändert weiter.
