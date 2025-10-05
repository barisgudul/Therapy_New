// components/__tests__/dream/ThemesCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ThemesCard from '../../dream/ThemesCard';

describe('ThemesCard', () => {
  it('themes array\'i verildiğinde temaları göstermelidir', () => {
    const testThemes = ['Anksiyete', 'Sevgi', 'Gelecek'];
    render(<ThemesCard themes={testThemes} />);
    
    expect(screen.getByText('dream.components.themes.title')).toBeTruthy();
    expect(screen.getByText('Anksiyete')).toBeTruthy();
    expect(screen.getByText('Sevgi')).toBeTruthy();
    expect(screen.getByText('Gelecek')).toBeTruthy();
  });

  it('themes prop\'u verilmediğinde component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<ThemesCard />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('themes undefined olduğunda component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<ThemesCard themes={undefined} />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('themes boş array olduğunda component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<ThemesCard themes={[]} />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('tek tema ile çalışmalıdır', () => {
    const testThemes = ['Tek Tema'];
    render(<ThemesCard themes={testThemes} />);
    
    expect(screen.getByText('dream.components.themes.title')).toBeTruthy();
    expect(screen.getByText('Tek Tema')).toBeTruthy();
  });

  it('çoklu temalar ile çalışmalıdır', () => {
    const testThemes = ['Tema 1', 'Tema 2', 'Tema 3', 'Tema 4', 'Tema 5'];
    render(<ThemesCard themes={testThemes} />);
    
    testThemes.forEach(theme => {
      expect(screen.getByText(theme)).toBeTruthy();
    });
  });

  it('component doğru şekilde render edilmelidir', () => {
    const testThemes = ['Test Tema 1', 'Test Tema 2'];
    const { toJSON } = render(<ThemesCard themes={testThemes} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
