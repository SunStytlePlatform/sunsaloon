import { Container } from './Container';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border py-8 text-sm text-muted-foreground">
      <Container>© {new Date().getFullYear()} SUNS. Salon booking made simple.</Container>
    </footer>
  );
}
