import { describe, expect, it } from 'vitest';
import { confirmDialog, useConfirmStore } from './confirm.store';

describe('confirm store', () => {
  it('encola un diálogo y resuelve true al confirmar', async () => {
    const promise = confirmDialog({ title: '¿Borrar?', tone: 'danger' });
    expect(useConfirmStore.getState().item?.title).toBe('¿Borrar?');
    expect(useConfirmStore.getState().item?.tone).toBe('danger');
    useConfirmStore.getState().resolve(true);
    await expect(promise).resolves.toBe(true);
    expect(useConfirmStore.getState().item).toBeNull();
  });

  it('resuelve false al cancelar y limpia el slot', async () => {
    const promise = confirmDialog('¿Continuar?');
    expect(useConfirmStore.getState().item?.title).toBe('¿Continuar?');
    expect(useConfirmStore.getState().item?.cancelLabel).toBeUndefined();
    useConfirmStore.getState().resolve(false);
    await expect(promise).resolves.toBe(false);
    expect(useConfirmStore.getState().item).toBeNull();
  });
});