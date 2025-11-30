/**
 * Lazy-loaded editor components for code splitting
 */
import React, { lazy } from 'react';
import type { PersonEditorProps } from './Editor/PersonEditor';
import type { RelationshipEditorProps } from './Editor/RelationshipEditor';

// Lazy load PersonEditor - only loaded when needed
export const PersonEditor: React.LazyExoticComponent<React.ComponentType<PersonEditorProps>> =
	lazy(() => import('./Editor/PersonEditor'));

// Lazy load RelationshipEditor - only loaded when needed
export const RelationshipEditor: React.LazyExoticComponent<React.ComponentType<RelationshipEditorProps>> =
	lazy(() => import('./Editor/RelationshipEditor'));

// Re-export prop types for consumers
export type { PersonEditorProps, RelationshipEditorProps };
