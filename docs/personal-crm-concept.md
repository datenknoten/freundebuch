# Konzeptdokument: Persönliches CRM für Privatpersonen

**Version:** 1.0  
**Datum:** 04.10.2025  
**Status:** Initial Draft

---

## 1. Executive Summary

Dieses Dokument beschreibt ein persönliches Customer Relationship Management System (CRM) für Privatpersonen. Die Anwendung erweitert ein klassisches Adressbuch um intelligente Funktionen für Beziehungsmanagement, Kontaktpflege und Erinnerungen. 

Die Web-Anwendung ermöglicht es Einzelpersonen und Familien, ihre sozialen Kontakte strukturiert zu verwalten, Interaktionen zu dokumentieren und wichtige Beziehungen aktiv zu pflegen. Durch CalDAV/CardDAV-Schnittstellen integriert sich die Lösung nahtlos in bestehende Ökosysteme.

---

## 2. Ziele und Nicht-Ziele

### 2.1 Ziele

**Primäre Ziele:**
- Erstellung eines erweiterten Adressbuchs mit Beziehungsmanagement-Funktionen
- Unterstützung von Privatpersonen beim aktiven Pflegen sozialer Kontakte
- Multi-User-Fähigkeit für gemeinsame Nutzung innerhalb von Familien
- Standardkonforme Integration über CalDAV/CardDAV
- Selbst-hostbare Web-Anwendung

**Sekundäre Ziele:**
- Einfache Bedienbarkeit ohne Einarbeitungszeit
- Datenschutz und Datensouveränität
- Möglichkeit zur Migration aus bestehenden Adressbüchern
- Flexible Deployment-Optionen (FOSS/SaaS)

### 2.2 Nicht-Ziele

- Enterprise-CRM-Funktionen (Sales Pipeline, Lead Management, etc.)
- Komplexe Workflow-Automatisierung
- Integrationen mit Business-Tools (CRM-Systeme, ERP, etc.)
- Native Mobile Apps (zunächst nur responsive Web-App)
- Social Media Integration (kann später evaluiert werden)

---

## 3. Feature-Übersicht (High-Level)

### 3.1 Core Features
1. **Kontaktverwaltung** - Erweitertes Adressbuch mit umfangreichen Kontaktinformationen
2. **Beziehungsmanagement** - Dokumentation und Tracking von Interaktionen
3. **Erinnerungssystem** - Automatische Benachrichtigungen für Kontaktpflege
4. **Kategorisierung & Organisation** - Flexible Gruppierung und Tagging
5. **Multi-User-Verwaltung** - Gemeinsame Nutzung innerhalb von Familien/Gruppen

### 3.2 Integration Features
6. **CalDAV/CardDAV Interface** - Standardkonforme Synchronisation
7. **Import/Export** - Datenportabilität und Migration

### 3.3 Supporting Features
8. **Aktivitäten-Timeline** - Chronologische Übersicht aller Interaktionen
9. **Dashboard & Insights** - Übersichten und Statistiken zu Kontakten
10. **Suchfunktion** - Schnelles Auffinden von Kontakten und Informationen

---

## 4. Detaillierte Feature-Beschreibungen

### Feature 1: Kontaktverwaltung

**Beschreibung:**  
Zentrale Verwaltung aller Kontaktinformationen mit erweiterten Feldern über Standard-Adressbücher hinaus.

**Funktionsumfang:**
- Standard-Kontaktfelder (Name, Adresse, Telefon, E-Mail, etc.)
- Erweiterte Felder:
  - Profilbild/Avatar
  - Geburtstag & wichtige Daten (Jahrestage, etc.)
  - Wie/Wo kennengelernt (Datum, Ort, Kontext)
  - Interessen & Hobbies
  - Beruf & Organisation
  - Social Media Profile (optional)
  - Benutzerdefinierte Felder
- Mehrere Adressen, Telefonnummern, E-Mails pro Kontakt
- Beziehungen zwischen Kontakten (Partner, Kinder, Geschwister, Kollegen, etc.)
- Freitext-Notizen mit Zeitstempel

**Abgrenzung zu Standard-Adressbuch:**  
Fokus auf persönlichen Kontext und Beziehungsinformationen, nicht nur Kontaktdaten.

---

### Feature 2: Beziehungsmanagement

**Beschreibung:**  
Dokumentation und Tracking der Beziehungshistorie zu jeder Person.

**Funktionsumfang:**
- **Interaktions-Log:**
  - Manuelle Erfassung von Treffen, Anrufen, Nachrichten
  - Datum, Typ, Notizen zu jeder Interaktion
  - Anhänge (Fotos, Dokumente)
- **Letzte Interaktion:**
  - Automatische Anzeige der letzten Kontaktaufnahme
  - Zeitspanne seit letztem Kontakt
- **Beziehungs-Qualität:**
  - Kontakt-Frequenz-Tracking
  - Optionale Kategorisierung (enger Freund, Bekannter, etc.)
- **Gemeinsame Erlebnisse:**
  - Verknüpfung von Events/Aktivitäten mit mehreren Personen
  - Foto-Alben zu gemeinsamen Erlebnissen

---

### Feature 3: Erinnerungssystem

**Beschreibung:**  
Proaktive Unterstützung bei der Kontaktpflege durch intelligente Erinnerungen.

**Funktionsumfang:**
- **Automatische Erinnerungen:**
  - "Person X seit Y Tagen/Wochen nicht kontaktiert"
  - Konfigurierbare Schwellwerte pro Kontakt oder Gruppe
  - Geburtstags-Erinnerungen (konfigurierbare Vorlaufzeit)
- **Manuelle Erinnerungen:**
  - "Mal wieder bei X melden am [Datum]"
  - Wiederkehrende Erinnerungen (z.B. monatlich)
- **Erinnerungs-Kanäle:**
  - In-App-Benachrichtigungen
  - E-Mail-Benachrichtigungen
  - Optional: Browser-Push-Notifications
- **Snooze & Dismiss:**
  - Erinnerungen verschieben oder als erledigt markieren

---

### Feature 4: Kategorisierung & Organisation

**Beschreibung:**  
Flexible Organisation von Kontakten nach verschiedenen Kriterien.

**Funktionsumfang:**
- **Gruppen:**
  - Vordefinierte Gruppen (Familie, Freunde, Arbeit, Verein, Nachbarn)
  - Benutzerdefinierte Gruppen
  - Hierarchische Gruppen (z.B. Freunde > Schulfreunde)
  - Ein Kontakt kann mehreren Gruppen angehören
- **Tags:**
  - Freie Tag-Vergabe (z.B. #Wandern, #Kochen, #Technik)
  - Tag-Cloud zur schnellen Navigation
  - Tag-basierte Filter
- **Favoriten:**
  - Markierung besonders wichtiger Kontakte
  - Schnellzugriff auf Favoriten
- **Archivierung:**
  - Kontakte archivieren (nicht löschen)
  - Getrennte Ansicht für aktive/archivierte Kontakte

---

### Feature 5: Multi-User-Verwaltung

**Beschreibung:**  
Gemeinsame Nutzung der Kontaktdatenbank innerhalb von Familien oder Haushalten.

**Funktionsumfang:**
- **User Accounts:**
  - Registrierung und Authentifizierung
  - Passwort-Management
  - Profilverwaltung
- **Familien/Gruppen-Spaces:**
  - Erstellung von gemeinsamen Workspaces
  - Einladung von Mitgliedern
  - Rollenbasierte Berechtigungen (Admin, Mitglied, Nur-Lesen)
- **Kontakt-Ownership:**
  - Persönliche Kontakte (nur für einen User sichtbar)
  - Geteilte Kontakte (für alle Gruppenmitglieder sichtbar)
  - Konfliktauflösung bei gleichzeitiger Bearbeitung
- **Activity Tracking:**
  - Wer hat welchen Kontakt angelegt/bearbeitet
  - Änderungshistorie

---

### Feature 6: CalDAV/CardDAV Interface

**Beschreibung:**  
Standardkonforme Schnittstellen zur Synchronisation mit externen Anwendungen.

**Funktionsumfang:**
- **CardDAV:**
  - Vollständige vCard-Unterstützung (RFC 6350)
  - Synchronisation von Kontakten mit:
    - Smartphone-Adressbüchern (iOS, Android)
    - Desktop-Anwendungen (Thunderbird, Outlook, etc.)
    - Andere CardDAV-Clients
  - Bidirektionale Synchronisation
  - Konfliktbehandlung
- **CalDAV:**
  - iCalendar-Unterstützung (RFC 5545)
  - Synchronisation von:
    - Geburtstagen als Kalender-Events
    - Erinnerungen als Aufgaben/Termine
    - Interaktions-History als Kalendereinträge (optional)
  - Mehrere Kalender (z.B. "Geburtstage", "Treffen")
- **Authentifizierung:**
  - Basic Auth, OAuth 2.0
  - App-spezifische Passwörter

---

### Feature 7: Import/Export

**Beschreibung:**  
Einfache Migration von und zu anderen Systemen.

**Funktionsumfang:**
- **Import:**
  - vCard (.vcf) - Einzel- und Mehrfach-Import
  - CSV-Import mit Feld-Mapping
  - Google Contacts Export
  - Apple Contacts Export
  - Deduplizierungs-Assistent nach Import
- **Export:**
  - Vollständiger Export als vCard
  - Selektiver Export (einzelne Kontakte, Gruppen)
  - CSV-Export für Weiterverarbeitung
  - Backup-Funktion (kompletter Datenexport inkl. Metadaten)
- **Daten-Bereinigung:**
  - Duplikat-Erkennung
  - Merge-Funktion für doppelte Kontakte
  - Validierung von Datenformaten (E-Mail, Telefon, etc.)

---

### Feature 8: Aktivitäten-Timeline

**Beschreibung:**  
Chronologische Darstellung aller Interaktionen und Ereignisse.

**Funktionsumfang:**
- **Pro-Kontakt-Timeline:**
  - Alle Interaktionen in chronologischer Reihenfolge
  - Geburtstage, Jahrestage
  - Notizen mit Zeitstempel
  - Filter nach Interaktionstyp
- **Globale Timeline:**
  - Überblick über alle Aktivitäten aller Kontakte
  - Filter nach Datum, Person, Typ
  - "Heute", "Diese Woche", "Dieser Monat" Ansichten
- **Visualisierung:**
  - Zeitstrahl-Ansicht
  - Kalender-Ansicht
  - Listen-Ansicht
- **Schnelleintrag:**
  - Quick-Add für neue Interaktionen
  - Templates für häufige Interaktionstypen

---

### Feature 9: Dashboard & Insights

**Beschreibung:**  
Übersichten und Statistiken zur Kontaktpflege.

**Funktionsumfang:**
- **Dashboard-Widgets:**
  - Anstehende Geburtstage (nächste 30 Tage)
  - Überfällige Kontakte ("Schon lange nicht mehr gesehen")
  - Kontakt-Statistiken (Gesamt, Neue diese Woche/Monat)
  - Aktivitäts-Übersicht (Interaktionen diese Woche)
  - Top-Kontakte (nach Interaktions-Frequenz)
- **Insights:**
  - Kontakt-Frequenz-Analyse
  - Gruppen-Verteilung (Pie Chart)
  - Interaktions-Trends (zeitliche Entwicklung)
  - "Vernachlässigte" Kontakte identifizieren
- **Personalisierung:**
  - Widget-Anordnung anpassbar
  - Auswählbare Metriken
  - Zeitraum-Filter

---

### Feature 10: Suchfunktion

**Beschreibung:**  
Leistungsstarke Suche über alle Kontaktdaten.

**Funktionsumfang:**
- **Volltextsuche:**
  - Suche über Name, Notizen, Tags, Gruppen
  - Fuzzy Search (Tippfehler-tolerant)
  - Autocomplete während der Eingabe
- **Erweiterte Filter:**
  - Kombinierte Filter (Gruppe + Tag + Zeitraum)
  - Gespeicherte Suchen/Filter
  - "Zuletzt kontaktiert" Filter
  - Geburtstags-Zeitraum
- **Sortierung:**
  - Nach Name (A-Z)
  - Nach letzter Interaktion
  - Nach Erstelldatum
  - Nach Häufigkeit der Interaktion
- **Ergebnis-Vorschau:**
  - Kontakt-Karte mit wichtigsten Infos
  - Highlighting der Suchbegriffe

---

## 5. Technische Rahmenbedingungen

### 5.1 Architektur-Überlegungen

**Frontend:**
- Moderne Web-Technologie (React, Vue, Svelte oder ähnlich)
- Responsive Design (Mobile-First)
- Progressive Web App (PWA) Fähigkeiten optional
- Offline-Fähigkeit (Service Worker) als zukünftige Erweiterung

**Backend:**
- RESTful API oder GraphQL
- Authentifizierung & Autorisierung (JWT, Session-based)
- CalDAV/CardDAV Server-Komponente
- Datenbank (PostgreSQL, MySQL oder ähnlich)

**Deployment:**
- Docker-basiert für einfache Installation
- Konfigurierbar für FOSS (Self-Hosting) oder SaaS
- Umgebungsvariablen für Konfiguration
- Reverse-Proxy-kompatibel (nginx, Traefik)

### 5.2 Sicherheit & Datenschutz

- Ende-zu-Ende-Verschlüsselung von sensiblen Notizen (optional)
- HTTPS-Only
- DSGVO-Konformität (Datenexport, Löschung)
- Audit-Log für alle Datenänderungen
- Rate Limiting
- CORS-Konfiguration
- Input-Validierung & Sanitization

### 5.3 Performance-Anforderungen

- Seitenladezeit < 2 Sekunden
- Suchresultate < 500ms
- Unterstützung für mindestens 10.000 Kontakte pro User
- Optimistische UI-Updates
- Lazy Loading von Listen
- Caching-Strategie

### 5.4 Browser-Unterstützung

- Moderne Browser (Chrome, Firefox, Safari, Edge)
- Letzte 2 Major-Versionen
- Mobile Browser (iOS Safari, Chrome Mobile)

---

## 6. Abhängigkeiten und Schnittstellen

### 6.1 Externe Abhängigkeiten

**Protokolle & Standards:**
- vCard 4.0 (RFC 6350) - CardDAV
- iCalendar (RFC 5545) - CalDAV
- WebDAV (RFC 4918) - Basis für CalDAV/CardDAV
- OAuth 2.0 (RFC 6749) - Authentifizierung

**Optionale Integrationen:**
- E-Mail-Versand (SMTP) für Benachrichtigungen
- Gravatar für Profilbilder
- Geocoding-Service für Adressen (Google Maps, OpenStreetMap)

### 6.2 Interne Schnittstellen

**API-Endpunkte (Beispiele):**
- `/api/contacts` - CRUD für Kontakte
- `/api/interactions` - Interaktions-Tracking
- `/api/reminders` - Erinnerungsverwaltung
- `/api/groups` - Gruppen-Management
- `/api/users` - User-Management
- `/caldav/` - CalDAV-Endpunkt
- `/carddav/` - CardDAV-Endpunkt

**Datenmodell-Beziehungen:**
- User → Contacts (1:n)
- User → Groups (1:n)
- Contact → Interactions (1:n)
- Contact → Reminders (1:n)
- Contact → Groups (n:m)
- Contact → Tags (n:m)
- Group → Users (n:m) - für Multi-User

### 6.3 Datenschnittstellen

**Import-Formate:**
- vCard (.vcf)
- CSV
- JSON (für Backup/Restore)

**Export-Formate:**
- vCard (.vcf)
- CSV
- JSON
- PDF (für Drucken einzelner Kontakte oder Listen)

---

## 7. Nächste Schritte

### Phase 1: MVP (Minimum Viable Product)
- Feature 1: Kontaktverwaltung (Basis)
- Feature 4: Kategorisierung (Gruppen & Tags)
- Feature 10: Suchfunktion (Basis)
- Feature 5: Multi-User (Single-Tenant MVP)

### Phase 2: Kernfunktionalität
- Feature 2: Beziehungsmanagement
- Feature 3: Erinnerungssystem
- Feature 8: Aktivitäten-Timeline
- Feature 9: Dashboard (Basis)

### Phase 3: Integration & Polish
- Feature 6: CalDAV/CardDAV
- Feature 7: Import/Export
- Feature 9: Dashboard (erweitert)
- Performance-Optimierung

### Offene Fragen zur Klärung
1. Soll die Multi-Tenant-Architektur von Anfang an implementiert werden oder erst später?
2. Welche Monetarisierungs-Strategie wird für SaaS-Variante angestrebt?
3. Welche Backup-Strategie soll implementiert werden?
4. Sollen Kontakte physisch gelöscht oder nur als gelöscht markiert werden?
5. Welche Lokalisierungen (Sprachen) sind initial geplant?

---

## 8. Glossar

- **CalDAV**: Calendaring Extensions to WebDAV - Protokoll zur Kalender-Synchronisation
- **CardDAV**: vCard Extensions to WebDAV - Protokoll zur Kontakt-Synchronisation  
- **CRM**: Customer Relationship Management
- **FOSS**: Free and Open Source Software
- **MVP**: Minimum Viable Product
- **PWA**: Progressive Web App
- **SaaS**: Software as a Service
- **vCard**: Elektronisches Visitenkarten-Format

---

**Dokumenten-Ende**