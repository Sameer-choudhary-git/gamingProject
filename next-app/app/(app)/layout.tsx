import AuthGuard from "@/components/AuthGuard";
import PresenceProvider from "@/components/PresenceProvider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <PresenceProvider>
        {/* You can also add your Sidebar/Navbar here! 
          This way, the sidebar ONLY appears when the user is logged in.
      */}
        {children}
      </PresenceProvider>
    </AuthGuard>
  );
}
