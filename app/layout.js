import './globals.css';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

export const metadata = {
  title: 'Cleanslate',
  description: 'AI-assisted data cleansing',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '16px 24px',
              gap: 12,
            }}
          >
            <SignedOut>
              <SignInButton mode="modal" />
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          <SignedOut>
            <div className="wrap">
              <div className="card">
                <p style={{ margin: 0 }}>Sign in above to use Cleanslate — this keeps your uploads and learned corrections tied to your account.</p>
              </div>
            </div>
          </SignedOut>

          <SignedIn>{children}</SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}
