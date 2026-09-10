import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '$lib/test';
import DetailActions from './detail-actions.svelte';

describe('DetailActions', () => {
  it('renders edit and delete buttons with the given labels', () => {
    render(DetailActions, {
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      editLabel: 'Edit phone',
      deleteLabel: 'Delete phone',
    });
    expect(screen.getByLabelText('Edit phone')).toBeTruthy();
    expect(screen.getByLabelText('Delete phone')).toBeTruthy();
  });

  it('omits the edit button when no onEdit handler is given', () => {
    render(DetailActions, { onDelete: vi.fn(), deleteLabel: 'Delete phone' });
    expect(screen.queryByLabelText('Edit phone')).toBeNull();
    expect(screen.getByLabelText('Delete phone')).toBeTruthy();
  });

  it('fires onEdit and onDelete when pressed', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(DetailActions, {
      onEdit,
      onDelete,
      editLabel: 'Edit phone',
      deleteLabel: 'Delete phone',
    });

    await fireEvent.click(screen.getByLabelText('Edit phone'));
    await fireEvent.click(screen.getByLabelText('Delete phone'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('disables the delete button while deleting', () => {
    render(DetailActions, { onDelete: vi.fn(), isDeleting: true, deleteLabel: 'Delete phone' });
    expect((screen.getByLabelText('Delete phone') as HTMLButtonElement).disabled).toBe(true);
  });
});
