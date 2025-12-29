# Epic 11: Custom Fields

**Status:** Planned
**Phase:** Phase 2
**Priority:** Low
**GitHub Issue:** TBD

## Overview

Give users the power to extend their contact database with custom fields tailored to their specific needs. Whether it's tracking preferred pronouns, VIP status, or any other information that matters to them, custom fields make Freundebuch truly yours.

## Goals

- Allow users to define their own contact fields
- Support multiple field types for different data needs
- Display custom fields seamlessly alongside standard fields
- Keep the system simple and performant

## Key Features

### Custom Field Definitions
- Users can define their own fields
- Field types:
  - Text (single line)
  - Text (multi-line)
  - Number
  - Date
  - Yes/No (boolean)
  - Single select (dropdown)
  - URL
- Fields have:
  - Name/label
  - Type
  - Options (for single select)
  - Default value (optional)
  - Sort order

### Custom Field Values
- Values stored per contact
- Displayed in contact detail view
- Editable in contact form

### Limitations for Initial Implementation
- No multi-select fields (future enhancement)
- No conditional fields (future enhancement)
- No field groups/sections (future enhancement)
- No field templates/presets (future enhancement)

## User Stories

1. As a user, I want to create a custom "Preferred pronouns" text field so I can respect how people want to be addressed
2. As a user, I want to create a "VIP" yes/no field to mark important contacts
3. As a user, I want to create a "Priority level" dropdown with High/Medium/Low options
4. As a user, I want to fill in custom fields when editing a contact
5. As a user, I want to see custom fields displayed on the contact detail page
6. As a user, I want to reorder my custom fields to control how they appear
7. As a user, I want to delete a custom field I no longer need

## Technical Considerations

### Database Schema

```sql
-- Custom field definitions
CREATE TABLE custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL,
    options JSONB,  -- For single_select: ["Option 1", "Option 2"]
    default_value TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_field_type CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'boolean', 'single_select', 'url')),
    CONSTRAINT unique_field_name_per_user UNIQUE (user_id, field_name)
);

CREATE INDEX idx_custom_field_definitions_user ON custom_field_definitions(user_id);
CREATE INDEX idx_custom_field_definitions_sort ON custom_field_definitions(user_id, sort_order);

-- Custom field values
CREATE TABLE custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,

    value_text TEXT,
    value_number NUMERIC,
    value_date DATE,
    value_boolean BOOLEAN,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_value_per_contact_field UNIQUE (contact_id, field_definition_id)
);

CREATE INDEX idx_custom_field_values_contact ON custom_field_values(contact_id);
CREATE INDEX idx_custom_field_values_field ON custom_field_values(field_definition_id);
```

### API Endpoints

#### Field Definitions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/custom-fields` | List user's custom field definitions |
| POST | `/api/custom-fields` | Create new custom field |
| PUT | `/api/custom-fields/:id` | Update custom field |
| DELETE | `/api/custom-fields/:id` | Delete custom field (and all values!) |
| PUT | `/api/custom-fields/reorder` | Reorder custom fields |

#### Field Values
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts/:id/custom-fields` | Get custom field values for contact |
| PUT | `/api/contacts/:id/custom-fields` | Set/update custom field values (batch) |

### ArkType Validation Schemas

```typescript
import { type } from 'arktype'

// Field definition schema
export const customFieldDefinitionSchema = type({
  field_name: 'string > 0',
  field_type: '"text" | "textarea" | "number" | "date" | "boolean" | "single_select" | "url"',
  'options?': 'string[]',  // Required for single_select
  'default_value?': 'string',
  'sort_order?': 'number',
})

// Field value schema (for batch update)
export const customFieldValuesSchema = type({
  'values': [{
    field_definition_id: 'string.uuid',
    'value?': 'string | number | boolean | null',
  }],
})
```

### Frontend Components

| Component | Description |
|-----------|-------------|
| `CustomFieldManager` | Settings page for managing field definitions |
| `CustomFieldDefinitionForm` | Form for creating/editing field definition |
| `CustomFieldDefinitionList` | Sortable list of field definitions |
| `CustomFieldInput` | Dynamic input component based on field type |
| `CustomFieldsSection` | Display custom fields in contact detail view |
| `CustomFieldsFormSection` | Custom fields section in contact form |

### Field Type Rendering

| Type | Input Component | Display Format |
|------|-----------------|----------------|
| text | `<input type="text">` | Plain text |
| textarea | `<textarea>` | Multi-line text |
| number | `<input type="number">` | Formatted number |
| date | Date picker | Localized date |
| boolean | Toggle/Checkbox | Yes/No or custom labels |
| single_select | `<select>` dropdown | Selected option text |
| url | `<input type="url">` | Clickable link |

## Success Metrics

- Custom field definitions CRUD works correctly
- All field types render and save properly
- Custom fields appear in contact form dynamically
- Reordering persists correctly
- Deleting a field removes all associated values
- Field definitions load in <100ms
- Custom field values load with contact in <50ms additional overhead

## Dependencies

- Epic 1: Contact Management (contacts to attach fields to)
- Epic 5: Multi-User Management (user_id for field ownership)

## Out of Scope

- Searchable custom fields (defer to Epic 10 enhancement)
- Custom field templates/presets
- Sharing custom field definitions between users
- Conditional field visibility
- Multi-select fields
- Field grouping/sections
- Import/export of field definitions

## Related Epics

- **Epic 1:** Contact Management - provides contacts to attach custom fields
- **Epic 7:** Import/Export - future consideration for custom field data
- **Epic 10:** Search - future enhancement to search by custom fields

## Testing Strategy

### Unit Tests
- Field type validation
- Default value application
- Options validation for single_select

### Integration Tests
- CRUD operations for definitions
- CRUD operations for values
- Cascade delete when definition is removed
- Cascade delete when contact is removed

### E2E Tests
- Create field definition flow
- Add custom field values to contact
- Edit and delete field definitions
- Reorder fields via drag-and-drop

## Future Enhancements

- **Multi-select fields** - Allow selecting multiple options
- **Conditional fields** - Show/hide based on other field values
- **Field templates** - Pre-built field sets (e.g., "Sales CRM", "Personal")
- **Search integration** - Filter contacts by custom field values
- **Computed fields** - Fields with calculated values
- **Field validation rules** - Min/max, regex patterns, required
