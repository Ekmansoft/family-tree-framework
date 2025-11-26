/**
 * Lazy-loaded editor components for code splitting
 */
import { lazy } from 'react';

// Lazy load PersonEditor - only loaded when needed
export const PersonEditor = lazy(() => import('./Editor/PersonEditor'));

// Lazy load RelationshipEditor - only loaded when needed
export const RelationshipEditor = lazy(() => import('./Editor/RelationshipEditor'));
