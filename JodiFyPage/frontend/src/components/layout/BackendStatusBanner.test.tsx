import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BackendStatusBanner } from './BackendStatusBanner';
import { useBackendStore } from '../../store/backend.store';
import { SessionProvider } from '../../context/SessionContext';

describe('BackendStatusBanner', () => {
  beforeEach(() => {
    act(() => {
      useBackendStore.setState({
        status: 'online',
        isWaking: false,
        countdown: 5,
        retrying: false,
        retryAttempts: 0,
        dismissed: false,
        lastChecked: null,
        errorMessage: null,
      });
    });
  });

  it('no renderiza nada cuando el backend está online', () => {
    const { container } = render(
      <SessionProvider>
        <BackendStatusBanner />
      </SessionProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra el banner cuando el backend está offline con cuenta regresiva y botón de reintentar', () => {
    act(() => {
      useBackendStore.setState({
        status: 'offline',
        isWaking: false,
        countdown: 4,
        retrying: false,
        retryAttempts: 1,
        dismissed: false,
      });
    });

    render(
      <SessionProvider>
        <BackendStatusBanner />
      </SessionProvider>,
    );

    expect(screen.getByText('Servidor backend no disponible')).toBeInTheDocument();
    expect(screen.getByText('Reconectando en 4s')).toBeInTheDocument();
    expect(screen.getByText('Reintentar ahora')).toBeInTheDocument();
  });

  it('permite minimizar a pastilla flotante y volver a expandir', () => {
    act(() => {
      useBackendStore.setState({
        status: 'offline',
        isWaking: false,
        countdown: 3,
        retrying: false,
        retryAttempts: 1,
        dismissed: false,
      });
    });

    render(
      <SessionProvider>
        <BackendStatusBanner />
      </SessionProvider>,
    );

    // Click minimizar
    const minBtn = screen.getByRole('button', { name: /minimizar/i });
    act(() => {
      fireEvent.click(minBtn);
    });

    // Debe mostrar la pastilla
    expect(screen.getByText(/Backend inactivo/)).toBeInTheDocument();
    expect(screen.getByText(/Reintento en 3s/)).toBeInTheDocument();

    // Click expandir
    const expBtn = screen.getByRole('button', { name: /expandir aviso/i });
    act(() => {
      fireEvent.click(expBtn);
    });

    // Vuelve a estar en modo tarjeta completa
    expect(screen.getByText('Servidor backend no disponible')).toBeInTheDocument();
  });

  it('muestra aviso de inicio en frío si Render está despertando (isWaking = true)', () => {
    act(() => {
      useBackendStore.setState({
        status: 'offline',
        isWaking: true,
        countdown: 5,
        retrying: false,
        retryAttempts: 2,
        dismissed: false,
      });
    });

    render(
      <SessionProvider>
        <BackendStatusBanner />
      </SessionProvider>,
    );

    expect(screen.getByText('Iniciando servidor de JodiFy')).toBeInTheDocument();
    expect(screen.getByText(/cold-start/i)).toBeInTheDocument();
  });
});
