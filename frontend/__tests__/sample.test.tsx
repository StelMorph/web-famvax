// frontend/__tests__/sample.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

const SampleComponent = () => <div>Hello, World!</div>;

describe('Frontend Sample Test', () => {
  it('should render the sample component', () => {
    render(<SampleComponent />);
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
  });
});
