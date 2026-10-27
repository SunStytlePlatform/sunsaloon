import './globals.css';

export const metadata = {
  title: 'SunSaloon',
  description: 'SunSaloon health check',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
