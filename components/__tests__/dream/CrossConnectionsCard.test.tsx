// components/__tests__/dream/CrossConnectionsCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import CrossConnectionsCard from '../../dream/CrossConnectionsCard';

describe('CrossConnectionsCard', () => {
  const mockConnections = [
    {
      connection: 'Test Bağlantı 1',
      evidence: 'Test Kanıt 1'
    },
    {
      connection: 'Test Bağlantı 2', 
      evidence: 'Test Kanıt 2'
    }
  ];

  it('connections array\'i verildiğinde bağlantıları göstermelidir', () => {
    render(<CrossConnectionsCard connections={mockConnections} />);
    
    expect(screen.getByText('dream.components.cross.title')).toBeTruthy();
    expect(screen.getByText('Test Bağlantı 1')).toBeTruthy();
    expect(screen.getByText('Test Kanıt 1')).toBeTruthy();
    expect(screen.getByText('Test Bağlantı 2')).toBeTruthy();
    expect(screen.getByText('Test Kanıt 2')).toBeTruthy();
  });

  it('connections prop\'u verilmediğinde component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<CrossConnectionsCard />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('connections undefined olduğunda component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<CrossConnectionsCard connections={undefined} />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('connections boş array olduğunda component render edilmemelidir', () => {
    const { UNSAFE_root } = render(<CrossConnectionsCard connections={[]} />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });

  it('tek connection ile çalışmalıdır', () => {
    const singleConnection = [{
      connection: 'Tek Bağlantı',
      evidence: 'Tek Kanıt'
    }];
    
    render(<CrossConnectionsCard connections={singleConnection} />);
    
    expect(screen.getByText('dream.components.cross.title')).toBeTruthy();
    expect(screen.getByText('Tek Bağlantı')).toBeTruthy();
    expect(screen.getByText('Tek Kanıt')).toBeTruthy();
  });

  it('çoklu connections ile çalışmalıdır', () => {
    const multipleConnections = [
      { connection: 'Bağlantı 1', evidence: 'Kanıt 1' },
      { connection: 'Bağlantı 2', evidence: 'Kanıt 2' },
      { connection: 'Bağlantı 3', evidence: 'Kanıt 3' },
      { connection: 'Bağlantı 4', evidence: 'Kanıt 4' }
    ];
    
    render(<CrossConnectionsCard connections={multipleConnections} />);
    
    multipleConnections.forEach(conn => {
      expect(screen.getByText(conn.connection)).toBeTruthy();
      expect(screen.getByText(conn.evidence)).toBeTruthy();
    });
  });

  it('başlık ikonu göstermelidir', () => {
    render(<CrossConnectionsCard connections={mockConnections} />);
    
    const titleElement = screen.getByText('dream.components.cross.title');
    expect(titleElement).toBeTruthy();
  });

  it('component doğru şekilde render edilmelidir', () => {
    const { toJSON } = render(<CrossConnectionsCard connections={mockConnections} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
