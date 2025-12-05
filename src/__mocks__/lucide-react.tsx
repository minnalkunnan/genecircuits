import React from 'react';

// Mock all lucide-react icons as simple components
const createMockIcon = (name: string) => {
  const MockIcon = (props: any) => <svg data-testid={`${name}-icon`} {...props}>{name}</svg>;
  MockIcon.displayName = name;
  return MockIcon;
};

export const Play = createMockIcon('Play');
export const Save = createMockIcon('Save');
export const Trash2 = createMockIcon('Trash2');
export const Settings = createMockIcon('Settings');
export const Download = createMockIcon('Download');
export const FolderOpen = createMockIcon('FolderOpen');
export const X = createMockIcon('X');
export const Dna = createMockIcon('Dna');
export const AreaChart = createMockIcon('AreaChart');
export const Grid3X3 = createMockIcon('Grid3X3');

