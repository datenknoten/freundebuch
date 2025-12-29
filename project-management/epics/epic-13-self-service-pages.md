# Epic 13: Self-Service Friend Pages

**Status:** Future
**Phase:** Phase 4 (Post-MVP)
**Priority:** Low
**Depends On:** Epic 1 (Contact Management), Epic 5 (Multi-User Management)

## Overview

Remember how the original Freundebuch worked? You handed the book to your friend, and they filled out their own page. This epic brings that experience to the digital world.

Self-Service Friend Pages allow you to generate a unique, shareable link for a friend. When they visit that link, they can fill out their own page in your Freundebuch - their contact info, interests, important dates, and whatever else you've asked them to share. It's like passing around the friendship book, but without the shipping costs.

Think of it as: "Hey, fill out your page in my Freundebuch!" - just like kindergarten, but digital.

## Goals

- Allow users to invite friends to fill out their own pages
- Create a simple, friendly form experience for invited friends
- Give page owners control over what information is requested
- Handle updates gracefully (friends can update their info later)
- Maintain privacy and security (links expire, can be revoked)
- Stay true to the Freundebuch spirit - warm, personal, not transactional

---

## Core Concepts

### Invitation Links

Each invitation is a unique, secure URL that:
- Points to a friend-facing form to fill out their page
- Is tied to a specific page in the owner's Freundebuch
- Can be sent via any channel (email, messenger, carrier pigeon)
- Expires after a configurable time (default: 30 days)
- Can be revoked at any time
- Can optionally allow future updates

### Friend Experience

When a friend visits an invitation link, they see:
1. A warm welcome explaining what Freundebuch is
2. The name of the person who invited them
3. A form to fill out their information
4. Clear indication this is personal, not a business thing
5. Submit button with a friendly confirmation

They do NOT need to:
- Create an account
- Download anything
- Give us their email for marketing
- Sign up for anything

### Owner Experience

The Freundebuch owner can:
- Generate invitation links for new or existing pages
- Customize what fields are shown on the form
- Set expiration times
- Track which invitations are pending
- See when a friend has filled out their page
- Allow or disallow future self-updates

---

## Features

### Invitation Management

- **Generate Link**: Create an invitation link for a new or existing page
- **Customize Fields**: Choose which fields appear on the friend's form
- **Set Expiration**: Configure how long the link remains valid
- **Allow Updates**: Optionally let friends update their info later
- **Revoke Link**: Cancel an invitation at any time
- **Track Status**: See which invitations are pending, completed, or expired

### Friend-Facing Form

- **Welcome Screen**: Warm explanation of what they're doing
- **Pre-filled Fields**: If updating, show current info
- **Required vs Optional**: Clearly mark which fields are required
- **Photo Upload**: Let friends add their own photo
- **Preview**: Show how their page will look
- **Submit & Confirm**: Clear success message

### Notification & Updates

- **Completion Notice**: Owner gets notified when a friend fills out their page
- **Update Notice**: Owner gets notified if a friend updates their info
- **Diff View**: See what changed between versions
- **Approval Flow**: Optionally review changes before they go live

---

## User Stories

1. As a Freundebuch owner, I want to send my friend a link so they can fill out their own page
2. As a Freundebuch owner, I want to choose which fields my friend sees (I don't need their work info)
3. As a Freundebuch owner, I want to be notified when my friend completes their page
4. As a friend receiving a link, I want to easily understand what I'm being asked to do
5. As a friend, I want to update my info if it changes (new phone number, etc.)
6. As a Freundebuch owner, I want to revoke an invitation if I sent it by mistake
7. As a friend, I want confidence that my info is only going to my friend, not being sold
8. As a Freundebuch owner, I want to see which friends haven't filled out their pages yet

---

## Form Fields

### Always Available
These fields can be included in any invitation form:

| Field Group | Fields |
|-------------|--------|
| **Basic Info** | Name, nickname, pronouns |
| **Contact** | Email, phone, address |
| **Photo** | Profile picture upload |
| **Important Dates** | Birthday, anniversary |
| **Personal** | Interests/hobbies, about me |
| **Work** | Job title, company |
| **Social** | Social media profiles |
| **Custom** | Any custom fields defined by the owner |

### Form Templates

Pre-defined templates to make setup easy:

| Template | Fields Included | Use Case |
|----------|-----------------|----------|
| **Quick** | Name, email, phone, birthday | Fast and simple |
| **Standard** | Quick + photo, address, interests | Good default |
| **Complete** | Everything | Comprehensive |
| **Just Basics** | Name, email | Minimal friction |
| **Personal** | Name, photo, birthday, interests, about | For close friends |
| **Professional** | Name, email, phone, work info | Colleagues |

---

## Technical Considerations

### Security

- **Token Security**: Invitation tokens should be cryptographically secure
- **Expiration**: Tokens expire after set time (configurable, default 30 days)
- **Rate Limiting**: Prevent brute force attempts on tokens
- **One-Time vs Reusable**: Tokens can be one-time or allow updates
- **Revocation**: Immediate effect when owner revokes
- **No Account Required**: Friends don't need to create accounts
- **Data Minimization**: Only collect what's needed

### Privacy

- **Clear Communication**: Friends know exactly where their data goes
- **No Marketing**: We don't collect friend emails for marketing
- **Owner Only**: Data goes only to the Freundebuch owner
- **Deletion**: Friends can request their data be removed
- **GDPR Compliance**: Proper consent and data handling

### URL Structure

```
https://app.freundebuch.example/invite/{token}
```

Or for self-hosted:
```
https://your-domain.com/invite/{token}
```

### Data Flow

1. Owner generates invitation → creates token in database
2. Owner shares link with friend → any channel
3. Friend visits link → validates token, shows form
4. Friend submits form → creates/updates page, marks token used
5. Owner notified → sees new/updated page

---

## Database Schema

```sql
-- Invitation tokens
CREATE TABLE page_invitations (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL DEFAULT gen_random_uuid(),

    -- Owner and page
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES contacts.contacts(id) ON DELETE CASCADE,
    -- contact_id is NULL if this creates a new page

    -- Token
    token VARCHAR(64) NOT NULL UNIQUE,

    -- Configuration
    fields_config JSONB NOT NULL DEFAULT '{}',
    -- Example: {"basic": true, "contact": true, "photo": true, "work": false}

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, completed, expired, revoked

    -- Settings
    expires_at TIMESTAMPTZ NOT NULL,
    allow_updates BOOLEAN NOT NULL DEFAULT FALSE,

    -- Tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ,

    -- Metadata
    friend_name VARCHAR(255),  -- Optional: pre-fill if owner knows name
    message TEXT,              -- Optional: personal message to friend

    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'expired', 'revoked'))
);

CREATE UNIQUE INDEX idx_page_invitations_token ON page_invitations(token);
CREATE INDEX idx_page_invitations_user_id ON page_invitations(user_id);
CREATE INDEX idx_page_invitations_status ON page_invitations(status) WHERE status = 'pending';

-- Audit log for submissions
CREATE TABLE page_invitation_submissions (
    id SERIAL PRIMARY KEY,

    invitation_id INTEGER NOT NULL REFERENCES page_invitations(id) ON DELETE CASCADE,

    -- What was submitted (for history/diff)
    submitted_data JSONB NOT NULL,

    -- Tracking
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_page_invitation_submissions_invitation_id
    ON page_invitation_submissions(invitation_id);
```

---

## API Endpoints

### Owner Endpoints (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invitations` | List all invitations |
| POST | `/api/invitations` | Create new invitation |
| GET | `/api/invitations/:id` | Get invitation details |
| PUT | `/api/invitations/:id` | Update invitation settings |
| POST | `/api/invitations/:id/revoke` | Revoke invitation |
| DELETE | `/api/invitations/:id` | Delete invitation |

### Friend Endpoints (Public with Token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invite/:token` | Get form configuration |
| POST | `/api/invite/:token` | Submit form data |

---

## Frontend Components

### Owner Components

| Component | Description |
|-----------|-------------|
| `InvitationList` | List of all invitations with status |
| `InvitationListItem` | Single invitation with actions |
| `CreateInvitationModal` | Form to create new invitation |
| `InvitationFieldSelector` | Choose which fields to include |
| `InvitationStatusBadge` | Visual status indicator |
| `InvitationLinkCopy` | Copy link to clipboard |
| `InvitationPreview` | Preview what friend will see |

### Friend Components

| Component | Description |
|-----------|-------------|
| `InvitationWelcome` | Welcome screen with explanation |
| `InvitationForm` | Dynamic form based on config |
| `InvitationPhotoUpload` | Photo upload component |
| `InvitationPreview` | Preview of filled page |
| `InvitationSuccess` | Confirmation after submission |
| `InvitationExpired` | Expired/invalid token message |

---

## UI Copy Examples

### Welcome Screen
> **Fill out your page!**
>
> [Owner Name] invited you to their Freundebuch - a digital friendship book where they keep track of the people they care about.
>
> Just fill out the form below, and you'll have your own page in their book. It only takes a minute!

### Success Message
> **You're in the book!**
>
> Thanks for filling out your page. [Owner Name] will be able to see your info and stay in touch.
>
> [If updates allowed] Want to update your info later? Bookmark this link.

### Expired Message
> **This invitation has expired**
>
> The link you followed is no longer valid. If you think this is a mistake, reach out to [Owner Name] for a new one.

---

## Success Metrics

- Invitation link generation: < 200ms
- Form load time: < 1 second
- Form submission: < 500ms
- Invitation completion rate tracking
- Average time to complete form

---

## Implementation Order

1. **Database Migration**
   - Create invitation tables
   - Add indexes

2. **Backend: Token Generation**
   - Secure token generation
   - Expiration handling
   - Revocation logic

3. **Backend: Public Form API**
   - Token validation
   - Form configuration endpoint
   - Submission handling

4. **Backend: Owner API**
   - CRUD for invitations
   - Status tracking
   - Notification triggers

5. **Frontend: Owner UI**
   - Invitation management
   - Field configuration
   - Link sharing

6. **Frontend: Friend Form**
   - Welcome experience
   - Dynamic form
   - Photo upload
   - Success confirmation

7. **Notifications**
   - Email notifications (optional)
   - In-app notifications

8. **Testing**
   - Security testing for tokens
   - E2E flows
   - Expiration handling

---

## Edge Cases

### Token Expiration
- Show friendly message
- Suggest contacting the person who sent the link

### Invalid Token
- Don't reveal whether token exists or expired (security)
- Generic "invalid or expired" message

### Multiple Submissions
- If updates allowed: update the page
- If updates not allowed: show "already completed" message

### Page Already Exists
- Merge submitted data with existing
- Show diff to owner for review

### Photo Upload Failures
- Allow form submission without photo
- Retry capability

### Large Form Abandonment
- Consider auto-save/draft functionality
- Progress indicator for long forms

---

## Future Enhancements

- **QR Codes**: Generate QR codes for in-person sharing
- **Batch Invitations**: Send multiple invitations at once
- **Template Messages**: Pre-written messages for different contexts
- **Scheduled Expiration**: "Expires after event X"
- **Reminder Emails**: Nudge friends who haven't completed
- **Mutual Filling**: Both people fill out pages for each other
- **Social Proof**: "X friends have already added their pages"

---

## Related Epics

- **Epic 1:** Contact Management - pages being filled out
- **Epic 5:** Multi-User Management - authentication for owner actions
- **Epic 7:** Import/Export - could export invitation data
- **Epic 11:** Custom Fields - custom fields can appear on forms

---

**Note:** This epic represents the "full circle" back to the original Freundebuch concept. While technically complex, it's the feature that most embodies the spirit of the product. It should be implemented with extra care for the friend experience - this might be their first impression of Freundebuch.
