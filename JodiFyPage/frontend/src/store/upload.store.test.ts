import { describe, expect, it, beforeEach } from 'vitest';
import { useUploadStore } from './upload.store';

describe('upload.store', () => {
  beforeEach(() => {
    useUploadStore.setState({
      tasks: [],
      isUploading: false,
      isModalOpen: false,
      hasFinishedNotice: false,
    });
  });

  it('permite abrir y cerrar el modal a voluntad sin resetear tareas', () => {
    const store = useUploadStore.getState();
    expect(store.isModalOpen).toBe(false);

    store.openModal();
    expect(useUploadStore.getState().isModalOpen).toBe(true);

    store.closeModal();
    expect(useUploadStore.getState().isModalOpen).toBe(false);
  });

  it('encola archivos para subida', () => {
    const store = useUploadStore.getState();
    const fakeFile = new File(['dummy audio content'], 'prueba.mp3', { type: 'audio/mpeg' });

    store.enqueueFiles([fakeFile], 'admin');
    const tasks = useUploadStore.getState().tasks;

    expect(tasks.length).toBe(1);
    expect(tasks[0].name).toBe('prueba');
    expect(useUploadStore.getState().isModalOpen).toBe(true);
  });

  it('limpia las tareas completadas', () => {
    useUploadStore.setState({
      tasks: [
        {
          id: '1',
          file: new File([], '1.mp3'),
          name: '1',
          status: 'success',
          progress: 100,
        },
        {
          id: '2',
          file: new File([], '2.mp3'),
          name: '2',
          status: 'error',
          progress: 100,
          error: 'Error al subir',
        },
      ],
      hasFinishedNotice: true,
    });

    useUploadStore.getState().clearCompleted();
    const tasks = useUploadStore.getState().tasks;
    expect(tasks.length).toBe(1);
    expect(tasks[0].status).toBe('error');
  });
});
