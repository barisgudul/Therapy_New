// app/__tests__/_layout.test.tsx
describe('RootLayout', () => {
  it('_layout dosyası var olmalıdır', () => {
    const fs = require('fs');
    const path = require('path');
    const layoutPath = path.join(__dirname, '../_layout.tsx');
    
    expect(fs.existsSync(layoutPath)).toBe(true);
  });

  it('_layout dosyası default export içermelidir', () => {
    const fs = require('fs');
    const path = require('path');
    const layoutPath = path.join(__dirname, '../_layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf8');
    
    expect(content).toContain('export default');
    expect(content).toContain('RootLayout');
  });

  it('_layout dosyası gerekli provider\'ları içermelidir', () => {
    const fs = require('fs');
    const path = require('path');
    const layoutPath = path.join(__dirname, '../_layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf8');
    
    expect(content).toContain('AuthProvider');
    expect(content).toContain('LoadingProvider');
    expect(content).toContain('QueryClientProvider');
  });

  it('_layout dosyası navigation logic içermelidir', () => {
    const fs = require('fs');
    const path = require('path');
    const layoutPath = path.join(__dirname, '../_layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf8');
    
    expect(content).toContain('useRouter');
    expect(content).toContain('useSegments');
    expect(content).toContain('useAuth');
  });
});
