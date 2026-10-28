import Link from 'next/link';
import { Container } from './Container';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="font-serif text-2xl font-bold tracking-wide text-primary">
          SUNS
        </Link>
        <ThemeToggle />
      </Container>
    </header>
  );
}
