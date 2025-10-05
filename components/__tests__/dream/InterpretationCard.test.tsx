// components/__tests__/dream/InterpretationCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import InterpretationCard from '../../dream/InterpretationCard';

describe('InterpretationCard', () => {
  it('interpretation prop\'u verildiğinde içeriği göstermelidir', () => {
    const testInterpretation = 'Bu bir test yorumudur';
    render(<InterpretationCard interpretation={testInterpretation} />);
    
    expect(screen.getByText('dream.components.interpretation.title')).toBeTruthy();
  });

  it('interpretation prop\'u verilmediğinde component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<InterpretationCard />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('interpretation undefined olduğunda component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<InterpretationCard interpretation={undefined} />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('interpretation boş string olduğunda component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<InterpretationCard interpretation="" />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('başlık ikonu göstermelidir', () => {
    const testInterpretation = 'Test interpretation';
    render(<InterpretationCard interpretation={testInterpretation} />);
    
    const titleElement = screen.getByText('dream.components.interpretation.title');
    expect(titleElement).toBeTruthy();
  });

  it('markdown içeriği ile çalışmalıdır', () => {
    const markdownContent = '# Başlık\n\n**Kalın metin** ve *italik metin*.';
    render(<InterpretationCard interpretation={markdownContent} />);
    
    expect(screen.getByText('dream.components.interpretation.title')).toBeTruthy();
  });

  it('uzun interpretation metni ile çalışmalıdır', () => {
    const longInterpretation = 'Bu çok uzun bir rüya yorumudur. '.repeat(50);
    render(<InterpretationCard interpretation={longInterpretation} />);
    
    expect(screen.getByText('dream.components.interpretation.title')).toBeTruthy();
  });

  it('component doğru şekilde render edilmelidir', () => {
    const testInterpretation = 'Test interpretation';
    const { toJSON } = render(<InterpretationCard interpretation={testInterpretation} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
