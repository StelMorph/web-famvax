// frontend/__tests__/components/common/ProfileCard.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProfileCard from '../../../src/components/common/ProfileCard';

describe('ProfileCard', () => {
  const mockProfile = {
    profileId: '123',
    name: 'John Doe',
    dob: '2022-01-01',
    relationship: 'Self',
    isShared: true,
    avatarColor: 'avatar-blue',
    bloodType: 'O+',
    vaccines: [{}, {}],
  };

  it('should render the profile name', () => {
    render(<ProfileCard profile={mockProfile} onSelect={() => {}} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should render the calculated age', () => {
    render(<ProfileCard profile={mockProfile} onSelect={() => {}} />);
    // The age will change over time, so we'll just check that it's in the document
    expect(screen.getByText(/year(s)? old/)).toBeInTheDocument();
  });

  it('should render the date of birth', () => {
    render(<ProfileCard profile={mockProfile} onSelect={() => {}} />);
    expect(screen.getByText('Born January 1, 2022')).toBeInTheDocument();
  });

  it('should render the relationship', () => {
    render(<ProfileCard profile={mockProfile} onSelect={() => {}} />);
    expect(screen.getByText('Self')).toBeInTheDocument();
  });

  it('should render the "Shared" tag if isShared is true', () => {
    render(<ProfileCard profile={mockProfile} onSelect={() => {}} />);
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });

  it('should not render the "Shared" tag if isShared is false', () => {
    const profileWithoutShare = { ...mockProfile, isShared: false };
    render(<ProfileCard profile={profileWithoutShare} onSelect={() => {}} />);
    expect(screen.queryByText('Shared')).not.toBeInTheDocument();
  });

  it('should render the number of vaccines', () => {
    render(<ProfileCard profile={mockProfile} onSelect={() => {}} />);
    expect(screen.getByText('2 vaccines')).toBeInTheDocument();
  });

  it('should render the blood type', () => {
    render(<ProfileCard profile={mockProfile} onSelect={() => {}} />);
    expect(screen.getByText('Blood Type: O+')).toBeInTheDocument();
  });

  it('should call onSelect when the card is clicked', () => {
    const onSelect = vi.fn();
    render(<ProfileCard profile={mockProfile} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('John Doe'));
    expect(onSelect).toHaveBeenCalledWith('123');
  });
});
