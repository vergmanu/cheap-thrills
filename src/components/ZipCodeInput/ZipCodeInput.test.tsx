import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ZipCodeInput } from './ZipCodeInput';

describe('ZipCodeInput', () => {
  it('submits a valid zip code', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ZipCodeInput onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/zip code/i), '90210');
    await user.click(screen.getByRole('button', { name: /find deals/i }));

    expect(onSubmit).toHaveBeenCalledWith('90210');
  });

  it('shows error for invalid zip', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ZipCodeInput onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/zip code/i), '902');
    await user.click(screen.getByRole('button', { name: /find deals/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/valid 5-digit/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
