# Epic 7: Import/Export

**Status:** Planned
**Phase:** Integration & Polish (Phase 3)
**Priority:** Medium

## Overview

Moving from another system? No problem! This feature makes it easy to bring your contacts in from wherever they are now, and to get them back out when you need them. Data portability matters - your contacts are yours, and we want to make sure you can always access them.

## Goals

- Make it painless to move from Google Contacts, Apple Contacts, or wherever you're coming from
- Give you full control over your data - no vendor lock-in here!
- Provide simple backup and restore options for peace of mind
- Keep your data safe and intact during all import/export operations
- Help you clean up any messy duplicates that come along for the ride

## Key Features

### Import Functionality

#### vCard Import
- Single vCard file (.vcf)
- Multi-contact vCard files (Google/Apple exports)
- vCard versions 2.1, 3.0, and 4.0 support
- Field mapping preview before import
- Duplicate detection during import
- Import progress tracking

#### CSV Import
- Flexible column mapping interface
- Template support for common formats (Google, Outlook, etc.)
- Preview before import
- Header detection
- Custom delimiter support (comma, semicolon, tab)
- Encoding detection (UTF-8, ISO-8859-1, etc.)

#### Platform-Specific Imports
- **Google Contacts:** Direct CSV import with Google format mapping
- **Apple Contacts:** vCard import optimized for Apple's format
- **Outlook:** CSV import with Outlook format mapping
- **LinkedIn:** CSV import (if available)

#### Import Wizard
- Step-by-step guided import process
- File upload with validation
- Format detection
- Field mapping configuration
- Duplicate detection options
- Import summary and error reporting

### Export Functionality

#### vCard Export
- Full export as vCard 4.0
- Single contact export
- Selected contacts export
- Group export
- Include photos option
- Include custom fields as X- properties

#### CSV Export
- Configurable column selection
- Custom field inclusion
- Template-based export (Google, Outlook formats)
- Encoding selection
- Delimiter selection

#### JSON Export
- Full data export including metadata
- Structured format for programmatic use
- Include interactions option
- Include reminders option
- Include groups/tags option

#### PDF Export (Optional)
- Single contact as printable card
- Contact list as table
- Group directory
- Customizable template

#### Selective Export
- Export by group
- Export by tag
- Export favorites
- Export recent contacts
- Date range filtering

### Backup & Restore

#### Backup
- Full database backup (JSON format)
- Scheduled automatic backups
- Includes all data:
  - Contacts with all fields
  - Interactions and history
  - Reminders
  - Groups and tags
  - Settings and preferences
- Backup encryption (optional)
- Backup to file system
- Backup download

#### Restore
- Full restore from backup
- Partial restore (contacts only, etc.)
- Restore preview
- Conflict resolution options
- Restore validation

### Data Cleansing

#### Duplicate Detection
- Automatic duplicate detection based on:
  - Exact name match
  - Fuzzy name match
  - Email match
  - Phone number match
- Similarity scoring
- Duplicate review interface
- Side-by-side comparison

#### Merge Functionality
- Manual merge of duplicate contacts
- Automatic merge suggestions
- Field-by-field merge decisions
- Merge preview
- Undo merge capability
- Merge history

#### Data Validation
- Email format validation
- Phone number format validation
- URL validation
- Date format validation
- Required field checking
- Data quality report

## User Stories

1. As a user, I want to import my Google Contacts so I can start using Personal CRM with my existing data
2. As a user, I want to export my contacts as vCard so I can back them up
3. As a user, I want to detect duplicates after import so I don't have messy data
4. As a user, I want to merge duplicate contacts so I have a clean database
5. As a user, I want to export a full backup so I can restore my data if needed
6. As a user, I want to export contacts as CSV so I can use them in spreadsheet applications
7. As a user, I want to map CSV columns to contact fields so I can import from any format
8. As a user, I want to export a group as PDF so I can print a directory

## Technical Considerations

### Libraries & Dependencies
- vCard parser: `vcard4` or similar
- CSV parser: `papaparse` or `csv-parse`
- PDF generator: `pdfkit` or `puppeteer`
- Fuzzy matching: `fuzzyset.js` or `string-similarity`
- File upload: `multer` (for Node.js)

### Database Schema
- `import_jobs` table with status, file_name, total_records, processed, errors
- `export_jobs` table with format, filters, status, file_path
- `backups` table with timestamp, size, file_path, encrypted
- `merge_history` table for tracking merged contacts

### API Endpoints

#### Import
- `POST /api/import/vcard` - Upload and import vCard
- `POST /api/import/csv` - Upload CSV for mapping
- `POST /api/import/csv/preview` - Preview CSV with mapping
- `POST /api/import/csv/execute` - Execute CSV import
- `GET /api/import/jobs/:id` - Get import job status
- `GET /api/import/templates` - Get CSV mapping templates

#### Export
- `POST /api/export/vcard` - Initiate vCard export
- `POST /api/export/csv` - Initiate CSV export
- `POST /api/export/json` - Initiate JSON export
- `POST /api/export/pdf` - Initiate PDF export
- `GET /api/export/jobs/:id` - Get export job status
- `GET /api/export/jobs/:id/download` - Download export file

#### Backup
- `POST /api/backups` - Create backup
- `GET /api/backups` - List backups
- `GET /api/backups/:id/download` - Download backup
- `POST /api/backups/:id/restore` - Restore from backup
- `DELETE /api/backups/:id` - Delete backup

#### Deduplication
- `GET /api/contacts/duplicates` - Find duplicates
- `POST /api/contacts/merge` - Merge contacts
- `GET /api/contacts/:id/similar` - Find similar contacts

### Frontend Components
- File upload component with drag-and-drop
- CSV mapping interface
- Import progress indicator
- Duplicate review interface
- Merge comparison view
- Export options form
- Backup management dashboard
- Format selection wizard
- Field selection for CSV export
- Download button for completed exports

### File Processing
- Asynchronous processing for large imports
- Queue system for import/export jobs
- Progress tracking
- Error handling and reporting
- Cleanup of temporary files
- File size limits
- Virus scanning (optional)

### Data Quality
- Import validation rules
- Data normalization (phone numbers, emails)
- Character encoding handling
- Timezone handling for dates
- Image size optimization for photos

## Success Metrics

- Successful import of Google Contacts with >95% accuracy
- Successful import of Apple Contacts export
- Duplicate detection finds >90% of actual duplicates with low false positives
- vCard export compatible with major clients
- CSV export/import round-trip preserves all data
- Backup/restore cycle completes without data loss
- Import of 1000 contacts completes in <60 seconds

## Dependencies

- File upload handling
- Background job processing system
- Temporary file storage
- Epic 1: Contact Management (target for import)

## Out of Scope

- Direct integration with Google/Apple APIs (we'll stick with file-based imports for now)
- Automatic continuous sync with other systems (that's what CalDAV is for!)
- Import from social media platforms
- Proprietary format support (Salesforce, etc. - sticking with open formats)
- Cloud backup storage (S3, etc.) - we're keeping backups local for security

## Related Epics

- Epic 1: Contact Management (import destination)
- Epic 6: CalDAV/CardDAV Interface (alternative sync method)

## Implementation Phases

### Phase 3A: Import
1. vCard import (basic)
2. CSV import with mapping
3. Google/Apple format support
4. Duplicate detection

### Phase 3B: Export
1. vCard export
2. CSV export
3. JSON backup
4. PDF export (optional)

### Phase 3C: Data Quality
1. Enhanced duplicate detection
2. Merge functionality
3. Data validation
4. Automated backups

## Testing Strategy

- Test with real-world exports from:
  - Google Contacts
  - Apple Contacts
  - Outlook
  - Various vCard versions
- Test with large datasets (10,000+ contacts)
- Test edge cases (special characters, empty fields, malformed data)
- Test round-trip (export then import)
