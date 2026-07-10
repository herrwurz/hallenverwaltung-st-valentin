# Ticket: Tarife als eigenes Admin-Menue

Status
------
- Grundfunktionen umgesetzt (2026-07-08): Admin-Menue, Tarifgruppen, Tarif anlegen/bearbeiten, Tarif befristen (Gueltig-bis setzen)
- Offener Rest: siehe "Offene Nacharbeit"
- Angelegt: 2026-07-08

Ziel
----
Ein eigenes Admin-Menue fuer Tarife bereitstellen, damit Tarifpflege nicht nur indirekt ueber Abrechnung sichtbar ist.

Ausgangslage
------------
- Tariflogik und Datenmodell sind vorhanden (TariffGroup, Tariff, BillingEntry).
- In der Navigation gibt es aktuell kein eigenes Stammdaten-Menue fuer Tarife.
- In der Benutzerdoku wurde bewusst klargestellt, dass derzeit kein eigenes Menue fuer Tarife/Preise/Ausstattung sichtbar ist.

Scope
-----
- Admin-Navigationspunkt fuer Tarife
- Tarifliste mit Filter/Suche
- Tarif anlegen, bearbeiten, deaktivieren
- Rechtepruefung serverseitig
- Validierung mit bestehenden Fachregeln (Raum, Tarifgruppe, Nutzungstyp, Zeitraum, Tagesart)

Nicht-Scope
-----------
- Keine neue Rechnungslegung oder Zahlungsabwicklung
- Keine Ausstattung-/Ressourcenverwaltung
- Kein neues allgemeines Inventarmodul

Fachliche Mindestanforderungen
------------------------------
1. Tarif ist eindeutig ueber Raum, Tarifgruppe, Nutzungstyp, Tagesart und Gueltigkeitszeitraum verwaltbar.
2. Ueberschneidende oder fachlich ungueltige Konstellationen werden abgewiesen.
3. 0-Euro-Tarife bleiben erlaubt.
4. Aenderungen sind nachvollziehbar (Audit/History nach bestehendem Muster).

Technische Leitplanken
----------------------
- Businesslogik nur in Services
- Keine Fachlogik in React-Komponenten
- Prisma als einzige Datenzugriffsschicht
- Rechtepruefung serverseitig

Abnahmekriterien
----------------
1. Tarife sind im Admin-Menue sichtbar und aufrufbar.
2. CRUD fuer Tarife funktioniert mit serverseitiger Validierung.
3. Bestehende Abrechnungsvorbereitung bleibt stabil.
4. Relevante Tests fuer Service und UI-Flow vorhanden.
5. Doku-Update in der Testbetrieb-Anleitung nach Umsetzung.

Prioritaet
----------
- Mittel

Nacharbeit (vermerkt 2026-07-08, umgesetzt 2026-07-09)
------------------------------------------------------
Umgesetzt in Commit 0ef8ff0:

1. Tarif endgueltig loeschen - nur moeglich, wenn keine BillingEntry-
   Datensaetze auf den Tarif verweisen; sonst klare Fehlermeldung mit
   Hinweis auf Deaktivierung.
2. Tarif deaktivieren/reaktivieren (Tariff.isActive) - deaktivierte Tarife
   bleiben mit Historie erhalten, werden aber bei der Tarifaufloesung in
   der Abrechnung ignoriert.
3. UI: je Tarif die drei Aktionen Beenden (befristen), Deaktivieren,
   Endgueltig loeschen (mit Confirm-Dialog); blockierende
   Abrechnungspositionen werden mit Anzahl angezeigt.
