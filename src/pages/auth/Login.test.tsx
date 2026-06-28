import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';

// Mock Dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../contexts/LogoContext', () => ({
  useLogo: () => ({ logoKiriSidebar: '' }),
}));

vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
  }
}));

describe('Login Component', () => {
  const mockNavigate = vi.fn();
  const mockAuthLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useNavigate as Mock).mockReturnValue(mockNavigate);

    (useAuthStore as unknown as Mock).mockReturnValue({
      isAuthenticated: false,
      login: mockAuthLogin,
    });
  });

  it('renders login form correctly', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Smart Presence/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/NIP/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Masuk/i })).toBeInTheDocument();
  });

  it('redirects to dashboard if already authenticated', () => {
    (useAuthStore as unknown as Mock).mockReturnValue({
      isAuthenticated: true,
      login: mockAuthLogin,
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('shows error on invalid login', async () => {
    (authService.login as Mock).mockRejectedValueOnce({
      response: { data: { message: 'NIP atau password salah' } }
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/NIP/i), '123456');
    await user.type(screen.getByLabelText(/Password/i), 'wrongpassword');
    
    await user.click(screen.getByRole('button', { name: /Masuk/i }));

    await waitFor(() => {
      expect(screen.getByText('NIP atau password salah')).toBeInTheDocument();
    });
    
    expect(mockAuthLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('successfully logs in and redirects', async () => {
    const mockResponse = {
      token: 'fake-token',
      user: { id: 1, name: 'John Doe', nip: '123456', role_id: 2 }
    };
    (authService.login as Mock).mockResolvedValueOnce(mockResponse);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/NIP/i), '123456');
    await user.type(screen.getByLabelText(/Password/i), 'correctpassword');
    
    await user.click(screen.getByRole('button', { name: /Masuk/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        nip: '123456',
        password: 'correctpassword'
      });
    });

    expect(mockAuthLogin).toHaveBeenCalledWith('fake-token', mockResponse.user);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});
