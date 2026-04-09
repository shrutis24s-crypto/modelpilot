/**
 * API Configuration
 * 
 * Change BASE_URL to point to any backend.
 * Update ENDPOINTS if route paths change.
 * No other files need modification.
 */

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ENDPOINTS = {
  models:            '/models',
  build:             '/build',
  run:               '/run',
  runs:              '/runs',
  runDetail:         (id: string) => `/run/${id}`,
  runLogs:           (id: string) => `/run/${id}/logs`,
  runOutput:         (id: string) => `/run/${id}/output`,
  runRelated:        (id: string) => `/run/${id}/related`,
  report:            (id: string) => `/report/${id}`,
  reportVisual:      (id: string) => `/report/${id}/visual`,
  compare:           '/compare',
  compareTwo:        '/compare/two',
  compareSameModel:  (id: string) => `/compare/same-model?run_id=${id}`,
  templates:         '/templates',
  templateDetail:    (name: string) => `/templates/${name}`,
  templateSelected:  '/templates/selected',
  templateSelect:    '/templates/select',
} as const;
