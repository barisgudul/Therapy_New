// components/__tests__/shared/MarkdownRenderer.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MarkdownRenderer } from '../../shared/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('boş içerik için null döner', () => {
    const { toJSON } = render(<MarkdownRenderer content="" accentColor="#000" />);
    expect(toJSON()).toBeNull();
  });

  it('normal metni render eder', () => {
    render(<MarkdownRenderer content="Normal metin" accentColor="#000" />);
    expect(screen.getByText('Normal metin')).toBeTruthy();
  });

  it('bold metni render eder', () => {
    render(<MarkdownRenderer content="**Kalın metin**" accentColor="#000" />);
    expect(screen.getByText('Kalın metin')).toBeTruthy();
  });

  it('italic metni render eder', () => {
    render(<MarkdownRenderer content="*İtalik metin*" accentColor="#000" />);
    expect(screen.getByText('İtalik metin')).toBeTruthy();
  });

  it('başlıkları render eder', () => {
    render(<MarkdownRenderer content="## Başlık 2" accentColor="#000" />);
    expect(screen.getByText('Başlık 2')).toBeTruthy();
  });

  it('bullet pointleri render eder', () => {
    render(<MarkdownRenderer content="- Liste öğesi" accentColor="#000" />);
    expect(screen.getByText('•')).toBeTruthy();
    expect(screen.getByText('Liste öğesi')).toBeTruthy();
  });

  it('özel kutuyu render eder', () => {
    render(<MarkdownRenderer content="💭 **Özel kutu içeriği**" accentColor="#FF0000" />);
    expect(screen.getByText('Özel kutu içeriği')).toBeTruthy();
  });
});
