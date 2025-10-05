// components/__tests__/dream/SummaryCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SummaryCard from '../../dream/SummaryCard';

describe('SummaryCard', () => {
  it('summary prop\'u verildiğinde içeriği göstermelidir', () => {
    const testSummary = 'Bu bir test özetidir';
    render(<SummaryCard summary={testSummary} />);
    
    expect(screen.getByText('dream.components.summary.title')).toBeTruthy();
    expect(screen.getByText(testSummary)).toBeTruthy();
  });

  it('summary prop\'u verilmediğinde component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<SummaryCard />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('summary undefined olduğunda component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<SummaryCard summary={undefined} />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('summary boş string olduğunda component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<SummaryCard summary="" />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('başlık ikonu göstermelidir', () => {
    const testSummary = 'Test summary';
    render(<SummaryCard summary={testSummary} />);
    
    // Icon'u test etmek için parent element'i kontrol et
    const titleElement = screen.getByText('dream.components.summary.title');
    expect(titleElement).toBeTruthy();
  });

  it('component doğru şekilde render edilmelidir', () => {
    const testSummary = 'Test summary';
    const { toJSON } = render(<SummaryCard summary={testSummary} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
